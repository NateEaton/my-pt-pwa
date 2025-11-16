<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * AudioSettingsModal Component - Manage audio and sound preferences
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
  import { audioService } from '$lib/services/AudioService';
  import type { AppSettings } from '$lib/types/pt';

  const dispatch = createEventDispatcher();

  // Form state
  let soundEnabled = true;
  let soundVolume = 0.7;
  let audioLeadInEnabled = true;
  let audioContinuousTicksEnabled = false;
  let audioPerRepBeepsEnabled = false;
  let audioWarningTonesEnabled = true;

  // Load current settings
  onMount(() => {
    if ($ptState.settings) {
      soundEnabled = $ptState.settings.soundEnabled;
      soundVolume = $ptState.settings.soundVolume;
      audioLeadInEnabled = $ptState.settings.audioLeadInEnabled;
      audioContinuousTicksEnabled = $ptState.settings.audioContinuousTicksEnabled;
      audioPerRepBeepsEnabled = $ptState.settings.audioPerRepBeepsEnabled;
      audioWarningTonesEnabled = $ptState.settings.audioWarningTonesEnabled;
    }

    // Unlock audio context on mount
    audioService.unlock();
  });

  function handleClose() {
    dispatch('close');
  }

  async function saveSettings() {
    if (!$ptState.settings) return;

    const newSettings: AppSettings = {
      ...$ptState.settings,
      soundEnabled,
      soundVolume,
      audioLeadInEnabled,
      audioContinuousTicksEnabled,
      audioPerRepBeepsEnabled,
      audioWarningTonesEnabled
    };

    try {
      await ptService.saveSettings(newSettings);

      // Reload settings into state
      const settings = await ptService.getSettings();
      ptState.update((state) => ({ ...state, settings }));

      // Update audio service with new settings
      audioService.setMasterVolume(soundVolume);
      audioService.setLeadInEnabled(audioLeadInEnabled);
      audioService.setContinuousTicksEnabled(audioContinuousTicksEnabled);
      audioService.setPerRepBeepsEnabled(audioPerRepBeepsEnabled);
      audioService.setWarningTonesEnabled(audioWarningTonesEnabled);

      toastStore.show('Audio settings saved', 'success');
      handleClose();
    } catch (error) {
      console.error('Error saving audio settings:', error);
      toastStore.show('Failed to save settings', 'error');
    }
  }

  // Preview sound functions
  function previewExerciseStart() {
    audioService.setMasterVolume(soundVolume);
    audioService.onExerciseStart();
  }

  function previewExerciseEnd() {
    audioService.setMasterVolume(soundVolume);
    audioService.onExerciseEnd();
  }

  function previewRestStart() {
    audioService.setMasterVolume(soundVolume);
    audioService.onRestStart();
  }

  function previewCountdown() {
    audioService.setMasterVolume(soundVolume);
    audioService.setLeadInEnabled(true); // Temporarily enable for preview

    // Play 3-2-1 sequence
    audioService.onCountdown(3);
    setTimeout(() => audioService.onCountdown(2), 400);
    setTimeout(() => audioService.onCountdown(1), 800);
  }

  function previewRepComplete() {
    audioService.setMasterVolume(soundVolume);
    audioService.setPerRepBeepsEnabled(true); // Temporarily enable for preview
    audioService.onRepComplete();
  }

  function previewWarning() {
    audioService.setMasterVolume(soundVolume);
    audioService.setWarningTonesEnabled(true); // Temporarily enable for preview
    audioService.onWarning();
  }

  function previewSessionComplete() {
    audioService.setMasterVolume(soundVolume);
    audioService.onSessionComplete();
  }

  // Convert 0-1 to percentage for display
  $: volumePercentage = Math.round(soundVolume * 100);
</script>

