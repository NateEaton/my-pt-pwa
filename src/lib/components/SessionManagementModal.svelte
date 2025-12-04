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
  import { createEventDispatcher, onMount } from 'svelte';
  import Modal from './Modal.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import DurationInput from './DurationInput.svelte';
  import { ptState, ptService } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';
  import type { SessionDefinition, SessionExercise, Exercise } from '$lib/types/pt';

  const dispatch = createEventDispatcher();

  // Session form modal state
  let showSessionForm = false;
  let editingSession: SessionDefinition | null = null;

  // Delete confirmation state
  let showDeleteConfirm = false;
  let sessionToDelete: SessionDefinition | null = null;

  // LocalStorage keys for persisting sort preferences
  const SORT_FIELD_KEY = 'session-library-sort-field';
  const SORT_ASC_KEY = 'session-library-sort-asc';

  // Load sort preferences from localStorage
  function loadSortPreferences(): {
    field: 'name' | 'dateCreated';
    asc: boolean;
  } {
    if (typeof window === 'undefined') {
      return { field: 'name', asc: true };
    }

    const savedField = localStorage.getItem(SORT_FIELD_KEY);
    const savedAsc = localStorage.getItem(SORT_ASC_KEY);

    return {
      field: (savedField as 'name' | 'dateCreated') || 'name',
      asc: savedAsc === 'false' ? false : true
    };
  }

  // Save sort preferences to localStorage
  function saveSortPreferences(field: 'name' | 'dateCreated', asc: boolean) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SORT_FIELD_KEY, field);
    localStorage.setItem(SORT_ASC_KEY, String(asc));
  }

  // Search and sort state - load from localStorage
  let searchQuery = '';
  const sortPrefs = loadSortPreferences();
  let sortField: 'name' | 'dateCreated' = sortPrefs.field;
  let sortAsc = sortPrefs.asc;

  // Exercise search in session form
  let exerciseSearchQuery = '';

  // Session form data
  let sessionFormData = {
    name: '',
    selectedExercises: [] as number[],
    isDefault: false,
    autoAdvance: undefined as boolean | undefined,
    pauseBetweenExercises: undefined as number | undefined,
    autoAdvanceSets: undefined as boolean | undefined,
    allowMultiplePerDay: undefined as boolean | undefined
  };

  // Helper to determine if auto-advance is effectively on (for UI disabled states)
  $: resolvedAutoAdvance = sessionFormData.autoAdvance ?? $ptState.settings?.enableAutoAdvance ?? true;

  // Computed: filtered and sorted sessions
  $: filteredSessions = filterAndSortSessions($ptState.sessionDefinitions, searchQuery, sortField, sortAsc);

  function filterAndSortSessions(
    sessions: SessionDefinition[],
    query: string,
    field: 'name' | 'dateCreated',
    ascending: boolean
  ): SessionDefinition[] {
    // Filter by search query
    let filtered = sessions;
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = sessions.filter(session =>
        session.name.toLowerCase().includes(lowerQuery)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'dateCreated':
          comparison = new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime();
          break;
      }

      return ascending ? comparison : -comparison;
    });

    return sorted;
  }

  function toggleSort(field: 'name' | 'dateCreated') {
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

  // ========== Session CRUD Functions ==========

  function openAddSession() {
    editingSession = null;
    resetSessionForm();
    showSessionForm = true;
  }

  function openEditSession(session: SessionDefinition) {
    editingSession = session;
    sessionFormData = {
      name: session.name,
      selectedExercises: session.exercises.map((e: SessionExercise) => e.exerciseId),
      isDefault: session.isDefault,
      autoAdvance: session.autoAdvance,
      pauseBetweenExercises: session.pauseBetweenExercises,
      autoAdvanceSets: session.autoAdvanceSets,
      allowMultiplePerDay: session.allowMultiplePerDay
    };
    showSessionForm = true;
  }

  function resetSessionForm() {
    sessionFormData = {
      name: '',
      selectedExercises: [],
      isDefault: false,
      autoAdvance: undefined,
      pauseBetweenExercises: undefined,
      autoAdvanceSets: undefined,
      allowMultiplePerDay: undefined
    };
  }

  function closeSessionForm() {
    showSessionForm = false;
    resetSessionForm();
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
          isDefault: sessionFormData.isDefault,
          autoAdvance: sessionFormData.autoAdvance,
          pauseBetweenExercises: sessionFormData.pauseBetweenExercises,
          autoAdvanceSets: sessionFormData.autoAdvanceSets,
          allowMultiplePerDay: sessionFormData.allowMultiplePerDay
        };

        await ptService.updateSessionDefinition(updated);
        toastStore.show('Session updated successfully', 'success');
      } else {
        const newSession: Omit<SessionDefinition, 'id'> = {
          name: sessionFormData.name.trim(),
          exercises: sessionExercises,
          isDefault: sessionFormData.isDefault,
          autoAdvance: sessionFormData.autoAdvance,
          pauseBetweenExercises: sessionFormData.pauseBetweenExercises,
          autoAdvanceSets: sessionFormData.autoAdvanceSets,
          allowMultiplePerDay: sessionFormData.allowMultiplePerDay,
          dateCreated: new Date().toISOString()
        };

        await ptService.addSessionDefinition(newSession);
        toastStore.show('Session created successfully', 'success');
      }

      await reloadData();
      closeSessionForm();
    } catch (error) {
      console.error('Failed to save session:', error);
      toastStore.show('Failed to save session', 'error');
    }
  }

  function confirmDeleteSession(session: SessionDefinition, event: Event) {
    event.stopPropagation();
    sessionToDelete = session;
    showDeleteConfirm = true;
  }

  async function deleteSession() {
    if (!sessionToDelete) return;

    try {
      await ptService.deleteSessionDefinition(sessionToDelete.id);
      toastStore.show('Session deleted', 'success');
      await reloadData();
      showDeleteConfirm = false;
      sessionToDelete = null;
    } catch (error) {
      console.error('Failed to delete session:', error);
      toastStore.show('Failed to delete session', 'error');
    }
  }

  async function reloadData() {
    const sessionDefinitions = await ptService.getSessionDefinitions();
    ptState.update((state) => ({ ...state, sessionDefinitions }));
  }

  // ========== Helper Functions ==========

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

  function getExerciseById(exerciseId: number): Exercise | undefined {
    return $ptState.exercises.find(e => e.id === exerciseId);
  }

  // Auto-open Add dialog if no sessions exist
  onMount(() => {
    if ($ptState.sessionDefinitions.length === 0) {
      openAddSession();
    }
  });
