<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * ExerciseManagementModal Component - Manage exercise library
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import Modal from './Modal.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import DurationInput from './DurationInput.svelte';
  import { ptState, ptService } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';
  import type { Exercise, SessionDefinition } from '$lib/types/pt';

  const dispatch = createEventDispatcher();

  // Exercise form modal state
  let showExerciseForm = false;
  let editingExercise: Exercise | null = null;

  // Delete confirmation state
  let showDeleteConfirm = false;
  let showEmptySessionConfirm = false;
  let exerciseToDelete: Exercise | null = null;
  let sessionsUsingExercise: SessionDefinition[] = [];
  let exerciseJournalReferences = 0;
  let emptySessionsAfterDeletion: SessionDefinition[] = [];
  let currentEmptySessionIndex = 0;

  // LocalStorage keys for persisting sort preferences
  const SORT_FIELD_KEY = 'exercise-library-sort-field';
  const SORT_ASC_KEY = 'exercise-library-sort-asc';

  // Load sort preferences from localStorage
  function loadSortPreferences(): {
    field: 'name' | 'dateAdded';
    asc: boolean;
  } {
    if (typeof window === 'undefined') {
      return { field: 'name', asc: true };
    }

    const savedField = localStorage.getItem(SORT_FIELD_KEY);
    const savedAsc = localStorage.getItem(SORT_ASC_KEY);

    return {
      field: (savedField as 'name' | 'dateAdded') || 'name',
      asc: savedAsc === 'false' ? false : true
    };
  }

  // Save sort preferences to localStorage
  function saveSortPreferences(field: 'name' | 'dateAdded', asc: boolean) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SORT_FIELD_KEY, field);
    localStorage.setItem(SORT_ASC_KEY, String(asc));
  }

  // Search and sort state - load from localStorage
  let searchQuery = '';
  const sortPrefs = loadSortPreferences();
  let sortField: 'name' | 'dateAdded' = sortPrefs.field;
  let sortAsc = sortPrefs.asc;

  // Exercise form data - use settings defaults
  let exerciseFormData = {
    name: '',
    type: 'reps' as 'duration' | 'reps', // Default to reps/sets
    defaultDuration: $ptState.settings?.defaultDuration || 60,
    defaultReps: 10,
    defaultSets: 3,
    defaultRepDuration: $ptState.settings?.defaultRepDuration || 30,
    pauseBetweenReps: $ptState.settings?.defaultPauseBetweenReps || 5,
    restBetweenSets: $ptState.settings?.restBetweenSets || 20,
    sideMode: 'bilateral' as 'bilateral' | 'unilateral' | 'alternating',
    instructions: '',
    includeInDefault: true
  };

  // Computed: filtered and sorted exercises
  $: filteredExercises = filterAndSortExercises($ptState.exercises, searchQuery, sortField, sortAsc);

  function filterAndSortExercises(
    exercises: Exercise[],
    query: string,
    field: 'name' | 'dateAdded',
    ascending: boolean
  ): Exercise[] {
    // Filter by search query
    let filtered = exercises;
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = exercises.filter(exercise =>
        exercise.name.toLowerCase().includes(lowerQuery) ||
        exercise.instructions?.toLowerCase().includes(lowerQuery)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'dateAdded':
          comparison = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
          break;
      }

      return ascending ? comparison : -comparison;
    });

    return sorted;
  }

  function toggleSort(field: 'name' | 'dateAdded') {
    if (sortField === field) {
      sortAsc = !sortAsc;
    } else {
      sortField = field;
      sortAsc = true;
    }
    // Persist sort preferences
    saveSortPreferences(sortField, sortAsc);
  }

  function handleClose() {
    dispatch('close');
  }

  // ========== Exercise CRUD Functions ==========

  function openAddExercise() {
    editingExercise = null;
    resetExerciseForm();
    showExerciseForm = true;
  }

  function openEditExercise(exercise: Exercise) {
    editingExercise = exercise;
    exerciseFormData = {
      name: exercise.name,
      type: exercise.type,
      defaultDuration: exercise.defaultDuration || 60,
      defaultReps: exercise.defaultReps || 10,
      defaultSets: exercise.defaultSets || 3,
      defaultRepDuration: exercise.defaultRepDuration || 2,
      pauseBetweenReps: exercise.pauseBetweenReps ?? 5,
      restBetweenSets: exercise.restBetweenSets ?? 30,
      sideMode: exercise.sideMode || 'bilateral',
      instructions: exercise.instructions || '',
      includeInDefault: exercise.includeInDefault
    };
    showExerciseForm = true;
  }

  function resetExerciseForm() {
    // Use settings defaults for new exercises
    const settings = $ptState.settings;
    exerciseFormData = {
      name: '',
      type: 'reps', // Default to reps/sets
      defaultDuration: settings?.defaultDuration || 60,
      defaultReps: 10,
      defaultSets: 3,
      defaultRepDuration: settings?.defaultRepDuration || 30,
      pauseBetweenReps: settings?.defaultPauseBetweenReps || 5,
      restBetweenSets: settings?.restBetweenSets || 20,
      sideMode: 'bilateral',
      instructions: '',
      includeInDefault: true
    };
  }

  function closeExerciseForm() {
    showExerciseForm = false;
    resetExerciseForm();
  }

  async function saveExercise() {
    if (!exerciseFormData.name.trim()) {
      toastStore.show('Please enter an exercise name', 'error');
      return;
    }

    try {
      if (editingExercise) {
        const updated: Exercise = {
          ...editingExercise,
          name: exerciseFormData.name.trim(),
          type: exerciseFormData.type,
          defaultDuration: exerciseFormData.type === 'duration' ? exerciseFormData.defaultDuration : undefined,
          defaultReps: exerciseFormData.type === 'reps' ? exerciseFormData.defaultReps : undefined,
          defaultSets: exerciseFormData.type === 'reps' ? exerciseFormData.defaultSets : undefined,
          defaultRepDuration: exerciseFormData.type === 'reps' ? exerciseFormData.defaultRepDuration : undefined,
          pauseBetweenReps: exerciseFormData.type === 'reps' ? exerciseFormData.pauseBetweenReps : undefined,
          restBetweenSets: exerciseFormData.type === 'reps' ? exerciseFormData.restBetweenSets : undefined,
          sideMode: exerciseFormData.type === 'reps' ? exerciseFormData.sideMode : undefined,
          instructions: exerciseFormData.instructions.trim() || undefined,
          includeInDefault: exerciseFormData.includeInDefault
        };

        await ptService.updateExercise(updated);
        toastStore.show('Exercise updated successfully', 'success');
      } else {
        const newExercise: Omit<Exercise, 'id'> = {
          name: exerciseFormData.name.trim(),
          type: exerciseFormData.type,
          defaultDuration: exerciseFormData.type === 'duration' ? exerciseFormData.defaultDuration : undefined,
          defaultReps: exerciseFormData.type === 'reps' ? exerciseFormData.defaultReps : undefined,
          defaultSets: exerciseFormData.type === 'reps' ? exerciseFormData.defaultSets : undefined,
          defaultRepDuration: exerciseFormData.type === 'reps' ? exerciseFormData.defaultRepDuration : undefined,
          pauseBetweenReps: exerciseFormData.type === 'reps' ? exerciseFormData.pauseBetweenReps : undefined,
          restBetweenSets: exerciseFormData.type === 'reps' ? exerciseFormData.restBetweenSets : undefined,
          sideMode: exerciseFormData.type === 'reps' ? exerciseFormData.sideMode : undefined,
          instructions: exerciseFormData.instructions.trim() || undefined,
          includeInDefault: exerciseFormData.includeInDefault,
          dateAdded: new Date().toISOString()
        };

        await ptService.addExercise(newExercise);
        toastStore.show('Exercise added successfully', 'success');
      }

      await reloadData();
      closeExerciseForm();
    } catch (error) {
      console.error('Failed to save exercise:', error);
      toastStore.show('Failed to save exercise', 'error');
    }
  }

  async function confirmDeleteExercise(exercise: Exercise, event: Event) {
    event.stopPropagation();
    exerciseToDelete = exercise;

    // Find all sessions using this exercise
    sessionsUsingExercise = $ptState.sessionDefinitions.filter(session =>
      session.exercises.some(ex => ex.exerciseId === exercise.id)
    );

    // Count journal entries referencing this exercise (for info only)
    const allInstances = await ptService.getSessionInstances();
    exerciseJournalReferences = allInstances.filter(instance =>
      instance.completedExercises.some(ex => ex.exerciseId === exercise.id)
    ).length;

    showDeleteConfirm = true;
  }

  async function deleteExercise() {
    if (!exerciseToDelete) return;

    try {
      // Remove exercise from all sessions
      for (const session of sessionsUsingExercise) {
        const updatedExercises = session.exercises.filter(ex => ex.exerciseId !== exerciseToDelete.id);
        const updated = { ...session, exercises: updatedExercises };
        await ptService.updateSessionDefinition(updated);
      }

      // Delete the exercise
      await ptService.deleteExercise(exerciseToDelete.id);

      // Check for empty sessions
      emptySessionsAfterDeletion = [];
      for (const session of sessionsUsingExercise) {
        const updatedSession = await ptService.getSessionDefinitionById(session.id);
        if (updatedSession && updatedSession.exercises.length === 0) {
          emptySessionsAfterDeletion.push(updatedSession);
        }
      }

      await reloadData();
      showDeleteConfirm = false;

      // Show empty session cleanup dialog if needed
      if (emptySessionsAfterDeletion.length > 0) {
        currentEmptySessionIndex = 0;
        showEmptySessionConfirm = true;
      } else {
        toastStore.show('Exercise deleted', 'success');
        exerciseToDelete = null;
        sessionsUsingExercise = [];
      }
    } catch (error) {
      console.error('Failed to delete exercise:', error);
      toastStore.show('Failed to delete exercise', 'error');
    }
  }

  async function deleteEmptySession() {
    if (currentEmptySessionIndex >= emptySessionsAfterDeletion.length) return;

    const session = emptySessionsAfterDeletion[currentEmptySessionIndex];
    try {
      await ptService.deleteSessionDefinition(session.id);
      currentEmptySessionIndex++;

      if (currentEmptySessionIndex < emptySessionsAfterDeletion.length) {
        // More sessions to process
        await reloadData();
      } else {
        // Done with all empty sessions
        await reloadData();
        showEmptySessionConfirm = false;
        emptySessionsAfterDeletion = [];
        currentEmptySessionIndex = 0;
        exerciseToDelete = null;
        sessionsUsingExercise = [];
        toastStore.show('Exercise and empty sessions deleted', 'success');
      }
    } catch (error) {
      console.error('Failed to delete empty session:', error);
      toastStore.show('Failed to delete session', 'error');
    }
  }

  function keepEmptySession() {
    currentEmptySessionIndex++;

    if (currentEmptySessionIndex < emptySessionsAfterDeletion.length) {
      // More sessions to process
    } else {
      // Done with all empty sessions
      showEmptySessionConfirm = false;
      emptySessionsAfterDeletion = [];
      currentEmptySessionIndex = 0;
      exerciseToDelete = null;
      sessionsUsingExercise = [];
      toastStore.show('Exercise deleted', 'success');
    }
  }

  async function reloadData() {
    const exercises = await ptService.getExercises();
    const sessionDefinitions = await ptService.getSessionDefinitions();
    ptState.update((state) => ({ ...state, exercises, sessionDefinitions }));
  }

  // ========== Helper Functions ==========

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }

  // Auto-open Add dialog if no exercises exist
  onMount(() => {
    if ($ptState.exercises.length === 0) {
      openAddExercise();
    }
  });
