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
  let audioExerciseAboutToEndEnabled = true;
  let audioRestCuesEnabled = true;
  let hapticsEnabled = false;

  // Feature detection
  let vibrationSupported = false;
  let wakeLockSupported = false;

  // Load current settings
  onMount(() => {
    if ($ptState.settings) {
      soundEnabled = $ptState.settings.soundEnabled;
      soundVolume = $ptState.settings.soundVolume;
      audioLeadInEnabled = $ptState.settings.audioLeadInEnabled;
      audioExerciseAboutToEndEnabled = $ptState.settings.audioExerciseAboutToEndEnabled;
      audioRestCuesEnabled = $ptState.settings.audioRestCuesEnabled;
      hapticsEnabled = $ptState.settings.hapticsEnabled;
    }

    // Detect feature support
    vibrationSupported = 'vibrate' in navigator;
    wakeLockSupported = 'wakeLock' in navigator;

    // Log diagnostics
    console.log('Feature Support:', {
      vibration: vibrationSupported,
      wakeLock: wakeLockSupported,
      userAgent: navigator.userAgent
    });

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
      audioExerciseAboutToEndEnabled,
      audioRestCuesEnabled,
      hapticsEnabled
    };

    try {
      await ptService.saveSettings(newSettings);

      // Reload settings into state
      const settings = await ptService.getSettings();
      ptState.update((state) => ({ ...state, settings }));

      // Update audio service with new settings
      audioService.setMasterVolume(soundVolume);
      audioService.setLeadInEnabled(audioLeadInEnabled);
      audioService.setExerciseAboutToEndEnabled(audioExerciseAboutToEndEnabled);
      audioService.setHapticsEnabled(hapticsEnabled);

      toastStore.show('Cue settings saved', 'success');
      handleClose();
    } catch (error) {
      console.error('Error saving cue settings:', error);
      toastStore.show('Failed to save settings', 'error');
    }
  }

  // Preview sound functions
  function previewDurationStart() {
    audioService.setMasterVolume(soundVolume);
    audioService.setHapticsEnabled(hapticsEnabled);
    audioService.onDurationStart();
  }

  function previewDurationEnd() {
    audioService.setMasterVolume(soundVolume);
    audioService.setHapticsEnabled(hapticsEnabled);
    audioService.onDurationEnd();
  }

  function previewRepStart() {
    audioService.setMasterVolume(soundVolume);
    audioService.setHapticsEnabled(hapticsEnabled);
    audioService.onRepStart();
  }

  function previewRepEnd() {
    audioService.setMasterVolume(soundVolume);
    audioService.setHapticsEnabled(hapticsEnabled);
    audioService.onRepEnd();
  }

  function previewRestStart() {
    audioService.setMasterVolume(soundVolume);
    audioService.setHapticsEnabled(hapticsEnabled);
    audioService.onRestStart();
  }

  function previewRestEnd() {
    audioService.setMasterVolume(soundVolume);
    audioService.setHapticsEnabled(hapticsEnabled);
    audioService.onRestEnd();
  }

  function previewCountdown() {
    audioService.setMasterVolume(soundVolume);
    audioService.setLeadInEnabled(true); // Temporarily enable for preview
    audioService.setHapticsEnabled(hapticsEnabled);

    // Play 3-2-1 sequence
    audioService.onCountdown(3);
    setTimeout(() => audioService.onCountdown(2), 1000);
    setTimeout(() => audioService.onCountdown(1), 2000);
  }

  function previewCountdownEnd() {
    audioService.setMasterVolume(soundVolume);
    audioService.setExerciseAboutToEndEnabled(true); // Temporarily enable for preview
    audioService.setHapticsEnabled(hapticsEnabled);

    // Play 3-2-1 descending sequence
    audioService.onCountdownEnd(3);
    setTimeout(() => audioService.onCountdownEnd(2), 1000);
    setTimeout(() => audioService.onCountdownEnd(1), 2000);
  }

  function previewSessionComplete() {
    audioService.setMasterVolume(soundVolume);
    audioService.setHapticsEnabled(hapticsEnabled);
    audioService.onSessionComplete();
  }

  // Test vibration directly
  function testVibration() {
    if ('vibrate' in navigator) {
      const success = navigator.vibrate(200);
      if (success) {
        toastStore.show('Vibration triggered', 'success');
      } else {
        toastStore.show('Vibration failed - check device settings', 'error');
      }
    } else {
      toastStore.show('Vibration not supported', 'error');
    }
  }

  // Convert 0-1 to percentage for display
  $: volumePercentage = Math.round(soundVolume * 100);
</script>

