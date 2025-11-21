<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * Session Player - Full-screen exercise timer interface
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { ptState, ptService } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';
  import { audioService } from '$lib/services/AudioService';
  import type { Exercise, SessionDefinition, SessionInstance, CompletedExercise } from '$lib/types/pt';

  // Player state
  let sessionDefinition: SessionDefinition | null = null;
  let sessionInstance: SessionInstance | null = null;
  let exercises: Exercise[] = [];
  let currentExerciseIndex = 0;
  let currentExercise: Exercise | null = null;

  // Timer state
  let timerState: 'paused' | 'countdown' | 'active' | 'resting' | 'completed' | 'preparing' = 'paused';
  let totalElapsedSeconds = 0;
  let exerciseElapsedSeconds = 0;
  let countdownSeconds = 3; // Fixed 3-second countdown
  let restElapsedSeconds = 0; // Time elapsed during rest period
  let currentSet = 1;
  let currentRep = 1;
  let repElapsedSeconds = 0; // Track time within current rep for countdown
  let isPausingBetweenReps = false; // Track pause state between reps
  let pauseRemainingSeconds = 0; // Countdown for pause between reps
  let preparingSeconds = 0; // Countdown for preparing/transition between exercises
  let preparingInterval: number | undefined;
  let pauseInterval: number | undefined;

  // Intervals
  let totalTimerInterval: number | undefined;
  let exerciseTimerInterval: number | undefined;

  // Settings
  let startCountdownDuration = 3;
  let endSessionDelay = 5;
  let restBetweenSets = 30;
  let restBetweenExercises = 30;
  let enableAutoAdvance = true;
  let pauseBetweenExercises = 10;

  // Runtime auto-advance toggle (can be toggled during session)
  let autoAdvanceActive = true;

  let sessionLoadAttempted = false;

  // Auto-scroll support for exercise list
  let exerciseElements: HTMLElement[] = [];
  let exerciseListContainer: HTMLElement | null = null;

  // Wake Lock to keep screen awake during session
  let wakeLock: any = null;

  // Scroll active exercise into view when index changes
  $: if (currentExerciseIndex >= 0 && exerciseElements[currentExerciseIndex] && exerciseListContainer) {
    const activeElement = exerciseElements[currentExerciseIndex];
    const container = exerciseListContainer;

    const elementTop = activeElement.offsetTop;
    const elementHeight = activeElement.offsetHeight;
    const containerScrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    // Calculate where the element's top is relative to the visible area
    const elementRelativeTop = elementTop - containerScrollTop;

    // Padding from the bottom edge when scrolling into view
    const bottomPadding = 100;

    // Only scroll if the element's top is below the visible area
    // (If it's already visible above the bottom, leave it alone)
    if (elementRelativeTop > containerHeight - bottomPadding) {
      // Scroll so the element's top appears near the bottom of the container
      container.scrollTo({
        top: elementTop - containerHeight + bottomPadding,
        behavior: 'smooth'
      });
    }
  }

  // Update audio service when settings change
  $: if ($ptState.settings) {
    audioService.setMasterVolume($ptState.settings.soundVolume);
    audioService.setLeadInEnabled($ptState.settings.audioLeadInEnabled);
    audioService.setExerciseAboutToEndEnabled($ptState.settings.audioExerciseAboutToEndEnabled);
    audioService.setContinuousTicksEnabled($ptState.settings.audioContinuousTicksEnabled);
    audioService.setPerRepBeepsEnabled($ptState.settings.audioPerRepBeepsEnabled);
    audioService.setHapticsEnabled($ptState.settings.hapticsEnabled);
  }

  // Check if audio is enabled
  function shouldPlayAudio(): boolean {
    return $ptState.settings?.soundEnabled ?? false;
  }

  // Request wake lock to keep screen awake
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('✓ Wake Lock activated successfully');

        // Re-request wake lock if it's released (e.g., user switches tabs)
        wakeLock.addEventListener('release', () => {
          console.log('⚠ Wake Lock released (tab hidden or screen locked)');
        });
      } else {
        console.warn('⚠ Wake Lock API not supported on this device/browser');
      }
    } catch (err) {
      console.error('✗ Wake Lock request failed:', err);
      console.log('Wake Lock may require user interaction first (especially on iOS)');
    }
  }

  // Release wake lock
  async function releaseWakeLock() {
    if (wakeLock) {
      try {
        await wakeLock.release();
        wakeLock = null;
        console.log('Wake Lock released manually');
      } catch (err) {
        console.error('Wake Lock release failed:', err);
      }
    }
  }

  // Unlock audio and configure settings on mount
  onMount(() => {
    audioService.unlock();
    requestWakeLock();

    // Configure audio service with user settings
    if ($ptState.settings) {
      audioService.setMasterVolume($ptState.settings.soundVolume);
      audioService.setLeadInEnabled($ptState.settings.audioLeadInEnabled);
      audioService.setExerciseAboutToEndEnabled($ptState.settings.audioExerciseAboutToEndEnabled);
      audioService.setContinuousTicksEnabled($ptState.settings.audioContinuousTicksEnabled);
      audioService.setPerRepBeepsEnabled($ptState.settings.audioPerRepBeepsEnabled);
      audioService.setHapticsEnabled($ptState.settings.hapticsEnabled);
    }
  });

  // Wait for ptState to be initialized, then load session
  $: if ($ptState.initialized && !sessionLoadAttempted) {
    loadSession();
  }

  async function loadSession() {
    sessionLoadAttempted = true;

    const sessionIdStr = localStorage.getItem('pt-active-session-id');
    if (!sessionIdStr) {
      toastStore.show('No session selected', 'error');
      goto('/');
      return;
    }

    const sessionId = parseInt(sessionIdStr, 10);
    sessionDefinition = $ptState.sessionDefinitions.find(s => s.id === sessionId) || null;

    if (!sessionDefinition) {
      toastStore.show('Session not found', 'error');
      goto('/');
      return;
    }

    // Load exercises in session-defined order
    exercises = sessionDefinition.exercises
      .map(se => $ptState.exercises.find(e => e.id === se.exerciseId))
      .filter((e): e is Exercise => e !== undefined);

    if (exercises.length === 0) {
      toastStore.show('Session has no exercises', 'error');
      goto('/');
      return;
    }

    // Load settings
    if ($ptState.settings) {
      startCountdownDuration = $ptState.settings.startCountdownDuration;
      endSessionDelay = $ptState.settings.endSessionDelay;
      restBetweenSets = $ptState.settings.restBetweenSets;
      restBetweenExercises = $ptState.settings.restBetweenExercises;
      enableAutoAdvance = $ptState.settings.enableAutoAdvance;
      pauseBetweenExercises = $ptState.settings.pauseBetweenExercises;
    }

    // Determine auto-advance setting: session-specific or app default
    const sessionAutoAdvance = sessionDefinition.autoAdvance ?? enableAutoAdvance;
    autoAdvanceActive = sessionAutoAdvance;

    // Check for existing in-progress session for today
    const existingSession = await ptService.getTodaySessionInstance();
    console.log('Checking for existing session:', existingSession);

    if (existingSession) {
      console.log('Existing session status:', existingSession.status);
      console.log('Existing session definition ID:', existingSession.sessionDefinitionId);
      console.log('Current session ID:', sessionId);
    }

    if (existingSession && existingSession.status === 'in-progress' &&
        existingSession.sessionDefinitionId === sessionId) {
      // Resume existing session
      console.log('Resuming existing session');
      await resumeSession(existingSession);
    } else {
      // Create new session instance
      console.log('Creating new session instance');
      await createSessionInstance();

      // Set first exercise and wait for user to press play
      currentExercise = exercises[0];
      currentExerciseIndex = 0;
      timerState = 'paused';
    }
  }

  onDestroy(() => {
    clearTimers();
    if (preparingInterval) clearInterval(preparingInterval);
    if (pauseInterval) clearInterval(pauseInterval);
    releaseWakeLock();
  });

  async function createSessionInstance() {
    if (!sessionDefinition) return;

    const today = ptService.formatDate(new Date());
    const completedExercises: CompletedExercise[] = exercises.map(ex => ({
      exerciseId: ex.id,

      // Snapshot data for historical preservation
      exerciseName: ex.name,
      exerciseType: ex.type,

      // Target values (what was planned)
      targetDuration: ex.type === 'duration' ? ex.defaultDuration : undefined,
      targetReps: ex.type === 'reps' ? ex.defaultReps : undefined,
      targetSets: ex.type === 'reps' ? ex.defaultSets : undefined,
      targetRepDuration: ex.type === 'reps' ? ex.defaultRepDuration : undefined,

      // Completion tracking
      completed: false,
      skipped: false
    }));

    const instance: Omit<SessionInstance, 'id'> = {
      date: today,
      sessionDefinitionId: sessionDefinition.id,
      sessionName: sessionDefinition.name,
      status: 'in-progress',
      startTime: new Date().toISOString(),
      completedExercises,
      customized: false
    };

    const id = await ptService.addSessionInstance(instance);
    sessionInstance = { ...instance, id };

    // Start total timer (only counts during active states)
    totalTimerInterval = window.setInterval(() => {
      if (timerState === 'active' || timerState === 'countdown') {
        totalElapsedSeconds++;
      }
    }, 1000);
  }

  async function resumeSession(existing: SessionInstance) {
    sessionInstance = existing;

    console.log('Resuming session:', existing);
    console.log('Completed exercises:', existing.completedExercises);

    // Restore cumulative elapsed time (not wall clock time since start)
    totalElapsedSeconds = existing.cumulativeElapsedSeconds || 0;

    // Find first incomplete exercise
    let resumeIndex = 0;
    for (let i = 0; i < exercises.length; i++) {
      const completed = existing.completedExercises.find(
        ce => ce.exerciseId === exercises[i].id
      );
      console.log(`Exercise ${i} (ID: ${exercises[i].id}):`, completed);

      if (!completed || (!completed.completed && !completed.skipped)) {
        resumeIndex = i;
        console.log(`Found incomplete exercise at index ${i}`);
        break;
      }
      if (completed.completed || completed.skipped) {
        resumeIndex = i + 1;
      }
    }

    // Check if session is already complete
    if (resumeIndex >= exercises.length) {
      toastStore.show('Session already completed', 'info');
      await completeSession();
      return;
    }

    currentExerciseIndex = resumeIndex;
    currentExercise = exercises[currentExerciseIndex];

    console.log(`Resuming from exercise ${resumeIndex + 1}: ${currentExercise.name}`);

    // Start total timer
    totalTimerInterval = window.setInterval(() => {
      if (timerState === 'active' || timerState === 'countdown') {
        totalElapsedSeconds++;
      }
    }, 1000);

    // Resume paused, waiting for user to press play
    timerState = 'paused';
    toastStore.show(`Resuming from exercise #${resumeIndex + 1}`, 'info');
  }

  function clearTimers() {
    if (totalTimerInterval) clearInterval(totalTimerInterval);
    if (exerciseTimerInterval) clearInterval(exerciseTimerInterval);
    if (preparingInterval) clearInterval(preparingInterval);
    if (pauseInterval) clearInterval(pauseInterval);
  }

  function startExerciseCountdown() {
    timerState = 'countdown';
    countdownSeconds = 3; // Fixed 3-second countdown

    // Play initial countdown tone
    if (shouldPlayAudio()) {
      audioService.onCountdown(countdownSeconds);
    }

    exerciseTimerInterval = window.setInterval(() => {
      countdownSeconds--;

      // Play countdown tone at 3, 2, 1
      if (shouldPlayAudio() && countdownSeconds >= 1) {
        audioService.onCountdown(countdownSeconds);
      }

      if (countdownSeconds <= 0) {
        clearInterval(exerciseTimerInterval);
        startExercise();
      }
    }, 1000);
  }

  function startExercise() {
    if (!currentExercise) return;

    timerState = 'active';
    exerciseElapsedSeconds = 0;
    isPausingBetweenReps = false;
    currentSet = 1;
    currentRep = 1;

    if (currentExercise.type === 'duration') {
      startDurationExercise();
    } else {
      startRepsExercise();
    }
  }

  function startDurationExercise() {
    if (!currentExercise) return;

    const totalDuration = currentExercise.defaultDuration || 60;
    const continuousTicksEnabled = $ptState.settings?.audioContinuousTicksEnabled ?? false;
    const leadInEnabled = $ptState.settings?.audioLeadInEnabled ?? false;

    // Play duration exercise start tone
    if (shouldPlayAudio()) {
      audioService.onDurationStart();
    }

    exerciseTimerInterval = window.setInterval(() => {
      exerciseElapsedSeconds++;
      const remaining = totalDuration - exerciseElapsedSeconds;

      // Audio cues during exercise
      if (shouldPlayAudio()) {
        if (continuousTicksEnabled) {
          // Play tick every second
          audioService.onTick();
        } else if (leadInEnabled && remaining >= 1 && remaining <= 3) {
          // Play subtle 3-2-1 countdown at end of duration
          audioService.onCountdownEnd(remaining);
        }
      }

      if (exerciseElapsedSeconds >= totalDuration) {
        clearInterval(exerciseTimerInterval);

        // Play end tone if countdown wasn't used
        if (shouldPlayAudio() && !continuousTicksEnabled && !leadInEnabled) {
          audioService.onDurationEnd();
        }

        completeCurrentExercise();
      }
    }, 1000);
  }

  function startRepsExercise() {
    if (!currentExercise) return;

    const reps = currentExercise.defaultReps || 10;
    const sets = currentExercise.defaultSets || 3;
    const repDuration = currentExercise.defaultRepDuration || $ptState.settings?.defaultRepDuration || 2;

    repElapsedSeconds = 0;
    isPausingBetweenReps = false;

    // Play rep start tone for first rep
    if (shouldPlayAudio()) {
      audioService.onRepStart();
    }

    exerciseTimerInterval = window.setInterval(() => {
      // If pausing between reps, don't increment counters
      if (isPausingBetweenReps) {
        return;
      }

      // Play end tone when counter shows "1" (last count of rep)
      if (repElapsedSeconds === repDuration - 1 && shouldPlayAudio()) {
        audioService.onRepEnd();
      }

      exerciseElapsedSeconds++;
      repElapsedSeconds++;

      // Determine current rep within the set
      currentRep = Math.floor((exerciseElapsedSeconds % (reps * repDuration)) / repDuration) + 1;

      // Check if rep is complete
      if (repElapsedSeconds >= repDuration) {
        const isEndOfSet = (exerciseElapsedSeconds % (reps * repDuration) === 0);

        if (isEndOfSet) {
          // Set is complete
          clearInterval(exerciseTimerInterval);

          if (currentSet >= sets) {
            // Exercise complete - all sets done
            completeCurrentExercise();
          } else {
            // Set complete, more sets to go
            currentSet++;
            exerciseElapsedSeconds = 0;
            repElapsedSeconds = 0;
            isPausingBetweenReps = false;

            // Get rest duration
            const restDuration = currentExercise.restBetweenSets ?? restBetweenSets;

            // Automatically start rest timer if there's a non-zero rest time
            if (restDuration > 0) {
              // Add a small delay before starting rest to prevent overlapping tones
              setTimeout(() => {
                startRestTimer();
              }, 300);
            } else {
              // No rest configured, either auto-advance to next set or pause
              if (autoAdvanceActive) {
                startRepsExercise();
              } else {
                timerState = 'paused';
              }
            }
          }
        } else {
          // Rep complete, but more reps in this set - pause between reps
          isPausingBetweenReps = true;
          const pauseDuration = currentExercise.pauseBetweenReps ?? 5;
          pauseRemainingSeconds = pauseDuration;

          // Clear any existing pause interval
          if (pauseInterval) clearInterval(pauseInterval);

          // Countdown interval for pause between reps
          pauseInterval = window.setInterval(() => {
            pauseRemainingSeconds--;

            if (pauseRemainingSeconds <= 0) {
              clearInterval(pauseInterval);
              pauseInterval = undefined;
              isPausingBetweenReps = false;
              repElapsedSeconds = 0;

              // Play start tone for next rep
              if (shouldPlayAudio()) {
                audioService.onRepStart();
              }
            }
          }, 1000);
        }
      }
    }, 1000);
  }

  function startRestTimer() {
    if (!currentExercise) return;

    // Get rest duration - use exercise override if available, otherwise global setting
    const restDuration = currentExercise.restBetweenSets ?? restBetweenSets;

    restElapsedSeconds = 0;
    timerState = 'resting';

    // Play rest start tone only if rest cues are enabled
    if (shouldPlayAudio() && $ptState.settings?.audioRestCuesEnabled) {
      audioService.onRestStart();
    }

    exerciseTimerInterval = window.setInterval(() => {
      restElapsedSeconds++;

      // Check if rest period is complete
      if (restElapsedSeconds >= restDuration) {
        clearInterval(exerciseTimerInterval);

        // Play rest end tone only if rest cues are enabled
        if (shouldPlayAudio() && $ptState.settings?.audioRestCuesEnabled) {
          audioService.onRestEnd();
        }

        restElapsedSeconds = 0;

        // If auto-advance is enabled, continue to next set automatically
        // Otherwise pause and wait for user
        if (autoAdvanceActive) {
          timerState = 'active';

          // Add delay to prevent overlapping tones between rest end and exercise start
          setTimeout(() => {
            if (currentExercise.type === 'reps') {
              startRepsExercise();
            } else {
              startDurationExercise();
            }
          }, 300);
        } else {
          timerState = 'paused';
        }
      }
    }, 1000);
  }

  async function completeCurrentExercise() {
    if (!sessionInstance) return;

    // Mark exercise as completed
    const completed = sessionInstance.completedExercises.find(
      ce => ce.exerciseId === currentExercise?.id
    );
    if (completed) {
      completed.completed = true;
      completed.completedAt = new Date().toISOString();
      completed.actualDuration = exerciseElapsedSeconds;
    }

    // Save progress
    await ptService.updateSessionInstance(sessionInstance);

    // Move to next exercise
    if (currentExerciseIndex < exercises.length - 1) {
      currentExerciseIndex++;
      currentExercise = exercises[currentExerciseIndex];
      exerciseElapsedSeconds = 0;
      repElapsedSeconds = 0;
      isPausingBetweenReps = false;
      currentSet = 1;
      currentRep = 1;

      // Check if auto-advance is enabled
      if (autoAdvanceActive && pauseBetweenExercises > 0) {
        // Start preparation/transition phase
        startPreparingForNextExercise();
      } else if (autoAdvanceActive && pauseBetweenExercises === 0) {
        // No pause, start immediately
        startExerciseCountdown();
      } else {
        // Auto-advance disabled, pause and wait for user
        timerState = 'paused';
      }
    } else {
      // Session complete
      await completeSession();
    }
  }

  function startPreparingForNextExercise() {
    timerState = 'preparing';
    preparingSeconds = pauseBetweenExercises;

    // No audio cues during preparing - the exercise start countdown will play them

    preparingInterval = window.setInterval(() => {
      preparingSeconds--;

      if (preparingSeconds <= 0) {
        clearInterval(preparingInterval);
        preparingInterval = undefined;

        // Automatically start the next exercise countdown
        startExerciseCountdown();
      }
    }, 1000);
  }

  async function completeSession() {
    if (!sessionInstance) return;

    // Wait 2 seconds to create clear delineation between final exercise tone and session completion
    await new Promise(resolve => setTimeout(resolve, 2000));

    timerState = 'completed';
    sessionInstance.status = 'completed';
    sessionInstance.endTime = new Date().toISOString();

    // Play completion chime
    if (shouldPlayAudio()) {
      audioService.onSessionComplete();
    }

    await ptService.updateSessionInstance(sessionInstance);

    toastStore.show('Session completed!', 'success');
    setTimeout(() => {
      goto('/');
    }, endSessionDelay * 1000);
  }

  function toggleAutoAdvance() {
    autoAdvanceActive = !autoAdvanceActive;
  }

  // VCR-style controls
  function togglePlayPause() {
    if (timerState === 'preparing') {
      // Cancel preparing phase and pause
      if (preparingInterval) {
        clearInterval(preparingInterval);
        preparingInterval = undefined;
      }
      timerState = 'paused';
    } else if (timerState === 'paused') {
      // Check if we're resuming a paused pause-between-reps
      if (isPausingBetweenReps && pauseRemainingSeconds > 0) {
        // Resume pause countdown where we left off
        timerState = 'active';
        if (pauseInterval) clearInterval(pauseInterval);

        pauseInterval = window.setInterval(() => {
          pauseRemainingSeconds--;

          if (pauseRemainingSeconds <= 0) {
            clearInterval(pauseInterval);
            pauseInterval = undefined;
            isPausingBetweenReps = false;
            repElapsedSeconds = 0;

            // Play start tone for next rep
            if (shouldPlayAudio()) {
              audioService.onRepStart();
            }
          }
        }, 1000);
        return;
      }

      // Check if we're resuming a paused rest (restElapsedSeconds > 0 indicates partial rest)
      const isResumingRest = currentSet > 1 && restElapsedSeconds > 0;

      if (isResumingRest) {
        // Resume rest timer where we left off
        startRestTimer();
      } else {
        // Check if we're mid-exercise (resuming a set within the same exercise)
        const isMidExercise = currentSet > 1;

        if (isMidExercise) {
          // Skip countdown when resuming between sets
          timerState = 'active';
          if (currentExercise?.type === 'reps') {
            startRepsExercise();
          } else {
            startDurationExercise();
          }
        } else {
          // Normal start - do countdown
          startExerciseCountdown();
        }
      }
    } else if (timerState === 'active') {
      // Pause current exercise or pause-between-reps
      if (isPausingBetweenReps) {
        // Pause the pause-between-reps countdown
        if (pauseInterval) {
          clearInterval(pauseInterval);
          pauseInterval = undefined;
        }
      } else {
        clearInterval(exerciseTimerInterval);
      }
      timerState = 'paused';
    } else if (timerState === 'countdown') {
      // Pause during countdown
      clearInterval(exerciseTimerInterval);
      timerState = 'paused';
    } else if (timerState === 'resting') {
      // Pause rest timer
      clearInterval(exerciseTimerInterval);
      timerState = 'paused';
    }
  }

  async function goToPreviousExercise() {
    if (timerState !== 'paused' || currentExerciseIndex === 0) return;

    // Move to previous exercise
    currentExerciseIndex--;
    currentExercise = exercises[currentExerciseIndex];
    exerciseElapsedSeconds = 0;
    repElapsedSeconds = 0;
    isPausingBetweenReps = false;
    currentSet = 1;
    currentRep = 1;

    // Mark current as incomplete if it was marked as completed
    const completedEx = sessionInstance?.completedExercises.find(
      ce => ce.exerciseId === currentExercise?.id
    );
    if (completedEx) {
      completedEx.completed = false;
      completedEx.skipped = false;
    }

    if (sessionInstance) {
      await ptService.updateSessionInstance(sessionInstance);
    }
  }

  async function goToNextExercise() {
    if (timerState !== 'paused') return;
    if (!sessionInstance || !currentExercise) return;

    // Mark current exercise as skipped
    const completed = sessionInstance.completedExercises.find(
      ce => ce.exerciseId === currentExercise?.id
    );
    if (completed && !completed.completed) {
      completed.skipped = true;
      completed.completedAt = new Date().toISOString();
    }

    await ptService.updateSessionInstance(sessionInstance);

    // Move to next exercise
    if (currentExerciseIndex < exercises.length - 1) {
      currentExerciseIndex++;
      currentExercise = exercises[currentExerciseIndex];
      exerciseElapsedSeconds = 0;
      repElapsedSeconds = 0;
      isPausingBetweenReps = false;
      currentSet = 1;
      currentRep = 1;
    } else {
      // Already at last exercise
      toastStore.show('Already at last exercise', 'info');
    }
  }

  async function exitSession() {
    // Exit with in-progress status
    if (!sessionInstance) {
      clearTimers();
      goto('/');
      return;
    }

    sessionInstance.status = 'in-progress';
    sessionInstance.cumulativeElapsedSeconds = totalElapsedSeconds;

    try {
      await ptService.updateSessionInstance(sessionInstance);
      toastStore.show('Progress saved', 'success');
    } catch (error) {
      console.error('Failed to save progress:', error);
      toastStore.show('Failed to save progress', 'error');
    }

    clearTimers();
    goto('/');
  }

  async function finishSession() {
    // Mark session as completed with only actual progress
    if (!sessionInstance) {
      clearTimers();
      goto('/');
      return;
    }

    sessionInstance.status = 'completed';
    sessionInstance.endTime = new Date().toISOString();
    sessionInstance.cumulativeElapsedSeconds = totalElapsedSeconds;

    try {
      await ptService.updateSessionInstance(sessionInstance);
      toastStore.show('Session finished', 'success');
    } catch (error) {
      console.error('Failed to finish session:', error);
      toastStore.show('Failed to finish session', 'error');
    }

    clearTimers();
    goto('/');
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Reactive: Current exercise timer display
  $: currentExerciseTimeDisplay = (() => {
    if (!currentExercise) return '0:00';

    if (currentExercise.type === 'duration') {
      const total = currentExercise.defaultDuration || 60;
      const remaining = Math.max(0, total - exerciseElapsedSeconds);
      return formatTime(remaining);
    } else {
      // For reps with duration > 2 seconds, show countdown within current rep
      const repDuration = currentExercise.defaultRepDuration || 2;
      if (repDuration > 2 && timerState === 'active') {
        const repRemaining = Math.max(0, repDuration - repElapsedSeconds);
        return formatTime(repRemaining);
      } else {
        // Otherwise show total remaining time
        const reps = currentExercise.defaultReps || 10;
        const sets = currentExercise.defaultSets || 3;
        const total = reps * sets * repDuration;
        const remaining = Math.max(0, total - exerciseElapsedSeconds);
        return formatTime(remaining);
      }
    }
  })();

  // Rest timer display - countdown from rest duration to 0
  $: restTimeDisplay = (() => {
    if (!currentExercise) return '0:00';
    const restDuration = currentExercise.restBetweenSets ?? restBetweenSets;
    const remaining = Math.max(0, restDuration - restElapsedSeconds);
    return formatTime(remaining);
  })();

  function getExerciseProgress(exerciseIndex: number): number {
    if (exerciseIndex < currentExerciseIndex) return 100;
    if (exerciseIndex > currentExerciseIndex) return 0;

    const exercise = exercises[exerciseIndex];
    if (exercise.type === 'duration') {
      const total = exercise.defaultDuration || 60;
      return Math.min(100, (exerciseElapsedSeconds / total) * 100);
    } else {
      const reps = exercise.defaultReps || 10;
      const sets = exercise.defaultSets || 3;
      const repDuration = exercise.defaultRepDuration || 2;
      const total = reps * sets * repDuration;
      return Math.min(100, (exerciseElapsedSeconds / total) * 100);
    }
  }

  function isExerciseCompleted(exerciseIndex: number): boolean {
    return exerciseIndex < currentExerciseIndex;
  }
</script>

<div class="player-container">
  <!-- Top Section: Current Exercise Display -->
  <div class="player-top">
    <!-- Session Info Bar -->
    <div class="session-info-bar">
      <!-- Auto-Advance Toggle -->
      <button
        class="auto-advance-toggle"
        class:active={autoAdvanceActive}
        on:click={toggleAutoAdvance}
        title={autoAdvanceActive ? 'Auto-advance enabled' : 'Auto-advance disabled'}
      >
        <span class="material-icons">{autoAdvanceActive ? 'play_circle' : 'pause_circle'}</span>
      </button>

      <div class="session-name">{sessionDefinition?.name || 'Session'}</div>

      <div class="session-timer">
        <span class="timer-label">Session Time</span>
        <span class="timer-value">{formatTime(totalElapsedSeconds)}</span>
      </div>
    </div>

    <!-- Exercise header (always visible) -->
    <div class="exercise-header">
      {#if currentExercise}
        <h2 class="exercise-name">{currentExercise.name}</h2>
      {:else}
        <h2 class="exercise-name">&nbsp;</h2>
      {/if}
    </div>

    <!-- Main display area with fixed height container -->
    <div class="main-display-area">
    {#if timerState === 'preparing'}
      <div class="preparing-display">
        <div class="preparing-label">Preparing for Next Exercise</div>
        <div class="preparing-timer">{formatTime(preparingSeconds)}</div>
        <div class="preparing-hint">Get ready...</div>
      </div>
    {:else if timerState === 'countdown'}
      <div class="countdown-display">
        <div class="countdown-number">{countdownSeconds}</div>
        <div class="countdown-label">Get Ready</div>
      </div>
    {:else if timerState === 'completed'}
      <div class="completion-display">
        <span class="material-icons completion-icon">check_circle</span>
        <div class="completion-label">Session Complete!</div>
      </div>
    {:else if timerState === 'paused' && currentExercise}
      <div class="paused-display">
        <div class="state-label">READY TO START</div>
        {#if currentExercise.type === 'duration'}
          <div class="state-focus">Duration: {currentExercise.defaultDuration}s</div>
        {:else}
          <div class="state-focus">
            Set {currentSet} of {currentExercise.defaultSets || 3}
          </div>
          <div class="state-details">
            {currentExercise.defaultReps || 10} reps per set
          </div>
        {/if}
      </div>
    {:else if timerState === 'resting' && currentExercise}
      <div class="rest-display">
        <div class="state-label">REST</div>
        <div class="state-timer">{restTimeDisplay}</div>
        <div class="state-details">
          Completed Set {currentSet - 1} of {currentExercise.defaultSets || 3}
        </div>
      </div>
    {:else if currentExercise && timerState === 'active'}
      <div class="current-exercise-card">
        {#if currentExercise.type === 'duration'}
          <div class="exercise-timer">
            <div class="timer-display">{currentExerciseTimeDisplay}</div>
            <div class="timer-label-small">Remaining</div>
          </div>
        {:else}
          <!-- Reps exercise -->
          <div class="exercise-reps">
            {#if isPausingBetweenReps}
              <!-- Pause between reps indicator -->
              <div class="pause-between-reps-display">
                <div class="state-label">TRANSITION</div>
                <div class="state-timer">{pauseRemainingSeconds}</div>
                <div class="state-details">Prepare for next rep</div>
              </div>
            {:else}
              <div class="set-info">Set {currentSet} of {currentExercise.defaultSets || 3}</div>
              <div class="rep-info">Rep {currentRep} of {currentExercise.defaultReps || 10}</div>
              {#if (currentExercise.defaultRepDuration || 2) > 2}
                <div class="rep-timer">{currentExerciseTimeDisplay}</div>
              {/if}
            {/if}
          </div>
        {/if}
      </div>
    {/if}
    </div>

    <!-- VCR-style control bar -->
    <div class="vcr-controls">
      <button class="vcr-btn vcr-exit" on:click={exitSession} title="Exit (save progress)">
        <span class="material-icons">exit_to_app</span>
        <span class="vcr-label">Exit</span>
      </button>

      <button
        class="vcr-btn vcr-back"
        on:click={goToPreviousExercise}
        disabled={timerState !== 'paused' || currentExerciseIndex === 0}
        title="Previous exercise"
      >
        <span class="material-icons">skip_previous</span>
      </button>

      <button class="vcr-btn vcr-play-pause" on:click={togglePlayPause} title={timerState === 'paused' ? 'Play' : 'Pause'} disabled={timerState === 'completed'}>
        <span class="material-icons">
          {timerState === 'paused' ? 'play_arrow' : 'pause'}
        </span>
      </button>

      <button
        class="vcr-btn vcr-forward"
        on:click={goToNextExercise}
        disabled={timerState !== 'paused'}
        title="Next exercise (skip)"
      >
        <span class="material-icons">skip_next</span>
      </button>

      <button class="vcr-btn vcr-finish" on:click={finishSession} title="Finish session">
        <span class="material-icons">check_circle</span>
        <span class="vcr-label">Finish</span>
      </button>
    </div>
  </div>

  <!-- Bottom Section: Exercise List -->
  <div class="player-bottom" bind:this={exerciseListContainer}>
    <div class="exercise-list">
      {#each exercises as exercise, index (exercise.id)}
        <div
          bind:this={exerciseElements[index]}
          class="exercise-item"
          class:active={index === currentExerciseIndex}
          class:completed={isExerciseCompleted(index)}
        >
          <div class="exercise-item-header">
            <span class="exercise-item-name">{exercise.name}</span>
            {#if isExerciseCompleted(index)}
              <span class="material-icons check-icon">check_circle</span>
            {/if}
          </div>

          <div class="exercise-item-details">
            {#if exercise.type === 'duration'}
              <span class="material-icons detail-icon">timer</span>
              <span>{exercise.defaultDuration}s</span>
            {:else}
              <span class="material-icons detail-icon">fitness_center</span>
              <span>{exercise.defaultSets} sets × {exercise.defaultReps} reps</span>
            {/if}
          </div>

          <div class="progress-bar">
            <div
              class="progress-fill"
              style="width: {getExerciseProgress(index)}%"
            ></div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .player-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--surface);
    overflow: hidden;
  }

  /* Top Section - 1/3 of screen */
  .player-top {
    flex: 0 0 33.333%;
    background: linear-gradient(135deg, var(--primary-color), var(--primary-color-dark));
    color: white;
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    position: relative;
  }

  .main-display-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }

  /* Session Info Bar */
  .session-info-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--spacing-md);
    margin-bottom: var(--spacing-md);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    min-height: 2.5rem;
    gap: var(--spacing-md);
  }

  .session-name {
    flex: 1;
    font-size: var(--font-size-lg);
    font-weight: 600;
    opacity: 0.95;
  }

  .auto-advance-toggle {
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
    opacity: 0.7;
    flex-shrink: 0;
  }

  .auto-advance-toggle.active {
    opacity: 1;
  }

  .auto-advance-toggle:hover {
    opacity: 1;
    transform: scale(1.1);
  }

  .auto-advance-toggle .material-icons {
    font-size: 2rem;
  }

  .session-timer {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .timer-label {
    font-size: var(--font-size-xs);
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .timer-value {
    font-size: var(--font-size-xl);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  /* VCR Control Bar */
  .vcr-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
  }

  .vcr-btn {
    background-color: rgba(255, 255, 255, 0.15);
    border: none;
    border-radius: 12px;
    color: white;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    transition: all 0.2s ease;
    min-height: 70px;
    padding: var(--spacing-sm);
  }

  .vcr-btn:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.25);
    transform: translateY(-2px);
  }

  .vcr-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .vcr-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .vcr-btn .material-icons {
    font-size: 2rem;
  }

  .vcr-label {
    font-size: var(--font-size-xs);
    opacity: 0.9;
  }

  /* Exit and Finish buttons - wider with labels */
  .vcr-exit,
  .vcr-finish {
    min-width: 80px;
  }

  /* Back and Forward buttons - square */
  .vcr-back,
  .vcr-forward {
    min-width: 60px;
  }

  /* Play/Pause button - largest and most prominent */
  .vcr-play-pause {
    min-width: 80px;
    min-height: 80px;
    background-color: rgba(255, 255, 255, 0.3);
  }

  .vcr-play-pause .material-icons {
    font-size: 3rem;
  }

  .vcr-play-pause:hover {
    background-color: rgba(255, 255, 255, 0.4);
  }

  .countdown-display {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
  }

  .countdown-number {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1;
  }

  .countdown-label {
    font-size: var(--font-size-base);
    margin-top: var(--spacing-sm);
    opacity: 0.9;
  }

  .preparing-display {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: var(--spacing-sm);
  }

  .preparing-label {
    font-size: var(--font-size-base);
    font-weight: 600;
  }

  .preparing-timer {
    font-size: 2.5rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--primary);
    line-height: 1;
  }

  .preparing-hint {
    font-size: var(--font-size-base);
    opacity: 0.9;
  }

  .completion-display {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
  }

  .completion-icon {
    font-size: 2.5rem;
    color: var(--success-color);
  }

  .completion-label {
    font-size: var(--font-size-xl);
    font-weight: 600;
  }

  .current-exercise-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .exercise-header {
    min-height: 3.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .exercise-header.invisible {
    visibility: hidden;
  }

  .exercise-name {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: 600;
    line-height: 1.2;
  }

  .exercise-timer {
    text-align: center;
    margin: var(--spacing-lg) 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .timer-display {
    font-size: 2.5rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .timer-label-small {
    font-size: var(--font-size-base);
    opacity: 0.9;
  }

  .exercise-reps {
    text-align: center;
    margin: var(--spacing-lg) 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .set-info {
    font-size: var(--font-size-xl);
    font-weight: 600;
  }

  .rep-info {
    font-size: var(--font-size-lg);
    opacity: 0.9;
  }

  /* Paused Display */
  .paused-display {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: var(--spacing-sm);
  }

  /* Rest display */
  .rest-display {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: var(--spacing-sm);
  }

  /* Pause between reps display */
  .pause-between-reps-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: var(--spacing-sm);
  }

  /* Shared state styling */
  .state-label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    opacity: 0.8;
  }

  .state-focus {
    font-size: var(--font-size-xl);
    font-weight: 600;
    line-height: 1.2;
  }

  .state-timer {
    font-size: 2.5rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--primary);
    line-height: 1;
  }

  .state-details {
    font-size: var(--font-size-base);
    opacity: 0.9;
  }

  .rest-details {
    font-size: var(--font-size-base);
    opacity: 0.9;
  }

  /* Rep timer for long-duration reps */
  .rep-timer {
    font-size: var(--font-size-xl);
    font-weight: 700;
    margin-top: var(--spacing-sm);
    font-variant-numeric: tabular-nums;
    opacity: 0.9;
  }

  /* Bottom Section - 2/3 of screen */
  .player-bottom {
    flex: 0 0 66.666%;
    background-color: var(--surface);
    overflow-y: auto;
    padding: var(--spacing-lg);
  }

  .exercise-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .exercise-item {
    background-color: #1e3a5f;
    color: white;
    border-radius: var(--border-radius);
    padding: var(--spacing-md);
    transition: all 0.3s ease;
  }

  .exercise-item.active {
    background-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.3);
  }

  .exercise-item.completed {
    background-color: rgba(76, 175, 80, 0.2);
    opacity: 0.7;
  }

  .exercise-item-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
  }

  .exercise-item-name {
    flex: 1;
    font-size: var(--font-size-base);
    font-weight: 600;
  }

  .check-icon {
    color: var(--success-color);
    font-size: var(--icon-size-md);
  }

  .exercise-item-details {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
    opacity: 0.9;
    margin-bottom: var(--spacing-sm);
  }

  .detail-icon {
    font-size: var(--icon-size-sm);
  }

  .progress-bar {
    height: 4px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background-color: white;
    transition: width 0.3s ease;
  }

  @media (max-width: 480px) {
    .player-top {
      padding: var(--spacing-md);
    }

    .session-name {
      font-size: var(--font-size-base);
    }

    .timer-value {
      font-size: var(--font-size-lg);
    }

    .exercise-name {
      font-size: var(--font-size-xl);
    }
  }

  /* Extra small screens - scale down primary content slightly */
  @media (max-width: 360px) {
    .timer-display,
    .countdown-number,
    .state-timer,
    .preparing-timer {
      font-size: 2rem;
    }

    .completion-icon {
      font-size: 2rem;
    }
  }
</style>