</script>

<Modal fullScreen={true} title="Exercise Library" iosStyle={true} on:close={handleClose}>
  <div slot="headerActions">
    <button class="icon-button add-button" on:click={openAddExercise} aria-label="Add exercise">
      <span class="material-icons">add</span>
    </button>
  </div>

  <div class="management-content">
    <!-- Search Bar -->
    <div class="search-bar">
      <span class="material-icons search-icon">search</span>
      <input
        type="text"
        placeholder="Search exercises..."
        bind:value={searchQuery}
        class="search-input"
      />
      {#if searchQuery}
        <button class="clear-search" on:click={() => (searchQuery = '')} aria-label="Clear search">
          <span class="material-icons">close</span>
        </button>
      {/if}
    </div>

    <!-- Sort Header (Table-Column-Style) -->
    <div class="sort-header">
      <button class="sort-button" on:click={() => toggleSort('name')}>
        <span>Name</span>
        <span class="material-icons sort-icon">
          {sortField === 'name' ? (sortAsc ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
        </span>
      </button>
      <button class="sort-button" on:click={() => toggleSort('dateAdded')}>
        <span>Created</span>
        <span class="material-icons sort-icon">
          {sortField === 'dateAdded' ? (sortAsc ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
        </span>
      </button>
    </div>

    <!-- Exercises List -->
    {#if filteredExercises.length === 0}
      <div class="empty-state">
        {#if searchQuery}
          <span class="material-icons empty-icon">search_off</span>
          <p>No exercises found</p>
          <p class="empty-hint">Try a different search term</p>
        {:else}
          <span class="material-icons empty-icon">self_improvement</span>
          <p>No exercises yet</p>
          <p class="empty-hint">Add your first exercise to get started</p>
        {/if}
      </div>
    {:else}
      <div class="exercise-list">
        {#each filteredExercises as exercise (exercise.id)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="exercise-card" on:click={() => openEditExercise(exercise)}>
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
                    <span class="material-icons detail-icon">repeat</span>
                    {exercise.defaultSets} {exercise.defaultSets === 1 ? 'set' : 'sets'} × {exercise.defaultReps} reps
                    {#if exercise.sideMode && exercise.sideMode !== 'bilateral'}
                      <span class="mode-badge">{exercise.sideMode === 'unilateral' ? 'Unilateral' : 'Alternating'}</span>
                    {/if}
                  </span>
                {/if}
              </div>

              {#if exercise.instructions}
                <p class="exercise-instructions">{exercise.instructions}</p>
              {/if}
            </div>

            <div class="exercise-actions">
              <button
                class="icon-button delete"
                on:click={(e) => confirmDeleteExercise(exercise, e)}
                aria-label="Delete exercise"
              >
                <span class="material-icons">delete</span>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</Modal>

<!-- Exercise Form Modal (Nested) -->
{#if showExerciseForm}
  <Modal
    title={editingExercise ? 'Edit Exercise' : 'Add Exercise'}
    iosStyle={true}
    on:close={closeExerciseForm}
  >
    <form on:submit|preventDefault={saveExercise} class="exercise-form">
      <div class="form-group">
        <label for="exercise-name">
          Exercise Name <span class="required">*</span>
        </label>
        <input
          id="exercise-name"
          type="text"
          bind:value={exerciseFormData.name}
          placeholder="e.g., Wall Slides"
          required
        />
      </div>

      <div class="form-group">
        <label for="exercise-type">Exercise Type</label>
        <select id="exercise-type" bind:value={exerciseFormData.type}>
          <option value="reps">Reps & Sets</option>
          <option value="duration">Duration (timed exercise)</option>
        </select>
      </div>

      {#if exerciseFormData.type === 'duration'}
        <div class="form-group">
          <label for="default-duration">Duration</label>
          <DurationInput
            id="default-duration"
            bind:value={exerciseFormData.defaultDuration}
            min={1}
            placeholder="MM:SS or seconds"
          />
        </div>
      {:else}
        <div class="form-row">
          <div class="form-group">
            <label for="default-reps">Reps per Set</label>
            <input
              id="default-reps"
              type="number"
              bind:value={exerciseFormData.defaultReps}
              min="1"
              step="1"
            />
          </div>
          <div class="form-group">
            <label for="default-sets">Number of Sets</label>
            <input
              id="default-sets"
              type="number"
              bind:value={exerciseFormData.defaultSets}
              min="1"
              step="1"
            />
          </div>
        </div>
        <div class="form-group">
          <label for="side-mode">Mode</label>
          <select id="side-mode" bind:value={exerciseFormData.sideMode}>
            <option value="bilateral">Bilateral</option>
            <option value="unilateral">Unilateral</option>
            <option value="alternating">Alternating</option>
          </select>
          <p class="help-text">
            <strong>Bilateral:</strong> Standard exercise<br>
            <strong>Unilateral:</strong> Perform all reps on one side, then all reps on the other<br>
            <strong>Alternating:</strong> Switch left-right with each rep
          </p>
        </div>
        <div class="form-group">
          <label for="rep-duration">Duration per Rep</label>
          <DurationInput
            id="rep-duration"
            bind:value={exerciseFormData.defaultRepDuration}
            min={1}
            max={120}
            placeholder="MM:SS or seconds"
          />
        </div>
        <div class="form-group">
          <label for="pause-between-reps">Pause Between Reps</label>
          <DurationInput
            id="pause-between-reps"
            bind:value={exerciseFormData.pauseBetweenReps}
            min={0}
            max={60}
            placeholder="MM:SS or seconds"
          />
        </div>
        <div class="form-group">
          <label for="rest-between-sets">Rest Between Sets</label>
          <DurationInput
            id="rest-between-sets"
            bind:value={exerciseFormData.restBetweenSets}
            min={0}
            max={300}
            placeholder="MM:SS or seconds"
          />
        </div>
      {/if}

      <div class="form-group">
        <label for="instructions">Instructions (optional)</label>
        <textarea
          id="instructions"
          bind:value={exerciseFormData.instructions}
          placeholder="Exercise instructions or notes"
          rows="3"
        />
      </div>
    </form>

    <div slot="footer" class="modal-actions">
      <button class="btn btn-secondary" on:click={closeExerciseForm} type="button">
        Cancel
      </button>
      <button class="btn btn-primary" on:click={saveExercise} type="button">
        {editingExercise ? 'Save' : 'Add'}
      </button>
    </div>
  </Modal>
{/if}

<!-- Delete Exercise Confirmation -->
{#if showDeleteConfirm && exerciseToDelete}
  <ConfirmDialog
    title="Delete Exercise"
    message={`Are you sure you want to delete '${exerciseToDelete.name}'?${
      sessionsUsingExercise.length > 0
        ? `\n\nThis exercise is used in ${sessionsUsingExercise.length} session(s). It will be removed from them.`
        : ''
    }${
      exerciseJournalReferences > 0
        ? `\n\nIt is referenced in ${exerciseJournalReferences} journal entry/entries (they will not be affected).`
        : ''
    }`}
    confirmText="Delete"
    confirmClass="danger"
    on:confirm={deleteExercise}
    on:cancel={() => {
      showDeleteConfirm = false;
      exerciseToDelete = null;
      sessionsUsingExercise = [];
      exerciseJournalReferences = 0;
    }}
  />
{/if}

<!-- Empty Session Confirmation (shown after exercise deletion) -->
{#if showEmptySessionConfirm && emptySessionsAfterDeletion.length > 0 && currentEmptySessionIndex < emptySessionsAfterDeletion.length}
  {@const session = emptySessionsAfterDeletion[currentEmptySessionIndex]}
  <ConfirmDialog
    title="Delete Empty Session?"
    message={`Session '${session.name}' is now empty. Do you want to delete it?\n\n(${currentEmptySessionIndex + 1} of ${emptySessionsAfterDeletion.length} empty sessions)`}
    confirmText="Delete Session"
    cancelText="Keep Session"
    confirmClass="danger"
    on:confirm={deleteEmptySession}
    on:cancel={keepEmptySession}
  />
{/if}

<style>
  .management-content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  /* Search Bar */
  .search-bar {
    position: relative;
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--divider);
    flex-shrink: 0;
  }

  .search-icon {
    position: absolute;
    left: calc(var(--spacing-lg) + var(--spacing-sm));
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-hint);
    font-size: var(--icon-size-md);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    padding-left: calc(var(--spacing-md) + var(--icon-size-md) + var(--spacing-sm));
    border: 1px solid var(--divider);
    border-radius: var(--border-radius);
    background: var(--surface);
    color: var(--text-primary);
    font-size: var(--font-size-base);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-alpha-10);
  }

  .clear-search {
    position: absolute;
    right: calc(var(--spacing-lg) + var(--spacing-sm));
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-hint);
    cursor: pointer;
    padding: var(--spacing-xs);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clear-search:hover {
    color: var(--text-secondary);
  }

  .clear-search .material-icons {
    font-size: var(--icon-size-sm);
  }

  /* Sort Header */
  .sort-header {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-lg);
    background-color: var(--surface-variant);
    border-bottom: 1px solid var(--divider);
    flex-shrink: 0;
  }

  .sort-button {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-weight: 500;
    transition: color 0.2s;
  }

  .sort-button:hover {
    color: var(--text-primary);
  }

  .sort-icon {
    font-size: var(--icon-size-sm);
  }

  /* Exercise List */
  .exercise-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-md) var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .exercise-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md);
    background-color: var(--surface);
    border: 1px solid var(--divider);
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: all 0.2s;
  }

  .exercise-card:hover {
    background-color: var(--surface-variant);
    border-color: var(--primary-color);
  }

  .exercise-info {
    flex: 1;
    min-width: 0;
  }

  .exercise-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
    flex-wrap: wrap;
  }

  .exercise-name {
    font-size: var(--font-size-base);
    font-weight: 500;
    color: var(--text-primary);
    margin: 0;
  }

  .exercise-type-badge {
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--surface-variant);
    color: var(--text-secondary);
    border-radius: calc(var(--border-radius) / 2);
    font-size: var(--font-size-xs);
    font-weight: 500;
  }

  .exercise-type-badge.is-duration {
    background-color: var(--primary-alpha-10);
    color: var(--primary-color);
  }

  .mode-badge {
    margin-left: var(--spacing-xs);
    padding: 2px var(--spacing-xs);
    border-radius: calc(var(--border-radius) / 2);
    background-color: rgba(156, 39, 176, 0.1);
    color: #9c27b0;
    font-size: var(--font-size-xs);
    font-weight: 500;
  }

  .exercise-details {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xs);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .detail-icon {
    font-size: var(--icon-size-sm);
  }

  .exercise-instructions {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .exercise-actions {
    display: flex;
    gap: var(--spacing-sm);
    margin-left: var(--spacing-md);
  }

  .icon-button {
    width: var(--touch-target-min);
    height: var(--touch-target-min);
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 50%;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .icon-button:hover {
    background-color: var(--hover-overlay);
    color: var(--text-primary);
  }

  .icon-button.delete:hover {
    background-color: rgba(244, 67, 54, 0.1);
    color: var(--error-color);
  }

  /* Larger, bolder add button in header */
  .icon-button.add-button {
    color: var(--primary-color);
  }

  .icon-button.add-button .material-icons {
    font-size: 2rem;
    font-weight: 700;
  }

  .icon-button.add-button:hover {
    background-color: var(--primary-alpha-10);
  }

  /* Empty State */
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-2xl);
    text-align: center;
    color: var(--text-secondary);
  }

  .empty-icon {
    font-size: 4rem;
    color: var(--text-hint);
    margin-bottom: var(--spacing-lg);
  }

  .empty-state p {
    margin: var(--spacing-xs) 0;
  }

  .empty-hint {
    font-size: var(--font-size-sm);
    color: var(--text-hint);
  }

  /* Exercise Form */
  .exercise-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
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

  .form-group input[type="text"],
  .form-group input[type="number"],
  .form-group select,
  .form-group textarea {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--divider);
    border-radius: var(--border-radius);
    background: var(--surface);
    color: var(--text-primary);
    font-size: var(--font-size-base);
    font-family: inherit;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-alpha-10);
  }

  .form-group textarea {
    resize: vertical;
  }

  .help-text {
    margin-top: var(--spacing-xs);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
    padding: var(--spacing-lg);
    border-top: 1px solid var(--divider);
  }

  @media (max-width: 480px) {
    .sort-header {
      grid-template-columns: 2fr 1fr 1fr;
      padding: var(--spacing-xs) var(--spacing-md);
    }

    .sort-button {
      font-size: var(--font-size-xs);
      padding: var(--spacing-xs);
    }

    .exercise-list {
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .exercise-card {
      padding: var(--spacing-sm);
    }

    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>
