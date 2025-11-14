<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * Settings Screen - Exercise library and app configuration
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import { ptState, ptService, sortedExercises } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';
  import BottomTabs from '$lib/components/BottomTabs.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import type { Exercise } from '$lib/types/pt';

  let showExerciseModal = false;
  let showDeleteConfirm = false;
  let editingExercise: Exercise | null = null;
  let exerciseToDelete: Exercise | null = null;

  // Form state
  let formData = {
    name: '',
    type: 'duration' as 'duration' | 'reps',
    defaultDuration: 60,
    defaultReps: 10,
    defaultSets: 3,
    defaultRepDuration: 2,
    instructions: '',
    includeInDefault: true
  };

  function openAddExercise() {
    editingExercise = null;
    resetForm();
    showExerciseModal = true;
  }

  function openEditExercise(exercise: Exercise) {
    editingExercise = exercise;
    formData = {
      name: exercise.name,
      type: exercise.type,
      defaultDuration: exercise.defaultDuration || 60,
      defaultReps: exercise.defaultReps || 10,
      defaultSets: exercise.defaultSets || 3,
      defaultRepDuration: exercise.defaultRepDuration || 2,
      instructions: exercise.instructions || '',
      includeInDefault: exercise.includeInDefault
    };
    showExerciseModal = true;
  }

  function resetForm() {
    formData = {
      name: '',
      type: 'duration',
      defaultDuration: 60,
      defaultReps: 10,
      defaultSets: 3,
      defaultRepDuration: 2,
      instructions: '',
      includeInDefault: true
    };
  }

  async function saveExercise() {
    if (!formData.name.trim()) {
      toastStore.show('Please enter an exercise name', 'error');
      return;
    }

    try {
      if (editingExercise) {
        // Update existing exercise
        const updated: Exercise = {
          ...editingExercise,
          name: formData.name.trim(),
          type: formData.type,
          defaultDuration: formData.type === 'duration' ? formData.defaultDuration : undefined,
          defaultReps: formData.type === 'reps' ? formData.defaultReps : undefined,
          defaultSets: formData.type === 'reps' ? formData.defaultSets : undefined,
          defaultRepDuration: formData.type === 'reps' ? formData.defaultRepDuration : undefined,
          instructions: formData.instructions.trim() || undefined,
          includeInDefault: formData.includeInDefault
        };

        await ptService.updateExercise(updated);
        toastStore.show('Exercise updated successfully', 'success');
      } else {
        // Add new exercise
        const newExercise: Omit<Exercise, 'id'> = {
          name: formData.name.trim(),
          type: formData.type,
          defaultDuration: formData.type === 'duration' ? formData.defaultDuration : undefined,
          defaultReps: formData.type === 'reps' ? formData.defaultReps : undefined,
          defaultSets: formData.type === 'reps' ? formData.defaultSets : undefined,
          defaultRepDuration: formData.type === 'reps' ? formData.defaultRepDuration : undefined,
          instructions: formData.instructions.trim() || undefined,
          includeInDefault: formData.includeInDefault,
          dateAdded: new Date().toISOString()
        };

        await ptService.addExercise(newExercise);
        toastStore.show('Exercise added successfully', 'success');
      }

      // Reload exercises
      await reloadExercises();
      showExerciseModal = false;
      resetForm();
    } catch (error) {
      console.error('Failed to save exercise:', error);
      toastStore.show('Failed to save exercise', 'error');
    }
  }

  function confirmDelete(exercise: Exercise) {
    exerciseToDelete = exercise;
    showDeleteConfirm = true;
  }

  async function deleteExercise() {
    if (!exerciseToDelete) return;

    try {
      await ptService.deleteExercise(exerciseToDelete.id);
      toastStore.show('Exercise deleted', 'success');
      await reloadExercises();
      showDeleteConfirm = false;
      exerciseToDelete = null;
    } catch (error) {
      console.error('Failed to delete exercise:', error);
      toastStore.show('Failed to delete exercise', 'error');
    }
  }

  async function reloadExercises() {
    const exercises = await ptService.getExercises();
    ptState.update((state) => ({ ...state, exercises }));
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
</script>

<div class="page-container">
  <main class="content">
    <header class="page-header">
      <h1>Settings</h1>
    </header>

    <!-- Exercise Library Section -->
    <section class="settings-section">
      <div class="section-header">
        <h2>Exercise Library</h2>
        <button class="btn btn-primary" on:click={openAddExercise}>
          <span class="material-icons">add</span>
          Add Exercise
        </button>
      </div>

      {#if $sortedExercises.length === 0}
        <div class="empty-state">
          <span class="material-icons empty-icon">self_improvement</span>
          <p>No exercises yet</p>
          <p class="empty-hint">Add your first exercise to get started</p>
        </div>
      {:else}
        <div class="exercise-list">
          {#each $sortedExercises as exercise (exercise.id)}
            <div class="exercise-card">
              <div class="exercise-info">
                <div class="exercise-header">
                  <h3 class="exercise-name">{exercise.name}</h3>
                  <span class="exercise-type-badge" class:is-duration={exercise.type === 'duration'}>
                    {exercise.type === 'duration' ? 'Duration' : 'Reps/Sets'}
                  </span>
                </div>

                <div class="exercise-details">
                  {#if exercise.type === 'duration'}
                    <span class="detail-item">
                      <span class="material-icons detail-icon">timer</span>
                      {formatDuration(exercise.defaultDuration || 0)}
                    </span>
                  {:else}
                    <span class="detail-item">
                      <span class="material-icons detail-icon">fitness_center</span>
                      {exercise.defaultReps} reps × {exercise.defaultSets} sets
                    </span>
                  {/if}

                  {#if exercise.includeInDefault}
                    <span class="detail-item">
                      <span class="material-icons detail-icon">check_circle</span>
                      In default session
                    </span>
                  {/if}
                </div>
              </div>

              <div class="exercise-actions">
                <button
                  class="icon-button"
                  on:click={() => openEditExercise(exercise)}
                  aria-label="Edit exercise"
                >
                  <span class="material-icons">edit</span>
                </button>
                <button
                  class="icon-button delete"
                  on:click={() => confirmDelete(exercise)}
                  aria-label="Delete exercise"
                >
                  <span class="material-icons">delete</span>
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </main>

  <BottomTabs currentTab="settings" />
</div>

<!-- Exercise Modal -->
{#if showExerciseModal}
  <Modal
    title={editingExercise ? 'Edit Exercise' : 'Add Exercise'}
    on:close={() => (showExerciseModal = false)}
  >
    <form on:submit|preventDefault={saveExercise} class="exercise-form">
      <div class="form-group">
        <label for="exercise-name">
          Exercise Name <span class="required">*</span>
        </label>
        <input
          id="exercise-name"
          type="text"
          bind:value={formData.name}
          placeholder="e.g., Wall Slides"
          required
        />
      </div>

      <div class="form-group">
        <label for="exercise-type">Exercise Type</label>
        <select id="exercise-type" bind:value={formData.type}>
          <option value="duration">Duration (timed exercise)</option>
          <option value="reps">Reps & Sets</option>
        </select>
      </div>

      {#if formData.type === 'duration'}
        <div class="form-group">
          <label for="default-duration">Default Duration (seconds)</label>
          <input
            id="default-duration"
            type="number"
            bind:value={formData.defaultDuration}
            min="1"
            step="1"
          />
        </div>
      {:else}
        <div class="form-row">
          <div class="form-group">
            <label for="default-reps">Reps per Set</label>
            <input
              id="default-reps"
              type="number"
              bind:value={formData.defaultReps}
              min="1"
              step="1"
            />
          </div>
          <div class="form-group">
            <label for="default-sets">Number of Sets</label>
            <input
              id="default-sets"
              type="number"
              bind:value={formData.defaultSets}
              min="1"
              step="1"
            />
          </div>
        </div>
        <div class="form-group">
          <label for="rep-duration">Duration per Rep (seconds)</label>
          <input
            id="rep-duration"
            type="number"
            bind:value={formData.defaultRepDuration}
            min="1"
            step="0.5"
          />
        </div>
      {/if}

      <div class="form-group">
        <label for="instructions">Instructions (optional)</label>
        <textarea
          id="instructions"
          bind:value={formData.instructions}
          placeholder="Exercise instructions or notes"
          rows="3"
        />
      </div>

      <div class="form-group checkbox-group">
        <label>
          <input type="checkbox" bind:checked={formData.includeInDefault} />
          <span>Include in default session</span>
        </label>
      </div>
    </form>

    <div slot="footer" class="modal-actions">
      <button class="btn btn-secondary" on:click={() => (showExerciseModal = false)}>
        Cancel
      </button>
      <button class="btn btn-primary" on:click={saveExercise}>
        {editingExercise ? 'Update' : 'Add'} Exercise
      </button>
    </div>
  </Modal>
{/if}

<!-- Delete Confirmation -->
{#if showDeleteConfirm && exerciseToDelete}
  <ConfirmDialog
    title="Delete Exercise"
    message="Are you sure you want to delete '{exerciseToDelete.name}'? This action cannot be undone."
    confirmText="Delete"
    cancelText="Cancel"
    confirmVariant="danger"
    on:confirm={deleteExercise}
    on:cancel={() => {
      showDeleteConfirm = false;
      exerciseToDelete = null;
    }}
  />
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

  .page-header h1 {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
  }

  .settings-section {
    padding: var(--spacing-lg);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--spacing-lg);
  }

  .section-header h2 {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
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
    gap: var(--spacing-xs);
    transition: all 0.2s ease;
    min-height: var(--touch-target-min);
  }

  .btn-primary {
    background-color: var(--primary-color);
    color: white;
  }

  .btn-primary:hover {
    background-color: var(--primary-color-dark);
  }

  .btn-secondary {
    background-color: var(--surface-variant);
    color: var(--text-primary);
  }

  .btn-secondary:hover {
    background-color: var(--divider);
  }

  .btn .material-icons {
    font-size: var(--icon-size-md);
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: var(--spacing-2xl);
    color: var(--text-secondary);
  }

  .empty-icon {
    font-size: 4rem;
    color: var(--text-secondary);
    opacity: 0.5;
  }

  .empty-state p {
    margin: var(--spacing-md) 0 0;
    font-size: var(--font-size-base);
  }

  .empty-hint {
    font-size: var(--font-size-sm) !important;
    opacity: 0.7;
  }

  /* Exercise List */
  .exercise-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .exercise-card {
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
    padding: var(--spacing-lg);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--spacing-md);
    box-shadow: var(--shadow);
  }

  .exercise-info {
    flex: 1;
  }

  .exercise-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }

  .exercise-name {
    margin: 0;
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--text-primary);
  }

  .exercise-type-badge {
    font-size: var(--font-size-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: calc(var(--border-radius) / 2);
    background-color: var(--primary-alpha-10);
    color: var(--primary-color);
    font-weight: 500;
  }

  .exercise-type-badge.is-duration {
    background-color: var(--primary-alpha-10);
    color: var(--primary-color);
  }

  .exercise-details {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .detail-icon {
    font-size: var(--icon-size-sm);
  }

  .exercise-actions {
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

  .icon-button.delete:hover {
    background-color: rgba(244, 67, 54, 0.1);
    color: var(--error-color);
  }

  /* Form Styles */
  .exercise-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }

  .form-group label {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--text-primary);
  }

  .required {
    color: var(--error-color);
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    padding: var(--spacing-sm);
    border: 1px solid var(--divider);
    border-radius: var(--border-radius);
    font-size: var(--font-size-base);
    background-color: var(--surface);
    color: var(--text-primary);
    font-family: inherit;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .checkbox-group label {
    flex-direction: row;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;
  }

  .checkbox-group input[type='checkbox'] {
    width: auto;
    cursor: pointer;
  }

  .modal-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
    width: 100%;
  }

  @media (max-width: 480px) {
    .page-header {
      padding: var(--spacing-lg);
    }

    .page-header h1 {
      font-size: var(--font-size-lg);
    }

    .settings-section {
      padding: var(--spacing-md);
    }

    .section-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-md);
    }

    .section-header .btn {
      width: 100%;
      justify-content: center;
    }

    .exercise-card {
      flex-direction: column;
    }

    .exercise-actions {
      width: 100%;
      justify-content: flex-end;
    }

    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>
