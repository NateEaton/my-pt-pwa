<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * Settings Screen - Exercise library and session definition management
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
  import type { Exercise, SessionDefinition, SessionExercise, AppSettings } from '$lib/types/pt';

  // Exercise modal state
  let showExerciseModal = false;
  let showDeleteExerciseConfirm = false;
  let editingExercise: Exercise | null = null;
  let exerciseToDelete: Exercise | null = null;

  // Session definition modal state
  let showSessionModal = false;
  let showDeleteSessionConfirm = false;
  let editingSession: SessionDefinition | null = null;
  let sessionToDelete: SessionDefinition | null = null;

  // Exercise form state
  let exerciseFormData = {
    name: '',
    type: 'duration' as 'duration' | 'reps',
    defaultDuration: 60,
    defaultReps: 10,
    defaultSets: 3,
    defaultRepDuration: 2,
    instructions: '',
    includeInDefault: true
  };

  // Session form state
  let sessionFormData = {
    name: '',
    selectedExercises: [] as number[],
    isDefault: false
  };

  // App settings modal state
  let showAppSettingsModal = false;

  // App settings form state
  let appSettingsFormData = {
    defaultRepDuration: 2,
    startCountdownDuration: 5,
    endCountdownDuration: 5,
    endSessionDelay: 5,
    restBetweenSets: 30,
    restBetweenExercises: 15,
    theme: 'auto' as 'light' | 'dark' | 'auto',
    exerciseSortOrder: 'alphabetical' as 'alphabetical' | 'dateAdded' | 'frequency'
  };

  // ========== Exercise Functions ==========

  function openAddExercise() {
    editingExercise = null;
    resetExerciseForm();
    showExerciseModal = true;
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
      instructions: exercise.instructions || '',
      includeInDefault: exercise.includeInDefault
    };
    showExerciseModal = true;
  }

  function resetExerciseForm() {
    exerciseFormData = {
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
          instructions: exerciseFormData.instructions.trim() || undefined,
          includeInDefault: exerciseFormData.includeInDefault,
          dateAdded: new Date().toISOString()
        };

        await ptService.addExercise(newExercise);
        toastStore.show('Exercise added successfully', 'success');
      }

      await reloadData();
      showExerciseModal = false;
      resetExerciseForm();
    } catch (error) {
      console.error('Failed to save exercise:', error);
      toastStore.show('Failed to save exercise', 'error');
    }
  }

  function confirmDeleteExercise(exercise: Exercise) {
    exerciseToDelete = exercise;
    showDeleteExerciseConfirm = true;
  }

  async function deleteExercise() {
    if (!exerciseToDelete) return;

    try {
      await ptService.deleteExercise(exerciseToDelete.id);
      toastStore.show('Exercise deleted', 'success');
      await reloadData();
      showDeleteExerciseConfirm = false;
      exerciseToDelete = null;
    } catch (error) {
      console.error('Failed to delete exercise:', error);
      toastStore.show('Failed to delete exercise', 'error');
    }
  }

  // ========== Session Definition Functions ==========

  function openAddSession() {
    editingSession = null;
    resetSessionForm();
    showSessionModal = true;
  }

  function openEditSession(session: SessionDefinition) {
    editingSession = session;
    sessionFormData = {
      name: session.name,
      selectedExercises: session.exercises.map(e => e.exerciseId),
      isDefault: session.isDefault
    };
    showSessionModal = true;
  }

  function resetSessionForm() {
    sessionFormData = {
      name: '',
      selectedExercises: [],
      isDefault: false
    };
  }

  function toggleExerciseSelection(exerciseId: number) {
    const index = sessionFormData.selectedExercises.indexOf(exerciseId);
    if (index >= 0) {
      sessionFormData.selectedExercises = sessionFormData.selectedExercises.filter(id => id !== exerciseId);
    } else {
      sessionFormData.selectedExercises = [...sessionFormData.selectedExercises, exerciseId];
    }
  }

  function moveExerciseUp(index: number) {
    if (index === 0) return;
    const newList = [...sessionFormData.selectedExercises];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    sessionFormData.selectedExercises = newList;
  }

  function moveExerciseDown(index: number) {
    if (index === sessionFormData.selectedExercises.length - 1) return;
    const newList = [...sessionFormData.selectedExercises];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    sessionFormData.selectedExercises = newList;
  }

  async function saveSession() {
    if (!sessionFormData.name.trim()) {
      toastStore.show('Please enter a session name', 'error');
      return;
    }

    if (sessionFormData.selectedExercises.length === 0) {
      toastStore.show('Please select at least one exercise', 'error');
      return;
    }

    try {
      const sessionExercises: SessionExercise[] = sessionFormData.selectedExercises.map(exerciseId => ({
        exerciseId
      }));

      if (editingSession) {
        const updated: SessionDefinition = {
          ...editingSession,
          name: sessionFormData.name.trim(),
          exercises: sessionExercises,
          isDefault: sessionFormData.isDefault
        };

        await ptService.updateSessionDefinition(updated);
        toastStore.show('Session updated successfully', 'success');
      } else {
        const newSession: Omit<SessionDefinition, 'id'> = {
          name: sessionFormData.name.trim(),
          exercises: sessionExercises,
          isDefault: sessionFormData.isDefault,
          dateCreated: new Date().toISOString()
        };

        await ptService.addSessionDefinition(newSession);
        toastStore.show('Session created successfully', 'success');
      }

      await reloadData();
      showSessionModal = false;
      resetSessionForm();
    } catch (error) {
      console.error('Failed to save session:', error);
      toastStore.show('Failed to save session', 'error');
    }
  }

  function confirmDeleteSession(session: SessionDefinition) {
    sessionToDelete = session;
    showDeleteSessionConfirm = true;
  }

  async function deleteSession() {
    if (!sessionToDelete) return;

    try {
      await ptService.deleteSessionDefinition(sessionToDelete.id);
      toastStore.show('Session deleted', 'success');
      await reloadData();
      showDeleteSessionConfirm = false;
      sessionToDelete = null;
    } catch (error) {
      console.error('Failed to delete session:', error);
      toastStore.show('Failed to delete session', 'error');
    }
  }

  // ========== Helper Functions ==========

  async function reloadData() {
    const [exercises, sessionDefinitions] = await Promise.all([
      ptService.getExercises(),
      ptService.getSessionDefinitions()
    ]);
    ptState.update((state) => ({ ...state, exercises, sessionDefinitions }));
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }

  function getExerciseName(exerciseId: number): string {
    const exercise = $ptState.exercises.find(e => e.id === exerciseId);
    return exercise?.name || 'Unknown Exercise';
  }

  // ========== App Settings Functions ==========

  function openAppSettings() {
    if ($ptState.settings) {
      appSettingsFormData = {
        defaultRepDuration: $ptState.settings.defaultRepDuration,
        startCountdownDuration: $ptState.settings.startCountdownDuration,
        endCountdownDuration: $ptState.settings.endCountdownDuration,
        endSessionDelay: $ptState.settings.endSessionDelay,
        restBetweenSets: $ptState.settings.restBetweenSets,
        restBetweenExercises: $ptState.settings.restBetweenExercises,
        theme: $ptState.settings.theme,
        exerciseSortOrder: $ptState.settings.exerciseSortOrder
      };
    }
    showAppSettingsModal = true;
  }

  async function saveAppSettings() {
    const newSettings: AppSettings = {
      ...appSettingsFormData,
      enableNotifications: $ptState.settings?.enableNotifications || false
    };

    await ptService.saveSettings(newSettings);

    // Reload settings into state
    const settings = await ptService.getSettings();
    ptState.update((state) => ({ ...state, settings }));

    showAppSettingsModal = false;
    toastStore.show('Settings saved', 'success');
  }
