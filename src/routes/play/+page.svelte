<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Nathan A. Eaton Jr.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { ptState, ptService } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';
  import { audioService } from '$lib/services/AudioService';
  import { formatDuration } from '$lib/utils/duration';
  import { parseMarkdown } from '$lib/utils/markdown';
  import DisplayRow from '$lib/components/DisplayRow.svelte';
  import SideIndicator from '$lib/components/SideIndicator.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
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
  let currentSide: 'left' | 'right' | null = null; // Track current side for unilateral/alternating exercises
  let sidePhase: 'first' | 'second' = 'first'; // Track which side phase we're in (for unilateral mode)
  let setStartingSide: 'left' | 'right' | null = null; // Track which side started current set (for alternating)
  let repElapsedSeconds = 0; // Track time within current rep for countdown
  let isPausingBetweenReps = false; // Track pause state between reps
  let isAwaitingSetContinuation = false; // Track if paused after set/phase completion awaiting manual advance
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
  let enableAutoAdvance = true;
  let autoAdvanceSets = true;
  let pauseBetweenExercises = 10;
  let resumeFromPausePoint = true;
  let startingSide: 'left' | 'right' = 'left';

  // Runtime auto-advance toggle (can be toggled during session)
  let autoAdvanceActive = true;

  let sessionLoadAttempted = false;

  // Auto-scroll support for exercise list
  let exerciseElements: HTMLElement[] = [];
  let exerciseListContainer: HTMLElement | null = null;

  // Instruction expansion state (accordion pattern)
  let expandedExerciseId: number | null = null;

  function toggleInstructions(exerciseId: number) {
    expandedExerciseId = expandedExerciseId === exerciseId ? null : exerciseId;
  }

  // Wake Lock to keep screen awake during session
  let wakeLock: any = null;

  // Fullscreen state
  let isFullscreen = false;

  // Confirmation dialog state
  let showRepeatSessionConfirm = false;

  // Scroll active exercise into view when index changes
  $: if (currentExerciseIndex >= 0 && exerciseElements[currentExerciseIndex] && exerciseListContainer) {
    const activeElement = exerciseElements[currentExerciseIndex];
    const container = exerciseListContainer;

    const elementTop = activeElement.offsetTop;
    const elementHeight = activeElement.offsetHeight;
    const containerScrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    // Calculate where the element's top and bottom are relative to the visible area
    const elementRelativeTop = elementTop - containerScrollTop;
    const elementRelativeBottom = elementRelativeTop + elementHeight;

    // Padding from the bottom edge when scrolling into view
    const bottomPadding = 20;

    // Check if element is below the visible area (need to scroll down)
    if (elementRelativeBottom > containerHeight - bottomPadding) {
      // Scroll so the entire element is visible with bottom padding
      container.scrollTo({
        top: elementTop + elementHeight - containerHeight + bottomPadding,
        behavior: 'smooth'
      });
    }
    // Check if element is above the visible area (need to scroll up)
    else if (elementRelativeTop < bottomPadding) {
      container.scrollTo({
        top: elementTop - bottomPadding,
        behavior: 'smooth'
      });
    }
  }

  // Update audio service when settings change
  $: if ($ptState.settings) {
    audioService.setMasterVolume($ptState.settings.soundVolume);
    audioService.setLeadInEnabled($ptState.settings.audioLeadInEnabled);
    audioService.setExerciseAboutToEndEnabled($ptState.settings.audioExerciseAboutToEndEnabled);
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

  // Request fullscreen
  async function requestFullscreen() {
    // Only request fullscreen if the setting is enabled
    const fullscreenEnabled = $ptState.settings?.fullscreenEnabled ?? false;
    if (!fullscreenEnabled) return;

    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
        isFullscreen = true;
        console.log('✓ Fullscreen activated successfully');
      } else if ((element as any).webkitRequestFullscreen) {
        // Safari support
        await (element as any).webkitRequestFullscreen();
        isFullscreen = true;
        console.log('✓ Fullscreen activated successfully (WebKit)');
      }
    } catch (err) {
      console.error('✗ Fullscreen request failed:', err);
      console.log('Fullscreen may require user interaction first');
    }
  }

  // Exit fullscreen
  async function exitFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        isFullscreen = false;
        console.log('Fullscreen exited');
      } else if ((document as any).webkitFullscreenElement) {
        // Safari support
        await (document as any).webkitExitFullscreen();
        isFullscreen = false;
        console.log('Fullscreen exited (WebKit)');
      }
    } catch (err) {
      console.error('Fullscreen exit failed:', err);
    }
  }

  // Listen for fullscreen changes (e.g., user pressing ESC)
  function handleFullscreenChange() {
    isFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
  }

  // Unlock audio and configure settings on mount
  onMount(() => {
    audioService.unlock();
    requestWakeLock();
    requestFullscreen();

    // Configure audio service with user settings
    if ($ptState.settings) {
      audioService.setMasterVolume($ptState.settings.soundVolume);
      audioService.setLeadInEnabled($ptState.settings.audioLeadInEnabled);
      audioService.setExerciseAboutToEndEnabled($ptState.settings.audioExerciseAboutToEndEnabled);
      audioService.setHapticsEnabled($ptState.settings.hapticsEnabled);
    }

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
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
      enableAutoAdvance = $ptState.settings.enableAutoAdvance;
      pauseBetweenExercises = $ptState.settings.pauseBetweenExercises;
      resumeFromPausePoint = $ptState.settings.resumeFromPausePoint;
      startingSide = $ptState.settings.startingSide || 'left';
      // Initialize with global default
      autoAdvanceSets = $ptState.settings.autoAdvanceSets ?? true; 
    }

    // Determine auto-advance setting: session-specific or app default
    const sessionAutoAdvance = sessionDefinition.autoAdvance ?? enableAutoAdvance;
    autoAdvanceActive = sessionAutoAdvance;

    // Apply session override for Auto-Start Sets if defined
    if (sessionDefinition.autoAdvanceSets !== undefined) {
      autoAdvanceSets = sessionDefinition.autoAdvanceSets;
    }

    // CHECK FOR SPECIFIC INSTANCE ID FIRST (from Resume button)
    const instanceIdStr = localStorage.getItem('pt-active-session-instance-id');
    let existingSession: SessionInstance | null = null;

    if (instanceIdStr) {
      // User clicked "Resume Session" - load the SPECIFIC instance they selected
      const instanceId = parseInt(instanceIdStr, 10);
      existingSession = await ptService.getSessionInstance(instanceId);

      // Clear the instance ID from localStorage after reading
      localStorage.removeItem('pt-active-session-instance-id');

      console.log('Loading specific instance ID:', instanceId, existingSession);
    } else {
      // No specific instance - check for any session for today
      existingSession = await ptService.getTodaySessionInstance(sessionId);
      console.log('Checking for existing session:', existingSession);
    }

    if (existingSession) {
      console.log('Existing session status:', existingSession.status);
      console.log('Existing session definition ID:', existingSession.sessionDefinitionId);
      console.log('Current session ID:', sessionId);

      // Check if it's in-progress
      if (existingSession.status === 'in-progress') {
        // Resume in-progress session
        console.log('Resuming in-progress session');
        await resumeSession(existingSession);
      } else if (existingSession.status === 'completed') {
        // Session already completed today
        // Check if this session allows multiple completions per day
        if (sessionDefinition.allowMultiplePerDay) {
          // Skip confirmation dialog and start new instance
          console.log('Session allows multiple per day, starting new instance');
          await createSessionInstance();
          currentExercise = exercises[0];
          currentExerciseIndex = 0;
          timerState = 'paused';
        } else {
          // Show confirmation dialog
          showRepeatSessionConfirm = true;
          return;
        }
      }
    } else {
      // No existing session - create new one
      console.log('Creating new session instance');
      await createSessionInstance();

      // Set first exercise and wait for user to press play
      currentExercise = exercises[0];
      currentExerciseIndex = 0;
      timerState = 'paused';
    }
  }

  async function confirmRepeatSession() {
    showRepeatSessionConfirm = false;
    await createSessionInstance();
    currentExercise = exercises[0];
    currentExerciseIndex = 0;
    timerState = 'paused';
  }

  function cancelRepeatSession() {
    showRepeatSessionConfirm = false;
    goto('/');
  }

  onDestroy(() => {
    clearTimers();
    if (preparingInterval) clearInterval(preparingInterval);
    if (pauseInterval) clearInterval(pauseInterval);
    releaseWakeLock();
    exitFullscreen();

    // Remove fullscreen event listeners
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
  });

  async function createSessionInstance() {
    if (!sessionDefinition) return;

    // SAFETY CHECK: Verify no in-progress instance already exists
    const existing = await ptService.getTodaySessionInstance(sessionDefinition.id);
    if (existing && existing.status === 'in-progress') {
      console.warn('In-progress instance already exists, resuming instead');
      await resumeSession(existing);
      return;
    }

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

  // ==================== Side Mode Helper Functions ====================

  /**
   * Initialize the currentSide based on exercise sideMode and startingSide setting
   */
  function initializeSide(exercise: Exercise) {
    const sideMode = exercise.sideMode || 'bilateral';
    if (sideMode === 'bilateral') {
      currentSide = null;
    } else {
      currentSide = startingSide;
    }
  }

  /**
   * Get the opposite side
   */
  function getOppositeSide(side: 'left' | 'right'): 'left' | 'right' {
    return side === 'left' ? 'right' : 'left';
  }

  // ==================== Exercise Control Functions ====================

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

    const exercise = currentExercise; // Store in local const to satisfy TypeScript null checks

    timerState = 'active';
    exerciseElapsedSeconds = 0;
    isPausingBetweenReps = false;
    currentSet = 1;
    currentRep = 1;
    sidePhase = 'first'; // Reset side phase
    initializeSide(exercise); // Initialize side for unilateral/alternating

    // Track starting side for alternating exercises
    if (exercise.sideMode === 'alternating') {
      setStartingSide = currentSide;
    }

    if (exercise.type === 'duration') {
      startDurationExercise();
    } else {
      startRepsExercise();
    }
  }

  function startDurationExercise() {
    if (!currentExercise) return;

    const totalDuration = currentExercise.defaultDuration || 60;
    const leadInEnabled = $ptState.settings?.audioLeadInEnabled ?? false;

    // Reset elapsed time when starting fresh
    exerciseElapsedSeconds = 0;

    // Play duration exercise start tone
    if (shouldPlayAudio()) {
      audioService.onDurationStart();
    }

    exerciseTimerInterval = window.setInterval(() => {
      exerciseElapsedSeconds++;
      const remaining = totalDuration - exerciseElapsedSeconds;

      // Audio cues during exercise
      if (shouldPlayAudio() && leadInEnabled && remaining >= 1 && remaining <= 3) {
        // Play subtle 3-2-1 countdown at end of duration
        audioService.onCountdownEnd(remaining);
      }

      if (exerciseElapsedSeconds >= totalDuration) {
        clearInterval(exerciseTimerInterval);

        // Play end tone if countdown wasn't used
        if (shouldPlayAudio() && !leadInEnabled) {
          audioService.onDurationEnd();
        }

        completeCurrentExercise();
      }
    }, 1000);
  }

  function resumeDurationExercise() {
    if (!currentExercise) return;

    const totalDuration = currentExercise.defaultDuration || 60;
    const leadInEnabled = $ptState.settings?.audioLeadInEnabled ?? false;

    // Don't reset exerciseElapsedSeconds - continue from where we paused

    exerciseTimerInterval = window.setInterval(() => {
      exerciseElapsedSeconds++;
      const remaining = totalDuration - exerciseElapsedSeconds;

      // Audio cues during exercise
      if (shouldPlayAudio() && leadInEnabled && remaining >= 1 && remaining <= 3) {
        // Play subtle 3-2-1 countdown at end of duration
        audioService.onCountdownEnd(remaining);
      }

      if (exerciseElapsedSeconds >= totalDuration) {
        clearInterval(exerciseTimerInterval);

        // Play end tone if countdown wasn't used
        if (shouldPlayAudio() && !leadInEnabled) {
          audioService.onDurationEnd();
        }

        completeCurrentExercise();
      }
    }, 1000);
  }

  function startRepsExercise() {
    if (!currentExercise) return;

    const exercise = currentExercise; // Store in local const to satisfy TypeScript null checks
    const reps = exercise.defaultReps || 10;
    const sets = exercise.defaultSets || 3;
    const repDuration = exercise.defaultRepDuration || $ptState.settings?.defaultRepDuration || 2;
    const sideMode = exercise.sideMode || 'bilateral';

    // Reset counters when starting fresh
    exerciseElapsedSeconds = 0;
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
        // Check if this is the very last rep of the first side in a unilateral exercise
        const isLastRepOfFirstSide =
          sideMode === 'unilateral' &&
          sidePhase === 'first' &&
          currentRep === reps;

        if (isLastRepOfFirstSide) {
          // Play distinctive Gong INSTEAD of standard rep beep
          audioService.onSwitchSides();
        } else {
          // Play standard high beep
          audioService.onRepEnd();
        }
      }

      exerciseElapsedSeconds++;
      repElapsedSeconds++;

      // Calculate current rep display based on mode
      if (sideMode === 'alternating') {
        // For alternating: each rep number appears twice (L then R)
        // Internal rep count: 1, 2, 3, 4, 5, 6, 7, 8 (for 4 reps)
        // Display rep count: 1, 1, 2, 2, 3, 3, 4, 4
        const timeInSet = exerciseElapsedSeconds % (reps * 2 * repDuration);
        const internalRepIndex = Math.floor(timeInSet / repDuration);
        currentRep = Math.floor(internalRepIndex / 2) + 1;
        if (currentRep > reps) currentRep = reps;
      } else {
        // For bilateral and unilateral: normal rep counting
        const timeInSet = exerciseElapsedSeconds % (reps * repDuration);
        const repIndex = Math.floor(timeInSet / repDuration);
        currentRep = (timeInSet === 0 && exerciseElapsedSeconds > 0) ? reps : Math.min(reps, repIndex + 1);
      }

      // Check if rep is complete
      if (repElapsedSeconds >= repDuration) {
        // Determine if we've completed a "phase" based on mode
        let isEndOfPhase = false;

        if (sideMode === 'unilateral') {
          // For unilateral: end of phase is after one side completes (reps iterations)
          isEndOfPhase = (exerciseElapsedSeconds % (reps * repDuration) === 0);
        } else {
          // For bilateral: end of phase is end of set
          isEndOfPhase = (exerciseElapsedSeconds % (reps * repDuration) === 0);
        }

        if (isEndOfPhase) {
          // Phase is complete
          clearInterval(exerciseTimerInterval);

          // For unilateral mode, check if we need to do the second side
          if (sideMode === 'unilateral' && sidePhase === 'first') {
            // Switch to second side, keep same set number
            sidePhase = 'second';
            if (currentSide) {
              currentSide = getOppositeSide(currentSide);
            }
            exerciseElapsedSeconds = 0;
            repElapsedSeconds = 0;
            isPausingBetweenReps = false;
            currentRep = 1;

            // Get rest duration
            const restDuration = currentExercise.restBetweenSets ?? restBetweenSets;

            // Automatically start rest timer if there's a non-zero rest time
            if (restDuration > 0) {
              setTimeout(() => {
                // Pass FALSE to skip the standard "Rest Start" beep
                // because the Gong just played
                startRestTimer(false);
              }, 300);
            } else {
              // No rest configured, either auto-advance to second side or pause
              if (autoAdvanceActive || autoAdvanceSets) {
                startRepsExercise();
              } else {
                isAwaitingSetContinuation = true;
                timerState = 'paused';
              }
            }
          } else {
            // Either bilateral/alternating completed, or unilateral second side completed
            // Check if all sets are done
            if (currentSet >= sets) {
              // Exercise complete - all sets done
              completeCurrentExercise();
            } else {
              // Set complete, more sets to go
              currentSet++;
              sidePhase = 'first'; // Reset to first side for next set
              if (sideMode === 'unilateral' && currentSide) {
                // Reset to starting side for next set
                currentSide = startingSide;
              } else if (sideMode === 'alternating' && currentSide && setStartingSide) {
                // Alternate the starting side for next set
                currentSide = getOppositeSide(setStartingSide);
                setStartingSide = currentSide; // Remember this set's starting side
              }
              exerciseElapsedSeconds = 0;
              repElapsedSeconds = 0;
              isPausingBetweenReps = false;
              currentRep = 1;

              // Get rest duration
              const restDuration = currentExercise.restBetweenSets ?? restBetweenSets;

              // Automatically start rest timer if there's a non-zero rest time
              if (restDuration > 0) {
                setTimeout(() => {
                  // Pass TRUE (default) to play standard rest beep
                  startRestTimer(true);
                }, 300);
              } else {
                // No rest configured, either auto-advance to next set or pause
                if (autoAdvanceActive) {
                  startRepsExercise();
                } else {
                  isAwaitingSetContinuation = true;
                  timerState = 'paused';
                }
              }
            }
          }
        } else {
          // Rep complete, but more reps in this phase - pause between reps
          isPausingBetweenReps = true;
          const pauseDuration = currentExercise.pauseBetweenReps ?? 5;
          pauseRemainingSeconds = pauseDuration;

          // Switch side for alternating mode
          if (sideMode === 'alternating' && currentSide) {
            currentSide = getOppositeSide(currentSide);
          }

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

  function resumeRepsExercise() {
    if (!currentExercise) return;

    const reps = currentExercise.defaultReps || 10;
    const sets = currentExercise.defaultSets || 3;
    const repDuration = currentExercise.defaultRepDuration || $ptState.settings?.defaultRepDuration || 2;
    const sideMode = currentExercise.sideMode || 'bilateral';

    // Don't reset counters - continue from where we paused
    // exerciseElapsedSeconds, currentSet, currentRep, repElapsedSeconds are preserved

    isPausingBetweenReps = false;

    exerciseTimerInterval = window.setInterval(() => {
      // If pausing between reps, don't increment counters
      if (isPausingBetweenReps) {
        return;
      }

      // Play end tone when counter shows "1" (last count of rep)
      if (repElapsedSeconds === repDuration - 1 && shouldPlayAudio()) {
        // Check if this is the very last rep of the first side in a unilateral exercise
        const isLastRepOfFirstSide =
          sideMode === 'unilateral' &&
          sidePhase === 'first' &&
          currentRep === reps;

        if (isLastRepOfFirstSide) {
          // Play distinctive Gong INSTEAD of standard rep beep
          audioService.onSwitchSides();
        } else {
          // Play standard high beep
          audioService.onRepEnd();
        }
      }

      exerciseElapsedSeconds++;
      repElapsedSeconds++;

      // Calculate current rep display based on mode
      if (sideMode === 'alternating') {
        // For alternating: each rep number appears twice (L then R)
        const timeInSet = exerciseElapsedSeconds % (reps * 2 * repDuration);
        const internalRepIndex = Math.floor(timeInSet / repDuration);
        currentRep = Math.floor(internalRepIndex / 2) + 1;
        if (currentRep > reps) currentRep = reps;
      } else {
        // For bilateral and unilateral: normal rep counting
        const timeInSet = exerciseElapsedSeconds % (reps * repDuration);
        const repIndex = Math.floor(timeInSet / repDuration);
        currentRep = (timeInSet === 0 && exerciseElapsedSeconds > 0) ? reps : Math.min(reps, repIndex + 1);
      }

      // Check if rep is complete
      if (repElapsedSeconds >= repDuration) {
        // Determine if we've completed a "phase" based on mode
        let isEndOfPhase = false;

        if (sideMode === 'unilateral') {
          // For unilateral: end of phase is after one side completes
          isEndOfPhase = (exerciseElapsedSeconds % (reps * repDuration) === 0);
        } else {
          // For bilateral: end of phase is end of set
          isEndOfPhase = (exerciseElapsedSeconds % (reps * repDuration) === 0);
        }

        if (isEndOfPhase) {
          // Phase is complete
          clearInterval(exerciseTimerInterval);

          // For unilateral mode, check if we need to do the second side
          if (sideMode === 'unilateral' && sidePhase === 'first') {
            // Switch to second side, keep same set number
            sidePhase = 'second';
            if (currentSide) {
              currentSide = getOppositeSide(currentSide);
            }
            exerciseElapsedSeconds = 0;
            repElapsedSeconds = 0;
            isPausingBetweenReps = false;
            currentRep = 1;

            // Get rest duration
            const restDuration = currentExercise.restBetweenSets ?? restBetweenSets;

            // Automatically start rest timer if there's a non-zero rest time
            if (restDuration > 0) {
              setTimeout(() => {
                // Pass FALSE to skip the standard "Rest Start" beep
                // because the Gong just played
                startRestTimer(false);
              }, 300);
            } else {
              // No rest configured, either auto-advance to second side or pause
              if (autoAdvanceActive || autoAdvanceSets) {
                startRepsExercise();
              } else {
                isAwaitingSetContinuation = true;
                timerState = 'paused';
              }
            }
          } else {
            // Either bilateral/alternating completed, or unilateral second side completed
            if (currentSet >= sets) {
              // Exercise complete - all sets done
              completeCurrentExercise();
            } else {
              // Set complete, more sets to go
              currentSet++;
              sidePhase = 'first'; // Reset to first side for next set
              if (sideMode === 'unilateral' && currentSide) {
                // Reset to starting side for next set
                currentSide = startingSide;
              } else if (sideMode === 'alternating' && currentSide && setStartingSide) {
                // Alternate the starting side for next set
                currentSide = getOppositeSide(setStartingSide);
                setStartingSide = currentSide; // Remember this set's starting side
              }
              exerciseElapsedSeconds = 0;
              repElapsedSeconds = 0;
              isPausingBetweenReps = false;
              currentRep = 1;

              // Get rest duration
              const restDuration = currentExercise.restBetweenSets ?? restBetweenSets;

              // Automatically start rest timer if there's a non-zero rest time
              if (restDuration > 0) {
                setTimeout(() => {
                  // Pass TRUE (default) to play standard rest beep
                  startRestTimer(true);
                }, 300);
              } else {
                // No rest configured, either auto-advance to next set or pause
                if (autoAdvanceActive || autoAdvanceSets) {
                  startRepsExercise();
                } else {
                  isAwaitingSetContinuation = true;
                  timerState = 'paused';
                }
              }
            }
          }
        } else {
          // Rep complete, but more reps in this phase - pause between reps
          isPausingBetweenReps = true;
          const pauseDuration = currentExercise.pauseBetweenReps ?? 5;
          pauseRemainingSeconds = pauseDuration;

          // Switch side for alternating mode
          if (sideMode === 'alternating' && currentSide) {
            currentSide = getOppositeSide(currentSide);
          }

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

  function startRestTimer(playStartCue: boolean = true) {
    if (!currentExercise) return;

    // Get rest duration - use exercise override if available, otherwise global setting
    const restDuration = currentExercise.restBetweenSets ?? restBetweenSets;

    restElapsedSeconds = 0;
    timerState = 'resting';

    // Play rest start tone only if:
    // 1. Audio enabled
    // 2. Setting enabled
    // 3. We weren't told to skip it (by the Switch Sides logic)
    if (shouldPlayAudio() && $ptState.settings?.audioRestCuesEnabled && playStartCue) {
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
        if (autoAdvanceActive || autoAdvanceSets) {
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
          isAwaitingSetContinuation = true;
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
      sidePhase = 'first';

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

    // Play rest start tone only if rest cues are enabled (rest between exercises)
    if (shouldPlayAudio() && $ptState.settings?.audioRestCuesEnabled) {
      audioService.onRestStart();
    }

    preparingInterval = window.setInterval(() => {
      preparingSeconds--;

      if (preparingSeconds <= 0) {
        clearInterval(preparingInterval);
        preparingInterval = undefined;

        // Play rest end tone only if rest cues are enabled
        if (shouldPlayAudio() && $ptState.settings?.audioRestCuesEnabled) {
          audioService.onRestEnd();
        }

        // Automatically start the next exercise countdown
        // Add delay to prevent overlapping tones
        setTimeout(() => {
          startExerciseCountdown();
        }, 300);
      }
    }, 1000);
  }

  async function completeSession() {
    if (!sessionInstance) return;

    // Save cumulative elapsed time before marking complete
    sessionInstance.cumulativeElapsedSeconds = totalElapsedSeconds;

    // Change state to completed immediately to show completion screen
    timerState = 'completed';
    sessionInstance.status = 'completed';
    sessionInstance.endTime = new Date().toISOString();

    // Wait 2 seconds to create clear delineation between final exercise tone and session completion
    await new Promise(resolve => setTimeout(resolve, 2000));

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

  async function toggleAutoAdvance() {
    autoAdvanceActive = !autoAdvanceActive;

    // Persist the change to the session definition
    if (sessionDefinition) {
      try {
        const updated: SessionDefinition = {
          ...sessionDefinition,
          autoAdvance: autoAdvanceActive
        };
        await ptService.updateSessionDefinition(updated);
        sessionDefinition = updated;

        // Update the state store to reflect the change
        const sessionDefinitions = await ptService.getSessionDefinitions();
        ptState.update((state) => ({ ...state, sessionDefinitions }));
      } catch (error) {
        console.error('Failed to update session definition:', error);
        // Continue even if save fails - user can still toggle during current session
      }
    }
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
      } else if (isAwaitingSetContinuation) {
        // Resume the next set/side without resetting state
        isAwaitingSetContinuation = false;
        timerState = 'active';

        if (currentExercise?.type === 'reps') {
          startRepsExercise(); // Continues with current currentSet/sidePhase
        } else {
          startDurationExercise();
        }
      } else {
        // Check if we're mid-exercise (paused during active exercise)
        const isMidExercise = exerciseElapsedSeconds > 0;

        if (isMidExercise && resumeFromPausePoint) {
          // Resume from pause point - continue where we left off
          timerState = 'active';
          if (currentExercise?.type === 'reps') {
            // Resume reps exercise from current rep
            resumeRepsExercise();
          } else {
            // Resume duration exercise from current elapsed time
            resumeDurationExercise();
          }
        } else if (isMidExercise && !resumeFromPausePoint) {
          // Restart exercise from beginning
          exerciseElapsedSeconds = 0;
          repElapsedSeconds = 0;
          currentSet = 1;
          currentRep = 1;
          startExerciseCountdown();
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
    sidePhase = 'first';
    isAwaitingSetContinuation = false;

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
      sidePhase = 'first';
      restElapsedSeconds = 0;
      isAwaitingSetContinuation = false;
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

    // Clear timers before database operation
    clearTimers();

    try {
      // Wait for database write to complete
      await ptService.updateSessionInstance(sessionInstance);

      // Only show success toast after DB confirms
      toastStore.show('Session finished', 'success');

      // Then navigate
      goto('/');
    } catch (error) {
      console.error('Failed to finish session:', error);
      toastStore.show('Failed to finish session', 'error');

      // Still navigate on error, but user knows it failed
      goto('/');
    }
  }

  async function jumpToExercise(index: number) {
    // Only allow jumping when paused
    if (timerState !== 'paused') return;

    // Don't jump to the same exercise
    if (index === currentExerciseIndex) return;

    // Mark any exercises between current and target as skipped if jumping forward
    if (index > currentExerciseIndex && sessionInstance) {
      for (let i = currentExerciseIndex; i < index; i++) {
        const completed = sessionInstance.completedExercises.find(
          ce => ce.exerciseId === exercises[i].id
        );
        if (completed && !completed.completed) {
          completed.skipped = true;
          completed.completedAt = new Date().toISOString();
        }
      }
      await ptService.updateSessionInstance(sessionInstance);
    }

    // Jump to the selected exercise
    currentExerciseIndex = index;
    currentExercise = exercises[currentExerciseIndex];
    exerciseElapsedSeconds = 0;
    repElapsedSeconds = 0;
    isPausingBetweenReps = false;
    currentSet = 1;
    currentRep = 1;
    sidePhase = 'first';
    restElapsedSeconds = 0;
    isAwaitingSetContinuation = false;

    // Clear any incomplete markers if jumping backward
    if (index < exercises.length && sessionInstance) {
      const completed = sessionInstance.completedExercises.find(
        ce => ce.exerciseId === currentExercise?.id
      );
      if (completed) {
        completed.completed = false;
        completed.skipped = false;
      }
      await ptService.updateSessionInstance(sessionInstance);
    }
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
      const repDuration = currentExercise.defaultRepDuration || $ptState.settings?.defaultRepDuration || 30;
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

  // Side label for display
  $: sideLabel = currentSide ? (currentSide === 'left' ? 'Left' : 'Right') : '';

  function getExerciseProgress(exerciseIndex: number): number {
    if (exerciseIndex < currentExerciseIndex) return 100;
    if (exerciseIndex > currentExerciseIndex) return 0;

    const exercise = exercises[exerciseIndex];
    let progress = 0;
    if (exercise.type === 'duration') {
      const total = exercise.defaultDuration || 60;
      progress = Math.min(100, (exerciseElapsedSeconds / total) * 100);
    } else {
      const reps = exercise.defaultReps || 10;
      const sets = exercise.defaultSets || 3;
      const repDuration = exercise.defaultRepDuration || $ptState.settings?.defaultRepDuration || 30;
      const total = reps * sets * repDuration;
      progress = Math.min(100, (exerciseElapsedSeconds / total) * 100);
    }
    console.log(`Progress for exercise ${exerciseIndex}: ${progress}% (elapsed: ${exerciseElapsedSeconds}s)`);
    return progress;
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
        <span class="material-icons">{autoAdvanceActive ? 'autorenew' : 'stop_circle'}</span>
      </button>

      <div class="session-center">
        <div class="session-name">{sessionDefinition?.name || 'Session'}</div>
        <div class="session-timer">{formatTime(totalElapsedSeconds)}</div>
      </div>

      <!-- Audio Mute Toggle -->
      <button
        class="audio-mute-toggle"
        class:muted={!$ptState.settings?.soundEnabled}
        on:click={() => {
          if ($ptState.settings) {
            $ptState.settings.soundEnabled = !$ptState.settings.soundEnabled;
            ptService.saveSettings($ptState.settings);
          }
        }}
        title={$ptState.settings?.soundEnabled ? 'Mute audio cues' : 'Unmute audio cues'}
      >
        <span class="material-icons">{$ptState.settings?.soundEnabled ? 'volume_up' : 'volume_off'}</span>
      </button>
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
    {#key `${timerState}-${currentExerciseIndex}-${currentSet}-${currentRep}-${isPausingBetweenReps}`}
    {#if timerState === 'preparing'}
      <!-- Preparing: Show countdown and resting label -->
      <div class="display-row-with-indicators">
        {#if currentSide}
          <div class="side-indicator-left">
            <SideIndicator side="left" active={currentSide === 'left' && timerState === 'active' && !isPausingBetweenReps} />
          </div>
        {/if}
        <DisplayRow size="big">
          {preparingSeconds}
        </DisplayRow>
        {#if currentSide}
          <div class="side-indicator-right">
            <SideIndicator side="right" active={currentSide === 'right' && timerState === 'active' && !isPausingBetweenReps} />
          </div>
        {/if}
      </div>
      <DisplayRow size="small">
        Resting
      </DisplayRow>
    {:else if timerState === 'countdown'}
      <!-- Countdown: Big number on top for visual attention -->
      <div class="display-row-with-indicators">
        {#if currentSide}
          <div class="side-indicator-left">
            <SideIndicator side="left" active={currentSide === 'left' && timerState === 'active' && !isPausingBetweenReps} />
          </div>
        {/if}
        <DisplayRow size="big">
          {countdownSeconds}
        </DisplayRow>
        {#if currentSide}
          <div class="side-indicator-right">
            <SideIndicator side="right" active={currentSide === 'right' && timerState === 'active' && !isPausingBetweenReps} />
          </div>
        {/if}
      </div>
      <DisplayRow size="small">
        Get Ready
      </DisplayRow>
    {:else if timerState === 'completed'}
      <!-- Completed: Big checkmark emphasis -->
      <DisplayRow size="big">
        ✓ Done!
      </DisplayRow>
      <DisplayRow size="small">
        Session Complete
      </DisplayRow>
    {:else if timerState === 'paused' && currentExercise}
      <!-- Paused: Show context and exercise details -->
      <DisplayRow size="small">
        Next activity
      </DisplayRow>
      <DisplayRow size="small" wrap={true}>
        {#if currentExercise.type === 'duration'}
          Duration: {formatDuration(currentExercise.defaultDuration || 0)}
        {:else}
          Set {currentSet} of {currentExercise.defaultSets || 3} · {currentExercise.defaultReps || 10} reps
        {/if}
      </DisplayRow>
    {:else if timerState === 'resting' && currentExercise}
      <!-- Rest: Big timer on top -->
      <div class="display-row-with-indicators">
        {#if currentSide}
          <div class="side-indicator-left">
            <SideIndicator side="left" active={currentSide === 'left' && timerState === 'active' && !isPausingBetweenReps} />
          </div>
        {/if}
        <DisplayRow size="big">
          {restTimeDisplay}
        </DisplayRow>
        {#if currentSide}
          <div class="side-indicator-right">
            <SideIndicator side="right" active={currentSide === 'right' && timerState === 'active' && !isPausingBetweenReps} />
          </div>
        {/if}
      </div>
      <DisplayRow size="small">
        Resting
      </DisplayRow>
    {:else if currentExercise && timerState === 'active'}
      {#if currentExercise.type === 'duration'}
        <!-- Active Duration: Big timer on top -->
        <div class="display-row-with-indicators">
          {#if currentSide}
            <div class="side-indicator-left">
              <SideIndicator side="left" active={currentSide === 'left' && timerState === 'active' && !isPausingBetweenReps} />
            </div>
          {/if}
          <DisplayRow size="big">
            {currentExerciseTimeDisplay}
          </DisplayRow>
          {#if currentSide}
            <div class="side-indicator-right">
              <SideIndicator side="right" active={currentSide === 'right' && timerState === 'active' && !isPausingBetweenReps} />
            </div>
          {/if}
        </div>
        <DisplayRow size="small">
          Remaining
        </DisplayRow>
      {:else}
        <!-- Active Reps Exercise -->
        {#if isPausingBetweenReps}
          <!-- Pause between reps: Big countdown on top -->
          <div class="display-row-with-indicators">
            {#if currentSide}
              <div class="side-indicator-left">
                <SideIndicator side="left" active={currentSide === 'left' && timerState === 'active' && !isPausingBetweenReps} />
              </div>
            {/if}
            <DisplayRow size="big">
              {pauseRemainingSeconds}
            </DisplayRow>
            {#if currentSide}
              <div class="side-indicator-right">
                <SideIndicator side="right" active={currentSide === 'right' && timerState === 'active' && !isPausingBetweenReps} />
              </div>
            {/if}
          </div>
          <DisplayRow size="small">
            Transition
          </DisplayRow>
        {:else}
          <!-- Active rep: Big timer on top, compact set/rep info below -->
          {#if (currentExercise.defaultRepDuration || $ptState.settings?.defaultRepDuration || 30) > 2}
            <div class="display-row-with-indicators">
              {#if currentSide}
                <div class="side-indicator-left">
                  <SideIndicator side="left" active={currentSide === 'left' && timerState === 'active' && !isPausingBetweenReps} />
                </div>
              {/if}
              <DisplayRow size="big">
                {currentExerciseTimeDisplay}
              </DisplayRow>
              {#if currentSide}
                <div class="side-indicator-right">
                  <SideIndicator side="right" active={currentSide === 'right' && timerState === 'active' && !isPausingBetweenReps} />
                </div>
              {/if}
            </div>
            <DisplayRow size="small">
              Set {currentSet} · Rep {currentRep} of {currentExercise.defaultReps || 10}
            </DisplayRow>
          {:else}
            <!-- Quick reps without timer: Show rep counter prominently -->
            <div class="display-row-with-indicators">
              {#if currentSide}
                <div class="side-indicator-left">
                  <SideIndicator side="left" active={currentSide === 'left' && timerState === 'active' && !isPausingBetweenReps} />
                </div>
              {/if}
              <DisplayRow size="big">
                {currentRep}
              </DisplayRow>
              {#if currentSide}
                <div class="side-indicator-right">
                  <SideIndicator side="right" active={currentSide === 'right' && timerState === 'active' && !isPausingBetweenReps} />
                </div>
              {/if}
            </div>
            <DisplayRow size="small">
              Set {currentSet} of {currentExercise.defaultSets || 3} · Rep {currentRep} of {currentExercise.defaultReps || 10}
            </DisplayRow>
          {/if}
        {/if}
      {/if}
    {/if}
    {/key}
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
          style={index === currentExerciseIndex ? `--progress-percent: ${getExerciseProgress(index)}%` : ''}
        >
          <!-- Info icon (left side) - always show, greyed out if no instructions -->
          <button
            class="icon-button info-icon"
            class:disabled={!exercise.instructions}
            on:click|stopPropagation={() => exercise.instructions && toggleInstructions(exercise.id)}
            aria-label={exercise.instructions ? "Toggle instructions" : "No instructions"}
            title={exercise.instructions ? "Toggle instructions" : "No instructions defined"}
            disabled={!exercise.instructions}
          >
            <span class="material-icons">info</span>
          </button>

          <div class="exercise-item-content">
            <div class="exercise-item-header">
              <span class="exercise-item-name">{exercise.name}</span>
              {#if isExerciseCompleted(index)}
                <span class="material-icons check-icon">check_circle</span>
              {/if}
            </div>

            <div class="exercise-item-details">
              {#if exercise.type === 'duration'}
                <span class="material-icons detail-icon">timer</span>
                <span>{formatDuration(exercise.defaultDuration || 0)}</span>
              {:else}
                <span class="material-icons detail-icon">repeat</span>
                <span>{exercise.defaultSets} {exercise.defaultSets === 1 ? 'set' : 'sets'} × {exercise.defaultReps} reps</span>
                {#if exercise.sideMode && exercise.sideMode !== 'bilateral'}
                  <span class="mode-badge">{exercise.sideMode === 'unilateral' ? 'Unilateral' : 'Alternating'}</span>
                {/if}
              {/if}
            </div>

            <div class="progress-bar">
              <div
                class="progress-fill"
                style="width: {getExerciseProgress(index)}%"
              ></div>
            </div>

            <!-- Expandable instructions panel -->
            {#if expandedExerciseId === exercise.id && exercise.instructions}
              <div class="instructions-panel">
                {@html parseMarkdown(exercise.instructions)}
              </div>
            {/if}
          </div>

          <!-- Make active icon (right side) -->
          {#if index !== currentExerciseIndex && timerState === 'paused'}
            <button
              class="icon-button make-active-icon"
              on:click|stopPropagation={() => jumpToExercise(index)}
              aria-label="Jump to this exercise"
              title="Jump to this exercise"
            >
              <span class="material-icons">play_circle</span>
            </button>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<!-- Repeat Session Confirmation Dialog -->
{#if showRepeatSessionConfirm}
  <ConfirmDialog
    title="Session Previously Completed Today"
    message="You've already completed this session today. Would you like to do it again?"
    confirmText="Confirm"
    cancelText="Cancel"
    confirmVariant="primary"
    on:confirm={confirmRepeatSession}
    on:cancel={cancelRepeatSession}
  />
{/if}

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
    padding: var(--spacing-sm) var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    position: relative;
  }

  .main-display-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 150px;
    height: 200px;
    overflow: hidden;
  }

  /* Session Info Bar */
  .session-info-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--spacing-xs);
    margin-bottom: var(--spacing-xs);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    min-height: 2rem;
    gap: var(--spacing-sm);
  }

  .session-center {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .session-name {
    font-size: var(--font-size-lg);
    font-weight: 600;
    opacity: 0.95;
    text-align: center;
  }

  .session-timer {
    font-size: var(--font-size-xl);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .auto-advance-toggle,
  .audio-mute-toggle {
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

  .auto-advance-toggle.active,
  .audio-mute-toggle:not(.muted) {
    opacity: 1;
  }

  .auto-advance-toggle:hover,
  .audio-mute-toggle:hover {
    opacity: 1;
    transform: scale(1.1);
  }

  .auto-advance-toggle .material-icons,
  .audio-mute-toggle .material-icons {
    font-size: 2rem;
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

  .exercise-header {
    min-height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0.25rem 0;
  }

  .exercise-header.invisible {
    visibility: hidden;
  }

  .exercise-name {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
    line-height: 1.2;
  }

  .display-row-with-indicators {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .side-indicator-left {
    position: absolute;
    left: 12.5%;
  }

  .side-indicator-right {
    position: absolute;
    right: 12.5%;
  }

  /* Bottom Section - 2/3 of screen */
  .player-bottom {
    flex: 0 0 66.666%;
    background-color: var(--surface);
    overflow-y: auto;
    padding: var(--spacing-lg) var(--spacing-lg) 0 var(--spacing-lg);
  }

  .exercise-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    padding-bottom: 150px;
  }

  .exercise-item {
    background-color: #1e3a5f;
    color: white;
    border-radius: var(--border-radius);
    padding: var(--spacing-md);
    transition: all 0.3s ease;
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    position: relative;
    overflow: hidden;
  }

  .exercise-item.active {
    box-shadow: 0 0 0 3px var(--primary-alpha-20);
  }

  /* Progressive fill overlay for active exercise */
  .exercise-item.active::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: var(--progress-percent, 0%);
    background-color: red;  /* Temporary: bright red for debugging */
    opacity: 0.8;  /* Temporary: make it very visible */
    transition: width 0.5s ease;
    z-index: 0;
    border-radius: var(--border-radius);
  }

  .exercise-item.completed {
    background-color: rgba(76, 175, 80, 0.2);
    opacity: 0.7;
  }

  .exercise-item-content {
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
  }

  .icon-button {
    background: none;
    border: none;
    padding: var(--spacing-xs);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: rgba(255, 255, 255, 0.7);
    transition: all 0.2s ease;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  .icon-button:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .icon-button:active:not(:disabled) {
    transform: scale(0.95);
  }

  .icon-button:disabled,
  .icon-button.disabled {
    opacity: 0.3;
    cursor: default;
  }

  .icon-button .material-icons {
    font-size: var(--icon-size-md);
  }

  .info-icon {
    align-self: flex-start;
  }

  .make-active-icon {
    align-self: flex-start;
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
    font-weight: 400;
  }

  .exercise-item.active .exercise-item-name {
    font-weight: 700;
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

  .mode-badge {
    margin-left: var(--spacing-xs);
    padding: 2px var(--spacing-xs);
    border-radius: calc(var(--border-radius) / 2);
    background-color: rgba(156, 39, 176, 0.3);
    color: #e1bee7;
    font-size: var(--font-size-xs);
    font-weight: 500;
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

  .instructions-panel {
    margin-top: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: rgba(0, 0, 0, 0.3);
    border-left: 3px solid white;
    border-radius: calc(var(--border-radius) / 2);
    font-size: var(--font-size-sm);
    line-height: 1.6;
    animation: slideDown 0.2s ease-out;
  }

  /* Markdown formatting styles */
  .instructions-panel :global(strong) {
    font-weight: 600;
    color: white;
  }

  .instructions-panel :global(em) {
    font-style: italic;
  }

  .instructions-panel :global(u) {
    text-decoration: underline;
  }

  .instructions-panel :global(br) {
    line-height: 1.6;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
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
