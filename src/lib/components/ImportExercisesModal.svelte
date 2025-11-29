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
  import { ptState, ptService } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';
  import { importExercisesFromCSV, detectDuplicates } from '$lib/utils/csvExercises';
  import type { Exercise } from '$lib/types/pt';

  const dispatch = createEventDispatcher();

  let fileInput: HTMLInputElement;
  let selectedFile: File | null = null;
  let isProcessing = false;
  let importError = '';

  // Preview state
  let showPreview = false;
  let parsedExercises: Omit<Exercise, 'id' | 'dateAdded'>[] = [];
  let newExercises: Omit<Exercise, 'id' | 'dateAdded'>[] = [];
  let duplicates: Array<{
    imported: Omit<Exercise, 'id' | 'dateAdded'>;
    existing: Exercise;
  }> = [];
  let parseErrors: string[] = [];
  let importMode: 'skip' | 'all' = 'skip';

  function handleClose() {
    dispatch('close');
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      selectedFile = file;
      importError = '';
      showPreview = false;
      processFile(file);
    }
  }

  async function processFile(file: File) {
    isProcessing = true;
    importError = '';
    parseErrors = [];
    parsedExercises = [];
    newExercises = [];
    duplicates = [];

    try {
      const content = await file.text();

      // Auto-detect format
      const isCSV = file.name.endsWith('.csv') || content.trim().startsWith('name,') || content.includes('\n') && !content.trim().startsWith('{');
      const isJSON = file.name.endsWith('.json') || content.trim().startsWith('{');

      if (isCSV) {
        // Parse CSV
        const result = importExercisesFromCSV(content);
        parsedExercises = result.exercises;
        parseErrors = result.errors;

        if (result.errors.length > 0 && result.exercises.length === 0) {
          importError = 'Failed to parse CSV file. See errors below.';
          isProcessing = false;
          return;
        }
      } else if (isJSON) {
        // Parse JSON
        try {
          const data = JSON.parse(content);

          // Check if it's an exercise export or full backup
          if (data.exportType === 'exercises' && data.data?.exercises) {
            parsedExercises = data.data.exercises.map(({ id, dateAdded, ...rest }: Exercise) => rest);
          } else if (data.data?.exercises) {
            // Full backup format
            parsedExercises = data.data.exercises.map(({ id, dateAdded, ...rest }: Exercise) => rest);
          } else {
            importError = 'Invalid JSON format. Missing exercises data.';
            isProcessing = false;
            return;
          }
        } catch (error) {
          importError = `Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`;
          isProcessing = false;
          return;
        }
      } else {
        importError = 'Unsupported file format. Please use CSV or JSON files.';
        isProcessing = false;
        return;
      }

      // Detect duplicates
      const result = detectDuplicates(parsedExercises, $ptState.exercises);
      newExercises = result.newExercises;
      duplicates = result.duplicates;

      showPreview = true;
    } catch (error) {
      console.error('Failed to process file:', error);
      importError = error instanceof Error ? error.message : 'Failed to process file';
    } finally {
      isProcessing = false;
    }
  }

  async function handleImport() {
    if (newExercises.length === 0 && importMode === 'skip') {
      toastStore.show('No new exercises to import', 'info');
      return;
    }

    isProcessing = true;

    try {
      let exercisesToImport: Omit<Exercise, 'id' | 'dateAdded'>[];

      if (importMode === 'skip') {
        exercisesToImport = newExercises;
      } else {
        // Import all (including duplicates with renamed names)
        exercisesToImport = [];
        for (const exercise of parsedExercises) {
          // Check if duplicate
          const isDuplicate = duplicates.some((d) => d.imported === exercise);
          if (isDuplicate) {
            // Rename duplicate
            exercisesToImport.push({
              ...exercise,
              name: `${exercise.name} (imported)`
            });
          } else {
            exercisesToImport.push(exercise);
          }
        }
      }

      // Import exercises
      let importedCount = 0;
      for (const exercise of exercisesToImport) {
        await ptService.addExercise({
          ...exercise,
          dateAdded: new Date().toISOString()
        });
        importedCount++;
      }

      // Reload exercises
      const exercises = await ptService.getExercises();
      ptState.update((state) => ({ ...state, exercises }));

      toastStore.show(`Imported ${importedCount} exercises`, 'success');
      handleClose();
    } catch (error) {
      console.error('Failed to import exercises:', error);
      toastStore.show('Failed to import exercises', 'error');
    } finally {
      isProcessing = false;
    }
  }

  function resetImport() {
    selectedFile = null;
    showPreview = false;
    parsedExercises = [];
    newExercises = [];
    duplicates = [];
    parseErrors = [];
    importError = '';
    if (fileInput) {
      fileInput.value = '';
    }
  }