</script>

<div class="page-container">
  <main class="content">
    <header class="page-header">
      <h1>Settings</h1>
    </header>

    <!-- Session Definitions Section -->
    <section class="settings-section">
      <div class="section-header">
        <h2>Session Definitions</h2>
        <button class="btn btn-primary" on:click={openAddSession}>
          <span class="material-icons">add</span>
          New Session
        </button>
      </div>

      {#if $ptState.sessionDefinitions.length === 0}
        <div class="empty-state">
          <span class="material-icons empty-icon">playlist_add</span>
          <p>No session definitions yet</p>
          <p class="empty-hint">Create a session to organize your exercises</p>
        </div>
      {:else}
        <div class="session-list">
          {#each $ptState.sessionDefinitions as session (session.id)}
            <div class="session-card">
              <div class="session-info">
                <div class="session-header">
                  <h3 class="session-name">{session.name}</h3>
                </div>

                <div class="session-details">
                  <span class="detail-item">
                    <span class="material-icons detail-icon">fitness_center</span>
                    {session.exercises.length} {session.exercises.length === 1 ? 'exercise' : 'exercises'}
                  </span>
                </div>

                <div class="exercise-tags">
                  {#each session.exercises.slice(0, 3) as sessionEx (sessionEx.exerciseId)}
                    <span class="exercise-tag">{getExerciseName(sessionEx.exerciseId)}</span>
                  {/each}
                  {#if session.exercises.length > 3}
                    <span class="exercise-tag more">+{session.exercises.length - 3} more</span>
                  {/if}
                </div>
              </div>

              <div class="session-actions">
                <button
                  class="icon-button"
                  on:click={() => openEditSession(session)}
                  aria-label="Edit session"
                >
                  <span class="material-icons">edit</span>
                </button>
                <button
                  class="icon-button delete"
                  on:click={() => confirmDeleteSession(session)}
                  aria-label="Delete session"
                >
                  <span class="material-icons">delete</span>
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

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
                  on:click={() => confirmDeleteExercise(exercise)}
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

    <!-- App Settings Section -->
    <section class="settings-section">
      <div class="section-header">
        <h2>App Settings</h2>
        <button class="btn btn-primary" on:click={openAppSettings}>
          <span class="material-icons">settings</span>
          Configure
        </button>
      </div>

      {#if $ptState.settings}
        <div class="settings-summary">
          <div class="setting-item">
            <span class="setting-label">Default Rep Duration:</span>
            <span class="setting-value">{$ptState.settings.defaultRepDuration}s</span>
          </div>
          <div class="setting-item">
            <span class="setting-label">Start Countdown:</span>
            <span class="setting-value">{$ptState.settings.startCountdownDuration}s</span>
          </div>
          <div class="setting-item">
            <span class="setting-label">Rest Between Sets:</span>
            <span class="setting-value">{$ptState.settings.restBetweenSets}s</span>
          </div>
          <div class="setting-item">
            <span class="setting-label">Rest Between Exercises:</span>
            <span class="setting-value">{$ptState.settings.restBetweenExercises}s</span>
          </div>
        </div>
      {/if}
    </section>
  </main>

  <BottomTabs currentTab="settings" />
</div>

<!-- Session Definition Modal -->
{#if showSessionModal}
  <Modal
    title={editingSession ? 'Edit Session' : 'New Session'}
    on:close={() => (showSessionModal = false)}
  >
    <form on:submit|preventDefault={saveSession} class="session-form">
      <div class="form-group">
        <label for="session-name">
          Session Name <span class="required">*</span>
        </label>
        <input
          id="session-name"
          type="text"
          bind:value={sessionFormData.name}
          placeholder="e.g., Morning Routine, Full Workout"
          required
        />
      </div>

      <div class="form-group">
        <label>
          Session Exercises {#if sessionFormData.selectedExercises.length > 0}({sessionFormData.selectedExercises.length}){/if}
        </label>
        {#if sessionFormData.selectedExercises.length > 0}
          <div class="selected-exercises-list">
            {#each sessionFormData.selectedExercises as exerciseId, index (exerciseId)}
              {@const exercise = $sortedExercises.find(e => e.id === exerciseId)}
              {#if exercise}
                <div class="selected-exercise-item">
                  <div class="exercise-order-number">{index + 1}</div>
                  <div class="exercise-order-info">
                    <div class="exercise-order-name">{exercise.name}</div>
                    <div class="exercise-order-meta">
                      {exercise.type === 'duration'
                        ? formatDuration(exercise.defaultDuration || 0)
                        : `${exercise.defaultReps} × ${exercise.defaultSets}`
                      }
                    </div>
                  </div>
                  <div class="exercise-order-controls">
                    <button
                      type="button"
                      class="order-btn"
                      disabled={index === 0}
                      on:click={() => moveExerciseUp(index)}
                      title="Move up"
                    >
                      <span class="material-icons">arrow_upward</span>
                    </button>
                    <button
                      type="button"
                      class="order-btn"
                      disabled={index === sessionFormData.selectedExercises.length - 1}
                      on:click={() => moveExerciseDown(index)}
                      title="Move down"
                    >
                      <span class="material-icons">arrow_downward</span>
                    </button>
                    <button
                      type="button"
                      class="order-btn remove-btn"
                      on:click={() => toggleExerciseSelection(exerciseId)}
                      title="Remove"
                    >
                      <span class="material-icons">close</span>
                    </button>
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        {:else}
          <p class="empty-hint">No exercises selected. Add exercises below.</p>
        {/if}
      </div>

      <div class="form-group">
        <label>
          Add Exercises <span class="required">*</span>
        </label>
        <div class="exercise-selector">
          {#if $sortedExercises.length === 0}
            <p class="empty-hint">No exercises available. Add exercises first.</p>
          {:else}
            {#each $sortedExercises as exercise (exercise.id)}
              {#if !sessionFormData.selectedExercises.includes(exercise.id)}
                <label class="exercise-checkbox">
                  <input
                    type="checkbox"
                    checked={false}
                    on:change={() => toggleExerciseSelection(exercise.id)}
                  />
                  <span class="exercise-checkbox-label">
                    <span class="exercise-checkbox-name">{exercise.name}</span>
                    <span class="exercise-checkbox-meta">
                      {exercise.type === 'duration'
                        ? formatDuration(exercise.defaultDuration || 0)
                        : `${exercise.defaultReps} × ${exercise.defaultSets}`
                      }
                    </span>
                  </span>
                </label>
              {/if}
            {/each}
          {/if}
        </div>
      </div>
    </form>

    <div slot="footer" class="modal-actions">
      <button class="btn btn-secondary" on:click={() => (showSessionModal = false)}>
        Cancel
      </button>
      <button class="btn btn-primary" on:click={saveSession}>
        {editingSession ? 'Update' : 'Create'} Session
      </button>
    </div>
  </Modal>
{/if}

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
          bind:value={exerciseFormData.name}
          placeholder="e.g., Wall Slides"
          required
        />
      </div>

      <div class="form-group">
        <label for="exercise-type">Exercise Type</label>
        <select id="exercise-type" bind:value={exerciseFormData.type}>
          <option value="duration">Duration (timed exercise)</option>
          <option value="reps">Reps & Sets</option>
        </select>
      </div>

      {#if exerciseFormData.type === 'duration'}
        <div class="form-group">
          <label for="default-duration">Default Duration (seconds)</label>
          <input
            id="default-duration"
            type="number"
            bind:value={exerciseFormData.defaultDuration}
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
          <label for="rep-duration">Duration per Rep (seconds)</label>
          <input
            id="rep-duration"
            type="number"
            bind:value={exerciseFormData.defaultRepDuration}
            min="1"
            step="0.5"
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
      <button class="btn btn-secondary" on:click={() => (showExerciseModal = false)}>
        Cancel
      </button>
      <button class="btn btn-primary" on:click={saveExercise}>
        {editingExercise ? 'Update' : 'Add'} Exercise
      </button>
    </div>
  </Modal>
{/if}

<!-- Delete Exercise Confirmation -->
{#if showDeleteExerciseConfirm && exerciseToDelete}
  <ConfirmDialog
    title="Delete Exercise"
    message="Are you sure you want to delete '{exerciseToDelete.name}'? This action cannot be undone."
    confirmText="Delete"
    cancelText="Cancel"
    confirmVariant="danger"
    on:confirm={deleteExercise}
    on:cancel={() => {
      showDeleteExerciseConfirm = false;
      exerciseToDelete = null;
    }}
  />
{/if}

<!-- Delete Session Confirmation -->
{#if showDeleteSessionConfirm && sessionToDelete}
  <ConfirmDialog
    title="Delete Session"
    message="Are you sure you want to delete '{sessionToDelete.name}'? This action cannot be undone."
    confirmText="Delete"
    cancelText="Cancel"
    confirmVariant="danger"
    on:confirm={deleteSession}
    on:cancel={() => {
      showDeleteSessionConfirm = false;
      sessionToDelete = null;
    }}
  />
{/if}

<!-- App Settings Modal -->
{#if showAppSettingsModal}
  <Modal
    title="App Settings"
    on:close={() => (showAppSettingsModal = false)}
  >
    <form on:submit|preventDefault={saveAppSettings} class="settings-form">
      <div class="form-section">
        <h3>Timing Settings</h3>

        <div class="form-group">
          <label for="default-rep-duration">
            Default Rep Duration (seconds)
          </label>
          <p class="help-text">Default time for each repetition</p>
          <input
            id="default-rep-duration"
            type="number"
            min="1"
            max="30"
            bind:value={appSettingsFormData.defaultRepDuration}
          />
        </div>

        <div class="form-group">
          <label for="start-countdown">
            Start Countdown (seconds)
          </label>
          <p class="help-text">Countdown before each exercise begins</p>
          <input
            id="start-countdown"
            type="number"
            min="0"
            max="30"
            bind:value={appSettingsFormData.startCountdownDuration}
          />
        </div>

        <div class="form-group">
          <label for="end-countdown">
            End Countdown (seconds)
          </label>
          <p class="help-text">Warning countdown at end of exercise</p>
          <input
            id="end-countdown"
            type="number"
            min="0"
            max="30"
            bind:value={appSettingsFormData.endCountdownDuration}
          />
        </div>

        <div class="form-group">
          <label for="end-session-delay">
            End Session Delay (seconds)
          </label>
          <p class="help-text">Delay before session player closes after completion</p>
          <input
            id="end-session-delay"
            type="number"
            min="0"
            max="30"
            bind:value={appSettingsFormData.endSessionDelay}
          />
        </div>

        <div class="form-group">
          <label for="rest-between-sets">
            Rest Between Sets (seconds)
          </label>
          <p class="help-text">Rest period between sets within an exercise</p>
          <input
            id="rest-between-sets"
            type="number"
            min="0"
            max="300"
            bind:value={appSettingsFormData.restBetweenSets}
          />
        </div>

        <div class="form-group">
          <label for="rest-between-exercises">
            Rest Between Exercises (seconds)
          </label>
          <p class="help-text">Rest period between different exercises</p>
          <input
            id="rest-between-exercises"
            type="number"
            min="0"
            max="300"
            bind:value={appSettingsFormData.restBetweenExercises}
          />
        </div>
      </div>

      <div class="form-section">
        <h3>Display Settings</h3>

        <div class="form-group">
          <label for="theme">Theme</label>
          <select id="theme" bind:value={appSettingsFormData.theme}>
            <option value="auto">Auto (System)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div class="form-group">
          <label for="sort-order">Exercise Sort Order</label>
          <select id="sort-order" bind:value={appSettingsFormData.exerciseSortOrder}>
            <option value="alphabetical">Alphabetical</option>
            <option value="dateAdded">Date Added</option>
            <option value="frequency">Frequency</option>
          </select>
        </div>
      </div>
    </form>

    <div slot="footer" class="modal-actions">
      <button
        type="button"
        class="btn btn-secondary"
        on:click={() => (showAppSettingsModal = false)}
      >
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        on:click={saveAppSettings}
      >
        Save Settings
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

  .page-header h1 {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
  }

  .settings-section {
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--divider);
  }

  .settings-section:last-of-type {
    border-bottom: none;
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

  /* Settings Summary */
  .settings-summary {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) 0;
    border-bottom: 1px solid var(--divider);
  }

  .setting-item:last-child {
    border-bottom: none;
  }

  .setting-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .setting-value {
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--text-primary);
  }

  /* Session List */
  .session-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .session-card {
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
    padding: var(--spacing-lg);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--spacing-md);
    box-shadow: var(--shadow);
  }

  .session-info {
    flex: 1;
  }

  .session-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    flex-wrap: wrap;
  }

  .session-name {
    margin: 0;
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--text-primary);
  }

  .default-badge {
    font-size: var(--font-size-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: calc(var(--border-radius) / 2);
    background-color: rgba(76, 175, 80, 0.1);
    color: var(--success-color);
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .default-badge .material-icons {
    font-size: var(--icon-size-sm);
  }

  .session-details {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-sm);
  }

  .exercise-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .exercise-tag {
    font-size: var(--font-size-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: calc(var(--border-radius) / 2);
    background-color: var(--surface);
    color: var(--text-secondary);
  }

  .exercise-tag.more {
    background-color: var(--primary-alpha-10);
    color: var(--primary-color);
  }

  .session-actions {
    display: flex;
    gap: var(--spacing-xs);
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
  .session-form,
  .exercise-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-md);
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

  .form-section {
    margin-bottom: var(--spacing-xl);
  }

  .form-section h3 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
    padding-bottom: var(--spacing-sm);
    border-bottom: 1px solid var(--divider);
  }

  .help-text {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    margin: 0.125rem 0 0 0;
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

  /* Exercise Selector */
  .exercise-selector {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid var(--divider);
    border-radius: var(--border-radius);
    padding: var(--spacing-sm);
  }

  /* Selected Exercises List */
  .selected-exercises-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
    border: 1px solid var(--divider);
    border-radius: var(--border-radius);
    padding: var(--spacing-sm);
    max-height: 400px;
    overflow-y: auto;
  }

  .selected-exercise-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background-color: var(--surface);
    border-radius: var(--border-radius);
    border: 1px solid var(--divider);
  }

  .exercise-order-number {
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

  .exercise-order-info {
    flex: 1;
    min-width: 0;
  }

  .exercise-order-name {
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 2px;
  }

  .exercise-order-meta {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .exercise-order-controls {
    display: flex;
    gap: var(--spacing-xs);
  }

  .order-btn {
    background: none;
    border: 1px solid var(--divider);
    border-radius: var(--border-radius);
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.2s ease;
  }

  .order-btn:hover:not(:disabled) {
    background-color: var(--hover-overlay);
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .order-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .order-btn.remove-btn {
    border-color: var(--error-color);
    color: var(--error-color);
  }

  .order-btn.remove-btn:hover:not(:disabled) {
    background-color: rgba(244, 67, 54, 0.1);
  }

  .order-btn .material-icons {
    font-size: var(--icon-size-sm);
  }

  .exercise-checkbox {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    cursor: pointer;
    border-radius: var(--border-radius);
    transition: background-color 0.2s ease;
  }

  .exercise-checkbox:hover {
    background-color: var(--hover-overlay);
  }

  .exercise-checkbox input[type='checkbox'] {
    margin-top: 0.2rem;
    cursor: pointer;
  }

  .exercise-checkbox-label {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .exercise-checkbox-name {
    font-size: var(--font-size-base);
    color: var(--text-primary);
  }

  .exercise-checkbox-meta {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
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

    .session-card,
    .exercise-card {
      flex-direction: column;
    }

    .session-actions,
    .exercise-actions {
      width: 100%;
      justify-content: flex-end;
    }

    .form-row {
      grid-template-columns: 1fr;
    }
  }
</style>
