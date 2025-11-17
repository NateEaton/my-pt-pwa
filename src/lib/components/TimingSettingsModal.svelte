<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * TimingSettingsModal Component - Manage timing preferences
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import Modal from './Modal.svelte';
  import { ptState, ptService } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';
  import type { AppSettings } from '$lib/types/pt';

  const dispatch = createEventDispatcher();

  // Form state
  let defaultRepDuration = 2;
  let startCountdownDuration = 3;
  let endSessionDelay = 5;
  let restBetweenSets = 30;
  let restBetweenExercises = 15;

  // Load current settings
  onMount(() => {
    if ($ptState.settings) {
      defaultRepDuration = $ptState.settings.defaultRepDuration;
      startCountdownDuration = $ptState.settings.startCountdownDuration;
      endSessionDelay = $ptState.settings.endSessionDelay;
      restBetweenSets = $ptState.settings.restBetweenSets;
      restBetweenExercises = $ptState.settings.restBetweenExercises;
    }
  });

  function handleClose() {
    dispatch('close');
  }

  async function saveSettings() {
    if (!$ptState.settings) return;

    const newSettings: AppSettings = {
      ...$ptState.settings,
      defaultRepDuration,
      startCountdownDuration,
      endSessionDelay,
      restBetweenSets,
      restBetweenExercises
    };

    try {
      await ptService.saveSettings(newSettings);

      // Reload settings into state
      const settings = await ptService.getSettings();
      ptState.update((state) => ({ ...state, settings }));

      toastStore.show('Timing settings saved', 'success');
      handleClose();
    } catch (error) {
      console.error('Error saving timing settings:', error);
      toastStore.show('Failed to save settings', 'error');
    }
  }
</script>

<Modal fullScreen={true} title="Timing Settings" on:close={handleClose}>
  <div class="timing-settings-content">
    <p class="modal-description">
      Adjust timing preferences for your exercise sessions and rest periods.
    </p>

    <!-- Settings List -->
    <div class="settings-list">
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Default Rep Duration</span>
          <span class="setting-description">Seconds per rep (for timing estimates)</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={defaultRepDuration}
            min="1"
            max="60"
            class="setting-input"
          />
          <span class="input-suffix">s</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Start Countdown</span>
          <span class="setting-description">Countdown before exercise starts (3-2-1)</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={startCountdownDuration}
            min="0"
            max="30"
            class="setting-input"
          />
          <span class="input-suffix">s</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Rest Between Sets</span>
          <span class="setting-description">Default rest time between sets</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={restBetweenSets}
            min="0"
            max="300"
            step="5"
            class="setting-input"
          />
          <span class="input-suffix">s</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Rest Between Exercises</span>
          <span class="setting-description">Transition time between exercises</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={restBetweenExercises}
            min="0"
            max="300"
            step="5"
            class="setting-input"
          />
          <span class="input-suffix">s</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">End Session Delay</span>
          <span class="setting-description">Delay before closing session player after completion</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={endSessionDelay}
            min="0"
            max="60"
            class="setting-input"
          />
          <span class="input-suffix">s</span>
        </div>
      </div>
    </div>
  </div>

  <div slot="footer" class="modal-actions">
    <button class="btn btn-secondary" on:click={handleClose}>
      Cancel
    </button>
    <button class="btn btn-primary" on:click={saveSettings}>
      <span class="material-icons">save</span>
      Save Settings
    </button>
  </div>
</Modal>

<style>
  .timing-settings-content {
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

  .settings-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
    gap: var(--spacing-md);
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    flex: 1;
  }

  .setting-label {
    font-size: var(--font-size-base);
    font-weight: 500;
    color: var(--text-primary);
  }

  .setting-description {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .setting-control {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .setting-input {
    width: 5rem;
    padding: var(--spacing-sm);
    border: 1px solid var(--divider);
    border-radius: var(--border-radius);
    background: var(--surface);
    color: var(--text-primary);
    font-size: var(--font-size-base);
    text-align: center;
  }

  .setting-input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-alpha-10);
  }

  .input-suffix {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    min-width: 1rem;
  }

  .modal-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
    padding: var(--spacing-lg);
    border-top: 1px solid var(--divider);
  }

  @media (max-width: 480px) {
    .setting-item {
      flex-direction: column;
      align-items: flex-start;
    }

    .setting-control {
      align-self: flex-end;
    }
  }
</style>
