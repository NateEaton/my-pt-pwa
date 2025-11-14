<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * Today Screen - Main landing page showing daily session
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import { ptState, ptService, defaultExercises } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';
  import BottomTabs from '$lib/components/BottomTabs.svelte';
  import ExerciseCard from '$lib/components/ExerciseCard.svelte';
  import Modal from '$lib/components/Modal.svelte';

  // Format today's date
  const today = new Date();
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedDate = dateFormatter.format(today);

  let showExerciseListModal = false;

  function calculateTotalDuration(): string {
    let totalSeconds = 0;

    $defaultExercises.forEach((exercise) => {
      if (exercise.type === 'duration') {
        totalSeconds += exercise.defaultDuration || 0;
      } else {
        const reps = exercise.defaultReps || 0;
        const sets = exercise.defaultSets || 0;
        const repDuration = exercise.defaultRepDuration || 2;
        totalSeconds += reps * sets * repDuration;
      }
    });

    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  function handlePlaySession() {
    toastStore.show('Session player coming in Phase 5!', 'info');
  }

  function handleLogSession() {
    toastStore.show('Manual logging coming soon!', 'info');
  }

  function viewExercises() {
    showExerciseListModal = true;
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
        {#if $defaultExercises.length === 0}
          <!-- Empty state -->
          <div class="empty-state">
            <div class="empty-icon">
              <span class="material-icons">self_improvement</span>
            </div>
            <h2>No Exercises Yet</h2>
            <p class="empty-text">
              Get started by adding your first exercise in the Settings tab.
            </p>
            <p class="empty-hint">
              Your physical therapist can help you determine which exercises to include.
            </p>
          </div>
        {:else}
          <!-- Session overview card -->
          <div class="session-card">
            <div class="session-header">
              <div class="session-title">
                <h2>Today's Session</h2>
                <span class="session-badge">Default</span>
              </div>
              <button
                class="view-exercises-btn"
                on:click={viewExercises}
                aria-label="View exercises"
              >
                <span class="material-icons">visibility</span>
              </button>
            </div>

            <div class="session-stats">
              <div class="stat-item">
                <span class="material-icons stat-icon">fitness_center</span>
                <div class="stat-content">
                  <span class="stat-value">{$defaultExercises.length}</span>
                  <span class="stat-label">
                    {$defaultExercises.length === 1 ? 'Exercise' : 'Exercises'}
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
            <h3 class="preview-title">Exercises ({$defaultExercises.length})</h3>
            <div class="exercise-list-preview">
              {#each $defaultExercises.slice(0, 3) as exercise (exercise.id)}
                <ExerciseCard {exercise} compact={true} />
              {/each}
              {#if $defaultExercises.length > 3}
                <button class="show-more-btn" on:click={viewExercises}>
                  <span class="material-icons">expand_more</span>
                  Show {$defaultExercises.length - 3} more exercises
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

<!-- Exercise List Modal -->
{#if showExerciseListModal}
  <Modal
    title="Today's Exercises"
    on:close={() => (showExerciseListModal = false)}
  >
    <div class="exercise-list-full">
      {#each $defaultExercises as exercise, index (exercise.id)}
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
    margin: 0;
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

  .view-exercises-btn {
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

  .view-exercises-btn:hover {
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
