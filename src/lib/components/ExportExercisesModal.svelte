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
  import { ptState, ptService } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';
  import { exportExercisesToCSV } from '$lib/utils/csvExercises';

  const dispatch = createEventDispatcher();

  let exercisesCount = 0;
  let selectedFormat: 'csv' | 'json' = 'csv';

  onMount(async () => {
    exercisesCount = $ptState.exercises.length;
  });

  function handleClose() {
    dispatch('close');
  }

  async function handleExport() {
    try {
      if (exercisesCount === 0) {
        toastStore.show('No exercises to export', 'error');
        return;
      }

      const exercises = $ptState.exercises;

      let blob: Blob;
      let filename: string;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

      if (selectedFormat === 'csv') {
        // Export as CSV
        const csv = exportExercisesToCSV(exercises);
        // Add UTF-8 BOM for Excel compatibility
        const bom = '\ufeff';
        blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
        filename = `my-pt-exercises-${timestamp}.csv`;
      } else {
        // Export as JSON (exercises only)
        const exportData = {
          version: 1,
          exportType: 'exercises',
          exportDate: new Date().toISOString(),
          data: {
            exercises
          }
        };
        const json = JSON.stringify(exportData, null, 2);
        blob = new Blob([json], { type: 'application/json' });
        filename = `my-pt-exercises-${timestamp}.json`;
      }

      // Create download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toastStore.show(`Exported ${exercisesCount} exercises`, 'success');
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

    <!-- Exercise Count -->
    <div class="export-summary">
      <div class="summary-item">
        <span class="material-icons">fitness_center</span>
        <span class="summary-text">
          {exercisesCount} {exercisesCount === 1 ? 'exercise' : 'exercises'}
        </span>
      </div>
    </div>

    <!-- Format Selection -->
    <div class="format-selection">
      <h4>Export Format</h4>

      <label class="format-option" class:selected={selectedFormat === 'csv'}>
        <input type="radio" name="format" value="csv" bind:group={selectedFormat} />
        <div class="format-details">
          <div class="format-header">
            <span class="material-icons">table_chart</span>
            <span class="format-name">CSV (Spreadsheet)</span>
          </div>
          <p class="format-description">
            Best for editing in Excel or Google Sheets. Easy to review and share.
          </p>
        </div>
      </label>

      <label class="format-option" class:selected={selectedFormat === 'json'}>
        <input type="radio" name="format" value="json" bind:group={selectedFormat} />
        <div class="format-details">
          <div class="format-header">
            <span class="material-icons">code</span>
            <span class="format-name">JSON (App Format)</span>
          </div>
          <p class="format-description">
            Technical format preserving all data structure. For developers.
          </p>
        </div>
      </label>
    </div>

    {#if exercisesCount === 0}
      <div class="info-box warning">
        <span class="material-icons">info</span>
        <p>You don't have any exercises to export. Create some exercises first!</p>
      </div>
    {:else}
      <div class="info-box">
        <span class="material-icons">info</span>
        <p>
          This exports <strong>only your exercises</strong>. Sessions, journal entries, and
          settings are not included. Use "Backup" for a complete backup.
        </p>
      </div>
    {/if}
  </div>

  <div slot="footer" class="modal-actions">
    <button class="btn btn-secondary" on:click={handleClose} type="button">Cancel</button>
    <button
      class="btn btn-primary"
      on:click={handleExport}
      type="button"
      disabled={exercisesCount === 0}
    >
      <span class="material-icons">file_download</span>
      Export
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
</style>
