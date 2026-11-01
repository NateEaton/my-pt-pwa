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
  import { ptService } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';
  import { buildBackup } from '$lib/utils/backup';

  const dispatch = createEventDispatcher();

  let exercisesCount = 0;
  let sessionsCount = 0;
  let journalEntriesCount = 0;
  let busy = false;

  // Web Share with files: the reliable route on iOS home-screen apps, where
  // <a download> often does nothing. Checked with a placeholder JSON file.
  const canShareFiles = (() => {
    if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false;
    try {
      const probe = new File(['{}'], 'probe.json', { type: 'application/json' });
      return navigator.canShare({ files: [probe] });
    } catch {
      return false;
    }
  })();

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

  // Record when the last backup was taken so Settings and the reminder can use it.
  // Best-effort: a failure here must not turn a successful backup into an error.
  async function markBackupTaken(exportDate: string) {
    try {
      await ptService.recordBackupTaken(exportDate);
    } catch (metaError) {
      console.warn('Failed to record last backup date:', metaError);
    }
  }

  async function handleBackup() {
    if (busy) return;
    busy = true;
    try {
      const { json, filename, exportDate } = await buildBackup();

      // Create blob and download
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await markBackupTaken(exportDate);

      toastStore.show('Backup downloaded successfully', 'success');
      handleClose();
    } catch (error) {
      console.error('Failed to export backup:', error);
      toastStore.show('Failed to create backup', 'error');
    } finally {
      busy = false;
    }
  }

  async function handleShare() {
    if (busy) return;
    busy = true;
    try {
      const { json, filename, exportDate } = await buildBackup();
      const file = new File([json], filename, { type: 'application/json' });

      // Resolves only once the share target has accepted the file; the user
      // cancelling the sheet rejects with AbortError and is not a backup.
      await navigator.share({ files: [file], title: 'My PT backup' });

      await markBackupTaken(exportDate);

      toastStore.show('Backup shared successfully', 'success');
      handleClose();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // User dismissed the share sheet; nothing to report
        return;
      }
      console.error('Failed to share backup:', error);
      toastStore.show('Failed to share backup', 'error');
    } finally {
      busy = false;
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
      <p>
        The backup file will include all your data. Keep it somewhere outside this device,
        such as a cloud drive or email, so it survives if the browser clears its storage.
      </p>
    </div>
  </div>

  <div slot="footer" class="modal-actions">
    <button class="btn btn-secondary" on:click={handleClose} type="button" disabled={busy}>
      Cancel
    </button>
    {#if canShareFiles}
      <button class="btn btn-secondary" on:click={handleBackup} type="button" disabled={busy}>
        <span class="material-icons">download</span>
        Download
      </button>
      <button class="btn btn-primary" on:click={handleShare} type="button" disabled={busy}>
        <span class="material-icons">ios_share</span>
        Share
      </button>
    {:else}
      <button class="btn btn-primary" on:click={handleBackup} type="button" disabled={busy}>
        <span class="material-icons">download</span>
        Download
      </button>
    {/if}
  </div>
</Modal>

<style>
  .backup-content {
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
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

  /* Component-specific info box styling (horizontal layout with icon) */
  .info-box {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    background-color: var(--primary-alpha-10);
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