<Modal fullScreen={true} title="Cue Settings" iosStyle={true} on:close={handleClose}>
  <div class="audio-settings-content">
    <p class="modal-description">
      Configure audio and haptic feedback for your exercise sessions.
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

      <!-- Audio Cue Options -->
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Exercise About-to-Start Tone</span>
          <span class="setting-description">
            Play 3-2-1 countdown with rising tones before each exercise begins (builds anticipation for movement)
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
          <span class="setting-label">Exercise About-to-End Tone</span>
          <span class="setting-description">
            Play 3-2-1 countdown with descending tones during final seconds (signals approaching completion)
          </span>
        </div>
        <div class="setting-control">
          <label class="toggle-switch">
            <input
              type="checkbox"
              bind:checked={audioExerciseAboutToEndEnabled}
              disabled={!soundEnabled}
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Rest Period Cues</span>
          <span class="setting-description">
            Play audio cues at the start and end of rest periods between sets
          </span>
        </div>
        <div class="setting-control">
          <label class="toggle-switch">
            <input
              type="checkbox"
              bind:checked={audioRestCuesEnabled}
              disabled={!soundEnabled}
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Haptic Feedback -->
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Haptic Feedback</span>
          <span class="setting-description">
            {#if vibrationSupported}
              Vibrate for each audio cue
              {#if navigator.userAgent.includes('Android')}
                <br/><small style="color: var(--warning-color);">
                  Note: Requires "Touch feedback" enabled in Android settings and device not on silent mode
                </small>
              {/if}
            {:else}
              <span style="color: var(--error-color);">Not supported on this device/browser (iOS does not support vibration)</span>
            {/if}
          </span>
        </div>
        <div class="setting-control">
          <label class="toggle-switch">
            <input type="checkbox" bind:checked={hapticsEnabled} disabled={!vibrationSupported} />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Test Vibration Button (only if supported) -->
      {#if vibrationSupported}
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Test Vibration</span>
            <span class="setting-description">
              Test if vibration is working on your device
            </span>
          </div>
          <div class="setting-control">
            <button class="btn-test" on:click={testVibration}>
              <span class="material-icons">vibration</span>
              Test
            </button>
          </div>
        </div>
      {/if}

      <!-- Info about always-on audio cues -->
      <div class="info-box">
        <div class="info-title">
          <span class="material-icons">info</span>
          Audio Cues
        </div>
        <div class="info-text">
          The app plays audio cues when sound is enabled:
          <ul>
            <li>Exercise start and completion</li>
            <li>Rest period start and end</li>
            <li>Session completion</li>
          </ul>
        </div>
      </div>

      <!-- Device Capabilities -->
      <div class="info-box" style="margin-top: var(--spacing-lg);">
        <div class="info-title">
          <span class="material-icons">devices</span>
          Device Capabilities
        </div>
        <div class="info-text">
          <ul>
            <li>
              <strong>Vibration API:</strong>
              {#if vibrationSupported}
                <span style="color: var(--success-color);">✓ Supported</span>
              {:else}
                <span style="color: var(--error-color);">✗ Not Supported</span>
              {/if}
            </li>
            <li>
              <strong>Wake Lock API:</strong>
              {#if wakeLockSupported}
                <span style="color: var(--success-color);">✓ Supported</span>
              {:else}
                <span style="color: var(--error-color);">✗ Not Supported</span>
              {/if}
            </li>
          </ul>
        </div>
      </div>

      <!-- Sound Preview -->
      <div class="preview-section">
        <h4 class="preview-title">Preview Sounds</h4>
        <div class="preview-buttons">
          <button
            class="btn-preview"
            on:click={previewDurationStart}
            disabled={!soundEnabled}
          >
            <span class="material-icons">play_arrow</span>
            Duration Start
          </button>
          <button
            class="btn-preview"
            on:click={previewDurationEnd}
            disabled={!soundEnabled}
          >
            <span class="material-icons">stop</span>
            Duration End
          </button>
          <button
            class="btn-preview"
            on:click={previewRepStart}
            disabled={!soundEnabled}
          >
            <span class="material-icons">fitness_center</span>
            Rep Start
          </button>
          <button
            class="btn-preview"
            on:click={previewRepEnd}
            disabled={!soundEnabled}
          >
            <span class="material-icons">fitness_center</span>
            Rep End
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
            on:click={previewRestEnd}
            disabled={!soundEnabled}
          >
            <span class="material-icons">bedtime</span>
            Rest End
          </button>
          <button
            class="btn-preview"
            on:click={previewCountdown}
            disabled={!soundEnabled}
          >
            <span class="material-icons">arrow_upward</span>
            About-to-Start
          </button>
          <button
            class="btn-preview"
            on:click={previewCountdownEnd}
            disabled={!soundEnabled}
          >
            <span class="material-icons">arrow_downward</span>
            About-to-End
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
    </div>
  </div>

  <div slot="footer" class="modal-actions">
    <button class="btn btn-secondary" on:click={handleClose} type="button">
      Cancel
    </button>
    <button class="btn btn-primary" on:click={saveSettings} type="button">
      Save
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

  /* Info Box */
  .info-box {
    padding: var(--spacing-md);
    background-color: var(--primary-alpha-10);
    border-radius: var(--border-radius);
    border-left: 4px solid var(--primary-color);
  }

  .info-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: var(--font-size-base);
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
  }

  .info-title .material-icons {
    font-size: var(--icon-size-md);
    color: var(--primary-color);
  }

  .info-text {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .info-text ul {
    margin: var(--spacing-xs) 0 0 var(--spacing-lg);
    padding: 0;
  }

  .info-text li {
    margin-bottom: var(--spacing-xs);
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

  /* Test Button */
  .btn-test {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-md);
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: var(--touch-target-min);
  }

  .btn-test:hover {
    background-color: var(--primary-color-dark);
    transform: translateY(-1px);
  }

  .btn-test:active {
    transform: translateY(0);
  }

  .btn-test .material-icons {
    font-size: var(--icon-size-sm);
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
    padding-bottom: calc(var(--spacing-lg) + var(--spacing-xl));
    border-top: 1px solid var(--divider);
  }

  /* Add safe area padding on iOS devices */
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .modal-actions {
      padding-bottom: calc(var(--spacing-lg) + var(--spacing-xl) + env(safe-area-inset-bottom));
    }
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
