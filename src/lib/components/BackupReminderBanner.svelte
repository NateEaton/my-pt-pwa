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
  import { ptState, ptService } from '$lib/stores/pt';
  import { shouldShowBackupReminder, snoozeUntil } from '$lib/utils/backupReminder';
  import type { DBMetadata } from '$lib/types';

  const dispatch = createEventDispatcher();

  let metadata: DBMetadata | null = null;
  let loaded = false;
  let loading = false;

  // Metadata lives in IndexedDB, not in ptState, so read it once the service
  // is initialized. On a full reload this component mounts before the layout
  // has finished initializing, so waiting on the store rather than onMount
  // avoids reading too early and mistaking "not ready" for "never backed up".
  $: if ($ptState.initialized && !loaded && !loading) {
    loadMetadata();
  }

  async function loadMetadata() {
    loading = true;
    try {
      metadata = await ptService.getMetadata();
    } catch (error) {
      // Leave metadata null: the policy treats unknown state as "don't show"
      console.warn('Failed to load metadata for backup reminder:', error);
    } finally {
      loaded = true;
      loading = false;
    }
  }

  $: hasData = $ptState.exercises.length > 0 || $ptState.sessionDefinitions.length > 0;
  $: visible =
    loaded &&
    $ptState.initialized &&
    shouldShowBackupReminder({ settings: $ptState.settings, metadata, hasData });

  $: neverBackedUp = !metadata?.lastBackupDate;

  function handleBackup() {
    dispatch('backup');
  }

  async function handleLater() {
    const until = snoozeUntil();
    // Hide immediately; the write is best-effort
    metadata = { ...(metadata ?? { version: 1, installDate: until }), backupReminderSnoozedUntil: until };
    try {
      await ptService.snoozeBackupReminder(until);
    } catch (error) {
      console.warn('Failed to snooze backup reminder:', error);
    }
  }
</script>

{#if visible}
  <div class="reminder-banner" role="status">
    <span class="material-icons banner-icon">backup</span>
    <div class="banner-body">
      <p class="banner-title">
        {neverBackedUp ? 'Your data has never been backed up' : 'Time to back up your data'}
      </p>
      <p class="banner-text">
        Everything lives only on this device. A backup file is the one copy that survives if the
        browser clears its storage.
      </p>
      <div class="banner-actions">
        <button class="btn btn-primary" type="button" on:click={handleBackup}>Back up</button>
        <button class="btn btn-secondary" type="button" on:click={handleLater}>Later</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .reminder-banner {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
    background-color: var(--primary-alpha-10);
    border-left: 3px solid var(--primary-color);
    border-radius: var(--border-radius);
  }

  .banner-icon {
    color: var(--primary-color);
    font-size: var(--icon-size-lg);
    flex-shrink: 0;
  }

  .banner-body {
    flex: 1;
    min-width: 0;
  }

  .banner-title {
    margin: 0 0 var(--spacing-xs) 0;
    color: var(--text-primary);
    font-weight: 500;
  }

  .banner-text {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .banner-actions {
    display: flex;
    gap: var(--spacing-sm);
    flex-wrap: wrap;
  }

  .banner-actions .btn {
    font-size: var(--font-size-sm);
  }
</style>
