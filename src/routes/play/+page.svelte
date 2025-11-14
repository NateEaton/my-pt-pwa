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
  import type { Exercise, SessionDefinition, SessionInstance, CompletedExercise } from '$lib/types/pt';

  // Player state
  let sessionDefinition: SessionDefinition | null = null;
  let sessionInstance: SessionInstance | null = null;
  let exercises: Exercise[] = [];
  let currentExerciseIndex = 0;
  let currentExercise: Exercise | null = null;

  // Timer state
  let timerState: 'countdown' | 'active' | 'rest' | 'paused' | 'completed' = 'countdown';
  let isPaused = false;
  let totalElapsedSeconds = 0;
  let exerciseElapsedSeconds = 0;
  let countdownSeconds = 10; // Start countdown
  let restCountdown = 0; // Rest period countdown
  let currentSet = 1;
  let currentRep = 0;

  // Intervals
  let totalTimerInterval: number | undefined;
  let exerciseTimerInterval: number | undefined;

  // Settings
  let startCountdownDuration = 10;
  let endCountdownDuration = 10;
  let restBetweenSets = 30;
  let restBetweenExercises = 30;

  // Load session from localStorage (set by Today screen)
  onMount(async () => {
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

    // Load exercises
    const exerciseIds = sessionDefinition.exercises.map(e => e.exerciseId);
    exercises = $ptState.exercises.filter(e => exerciseIds.includes(e.id));

    if (exercises.length === 0) {
      toastStore.show('Session has no exercises', 'error');
      goto('/');
      return;
    }

    // Load settings
    if ($ptState.settings) {
      startCountdownDuration = $ptState.settings.startCountdownDuration;
      endCountdownDuration = $ptState.settings.endCountdownDuration;
      restBetweenSets = $ptState.settings.restBetweenSets;
      restBetweenExercises = $ptState.settings.restBetweenExercises;
    }

    // Check for existing in-progress session for today
    const existingSession = await ptService.getTodaySessionInstance();
    if (existingSession && existingSession.status === 'in-progress' &&
        existingSession.sessionDefinitionId === sessionId) {
      // Resume existing session
      await resumeSession(existingSession);
    } else {
      // Create new session instance
      await createSessionInstance();

      // Start first exercise
      currentExercise = exercises[0];
      startExerciseCountdown();
    }
  });

  onDestroy(() => {
    clearTimers();
  });

  async function createSessionInstance() {
    if (!sessionDefinition) return;

    const today = new Date().toISOString().split('T')[0];
    const completedExercises: CompletedExercise[] = exercises.map(ex => ({
      exerciseId: ex.id,
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

    // Start total timer
    totalTimerInterval = window.setInterval(() => {
      if (!isPaused && timerState !== 'completed') {
        totalElapsedSeconds++;
      }
    }, 1000);
  }

  async function resumeSession(existing: SessionInstance) {
    sessionInstance = existing;

    // Calculate total elapsed time from start
    if (existing.startTime) {
      const start = new Date(existing.startTime).getTime();
      const now = Date.now();
      totalElapsedSeconds = Math.floor((now - start) / 1000);
    }

    // Find first incomplete exercise
    let resumeIndex = 0;
    for (let i = 0; i < exercises.length; i++) {
      const completed = existing.completedExercises.find(
        ce => ce.exerciseId === exercises[i].id
      );
      if (!completed || (!completed.completed && !completed.skipped)) {
        resumeIndex = i;
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

    // Start total timer
    totalTimerInterval = window.setInterval(() => {
      if (!isPaused && timerState !== 'completed') {
        totalElapsedSeconds++;
      }
    }, 1000);

    // Resume from current exercise
    toastStore.show(`Resuming from exercise #${resumeIndex + 1}`, 'info');
    startExerciseCountdown();
  }

  function clearTimers() {
    if (totalTimerInterval) clearInterval(totalTimerInterval);
    if (exerciseTimerInterval) clearInterval(exerciseTimerInterval);
  }

  function startExerciseCountdown() {
    timerState = 'countdown';
    countdownSeconds = startCountdownDuration;

    exerciseTimerInterval = window.setInterval(() => {
      if (isPaused) return;

      countdownSeconds--;
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
    currentSet = 1;
    currentRep = 0;

    if (currentExercise.type === 'duration') {
      startDurationExercise();
    } else {
      startRepsExercise();
    }
  }

  function startDurationExercise() {
    if (!currentExercise) return;

    const totalDuration = currentExercise.defaultDuration || 60;

    exerciseTimerInterval = window.setInterval(() => {
      if (isPaused) return;

      exerciseElapsedSeconds++;

      if (exerciseElapsedSeconds >= totalDuration) {
        clearInterval(exerciseTimerInterval);
        completeCurrentExercise();
      }
    }, 1000);
  }

  function startRepsExercise() {
    if (!currentExercise) return;

    const reps = currentExercise.defaultReps || 10;
    const sets = currentExercise.defaultSets || 3;
    const repDuration = currentExercise.defaultRepDuration || $ptState.settings?.defaultRepDuration || 2;

    exerciseTimerInterval = window.setInterval(() => {
      if (isPaused) return;

      exerciseElapsedSeconds++;
      currentRep = Math.floor((exerciseElapsedSeconds % (reps * repDuration)) / repDuration) + 1;

      // Check if set is complete
      if (exerciseElapsedSeconds % (reps * repDuration) === 0 && exerciseElapsedSeconds > 0) {
        currentSet++;

        if (currentSet > sets) {
          // Exercise complete
          clearInterval(exerciseTimerInterval);
          completeCurrentExercise();
        } else {
          // Rest between sets
          startRestBetweenSets();
        }
      }
    }, 1000);
  }

  function startRestBetweenSets() {
    clearInterval(exerciseTimerInterval);
    timerState = 'rest';
    restCountdown = restBetweenSets;

    exerciseTimerInterval = window.setInterval(() => {
      if (isPaused) return;

      restCountdown--;
      if (restCountdown <= 0) {
        clearInterval(exerciseTimerInterval);
        timerState = 'active';
        startRepsExercise();
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

      // Rest between exercises
      timerState = 'rest';
      restCountdown = restBetweenExercises;

      exerciseTimerInterval = window.setInterval(() => {
        if (isPaused) return;

        restCountdown--;
        if (restCountdown <= 0) {
          clearInterval(exerciseTimerInterval);
          startExerciseCountdown();
        }
      }, 1000);
    } else {
      // Session complete
      await completeSession();
    }
  }

  async function completeSession() {
    if (!sessionInstance) return;

    timerState = 'completed';
    sessionInstance.status = 'completed';
    sessionInstance.endTime = new Date().toISOString();

    await ptService.updateSessionInstance(sessionInstance);

    toastStore.show('Session completed!', 'success');
    setTimeout(() => {
      goto('/');
    }, 2000);
  }

  function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
      timerState = 'paused';
    } else {
      timerState = 'active';
    }
  }

  function skipCountdown() {
    if (timerState !== 'countdown') return;
    clearInterval(exerciseTimerInterval);
    startExercise();
  }

  async function skipExercise() {
    if (!sessionInstance || !currentExercise) return;

    // Mark as skipped
    const completed = sessionInstance.completedExercises.find(
      ce => ce.exerciseId === currentExercise?.id
    );
    if (completed) {
      completed.skipped = true;
      completed.completedAt = new Date().toISOString();
    }

    clearInterval(exerciseTimerInterval);
    await completeCurrentExercise();
  }

  async function saveAndExit() {
    if (!sessionInstance) {
      goto('/');
      return;
    }

    sessionInstance.status = 'completed';
    sessionInstance.endTime = new Date().toISOString();
    await ptService.updateSessionInstance(sessionInstance);

    toastStore.show('Session saved', 'success');
    goto('/');
  }

  async function saveProgressAndExit() {
    if (!sessionInstance) {
      goto('/');
      return;
    }

    // Keep status as in-progress
    await ptService.updateSessionInstance(sessionInstance);

    toastStore.show('Progress saved', 'success');
    goto('/');
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

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

  function getRemainingTime(): string {
    if (!currentExercise) return '0:00';

    if (currentExercise.type === 'duration') {
      const total = currentExercise.defaultDuration || 60;
      const remaining = Math.max(0, total - exerciseElapsedSeconds);
      return formatTime(remaining);
    } else {
      const reps = currentExercise.defaultReps || 10;
      const sets = currentExercise.defaultSets || 3;
      const repDuration = currentExercise.defaultRepDuration || 2;
      const total = reps * sets * repDuration;
      const remaining = Math.max(0, total - exerciseElapsedSeconds);
      return formatTime(remaining);
    }
  }
</script>

<div class="player-container">
  <!-- Top Section: Current Exercise Display -->
  <div class="player-top">
    <div class="session-timer">
      <span class="timer-label">Session Time</span>
      <span class="timer-value">{formatTime(totalElapsedSeconds)}</span>
    </div>

    <button class="pause-btn" on:click={togglePause}>
      <span class="material-icons">
        {isPaused ? 'play_arrow' : 'pause'}
      </span>
    </button>

    {#if timerState === 'countdown'}
      <div class="countdown-display">
        <div class="countdown-number">{countdownSeconds}</div>
        <div class="countdown-label">Get Ready</div>
        <button class="btn btn-primary skip-countdown-btn" on:click={skipCountdown}>
          <span class="material-icons">play_arrow</span>
          Start Now
        </button>
      </div>
    {:else if timerState === 'completed'}
      <div class="completion-display">
        <span class="material-icons completion-icon">check_circle</span>
        <div class="completion-label">Session Complete!</div>
      </div>
    {:else if currentExercise}
      <div class="current-exercise-card">
        <div class="exercise-header">
          <span class="exercise-number">#{currentExerciseIndex + 1}</span>
          <h2 class="exercise-name">{currentExercise.name}</h2>
        </div>

        {#if currentExercise.type === 'duration'}
          <div class="exercise-timer">
            <div class="timer-display">{getRemainingTime()}</div>
            <div class="timer-label-small">Remaining</div>
          </div>
        {:else}
          <div class="exercise-reps">
            <div class="set-info">Set {currentSet} of {currentExercise.defaultSets || 3}</div>
            <div class="rep-info">Rep {currentRep} of {currentExercise.defaultReps || 10}</div>
          </div>
        {/if}

        {#if timerState === 'rest'}
          <div class="rest-indicator">
            <span class="material-icons">self_improvement</span>
            <div class="rest-content">
              <div class="rest-label">Rest</div>
              <div class="rest-timer">{formatTime(restCountdown)}</div>
            </div>
          </div>
        {/if}
      </div>

      <button class="skip-btn" on:click={skipExercise}>
        <span class="material-icons">skip_next</span>
        Skip
      </button>
    {/if}

    <div class="exit-buttons">
      <button class="btn btn-secondary" on:click={saveProgressAndExit}>
        Save & Exit
      </button>
      <button class="btn btn-primary" on:click={saveAndExit}>
        Complete & Exit
      </button>
    </div>
  </div>

  <!-- Bottom Section: Exercise List -->
  <div class="player-bottom">
    <div class="exercise-list">
      {#each exercises as exercise, index (exercise.id)}
        <div
          class="exercise-item"
          class:active={index === currentExerciseIndex}
          class:completed={isExerciseCompleted(index)}
        >
          <div class="exercise-item-header">
            <span class="exercise-item-number">#{index + 1}</span>
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
    justify-content: space-between;
    position: relative;
  }

  .session-timer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
    padding-right: 4rem; /* Make room for pause button */
  }

  .timer-label {
    font-size: var(--font-size-sm);
    opacity: 0.9;
  }

  .timer-value {
    font-size: var(--font-size-xl);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .pause-btn {
    position: absolute;
    top: var(--spacing-lg);
    right: var(--spacing-lg);
    background-color: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .pause-btn:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }

  .pause-btn .material-icons {
    font-size: 2rem;
  }

  .countdown-display {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .countdown-number {
    font-size: 6rem;
    font-weight: 700;
    line-height: 1;
  }

  .countdown-label {
    font-size: var(--font-size-xl);
    margin-top: var(--spacing-md);
    margin-bottom: var(--spacing-xl);
    opacity: 0.9;
  }

  .skip-countdown-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .completion-display {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .completion-icon {
    font-size: 6rem;
    color: var(--success-color);
  }

  .completion-label {
    font-size: var(--font-size-2xl);
    margin-top: var(--spacing-md);
    font-weight: 600;
  }

  .current-exercise-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .exercise-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
  }

  .exercise-number {
    background-color: rgba(255, 255, 255, 0.2);
    padding: var(--spacing-xs) var(--spacing-md);
    border-radius: calc(var(--border-radius) / 2);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .exercise-name {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: 600;
  }

  .exercise-timer {
    text-align: center;
    margin: var(--spacing-xl) 0;
  }

  .timer-display {
    font-size: 4rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .timer-label-small {
    font-size: var(--font-size-base);
    margin-top: var(--spacing-sm);
    opacity: 0.9;
  }

  .exercise-reps {
    text-align: center;
    margin: var(--spacing-xl) 0;
  }

  .set-info {
    font-size: var(--font-size-2xl);
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
  }

  .rep-info {
    font-size: var(--font-size-xl);
    opacity: 0.9;
  }

  .rest-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: var(--border-radius);
    margin-top: var(--spacing-md);
    margin-bottom: 4rem; /* Make room for skip button */
  }

  .rest-content {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .rest-label {
    font-size: var(--font-size-lg);
    margin-bottom: var(--spacing-xs);
  }

  .rest-timer {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .skip-btn {
    position: absolute;
    bottom: calc(var(--spacing-lg) * 4);
    right: var(--spacing-lg);
    background-color: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: var(--border-radius);
    padding: var(--spacing-sm) var(--spacing-md);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-base);
    transition: background-color 0.2s;
  }

  .skip-btn:hover {
    background-color: rgba(255, 255, 255, 0.3);
  }

  .exit-buttons {
    display: flex;
    gap: var(--spacing-md);
    margin-top: var(--spacing-md);
  }

  .btn {
    flex: 1;
    padding: var(--spacing-md);
    border-radius: var(--border-radius);
    font-size: var(--font-size-base);
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
  }

  .btn-primary {
    background-color: white;
    color: var(--primary-color);
  }

  .btn-primary:hover {
    background-color: rgba(255, 255, 255, 0.9);
  }

  .btn-secondary {
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .btn-secondary:hover {
    background-color: rgba(255, 255, 255, 0.3);
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

  .exercise-item-number {
    background-color: rgba(255, 255, 255, 0.2);
    padding: 2px var(--spacing-xs);
    border-radius: calc(var(--border-radius) / 2);
    font-size: var(--font-size-xs);
    font-weight: 600;
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

    .exercise-name {
      font-size: var(--font-size-xl);
    }

    .timer-display {
      font-size: 3rem;
    }

    .countdown-number {
      font-size: 4rem;
    }
  }
</style>