</script>

<Modal fullScreen={true} title="Import Exercises" iosStyle={true} on:close={handleClose}>
  <div class="import-content">
    {#if !showPreview}
      <!-- File Selection -->
      <p class="modal-description">
        Import exercises from a CSV or JSON file. You can import exercises exported from this app
        or create your own CSV file.
      </p>

      <div class="file-input-container">
        <input
          type="file"
          accept=".csv,.json"
          on:change={handleFileSelect}
          bind:this={fileInput}
          id="file-input"
        />
        <label for="file-input" class="file-input-label">
          <span class="material-icons">upload_file</span>
          <span>{selectedFile ? selectedFile.name : 'Choose CSV or JSON file'}</span>
        </label>
      </div>

      {#if isProcessing}
        <div class="processing-indicator">
          <span class="material-icons spinning">sync</span>
          <span>Processing file...</span>
        </div>
      {/if}

      {#if importError}
        <div class="error-box">
          <span class="material-icons">error</span>
          <div>
            <p><strong>Error:</strong> {importError}</p>
            {#if parseErrors.length > 0}
              <ul class="error-list">
                {#each parseErrors as error}
                  <li>{error}</li>
                {/each}
              </ul>
            {/if}
          </div>
        </div>
      {/if}

      <div class="info-box">
        <span class="material-icons">info</span>
        <div>
          <p><strong>CSV Format:</strong></p>
          <p>
            Create a CSV with columns: name, type, defaultDuration, defaultReps, defaultSets,
            defaultRepDuration, pauseBetweenReps, restBetweenSets, sideMode, instructions
          </p>
        </div>
      </div>
    {:else}
      <!-- Import Preview -->
      <div class="preview-header">
        <h3>Import Preview</h3>
        <button class="btn-text" on:click={resetImport} type="button">
          <span class="material-icons">close</span>
          Change file
        </button>
      </div>

      <div class="preview-summary">
        <div class="summary-item">
          <span class="material-icons success">check_circle</span>
          <span><strong>{newExercises.length}</strong> new exercises</span>
        </div>

        {#if duplicates.length > 0}
          <div class="summary-item">
            <span class="material-icons warning">warning</span>
            <span><strong>{duplicates.length}</strong> possible duplicates</span>
          </div>
        {/if}

        {#if parseErrors.length > 0}
          <div class="summary-item">
            <span class="material-icons error">error</span>
            <span><strong>{parseErrors.length}</strong> errors (rows skipped)</span>
          </div>
        {/if}
      </div>

      {#if duplicates.length > 0}
        <!-- Duplicate Handling -->
        <div class="duplicate-section">
          <h4>Duplicate Exercises Found</h4>
          <p class="section-description">
            The following exercises have the same name as existing exercises:
          </p>

          <div class="duplicate-list">
            {#each duplicates.slice(0, 5) as dup}
              <div class="duplicate-item">
                <span class="material-icons">content_copy</span>
                <span>{dup.imported.name}</span>
              </div>
            {/each}
            {#if duplicates.length > 5}
              <div class="duplicate-more">
                And {duplicates.length - 5} more...
              </div>
            {/if}
          </div>

          <div class="import-mode-selection">
            <label class="mode-option" class:selected={importMode === 'skip'}>
              <input type="radio" name="mode" value="skip" bind:group={importMode} />
              <div class="mode-details">
                <strong>Skip duplicates</strong>
                <span>Import only {newExercises.length} new exercises</span>
              </div>
            </label>

            <label class="mode-option" class:selected={importMode === 'all'}>
              <input type="radio" name="mode" value="all" bind:group={importMode} />
              <div class="mode-details">
                <strong>Import all</strong>
                <span>Import {parsedExercises.length} exercises (duplicates renamed)</span>
              </div>
            </label>
          </div>
        </div>
      {/if}

      {#if parseErrors.length > 0}
        <details class="errors-details">
          <summary>{parseErrors.length} errors during parsing (click to view)</summary>
          <ul class="error-list">
            {#each parseErrors as error}
              <li>{error}</li>
            {/each}
          </ul>
        </details>
      {/if}
    {/if}
  </div>

  <div slot="footer" class="modal-actions">
    <button class="btn btn-secondary" on:click={handleClose} type="button">Cancel</button>
    {#if showPreview}
      <button
        class="btn btn-primary"
        on:click={handleImport}
        type="button"
        disabled={isProcessing || (newExercises.length === 0 && importMode === 'skip')}
      >
        {#if isProcessing}
          <span class="material-icons spinning">sync</span>
          Importing...
        {:else}
          <span class="material-icons">file_download</span>
          Import {importMode === 'skip' ? newExercises.length : parsedExercises.length} Exercises
        {/if}
      </button>
    {/if}
  </div>
</Modal>

<style>
  .import-content {
    padding: 0 1rem 1rem;
  }

  .modal-description {
    color: var(--text-secondary);
    margin: 0 0 1.5rem;
    line-height: 1.5;
  }

  .file-input-container {
    margin-bottom: 1.5rem;
  }

  #file-input {
    display: none;
  }

  .file-input-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1.5rem;
    border: 2px dashed var(--border-color);
    border-radius: 12px;
    background: var(--surface-variant);
    cursor: pointer;
    transition: all 0.2s;
  }

  .file-input-label:hover {
    border-color: var(--primary-color);
    background: var(--primary-alpha-10);
  }

  .file-input-label .material-icons {
    font-size: 32px;
    color: var(--primary-color);
  }

  .processing-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--primary-alpha-10);
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .processing-indicator .material-icons {
    color: var(--primary-color);
  }

  .spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .error-box {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(211, 47, 47, 0.1);
    border: 1px solid rgba(211, 47, 47, 0.2);
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .error-box .material-icons {
    color: #d32f2f;
    font-size: 20px;
    flex-shrink: 0;
  }

  .error-box p {
    margin: 0 0 0.5rem;
    font-size: 0.875rem;
  }

  .error-list {
    margin: 0.5rem 0 0;
    padding-left: 1.25rem;
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .error-list li {
    margin-bottom: 0.25rem;
  }

  .info-box {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--primary-alpha-10);
    border: 1px solid var(--primary-alpha-20);
    border-radius: 8px;
  }

  .info-box .material-icons {
    color: var(--primary-color);
    font-size: 20px;
    flex-shrink: 0;
  }

  .info-box p {
    margin: 0 0 0.25rem;
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--text-secondary);
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .preview-header h3 {
    margin: 0;
    font-size: 1.125rem;
  }

  .btn-text {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem;
    background: none;
    border: none;
    color: var(--primary-color);
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn-text .material-icons {
    font-size: 18px;
  }

  .preview-summary {
    background: var(--surface-variant);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .summary-item:last-child {
    margin-bottom: 0;
  }

  .summary-item .material-icons {
    font-size: 20px;
  }

  .summary-item .material-icons.success {
    color: #388e3c;
  }

  .summary-item .material-icons.warning {
    color: #f57c00;
  }

  .summary-item .material-icons.error {
    color: #d32f2f;
  }

  .duplicate-section {
    margin-bottom: 1.5rem;
  }

  .duplicate-section h4 {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin: 0 0 0.5rem;
    letter-spacing: 0.5px;
  }

  .section-description {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0 0 1rem;
  }

  .duplicate-list {
    background: rgba(245, 124, 0, 0.1);
    border: 1px solid rgba(245, 124, 0, 0.2);
    border-radius: 8px;
    padding: 0.75rem;
    margin-bottom: 1rem;
  }

  .duplicate-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    font-size: 0.875rem;
  }

  .duplicate-item .material-icons {
    font-size: 16px;
    color: #f57c00;
  }

  .duplicate-more {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-style: italic;
  }

  .import-mode-selection {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .mode-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border: 2px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mode-option:hover {
    border-color: var(--primary-color);
    background: var(--surface-variant);
  }

  .mode-option.selected {
    border-color: var(--primary-color);
    background: var(--primary-alpha-10);
  }

  .mode-option input[type='radio'] {
    margin: 0;
  }

  .mode-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .mode-details strong {
    font-size: 0.9375rem;
  }

  .mode-details span {
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .errors-details {
    margin-top: 1rem;
    padding: 0.75rem;
    background: var(--surface-variant);
    border-radius: 8px;
  }

  .errors-details summary {
    cursor: pointer;
    font-size: 0.875rem;
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
