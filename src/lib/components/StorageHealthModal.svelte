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
  import { storageHealth, initStorageHealth } from '$lib/stores/storage';
  import { formatBytes } from '$lib/utils/bytes';

  const dispatch = createEventDispatcher();

  let lastBackupDate: string | null = null;
  let changesSinceBackup = 0;
  let rechecking = false;

  onMount(async () => {
    try {
      const metadata = await ptService.getMetadata();
      lastBackupDate = metadata?.lastBackupDate ?? null;
      changesSinceBackup = metadata?.changesSinceBackup ?? 0;
    } catch (error) {
      console.error('Failed to load last backup date:', error);
    }
  });

  function handleClose() {
    dispatch('close');
  }

  async function handleRecheck() {
    rechecking = true;
    await initStorageHealth();
    rechecking = false;
  }

  $: persistence = $storageHealth.persistence;
  $: displayMode = $storageHealth.displayMode;
  $: isIOS = $storageHealth.isIOS;
  $: usage = $storageHealth.usage;
  $: quota = $storageHealth.quota;
  $: usagePercent = usage !== null && quota !== null && quota > 0 ? Math.min(100, (usage / quota) * 100) : null;

  $: persistenceLabel = (() => {
    switch (persistence) {
      case 'persisted':
        return 'Protected';
      case 'not-persisted':
        return 'Not protected';
      case 'unsupported':
        return 'Not available';
      default:
        return 'Unknown';
    }
  })();

  $: persistenceIcon = (() => {
    switch (persistence) {
      case 'persisted':
        return 'verified_user';
      case 'not-persisted':
        return 'warning';
      default:
        return 'help_outline';
    }
  })();

  $: persistenceDescription = (() => {
    switch (persistence) {
      case 'persisted':
        return 'The browser has agreed to keep this app\'s data and will not clear it automatically to free up space.';
      case 'not-persisted':
        return 'The browser has not agreed to keep this app\'s data. It may clear it automatically if the device runs low on space.';
      case 'unsupported':
        return 'This browser does not offer a way to ask for protected storage. Your data is still saved on this device, but the browser decides how long to keep it.';
      default:
        return 'Storage protection has not been checked yet.';
    }
  })();

  function formatDate(iso: string | null): string {
    if (!iso) return 'Never';
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
</script>

<Modal fullScreen={true} title="Storage" iosStyle={true} on:close={handleClose}>
  <div class="storage-content">
    <p class="modal-description">
      All of your data is stored only on this device, inside this browser. Nothing is sent
      anywhere. That also means the browser is the only copy, so it is worth knowing how safe it is.
    </p>

    <!-- Protection status -->
    <div class="status-card status-{persistence}">
      <div class="status-header">
        <span class="material-icons">{persistenceIcon}</span>
        <div>
          <h4>Storage protection</h4>
          <span class="status-label">{persistenceLabel}</span>
        </div>
      </div>
      <p>{persistenceDescription}</p>
      <button class="btn btn-secondary recheck-btn" on:click={handleRecheck} type="button" disabled={rechecking}>
        <span class="material-icons">refresh</span>
        {rechecking ? 'Checking' : 'Check again'}
      </button>
    </div>

    {#if persistence === 'not-persisted' || persistence === 'unsupported'}
      <div class="advice-box">
        <span class="material-icons">lightbulb</span>
        <div>
          <p><strong>What helps</strong></p>
          <ul>
            {#if displayMode !== 'standalone'}
              {#if isIOS}
                <li>Add My PT to your home screen (Share, then "Add to Home Screen") and open it from there. Safari can clear data for sites used only in a browser tab after a week without use; home screen apps are exempt.</li>
              {:else}
                <li>Install My PT to your home screen or desktop and open it from there. Installed apps are usually granted protected storage automatically.</li>
              {/if}
            {/if}
            {#if isIOS}
              <li>Do not delete the home screen icon: on iPhone and iPad that also deletes the app's data.</li>
            {/if}
            <li>Use Backup (below Storage in the Data section) regularly. A backup file is the only copy that survives if the browser clears its storage.</li>
          </ul>
        </div>
      </div>
    {/if}

    <!-- Usage -->
    <div class="detail-card">
      <h4>Space used</h4>
      {#if usage !== null}
        <div class="usage-row">
          <span class="usage-value">{formatBytes(usage)}</span>
          {#if quota !== null}
            <span class="usage-quota">of {formatBytes(quota)} available</span>
          {/if}
        </div>
        {#if usagePercent !== null}
          <div class="usage-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(usagePercent)}>
            <div class="usage-bar-fill" style="width: {Math.max(usagePercent, 0.5)}%"></div>
          </div>
        {/if}
      {:else}
        <p class="detail-muted">Not available in this browser.</p>
      {/if}
    </div>

    <!-- Last backup -->
    <div class="detail-card">
      <h4>Last backup</h4>
      <p class="detail-value">{formatDate(lastBackupDate)}</p>
      {#if !lastBackupDate}
        <p class="detail-muted">No backup has been taken from this device yet.</p>
      {:else if changesSinceBackup > 0}
        <p class="detail-muted">
          {changesSinceBackup} {changesSinceBackup === 1 ? 'change' : 'changes'} since then
        </p>
      {:else}
        <p class="detail-muted">No changes since then</p>
      {/if}
    </div>

    <div class="detail-card">
      <h4>Where this app is running</h4>
      <p class="detail-value">
        {#if displayMode === 'standalone'}
          Installed app
        {:else if displayMode === 'browser'}
          Browser tab
        {:else}
          Unknown
        {/if}
      </p>
    </div>
  </div>
</Modal>

<style>
  .storage-content {
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

  .status-card.status-persisted {
    border-left-color: var(--success-color);
  }

  .status-card.status-not-persisted {
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

  .status-persisted .status-header .material-icons {
    color: var(--success-color);
  }

  .status-not-persisted .status-header .material-icons {
    color: var(--warning-color);
  }

  .status-card h4,
  .detail-card h4 {
    margin: 0;
    color: var(--text-primary);
    font-size: var(--font-size-lg);
  }

  .status-label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .status-card p,
  .detail-muted {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .recheck-btn {
    margin-top: var(--spacing-md);
    font-size: var(--font-size-sm);
    /* btn-secondary shares the card background; lift it off the card */
    background-color: var(--surface);
    border: 1px solid var(--divider);
  }

  .recheck-btn .material-icons {
    font-size: var(--icon-size-sm);
  }

  .detail-card h4 {
    margin-bottom: var(--spacing-sm);
  }

  .detail-value {
    margin: 0;
    color: var(--text-primary);
  }

  .detail-value + .detail-muted {
    margin-top: var(--spacing-xs);
  }

  .advice-box {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    background-color: var(--primary-alpha-10);
    border-left: 3px solid var(--primary-color);
    padding: var(--spacing-lg);
    border-radius: var(--border-radius);
  }

  .advice-box .material-icons {
    color: var(--primary-color);
    font-size: var(--icon-size-md);
    flex-shrink: 0;
  }

  .advice-box p {
    margin: 0 0 var(--spacing-xs) 0;
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .advice-box ul {
    margin: 0;
    padding-left: var(--spacing-lg);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .usage-row {
    display: flex;
    align-items: baseline;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
  }

  .usage-value {
    color: var(--text-primary);
    font-size: var(--font-size-xl);
  }

  .usage-quota {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .usage-bar {
    margin-top: var(--spacing-sm);
    height: 0.5rem;
    background-color: var(--divider);
    border-radius: 0.25rem;
    overflow: hidden;
  }

  .usage-bar-fill {
    height: 100%;
    background-color: var(--primary-color);
    border-radius: 0.25rem;
  }
</style>