<Modal fullScreen={true} title="Audio & Sound Settings" on:close={handleClose}>
  <div class="audio-settings-content">
    <p class="modal-description">
      Configure audio cues and sound preferences for your exercise sessions.
    </p>

    <!-- Settings List -->
    <div class="settings-list">
      <!-- Master Enable/Disable -->
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Sound Enabled</span>
          <span class="setting-description">Enable or disable all audio cues</span>
        </div>
        <div class="setting-control">
          <label class="toggle-switch">
            <input type="checkbox" bind:checked={soundEnabled} />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Master Volume -->
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Master Volume</span>
          <span class="setting-description">Overall volume for all audio cues</span>
        </div>
        <div class="setting-control volume-control">
          <input
            type="range"
            bind:value={soundVolume}
            min="0"
            max="1"
            step="0.05"
            class="volume-slider"
            disabled={!soundEnabled}
          />
          <span class="volume-value">{volumePercentage}%</span>
        </div>
      </div>

      <!-- Sound Preview -->
      <div class="preview-section">
        <h4 class="preview-title">Preview Sounds</h4>
        <div class="preview-buttons">
          <button
            class="btn-preview"
            on:click={previewExerciseStart}
            disabled={!soundEnabled}
          >
            <span class="material-icons">play_arrow</span>
            Exercise Start
          </button>
          <button
            class="btn-preview"
            on:click={previewExerciseEnd}
            disabled={!soundEnabled}
          >
            <span class="material-icons">stop</span>
            Exercise End
          </button>
          <button
            class="btn-preview"
            on:click={previewRestStart}
            disabled={!soundEnabled}
          >
            <span class="material-icons">bedtime</span>
            Rest Start
          </button>
          <button
            class="btn-preview"
            on:click={previewCountdown}
            disabled={!soundEnabled}
          >
            <span class="material-icons">timer</span>
            3-2-1 Countdown
          </button>
          <button
            class="btn-preview"
            on:click={previewRepComplete}
            disabled={!soundEnabled}
          >
            <span class="material-icons">check</span>
            Rep Complete
          </button>
          <button
            class="btn-preview"
            on:click={previewWarning}
            disabled={!soundEnabled}
          >
            <span class="material-icons">warning</span>
            Warning
          </button>
          <button
            class="btn-preview"
            on:click={previewSessionComplete}
            disabled={!soundEnabled}
          >
            <span class="material-icons">celebration</span>
            Session Complete
          </button>
        </div>
      </div>

      <!-- Audio Cue Options -->
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">3-2-1 Countdown</span>
          <span class="setting-description">
            Play rising countdown tones before each exercise starts
          </span>
        </div>
        <div class="setting-control">
          <label class="toggle-switch">
            <input
              type="checkbox"
              bind:checked={audioLeadInEnabled}
              disabled={!soundEnabled}
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Continuous Ticks</span>
          <span class="setting-description">
            Play a tick sound every second during duration exercises (can be distracting)
          </span>
        </div>
        <div class="setting-control">
          <label class="toggle-switch">
            <input
              type="checkbox"
              bind:checked={audioContinuousTicksEnabled}
              disabled={!soundEnabled}
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Per-Rep Beeps</span>
          <span class="setting-description">
            Play a beep sound on each rep completion during rep exercises
          </span>
        </div>
        <div class="setting-control">
          <label class="toggle-switch">
            <input
              type="checkbox"
              bind:checked={audioPerRepBeepsEnabled}
              disabled={!soundEnabled}
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Warning Tones</span>
          <span class="setting-description">
            Play distinctive warning sounds when approaching end of exercise or rest
          </span>
        </div>
        <div class="setting-control">
          <label class="toggle-switch">
            <input
              type="checkbox"
              bind:checked={audioWarningTonesEnabled}
              disabled={!soundEnabled}
            />
            <span class="toggle-slider"></span>
          </label>
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
  .audio-settings-content {
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
    line-height: 1.4;
  }

  .setting-control {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .volume-control {
    flex-direction: column;
    align-items: flex-end;
    gap: var(--spacing-xs);
    min-width: 140px;
  }

  .volume-slider {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: var(--divider);
    outline: none;
    -webkit-appearance: none;
  }

  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--primary-color);
    cursor: pointer;
  }

  .volume-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--primary-color);
    cursor: pointer;
    border: none;
  }

  .volume-slider:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .volume-value {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    min-width: 3rem;
    text-align: right;
  }

  /* Toggle Switch */
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 26px;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--divider);
    transition: 0.3s;
    border-radius: 26px;
  }

  .toggle-slider:before {
    position: absolute;
    content: '';
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }

  input:checked + .toggle-slider {
    background-color: var(--primary-color);
  }

  input:checked + .toggle-slider:before {
    transform: translateX(22px);
  }

  input:disabled + .toggle-slider {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Preview Section */
  .preview-section {
    padding: var(--spacing-md);
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
  }

  .preview-title {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-base);
    font-weight: 500;
    color: var(--text-primary);
  }

  .preview-buttons {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--spacing-sm);
  }

  .btn-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--surface);
    border: 1px solid var(--divider);
    border-radius: var(--border-radius);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-preview:hover:not(:disabled) {
    background-color: var(--primary-alpha-10);
    border-color: var(--primary-color);
  }

  .btn-preview:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-preview .material-icons {
    font-size: var(--icon-size-sm);
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

    .volume-control {
      align-self: stretch;
      align-items: stretch;
    }

    .preview-buttons {
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    }
  }
</style>
