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
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import { ptState } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';
  import { exportExercisesToCSV } from '$lib/utils/csvExercises';
  import type { Exercise } from '$lib/types';

  const dispatch = createEventDispatcher();

  export let show = false; // or however you handle modal visibility

  // 1. Define the timestamp and default filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  let fileName = `my-pt-exercises-${timestamp}`;

  // Your existing state for format selection
  let selectedFormat: 'csv' | 'json' = 'csv';

  // Selection state - track which exercises are selected for export
  let selectedExerciseIds = new Set<number>();

  // Initialize selection with all exercises when exercises change
  $: if ($ptState.exercises.length > 0 && selectedExerciseIds.size === 0) {
    selectedExerciseIds = new Set($ptState.exercises.map(ex => ex.id));
  }

  $: exercisesCount = $ptState.exercises.length;
  $: selectedCount = selectedExerciseIds.size;
  $: allSelected = selectedCount === exercisesCount && exercisesCount > 0;

  function handleClose() {
    dispatch('close');
  }

  function toggleAllSelection() {
    if (allSelected) {
      // Deselect all
      selectedExerciseIds = new Set();
    } else {
      // Select all
      selectedExerciseIds = new Set($ptState.exercises.map(ex => ex.id));
    }
  }

  function toggleExercise(exerciseId: number) {
    const newSet = new Set(selectedExerciseIds);
    if (newSet.has(exerciseId)) {
      newSet.delete(exerciseId);
    } else {
      newSet.add(exerciseId);
    }
    selectedExerciseIds = newSet;
  }

  async function handleExport() {
    try {
      if (exercisesCount === 0) {
        toastStore.show('No exercises to export', 'error');
        return;
      }

      if (selectedCount === 0) {
        toastStore.show('Please select at least one exercise to export', 'error');
        return;
      }

      // Filter to only selected exercises
      const exercises = $ptState.exercises.filter(ex => selectedExerciseIds.has(ex.id));
      let blob: Blob;

      // 2. Use 'fileName' (from the input) and 'selectedFormat' (from the radio buttons)
      const cleanName = fileName.replace(/\.(csv|json)$/i, '');
      const finalFilename = `${cleanName}.${selectedFormat}`;

      if (selectedFormat === 'csv') {
        const csv = exportExercisesToCSV(exercises);
        const bom = '\ufeff';
        blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
      } else {
        const exportData = {
          version: 1,
          exportType: 'exercises',
          exportDate: new Date().toISOString(),
          data: { exercises }
        };
        const json = JSON.stringify(exportData, null, 2);
        blob = new Blob([json], { type: 'application/json' });
      }

      // Create download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalFilename; // Uses the corrected name
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toastStore.show(`Exported ${selectedCount} ${selectedCount === 1 ? 'exercise' : 'exercises'}`, 'success');
      handleClose();
    } catch (error) {
      console.error('Failed to export exercises:', error);
      toastStore.show('Failed to export exercises', 'error');
    }
  }
</script>

