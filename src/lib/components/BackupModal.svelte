<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * BackupModal Component - Create and download backup files
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import Modal from './Modal.svelte';
  import { ptService } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';

  const dispatch = createEventDispatcher();

  let exercisesCount = 0;
  let sessionsCount = 0;
  let journalEntriesCount = 0;

  onMount(async () => {
    try {
      const exercises = await ptService.getExercises();
      const sessionDefinitions = await ptService.getSessionDefinitions();
      const sessionInstances = await ptService.getSessionInstances();

      exercisesCount = exercises.length;
      sessionsCount = sessionDefinitions.length;
      journalEntriesCount = sessionInstances.length;
    } catch (error) {
      console.error('Failed to load backup counts:', error);
    }
  });

  function handleClose() {
    dispatch('close');
  }

  async function handleBackup() {
    try {
      // Gather all data from IndexedDB
      const exercises = await ptService.getExercises();
      const sessionDefinitions = await ptService.getSessionDefinitions();
      const sessionInstances = await ptService.getSessionInstances();
      const settings = await ptService.getSettings();
      const metadata = await ptService.getMetadata();

      const backupData = {
        version: 1,
        exportDate: new Date().toISOString(),
        data: {
          exercises,
          sessionDefinitions,
          sessionInstances,
          settings,
          metadata
        }
      };

      // Create blob and download
      const json = JSON.stringify(backupData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      a.download = `my-pt-backup-${timestamp}.json`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toastStore.show('Backup downloaded successfully', 'success');
      handleClose();
    } catch (error) {
      console.error('Failed to export backup:', error);
      toastStore.show('Failed to create backup', 'error');
    }
  }
</script>

<Modal fullScreen={true} title="Create Backup" iosStyle={true} on:close={handleClose}>
  <div class="backup-content">
    <p class="modal-description">
      Download all your exercises, sessions, and journal entries as a JSON file.
      This file can be used to restore your data later.
    </p>

    <!-- Data Summary -->
    <div class="backup-summary">
      <h4>Backup Contents</h4>
      <div class="summary-items">
        <div class="summary-item">
          <span class="material-icons">fitness_center</span>
          <span>{exercisesCount} {exercisesCount === 1 ? 'exercise' : 'exercises'}</span>
        </div>
        <div class="summary-item">
          <span class="material-icons">playlist_play</span>
          <span>{sessionsCount} {sessionsCount === 1 ? 'session' : 'sessions'}</span>
        </div>
        <div class="summary-item">
          <span class="material-icons">book</span>
          <span>{journalEntriesCount} {journalEntriesCount === 1 ? 'journal entry' : 'journal entries'}</span>
        </div>
        <div class="summary-item">
          <span class="material-icons">settings</span>
          <span>App settings</span>
        </div>
      </div>
    </div>

    <div class="info-box">
      <span class="material-icons">info</span>
      <p>The backup file will include all your data. Keep it safe!</p>
    </div>
  </div>

  <div slot="footer" class="modal-actions">
    <button class="btn btn-secondary" on:click={handleClose} type="button">
      Cancel
    </button>
    <button class="btn btn-primary" on:click={handleBackup} type="button">
      <span class="material-icons">download</span>
      Download
    </button>
  </div>
</Modal>

<style>
  .backup-content {
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
  }

  .modal-description {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .backup-summary {
    background-color: var(--surface-variant);
    padding: var(--spacing-lg);
    border-radius: var(--border-radius);
  }

  .backup-summary h4 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
    font-size: var(--font-size-lg);
  }

  .summary-items {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    color: var(--text-secondary);
  }

  .summary-item .material-icons {
    color: var(--primary-color);
    font-size: var(--icon-size-md);
  }

  .info-box {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--primary-alpha-10);
    border-radius: var(--border-radius);
    border-left: 3px solid var(--primary-color);
  }

  .info-box .material-icons {
    color: var(--primary-color);
    font-size: var(--icon-size-md);
    flex-shrink: 0;
  }

  .info-box p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .modal-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
    padding: var(--spacing-lg);
    border-top: 1px solid var(--divider);
  }
</style>