</script>

<Modal fullScreen={true} title="Session Library" iosStyle={true} on:close={handleClose}>
  <div slot="headerActions">
    <button class="icon-button add-button" on:click={openAddSession} aria-label="Create session">
      <span class="material-icons">add</span>
    </button>
  </div>

  <div class="management-content">
    <!-- Search Bar -->
    <div class="search-bar">
      <span class="material-icons search-icon">search</span>
      <input
        type="text"
        placeholder="Search sessions..."
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
      <button class="sort-button" on:click={() => toggleSort('dateCreated')}>
        <span>Created</span>
        <span class="material-icons sort-icon">
          {sortField === 'dateCreated' ? (sortAsc ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
        </span>
      </button>
    </div>

    <!-- Sessions List -->
    {#if filteredSessions.length === 0}
      <div class="empty-state">
        {#if searchQuery}
          <span class="material-icons empty-icon">search_off</span>
          <p>No sessions found</p>
          <p class="empty-hint">Try a different search term</p>
        {:else}
          <span class="material-icons empty-icon">playlist_add</span>
          <p>No session definitions yet</p>
          <p class="empty-hint">Create a session to organize your exercises</p>
        {/if}
      </div>
    {:else}
      <div class="session-list">
        {#each filteredSessions as session (session.id)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="session-card" on:click={() => openEditSession(session)}>
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
                class="icon-button delete"
                on:click={(e) => confirmDeleteSession(session, e)}
                aria-label="Delete session"
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

<!-- Session Form Modal (Nested) -->
{#if showSessionForm}
  <Modal
    title={editingSession ? 'Edit Session' : 'New Session'}
    iosStyle={true}
    on:close={closeSessionForm}
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
        <label class="checkbox-label">
          <input
            type="checkbox"
            checked={resolvedAutoAdvance}
            on:change={(e) => sessionFormData.autoAdvance = e.currentTarget.checked}
          />
          <span class="checkbox-text">
            <span class="checkbox-title">Auto-Advance</span>
            <span class="checkbox-description">
              Automatically advance to next exercise
              {#if sessionFormData.autoAdvance === undefined}
                (using app default: {$ptState.settings?.enableAutoAdvance ? 'enabled' : 'disabled'})
              {/if}
            </span>
          </span>
        </label>
      </div>

      <div class="form-group rest-between-exercises-group">
        <!-- Existing Rest Between Exercises Setting -->
        <div class="setting-item" class:disabled={!resolvedAutoAdvance}>
          <div class="setting-info">
            <span class="setting-label">Rest Between Exercises</span>
          </div>
          <div class="setting-control">
            <DurationInput
              bind:value={sessionFormData.pauseBetweenExercises}
              min={0}
              max={120}
              placeholder={`${$ptState.settings?.pauseBetweenExercises ?? 20}s`}
              disabled={!resolvedAutoAdvance}
            />
          </div>
        </div>

        <!-- NEW: Auto-Start Sets Setting (Visible/Enabled when AutoAdvance is OFF) -->
        <div class="setting-item" class:disabled={resolvedAutoAdvance}>
          <div class="setting-info">
            <span class="setting-label">Auto-Start Next Set</span>
            <span class="setting-description" style="font-size: var(--font-size-xs); color: var(--text-secondary);">
              {#if resolvedAutoAdvance}
                Controlled by Auto-Advance
              {:else}
                {#if sessionFormData.autoAdvanceSets === undefined}
                  (Default: {$ptState.settings?.autoAdvanceSets ? 'On' : 'Off'})
                {/if}
              {/if}
            </span>
          </div>
          <div class="setting-control">
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                checked={sessionFormData.autoAdvanceSets ?? $ptState.settings?.autoAdvanceSets ?? true} 
                on:change={(e) => sessionFormData.autoAdvanceSets = e.currentTarget.checked}
                disabled={resolvedAutoAdvance}
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <h4 class="form-label">
          Session Exercises {#if sessionFormData.selectedExercises.length > 0}({sessionFormData.selectedExercises.length}){/if}
        </h4>
        {#if sessionFormData.selectedExercises.length > 0}
          <div class="selected-exercises-list">
            {#each sessionFormData.selectedExercises as exerciseId, index (exerciseId)}
              {@const exercise = getExerciseById(exerciseId)}
              {#if exercise}
                <div class="selected-exercise-item">
                  <div class="exercise-order-number">{index + 1}</div>
                  <div class="exercise-order-info">
                    <div class="exercise-order-name">{exercise.name}</div>
                    <div class="exercise-order-meta">
                      {exercise.type === 'duration'
                        ? formatDuration(exercise.defaultDuration || 0)
                        : `${exercise.defaultSets} ${exercise.defaultSets === 1 ? 'set' : 'sets'} × ${exercise.defaultReps} reps`
                      }
                      {#if exercise.sideMode && exercise.sideMode !== 'bilateral'}
                        <span class="mode-badge">{exercise.sideMode === 'unilateral' ? 'Unilateral' : 'Alternating'}</span>
                      {/if}
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
        <h4 class="form-label">Available Exercises</h4>

        <!-- Exercise Search -->
        <div class="exercise-search-bar">
          <span class="material-icons search-icon">search</span>
          <input
            type="text"
            placeholder="Search exercises..."
            bind:value={exerciseSearchQuery}
            class="exercise-search-input"
          />
          {#if exerciseSearchQuery}
            <button
              class="clear-exercise-search"
              on:click={() => (exerciseSearchQuery = '')}
              aria-label="Clear search"
            >
              <span class="material-icons">close</span>
            </button>
          {/if}
        </div>

        <div class="exercise-selector">
          {#if $ptState.exercises.length === 0}
            <p class="empty-hint">No exercises available. Add exercises first.</p>
          {:else}
            {@const availableExercises = $ptState.exercises
              .filter(e => !sessionFormData.selectedExercises.includes(e.id))
              .filter(e => !exerciseSearchQuery.trim() || e.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()))
            }
            {#if availableExercises.length === 0}
              {#if exerciseSearchQuery.trim()}
                <p class="empty-hint" style="text-align: center;">
                  <span class="material-icons" style="vertical-align: middle; font-size: 1.2rem;">search_off</span>
                  No exercises match your search
                </p>
              {:else}
                <p class="empty-hint" style="text-align: center; color: var(--success-color);">
                  <span class="material-icons" style="vertical-align: middle; font-size: 1.2rem;">check_circle</span>
                  All exercises have been added to this session
                </p>
              {/if}
            {:else}
              {#each availableExercises as exercise (exercise.id)}
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
                        : `${exercise.defaultSets} ${exercise.defaultSets === 1 ? 'set' : 'sets'} × ${exercise.defaultReps} reps`
                      }
                      {#if exercise.sideMode && exercise.sideMode !== 'bilateral'}
                        <span class="mode-badge">{exercise.sideMode === 'unilateral' ? 'Unilateral' : 'Alternating'}</span>
                      {/if}
                    </span>
                  </span>
                </label>
              {/each}
            {/if}
          {/if}
        </div>
      </div>

      <div class="form-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            checked={sessionFormData.allowMultiplePerDay ?? false}
            on:change={(e) => sessionFormData.allowMultiplePerDay = e.currentTarget.checked}
          />
          <span class="checkbox-text">
            <span class="checkbox-title">Allow Multiple Per Day</span>
            <span class="checkbox-description">
              Enable this for sessions you plan to do more than once daily (e.g., stretching routines)
            </span>
          </span>
        </label>
      </div>
    </form>

    <div slot="footer" class="modal-actions">
      <button class="btn btn-secondary" on:click={closeSessionForm} type="button">
        Cancel
      </button>
      <button class="btn btn-primary" on:click={saveSession} type="button">
        {editingSession ? 'Save' : 'Create'}
      </button>
    </div>
  </Modal>
{/if}

<!-- Delete Confirmation Dialog -->
{#if showDeleteConfirm && sessionToDelete}
  <ConfirmDialog
    title="Delete Session"
    message="Are you sure you want to delete '{sessionToDelete.name}'? This will not affect completed journal entries."
    confirmText="Delete"
    confirmClass="danger"
    on:confirm={deleteSession}
    on:cancel={() => {
      showDeleteConfirm = false;
      sessionToDelete = null;
    }}
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

  /* Session List */
  .session-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-md) var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .session-card {
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

  .session-card:hover {
    background-color: var(--surface-variant);
    border-color: var(--primary-color);
  }

  .session-info {
    flex: 1;
    min-width: 0;
  }

  .session-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
  }

  .session-name {
    font-size: var(--font-size-base);
    font-weight: 500;
    color: var(--text-primary);
    margin: 0;
  }

  .session-details {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-sm);
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

  .exercise-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
  }

  .exercise-tag {
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--primary-alpha-10);
    color: var(--primary-color);
    border-radius: calc(var(--border-radius) / 2);
    font-size: var(--font-size-xs);
    white-space: nowrap;
  }

  .exercise-tag.more {
    background-color: var(--surface-variant);
    color: var(--text-secondary);
  }

  .session-actions {
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

  /* Session Form */
  .session-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
  }

  /* Component-specific form input styling */
  .form-group input[type="text"] {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--divider);
    border-radius: var(--border-radius);
    background: var(--surface);
    color: var(--text-primary);
    font-size: var(--font-size-base);
  }

  .form-group input[type="text"]:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-alpha-10);
  }

  .selected-exercises-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-sm);
  }

  .selected-exercise-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm);
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
  }

  .exercise-order-number {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--primary-color);
    color: white;
    border-radius: 50%;
    font-weight: 500;
    font-size: var(--font-size-sm);
    flex-shrink: 0;
  }

  .exercise-order-info {
    flex: 1;
    min-width: 0;
  }

  .exercise-order-name {
    font-weight: 500;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .exercise-order-meta {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  .exercise-order-controls {
    display: flex;
    gap: var(--spacing-xs);
  }

  .order-btn {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface);
    border: 1px solid var(--divider);
    border-radius: var(--border-radius);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }

  .order-btn:hover:not(:disabled) {
    background-color: var(--hover-overlay);
    color: var(--text-primary);
  }

  .order-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .order-btn.remove-btn:hover:not(:disabled) {
    background-color: rgba(244, 67, 54, 0.1);
    color: var(--error-color);
    border-color: var(--error-color);
  }

  .order-btn .material-icons {
    font-size: var(--icon-size-sm);
  }

  /* Exercise Search Bar */
  .exercise-search-bar {
    position: relative;
    margin-bottom: var(--spacing-sm);
  }

  .exercise-search-bar .search-icon {
    position: absolute;
    left: var(--spacing-sm);
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-hint);
    font-size: var(--icon-size-md);
    pointer-events: none;
  }

  .exercise-search-input {
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    padding-left: calc(var(--spacing-md) + var(--icon-size-md) + var(--spacing-sm));
    border: 1px solid var(--divider);
    border-radius: var(--border-radius);
    background: var(--surface);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .exercise-search-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-alpha-10);
  }

  .clear-exercise-search {
    position: absolute;
    right: var(--spacing-sm);
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

  .clear-exercise-search:hover {
    color: var(--text-secondary);
  }

  .clear-exercise-search .material-icons {
    font-size: var(--icon-size-sm);
  }

  .exercise-selector {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid var(--divider);
    border-radius: var(--border-radius);
    background: var(--surface);
  }

  .exercise-checkbox {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    border-bottom: 1px solid var(--divider);
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .exercise-checkbox:last-child {
    border-bottom: none;
  }

  .exercise-checkbox:hover {
    background-color: var(--surface-variant);
  }

  .exercise-checkbox input[type="checkbox"] {
    cursor: pointer;
    accent-color: var(--primary-color);
  }

  .exercise-checkbox-label {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .exercise-checkbox-name {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
  }

  .exercise-checkbox-meta {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
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

  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    cursor: pointer;
    padding: var(--spacing-md);
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
  }

  .checkbox-label input[type="checkbox"] {
    margin-top: 0.25rem;
    cursor: pointer;
    accent-color: var(--primary-color);
  }

  .checkbox-text {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .checkbox-title {
    font-size: var(--font-size-base);
    font-weight: 500;
    color: var(--text-primary);
  }

  .checkbox-description {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .rest-between-exercises-group {
    margin-left: var(--spacing-xl);
    margin-top: calc(-1 * var(--spacing-md));
  }

  /* Component-specific setting item styling (card-based with border) */
  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    background-color: var(--surface);
    border-radius: var(--border-radius);
    gap: var(--spacing-md);
    border-left: 3px solid var(--primary-color);
  }

  .setting-item.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    flex: 1;
  }

  .setting-control {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
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

    .session-list {
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .session-card {
      padding: var(--spacing-sm);
    }

    .setting-item {
      flex-direction: column;
      align-items: flex-start;
    }

    .setting-control {
      align-self: flex-end;
    }
  }
</style>