<Modal fullScreen={true} title="Export Exercises" iosStyle={true} on:close={handleClose}>
  <div class="export-content">
    <p class="modal-description">
      Export your exercise library to share with others or backup just your exercises.
    </p>

    <div class="stats-card">
      <span class="material-icons">fitness_center</span>
      <div class="stats-info">
        <span class="stats-value">{selectedCount} of {exercisesCount}</span>
        <span class="stats-label">{selectedCount === 1 ? 'exercise' : 'exercises'} selected</span>
      </div>
    </div>

    <!-- Exercise Selection Section -->
    {#if exercisesCount > 0}
      <div class="selection-section">
        <div class="selection-header">
          <h3>Select Exercises to Export</h3>
          <button
            class="btn-text"
            on:click={toggleAllSelection}
            type="button"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div class="exercise-list">
          {#each $ptState.exercises as exercise (exercise.id)}
            <label class="exercise-item">
              <input
                type="checkbox"
                checked={selectedExerciseIds.has(exercise.id)}
                on:change={() => toggleExercise(exercise.id)}
              />
              <div class="exercise-info">
                <span class="exercise-name">{exercise.name}</span>
                <span class="exercise-type-badge" class:duration={exercise.type === 'duration'}>
                  {exercise.type}
                </span>
              </div>
            </label>
          {/each}
        </div>
      </div>
    {/if}

    <!-- File Name Input Section -->
    <div class="input-section">
      <!-- Changed from <label> to <h3> to match "Export Format" -->
      <h3>File Name</h3>
      
      <div class="input-wrapper">
        <input 
          type="text" 
          id="filename" 
          bind:value={fileName} 
          autocomplete="off"
          spellcheck="false"
          aria-label="File Name" 
        />
        <span class="extension-badge">.{selectedFormat}</span>
      </div>
      
      <p class="input-helper">
        Enter a custom name or keep the default (timestamp added automatically)
      </p>
    </div>
    
    <h3>Export Format</h3>
    <div class="format-options">
      <label class="format-option" class:selected={selectedFormat === 'csv'}>
        <input type="radio" name="format" value="csv" bind:group={selectedFormat} />
        <span class="material-icons">table_chart</span>
        <div class="format-details">
          <strong>CSV (Spreadsheet)</strong>
          <span>Best for editing in Excel or Google Sheets. Easy to review and share.</span>
        </div>
      </label>

      <label class="format-option" class:selected={selectedFormat === 'json'}>
        <input type="radio" name="format" value="json" bind:group={selectedFormat} />
        <span class="material-icons">code</span>
        <div class="format-details">
          <strong>JSON (App Format)</strong>
          <span>Technical format preserving all data structure. For developers.</span>
        </div>
      </label>
    </div>

  </div>
  
  <div slot="footer" class="modal-actions">
    <button class="btn btn-secondary" on:click={handleClose}>Cancel</button>
    <button
      class="btn btn-primary"
      on:click={handleExport}
      disabled={selectedCount === 0}
    >
      <span class="material-icons">file_download</span>
      Export {selectedCount > 0 ? `(${selectedCount})` : ''}
    </button>
  </div>
</Modal>

<style>
  .export-content {
    padding: 0 1rem 1rem;
  }

  .modal-description {
    color: var(--text-secondary);
    margin: 0 0 1.5rem;
    line-height: 1.5;
  }

  .export-summary {
    background: var(--surface-variant);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .summary-item .material-icons {
    color: var(--primary-color);
    font-size: 24px;
  }

  .summary-text {
    font-size: 1rem;
    font-weight: 500;
  }

  .format-selection h4 {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin: 0 0 1rem;
    letter-spacing: 0.5px;
  }

  .format-option {
    display: block;
    border: 2px solid var(--border-color);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .format-option:hover {
    border-color: var(--primary-color);
    background: var(--surface-variant);
  }

  .format-option.selected {
    border-color: var(--primary-color);
    background: var(--primary-alpha-10);
  }

  .format-option input[type='radio'] {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .format-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .format-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .format-header .material-icons {
    color: var(--primary-color);
    font-size: 24px;
  }

  .format-name {
    font-weight: 600;
    font-size: 1rem;
  }

  .format-description {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin: 0;
    line-height: 1.4;
  }

  .info-box {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--primary-alpha-10);
    border: 1px solid var(--primary-alpha-20);
    border-radius: 8px;
    margin-top: 1.5rem;
  }

  .info-box.warning {
    background: rgba(245, 124, 0, 0.1);
    border-color: rgba(245, 124, 0, 0.2);
  }

  .info-box .material-icons {
    color: var(--primary-color);
    font-size: 20px;
    flex-shrink: 0;
  }

  .info-box.warning .material-icons {
    color: #f57c00;
  }

  .info-box p {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--text-secondary);
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .btn {
    flex: 1;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.2s;
  }

  .btn-secondary {
    background: var(--surface-variant);
    color: var(--text-primary);
  }

  .btn-secondary:hover {
    background: var(--border-color);
  }

  .btn-primary {
    background: var(--primary-color);
    color: white;
  }

  .btn-primary:hover {
    background: var(--primary-color-dark);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn .material-icons {
    font-size: 20px;
  }

  .input-section {
    margin-top: 2rem;    /* Adds the whitespace you requested */
    margin-bottom: 1.5rem;
  }

  .input-wrapper {
    display: flex;
    align-items: center;
    background: var(--surface);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0 0.75rem;
    height: 48px;
    transition: all 0.2s ease;
  }

  .input-wrapper:focus-within {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-alpha-10);
  }

  .input-wrapper input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 1rem;
    color: var(--text-primary);
    padding: 0.5rem 0;
    outline: none;
    width: 100%;
    min-width: 0;
  }

  .extension-badge {
    color: var(--text-secondary);
    font-weight: 500;
    font-size: 0.95rem;
    padding-left: 0.5rem;
    user-select: none;
    flex-shrink: 0;
  }

  .input-helper {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  /* Exercise Selection Section */
  .selection-section {
    margin: 1.5rem 0;
  }

  .selection-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .selection-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .btn-text {
    background: none;
    border: none;
    color: var(--primary-color);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .btn-text:hover {
    background: var(--primary-alpha-10);
  }

  .btn-text:active {
    background: var(--primary-alpha-20);
  }

  .exercise-list {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--surface);
  }

  .exercise-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    transition: background 0.15s;
    min-height: 44px; /* Ensure minimum touch target */
  }

  .exercise-item:last-child {
    border-bottom: none;
  }

  .exercise-item:hover {
    background: var(--surface-variant);
  }

  .exercise-item input[type='checkbox'] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    flex-shrink: 0;
    accent-color: var(--primary-color);
  }

  .exercise-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0; /* Allow text to truncate */
  }

  .exercise-name {
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .exercise-type-badge {
    background: var(--primary-alpha-10);
    color: var(--primary-color);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .exercise-type-badge.duration {
    background: rgba(76, 175, 80, 0.1);
    color: #4caf50;
  }

  .stats-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface-variant);
    border-radius: 12px;
    margin-bottom: 1.5rem;
  }

  .stats-card .material-icons {
    font-size: 32px;
    color: var(--primary-color);
  }

  .stats-info {
    display: flex;
    flex-direction: column;
  }

  .stats-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .stats-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

</style>
