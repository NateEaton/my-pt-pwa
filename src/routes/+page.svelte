<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * Today Screen - Main landing page showing daily session with session selection
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { ptState, ptService } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';
  import BottomTabs from '$lib/components/BottomTabs.svelte';
  import ExerciseCard from '$lib/components/ExerciseCard.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import type { Exercise, SessionDefinition, CompletedExercise } from '$lib/types/pt';

  // Format today's date
  const today = new Date();
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedDate = dateFormatter.format(today);

  // Modal states
  let showExerciseListModal = false;
  let showSessionSelectModal = false;
  let showManualLogConfirm = false;

  // Selected session for today (defaults to default session)
  let selectedSession: SessionDefinition | null = null;
  let sessionExercises: Exercise[] = [];
  let initialized = false;

  // Load persisted session selection from localStorage
  const STORAGE_KEY = 'pt-today-session-id';

  function loadPersistedSessionId(): number | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  }

  function persistSessionId(id: number | null) {
    if (typeof window === 'undefined') return;
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, id.toString());
    }
  }

  // Load the selected session (previously selected or first available)
  function loadSelectedSession() {
    if (!$ptState.initialized || $ptState.sessionDefinitions.length === 0) {
      selectedSession = null;
      return;
    }

    // Try to restore previously selected session
    const persistedId = loadPersistedSessionId();
    if (persistedId !== null) {
      const persisted = $ptState.sessionDefinitions.find(s => s.id === persistedId);
      if (persisted) {
        selectedSession = persisted;
        return;
      }
    }

    // Fall back to first available session
    if ($ptState.sessionDefinitions.length > 0) {
      selectedSession = $ptState.sessionDefinitions[0];
    }
  }

  // Load exercises for the selected session
  function loadSessionExercises() {
    if (!selectedSession) {
      sessionExercises = [];
      return;
    }

    // Map through session exercises in order to preserve session-defined order
    sessionExercises = selectedSession.exercises
      .map(se => $ptState.exercises.find(e => e.id === se.exerciseId))
      .filter((e): e is Exercise => e !== undefined);
  }

  // Reactive: Load session when store is initialized or session definitions change
  $: if ($ptState.initialized && !initialized) {
    loadSelectedSession();
    initialized = true;
  }

  // Reactive: Update session if it was modified in settings
  $: if ($ptState.sessionDefinitions.length > 0 && selectedSession) {
    const updated = $ptState.sessionDefinitions.find(s => s.id === selectedSession?.id);
    if (updated && JSON.stringify(updated) !== JSON.stringify(selectedSession)) {
      selectedSession = updated;
    }
  }

  // Reactive: Reload exercises when selected session changes
  $: if (selectedSession) {
    loadSessionExercises();
  }

  function calculateTotalDurationSeconds(): number {
    let totalSeconds = 0;

    sessionExercises.forEach((exercise) => {
      if (exercise.type === 'duration') {
        totalSeconds += exercise.defaultDuration || 0;
      } else {
        const reps = exercise.defaultReps || 0;
        const sets = exercise.defaultSets || 0;
        const repDuration = exercise.defaultRepDuration || 2;
        totalSeconds += reps * sets * repDuration;
      }
    });

    return totalSeconds;
  }

  function calculateTotalDuration(): string {
    const totalSeconds = calculateTotalDurationSeconds();

    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  function handlePlaySession() {
    if (!selectedSession) {
      toastStore.show('No session selected', 'error');
      return;
    }

    // Store session ID in localStorage for player to read
    localStorage.setItem('pt-active-session-id', selectedSession.id.toString());

    // Navigate to player
    goto('/play');
  }

  function handleLogSession() {
    if (!selectedSession) {
      toastStore.show('No session selected', 'error');
      return;
    }
    showManualLogConfirm = true;
  }

  async function confirmManualLog() {
    showManualLogConfirm = false;

    if (!selectedSession) return;

    try {
      const now = new Date();
      const totalDurationSeconds = calculateTotalDurationSeconds();

      // Calculate start time by subtracting the total duration from now
      const startTime = new Date(now.getTime() - totalDurationSeconds * 1000);
      const endTime = now;

      // Create completed exercises array with all exercises marked as completed
      const completedExercises: CompletedExercise[] = sessionExercises.map((exercise) => ({
        exerciseId: exercise.id,
        completed: true,
        actualDuration: exercise.type === 'duration'
          ? exercise.defaultDuration
          : (exercise.defaultReps || 0) * (exercise.defaultSets || 0) * (exercise.defaultRepDuration || 2),
        skipped: false,
        completedAt: now.toISOString()
      }));

      // Create the session instance
      const sessionInstance = {
        date: ptService.formatDate(now),
        sessionDefinitionId: selectedSession.id,
        sessionName: selectedSession.name,
        status: 'completed' as const,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        completedExercises,
        customized: false,
        manuallyLogged: true
      };

      // Save to database
      await ptService.addSessionInstance(sessionInstance);

      toastStore.show('Workout logged successfully!', 'success');
    } catch (error) {
      console.error('Error logging workout:', error);
      toastStore.show('Failed to log workout', 'error');
    }
  }

  function cancelManualLog() {
    showManualLogConfirm = false;
  }

  function viewExercises() {
    showExerciseListModal = true;
  }

  function openSessionSelect() {
    showSessionSelectModal = true;
  }

  function selectSession(session: SessionDefinition) {
    selectedSession = session;
    persistSessionId(session.id);
    loadSessionExercises();
    showSessionSelectModal = false;
    toastStore.show(`Switched to "${session.name}"`, 'success');
  }
</script>

<div class="page-container">
  <main class="content">
    <!-- Header with current date -->
    <header class="page-header">
      <h1 class="date-display">{formattedDate}</h1>
    </header>

    <!-- Session overview section -->
    <section class="session-section">
      {#if $ptState.initialized}
        {#if sessionExercises.length === 0}
          <!-- Empty state -->
          <div class="empty-state">
            <div class="empty-icon">
              <span class="material-icons">self_improvement</span>
            </div>
            <h2>No Session Available</h2>
            {#if $ptState.sessionDefinitions.length === 0}
              <p class="empty-text">
                Create a session definition in Settings to get started.
              </p>
              <p class="empty-hint">
                Sessions let you organize which exercises to do each day.
              </p>
            {:else}
              <p class="empty-text">
                The selected session has no exercises.
              </p>
              <button class="btn btn-primary" on:click={openSessionSelect}>
                <span class="material-icons">playlist_play</span>
                Choose Different Session
              </button>
            {/if}
          </div>
        {:else}
          <!-- Session overview card -->
          <div class="session-card">
            <div class="session-header">
              <div class="session-title">
                <h2>{selectedSession?.name || 'Session'}</h2>
              </div>
              <div class="session-header-actions">
                <button
                  class="icon-button"
                  on:click={openSessionSelect}
                  aria-label="Change session"
                  title="Change session"
                >
                  <span class="material-icons">swap_horiz</span>
                </button>
                <button
                  class="icon-button"
                  on:click={viewExercises}
                  aria-label="View exercises"
                  title="View all exercises"
                >
                  <span class="material-icons">visibility</span>
                </button>
              </div>
            </div>

            <div class="session-stats">
              <div class="stat-item">
                <span class="material-icons stat-icon">fitness_center</span>
                <div class="stat-content">
                  <span class="stat-value">{sessionExercises.length}</span>
                  <span class="stat-label">
                    {sessionExercises.length === 1 ? 'Exercise' : 'Exercises'}
                  </span>
                </div>
              </div>

              <div class="stat-item">
                <span class="material-icons stat-icon">schedule</span>
                <div class="stat-content">
                  <span class="stat-value">{calculateTotalDuration()}</span>
                  <span class="stat-label">Estimated</span>
                </div>
              </div>
            </div>

            <div class="session-actions">
              <button class="btn btn-primary btn-large" on:click={handlePlaySession}>
                <span class="material-icons">play_arrow</span>
                Play Session
              </button>
              <button class="btn btn-secondary btn-large" on:click={handleLogSession}>
                <span class="material-icons">check</span>
                Log as Done
              </button>
            </div>
          </div>

          <!-- Quick preview of exercises -->
          <div class="exercise-preview">
            <h3 class="preview-title">Exercises ({sessionExercises.length})</h3>
            <div class="exercise-list-preview">
              {#each sessionExercises.slice(0, 3) as exercise (exercise.id)}
                <ExerciseCard {exercise} compact={true} />
              {/each}
              {#if sessionExercises.length > 3}
                <button class="show-more-btn" on:click={viewExercises}>
                  <span class="material-icons">expand_more</span>
                  Show {sessionExercises.length - 3} more exercises
                </button>
              {/if}
            </div>
          </div>
        {/if}
      {:else}
        <div class="loading-indicator">
          <span class="material-icons spinning">refresh</span>
          <p>Loading...</p>
        </div>
      {/if}
    </section>
  </main>

  <BottomTabs currentTab="today" />
</div>

<!-- Manual Log Confirmation Dialog -->
{#if showManualLogConfirm}
  <ConfirmDialog
    title="Log Workout"
    message="This will log your workout as completed for today. Are you sure you want to continue?"
    confirmText="Log Workout"
    cancelText="Cancel"
    confirmVariant="primary"
    on:confirm={confirmManualLog}
    on:cancel={cancelManualLog}
  />
{/if}

<!-- Session Selection Modal -->
{#if showSessionSelectModal}
  <Modal
    title="Select Session"
    on:close={() => (showSessionSelectModal = false)}
  >
    {#if $ptState.sessionDefinitions.length === 0}
      <div class="modal-empty-state">
        <p>No session definitions available.</p>
        <p class="empty-hint">Create a session in Settings first.</p>
      </div>
    {:else}
      <div class="session-select-list">
        {#each $ptState.sessionDefinitions as session (session.id)}
          <button
            class="session-select-item"
            class:selected={selectedSession?.id === session.id}
            on:click={() => selectSession(session)}
          >
            <div class="session-select-info">
              <div class="session-select-header">
                <span class="session-select-name">{session.name}</span>
              </div>
              <div class="session-select-meta">
                <span class="material-icons meta-icon">fitness_center</span>
                {session.exercises.length} {session.exercises.length === 1 ? 'exercise' : 'exercises'}
              </div>
            </div>
            {#if selectedSession?.id === session.id}
              <span class="material-icons selected-icon">check</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}

    <div slot="footer" class="modal-actions">
      <button
        class="btn btn-secondary"
        on:click={() => (showSessionSelectModal = false)}
      >
        Cancel
      </button>
    </div>
  </Modal>
{/if}

<!-- Exercise List Modal -->
{#if showExerciseListModal}
  <Modal
    title="{selectedSession?.name || 'Session'} Exercises"
    on:close={() => (showExerciseListModal = false)}
  >
    <div class="exercise-list-full">
      {#each sessionExercises as exercise, index (exercise.id)}
        <div class="exercise-number-wrapper">
          <span class="exercise-number">{index + 1}</span>
          <ExerciseCard {exercise} />
        </div>
      {/each}
    </div>

    <div slot="footer" class="modal-actions">
      <button
        class="btn btn-secondary"
        on:click={() => (showExerciseListModal = false)}
      >
        Close
      </button>
      <button class="btn btn-primary" on:click={handlePlaySession}>
        <span class="material-icons">play_arrow</span>
        Play Session
      </button>
    </div>
  </Modal>
{/if}

<style>
  .page-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: var(--surface);
  }

  .content {
    flex: 1;
    padding-bottom: calc(var(--bottom-tabs-height) + var(--spacing-lg));
    overflow-y: auto;
  }

  .page-header {
    padding: var(--spacing-xl) var(--spacing-lg) var(--spacing-lg);
    background-color: var(--surface);
    border-bottom: 1px solid var(--divider);
  }

  .date-display {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
  }

  .session-section {
    padding: var(--spacing-xl) var(--spacing-lg);
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: var(--spacing-2xl);
  }

  .empty-icon {
    margin-bottom: var(--spacing-lg);
  }

  .empty-icon .material-icons {
    font-size: 5rem;
    color: var(--text-secondary);
    opacity: 0.5;
  }

  .empty-state h2 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-2xl);
    color: var(--text-primary);
  }

  .empty-text {
    margin: 0 0 var(--spacing-lg) 0;
    font-size: var(--font-size-base);
    color: var(--text-primary);
    line-height: 1.6;
  }

  .empty-hint {
    margin: 0 0 var(--spacing-lg) 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    line-height: 1.5;
  }

  /* Session Card */
  .session-card {
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
    padding: var(--spacing-xl);
    box-shadow: var(--shadow-lg);
    margin-bottom: var(--spacing-xl);
  }

  .session-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: var(--spacing-lg);
  }

  .session-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
  }

  .session-title h2 {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
  }

  .session-badge {
    font-size: var(--font-size-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: calc(var(--border-radius) / 2);
    background-color: var(--primary-alpha-10);
    color: var(--primary-color);
    font-weight: 500;
  }

  .session-header-actions {
    display: flex;
    gap: var(--spacing-xs);
  }

  .icon-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-xs);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    width: 2.5rem;
    height: 2.5rem;
    transition: all 0.2s ease;
  }

  .icon-button:hover {
    background-color: var(--hover-overlay);
    color: var(--text-primary);
  }

  .session-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--surface);
    border-radius: var(--border-radius);
  }

  .stat-icon {
    font-size: 2rem;
    color: var(--primary-color);
  }

  .stat-content {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1;
  }

  .stat-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-top: var(--spacing-xs);
  }

  .session-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }

  .btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--border-radius);
    font-size: var(--font-size-base);
    font-weight: 500;
    cursor: pointer;
    border: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    transition: all 0.2s ease;
    min-height: var(--touch-target-min);
  }

  .btn-large {
    padding: var(--spacing-md) var(--spacing-lg);
    font-size: var(--font-size-lg);
  }

  .btn-primary {
    background-color: var(--primary-color);
    color: white;
  }

  .btn-primary:hover {
    background-color: var(--primary-color-dark);
  }

  .btn-secondary {
    background-color: var(--surface);
    color: var(--text-primary);
    border: 1px solid var(--divider);
  }

  .btn-secondary:hover {
    background-color: var(--divider);
  }

  .btn .material-icons {
    font-size: var(--icon-size-lg);
  }

  /* Exercise Preview */
  .exercise-preview {
    margin-top: var(--spacing-xl);
  }

  .preview-title {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  .exercise-list-preview {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .show-more-btn {
    background-color: var(--surface-variant);
    border: 1px dashed var(--divider);
    border-radius: var(--border-radius);
    padding: var(--spacing-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    transition: all 0.2s ease;
  }

  .show-more-btn:hover {
    background-color: var(--divider);
    color: var(--text-primary);
  }

  .show-more-btn .material-icons {
    font-size: var(--icon-size-md);
  }

  /* Session Selection Modal */
  .modal-empty-state {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-secondary);
  }

  .session-select-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .session-select-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-lg);
    background-color: var(--surface-variant);
    border: 2px solid transparent;
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    width: 100%;
  }

  .session-select-item:hover {
    background-color: var(--divider);
  }

  .session-select-item.selected {
    border-color: var(--primary-color);
    background-color: var(--primary-alpha-10);
  }

  .session-select-info {
    flex: 1;
  }

  .session-select-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
  }

  .session-select-name {
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--text-primary);
  }

  .default-badge-small {
    font-size: var(--font-size-xs);
    padding: 2px var(--spacing-xs);
    border-radius: calc(var(--border-radius) / 2);
    background-color: rgba(76, 175, 80, 0.1);
    color: var(--success-color);
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .default-badge-small .material-icons {
    font-size: 12px;
  }

  .session-select-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .meta-icon {
    font-size: var(--icon-size-sm);
  }

  .selected-icon {
    color: var(--primary-color);
    font-size: var(--icon-size-lg);
  }

  /* Exercise List Modal */
  .exercise-list-full {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .exercise-number-wrapper {
    display: flex;
    gap: var(--spacing-md);
    align-items: flex-start;
  }

  .exercise-number {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--primary-color);
    color: white;
    border-radius: 50%;
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  .modal-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
    width: 100%;
  }

  .loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-2xl);
    color: var(--text-secondary);
  }

  .loading-indicator .material-icons {
    font-size: 3rem;
  }

  @media (max-width: 480px) {
    .page-header {
      padding: var(--spacing-lg);
    }

    .date-display {
      font-size: var(--font-size-lg);
    }

    .session-section {
      padding: var(--spacing-lg);
    }

    .session-card {
      padding: var(--spacing-lg);
    }

    .session-title h2 {
      font-size: var(--font-size-lg);
    }

    .session-actions {
      grid-template-columns: 1fr;
    }

    .session-stats {
      grid-template-columns: 1fr;
    }
  }
</style>
