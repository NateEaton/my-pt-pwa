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
  import { toastStore } from '$lib/stores/toast';
  import {
    autoBackupService,
    autoBackupState,
    KEEP_BACKUPS,
    LATEST_FILENAME,
    MIN_INTERVAL_MS
  } from '$lib/services/AutoBackupService';

  const dispatch = createEventDispatcher();

  let busy = false;

  function handleClose() {
    if (busy) return;
    dispatch('close');
  }

  async function handleChooseFolder() {
    busy = true;
    try {
      const chosen = await autoBackupService.chooseFolder();
      if (chosen) {
        toastStore.show('Automatic backup folder set', 'success');
      }
    } finally {
      busy = false;
    }
  }

  async function handleReenable() {
    busy = true;
    try {
      const permission = await autoBackupService.requestPermission();
      if (permission === 'granted') {
        toastStore.show('Folder access restored', 'success');
      } else {
        toastStore.show('Folder access was not granted', 'warning');
      }
    } finally {
      busy = false;
    }
  }

  async function handleBackupNow() {
    busy = true;
    try {
      const ok = await autoBackupService.runBackup();
      toastStore.show(ok ? 'Backup written' : 'Backup failed', ok ? 'success' : 'error');
    } finally {
      busy = false;
    }
  }

  async function handleDisable() {
    busy = true;
    try {
      await autoBackupService.disable();
      toastStore.show('Automatic backup turned off', 'info');
    } finally {
      busy = false;
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return 'Not yet';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  $: state = $autoBackupState;
  $: needsReenable = state.configured && state.permission !== 'granted';
</script>

<Modal fullScreen={true} title="Automatic Backup" iosStyle={true} on:close={handleClose}>
  <div class="auto-backup-content">
    <p class="modal-description">
      Pick a folder once and My PT will save a backup file there by itself whenever your data
      changes. Files in a real folder survive the browser clearing its storage. If the folder is
      synced (Google Drive, OneDrive, and the like) the copy also leaves this device, without
      the app ever sending anything itself.
    </p>

    {#if state.configured}
      <div class="status-card {needsReenable || state.lastError ? 'status-warning' : 'status-ok'}">
        <div class="status-header">
          <span class="material-icons">{needsReenable || state.lastError ? 'warning' : 'folder'}</span>
          <div>
            <h4>{state.folderName}</h4>
            <span class="status-label">
              {#if needsReenable}
                Access needs to be re-enabled
              {:else if state.lastError}
                {state.lastError}
              {:else}
                Backing up automatically
              {/if}
            </span>
          </div>
        </div>
        <p>Last written: {formatDate(state.lastRunAt)}</p>
        {#if needsReenable}
          <p>
            The browser asks for permission again after a restart when My PT is used in a tab.
            Installing the app usually makes the permission stick.
          </p>
        {/if}
      </div>

      <div class="actions">
        {#if needsReenable}
          <button class="btn btn-primary" type="button" on:click={handleReenable} disabled={busy}>
            <span class="material-icons">lock_open</span>
            Re-enable access
          </button>
        {:else}
          <button class="btn btn-primary" type="button" on:click={handleBackupNow} disabled={busy || state.running}>
            <span class="material-icons">save</span>
            {state.running ? 'Writing' : 'Back up now'}
          </button>
        {/if}
        <button class="btn btn-secondary" type="button" on:click={handleChooseFolder} disabled={busy}>
          <span class="material-icons">folder_open</span>
          Change folder
        </button>
        <button class="btn btn-secondary" type="button" on:click={handleDisable} disabled={busy}>
          <span class="material-icons">block</span>
          Turn off
        </button>
      </div>
    {:else}
      <div class="actions">
        <button class="btn btn-primary" type="button" on:click={handleChooseFolder} disabled={busy}>
          <span class="material-icons">create_new_folder</span>
          Choose a folder
        </button>
      </div>
    {/if}

    <div class="detail-card">
      <h4>How it works</h4>
      <ul>
        <li>While you use the app, a backup is written at most every {MIN_INTERVAL_MS / 60000} minutes, plus once when you leave or close it.</li>
        <li>The newest copy is always <code>{LATEST_FILENAME}</code>. A dated copy is kept for each of the last {KEEP_BACKUPS} days you made changes, so an accidental deletion can be undone from an earlier day.</li>
        <li>Nothing else in the folder is touched, including any backups you saved there yourself.</li>
        <li>To restore, use Restore in the Data section and pick any of these files.</li>
      </ul>
    </div>
  </div>
</Modal>

<style>
  .auto-backup-content {
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .status-card,
  .detail-card {
    background-color: var(--surface-variant);
    padding: var(--spacing-lg);
    border-radius: var(--border-radius);
  }

  .status-card {
    border-left: 3px solid var(--text-hint);
  }

  .status-card.status-ok {
    border-left-color: var(--success-color);
  }

  .status-card.status-warning {
    border-left-color: var(--warning-color);
  }

  .status-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-sm);
  }

  .status-header .material-icons {
    font-size: var(--icon-size-xl);
    color: var(--text-hint);
  }

  .status-ok .status-header .material-icons {
    color: var(--success-color);
  }

  .status-warning .status-header .material-icons {
    color: var(--warning-color);
  }

  .status-card h4,
  .detail-card h4 {
    margin: 0;
    color: var(--text-primary);
    font-size: var(--font-size-lg);
    overflow-wrap: anywhere;
  }

  .status-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .status-card p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .status-card p + p {
    margin-top: var(--spacing-sm);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
  }

  .detail-card h4 {
    margin-bottom: var(--spacing-sm);
  }

  .detail-card ul {
    margin: 0;
    padding-left: var(--spacing-lg);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  code {
    font-size: var(--font-size-sm);
  }
</style>
