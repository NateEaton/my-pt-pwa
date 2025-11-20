<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * RestoreModal Component - Restore from backup file
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';
  import { ptService, ptState } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';

  const dispatch = createEventDispatcher();

  let fileInput: HTMLInputElement;
  let isRestoring = false;
  let showPreview = false;
  let backupData: any = null;
  let restoreError = '';
  let previewStats = '';

  function handleClose() {
    if (isRestoring) return;
    resetModalState();
  }

  function resetModalState() {
    showPreview = false;
    backupData = null;
    restoreError = '';
    previewStats = '';
    isRestoring = false;

    if (fileInput) {
      fileInput.value = '';
    }

    dispatch('close');
  }

  function triggerFileSelect() {
    if (isRestoring) return;

    // Small delay for mobile to ensure modal state is stable
    setTimeout(() => {
      fileInput?.click();
    }, 100);
  }

  function calculateStats(data: any): string {
    const exercisesCount = data.data.exercises?.length || 0;
    const sessionsCount = data.data.sessionDefinitions?.length || 0;
    const journalEntriesCount = data.data.sessionInstances?.length || 0;
    const createdAt = data.exportDate
      ? new Date(data.exportDate).toLocaleDateString()
      : 'Unknown';

    return `
• Created: ${createdAt}<br>
• ${exercisesCount} ${exercisesCount === 1 ? 'exercise' : 'exercises'}<br>
• ${sessionsCount} ${sessionsCount === 1 ? 'session' : 'sessions'}<br>
• ${journalEntriesCount} ${journalEntriesCount === 1 ? 'journal entry' : 'journal entries'}<br>
• App settings and metadata`;
  }

  async function handleFileSelect(event: Event) {
    // Small delay to handle mobile file picker return properly
    await new Promise((resolve) => setTimeout(resolve, 50));

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (file.type !== 'application/json') {
      restoreError = 'Please select a valid JSON backup file';
      return;
    }

    restoreError = '';

    try {
      const fileContent = await file.text();
      const parsedBackupData = JSON.parse(fileContent);

      // Validate backup structure
      if (!parsedBackupData.version || !parsedBackupData.data || !parsedBackupData.data.exercises) {
        throw new Error('Invalid backup file format');
      }

      backupData = parsedBackupData;
      previewStats = calculateStats(backupData);
      showPreview = true;
    } catch (error) {
      console.error('Error processing backup file:', error);
      restoreError = error instanceof Error ? error.message : 'Failed to read backup file';
    } finally {
      if (input) {
        input.value = '';
      }
    }
  }

  function handleBackToFileSelect() {
    showPreview = false;
    backupData = null;
    previewStats = '';
    restoreError = '';
  }

  async function handleConfirmRestore() {
    if (!backupData || isRestoring) return;

    isRestoring = true;
    restoreError = '';

    try {
      // Clear all existing data
      await ptService.clearAllData();

      // Create ID mapping for exercises (old ID -> new ID)
      const exerciseIdMap = new Map<number, number>();

      // Restore exercises and build mapping
      for (const exercise of backupData.data.exercises) {
        const oldId = exercise.id;
        const { id, ...exerciseData } = exercise;
        const newId = await ptService.addExercise(exerciseData);
        exerciseIdMap.set(oldId, newId);
      }

      // Create ID mapping for session definitions (old ID -> new ID)
      const sessionDefIdMap = new Map<number, number>();

      // Restore session definitions with remapped exercise IDs
      for (const session of backupData.data.sessionDefinitions) {
        const oldId = session.id;
        const { id, ...sessionData } = session;

        // Remap exercise IDs in the exercises array
        const remappedExercises = sessionData.exercises.map(se => ({
          ...se,
          exerciseId: exerciseIdMap.get(se.exerciseId) ?? se.exerciseId
        }));

        const newId = await ptService.addSessionDefinition({
          ...sessionData,
          exercises: remappedExercises
        });
        sessionDefIdMap.set(oldId, newId);
      }

      // Restore session instances with remapped IDs
      for (const instance of backupData.data.sessionInstances) {
        const { id, ...instanceData } = instance;

        // Remap session definition ID
        const remappedSessionDefId = sessionDefIdMap.get(instanceData.sessionDefinitionId) ?? instanceData.sessionDefinitionId;

        // Remap exercise IDs in completed exercises
        const remappedCompletedExercises = instanceData.completedExercises.map(ce => ({
          ...ce,
          exerciseId: exerciseIdMap.get(ce.exerciseId) ?? ce.exerciseId
        }));

        await ptService.addSessionInstance({
          ...instanceData,
          sessionDefinitionId: remappedSessionDefId,
          completedExercises: remappedCompletedExercises
        });
      }

      // Restore settings
      if (backupData.data.settings) {
        await ptService.saveSettings(backupData.data.settings);
      }

      // Restore metadata
      if (backupData.data.metadata) {
        await ptService.saveMetadata(backupData.data.metadata);
      }

      // Reload all data into state
      const exercises = await ptService.getExercises();
      const sessionDefinitions = await ptService.getSessionDefinitions();
      const sessionInstances = await ptService.getSessionInstances();
      const settings = await ptService.getSettings();
      const metadata = await ptService.getMetadata();

      ptState.update((state) => ({
        ...state,
        exercises,
        sessionDefinitions,
        sessionInstances,
        settings,
        metadata
      }));

      toastStore.show('Data restored successfully', 'success');
      isRestoring = false;
      handleClose();
    } catch (error) {
      console.error('Restore process failed:', error);
      const errorMessage = `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      toastStore.show(errorMessage, 'error');
      isRestoring = false;
      handleClose();
    }
  }
</script>

<Modal fullScreen={true} title={showPreview ? 'Confirm Restore' : 'Restore Backup'} iosStyle={true} on:close={handleClose}>
  <div class="restore-content">
    {#if !showPreview}
      <!-- Step 1: File Selection -->
      <div class="restore-info">
        <div class="info-icon">
          <span class="material-icons">restore</span>
        </div>
        <div class="info-text">
          <h3>Select Backup File</h3>
          <p>Choose a backup file to restore. This will replace all current data.</p>
        </div>
      </div>

      <div class="warning-box">
        <span class="material-icons">warning</span>
        <div class="warning-content">
          <strong>Warning:</strong> This action will permanently replace all your current
          exercises, sessions, journal entries, and settings with the backup data. This cannot
          be undone.
        </div>
      </div>

      {#if restoreError}
        <div class="error-message">
          <span class="material-icons">error</span>
          <span>{restoreError}</span>
        </div>
      {/if}

      <div class="restore-actions">
        <input
          bind:this={fileInput}
          type="file"
          accept=".json"
          on:change={handleFileSelect}
          style="display: none;"
          aria-hidden="true"
        />

        <button class="btn btn-primary" on:click={triggerFileSelect} type="button">
          <span class="material-icons">upload_file</span>
          Select Backup File
        </button>
      </div>
    {:else}
      <!-- Step 2: Preview and Confirmation -->
      <div class="restore-info">
        <div class="info-icon">
          <span class="material-icons">preview</span>
        </div>
        <div class="info-text">
          <h3>Review & Confirm</h3>
          <p>Check the backup contents below before proceeding.</p>
        </div>
      </div>

      <div class="backup-preview">
        <h4>What Will Be Restored:</h4>
        <div class="preview-stats">{@html previewStats}</div>
      </div>

      <div class="warning-box">
        <span class="material-icons">warning</span>
        <div class="warning-content">
          <strong>Final Warning:</strong> This will permanently replace all your current data.
          Make sure you have a recent backup if needed.
        </div>
      </div>

      {#if restoreError}
        <div class="error-message">
          <span class="material-icons">error</span>
          <span>{restoreError}</span>
        </div>
      {/if}

      <div class="restore-actions two-button">
        <button
          class="btn btn-secondary"
          on:click={handleBackToFileSelect}
          disabled={isRestoring}
          type="button"
        >
          <span class="material-icons">arrow_back</span>
          Back to File Select
        </button>

        <button
          class="btn btn-primary restore-btn"
          on:click={handleConfirmRestore}
          disabled={isRestoring}
          type="button"
        >
          {#if isRestoring}
            <span class="material-icons spinning">sync</span>
            Restoring...
          {:else}
            <span class="material-icons">restore</span>
            Restore Data
          {/if}
        </button>
      </div>
    {/if}
  </div>
</Modal>

<style>
  .restore-content {
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
  }

  .restore-info {
    display: flex;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
    background-color: var(--primary-alpha-10);
    border-radius: var(--border-radius);
    border: 1px solid var(--primary-color);
  }

  .info-icon {
    flex-shrink: 0;
  }

  .info-icon .material-icons {
    font-size: var(--icon-size-lg);
    color: var(--primary-color);
  }

  .info-text h3 {
    color: var(--text-primary);
    margin: 0 0 var(--spacing-sm) 0;
    font-size: var(--font-size-lg);
  }

  .info-text p {
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
  }

  .warning-box {
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    background-color: rgba(255, 152, 0, 0.1);
    border-radius: var(--border-radius);
    border: 1px solid rgba(255, 152, 0, 0.2);
  }

  .warning-box .material-icons {
    font-size: var(--icon-size-lg);
    color: #ff9800;
    flex-shrink: 0;
  }

  .warning-content {
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .warning-content strong {
    color: var(--text-primary);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-lg);
    background-color: rgba(244, 67, 54, 0.1);
    color: #f44336;
    border-radius: var(--border-radius);
    border: 1px solid rgba(244, 67, 54, 0.2);
  }

  .error-message .material-icons {
    font-size: var(--icon-size-md);
  }

  .backup-preview {
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
    padding: var(--spacing-lg);
    border: 1px solid var(--divider);
  }

  .backup-preview h4 {
    color: var(--text-primary);
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-base);
  }

  .preview-stats {
    color: var(--text-secondary);
    line-height: 1.6;
    font-size: var(--font-size-sm);
  }

  .restore-actions {
    text-align: center;
  }

  .restore-actions.two-button {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .restore-btn {
    background-color: #d32f2f !important;
  }

  .restore-btn:hover:not(:disabled) {
    background-color: #b71c1c !important;
  }

  .restore-btn:active:not(:disabled) {
    background-color: #b71c1c !important;
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

  @media (max-width: 480px) {
    .restore-info {
      padding: var(--spacing-md);
      gap: var(--spacing-md);
    }

    .warning-box {
      padding: var(--spacing-md);
      gap: var(--spacing-sm);
    }

    .backup-preview {
      padding: var(--spacing-md);
    }
  }
</style>
