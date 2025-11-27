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
  import { ptState, ptService } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';
  import { isDevelopment } from '$lib/utils/buildInfo';
  import BottomTabs from '$lib/components/BottomTabs.svelte';
  import SessionManagementModal from '$lib/components/SessionManagementModal.svelte';
  import ExerciseManagementModal from '$lib/components/ExerciseManagementModal.svelte';
  import TimingSettingsModal from '$lib/components/TimingSettingsModal.svelte';
  import AudioSettingsModal from '$lib/components/AudioSettingsModal.svelte';
  import BackupModal from '$lib/components/BackupModal.svelte';
  import RestoreModal from '$lib/components/RestoreModal.svelte';
  import GuideDialog from '$lib/components/GuideDialog.svelte';
  import AboutDialog from '$lib/components/AboutDialog.svelte';
  import type { AppSettings } from '$lib/types/pt';

  // Check if running in development mode
  const showDevFeatures = isDevelopment();

  // Modal visibility state
  let showSessionManagement = false;
  let showExerciseManagement = false;
  let showTimingSettings = false;
  let showAudioSettings = false;
  let showBackupModal = false;
  let showRestoreModal = false;
  let showGuide = false;
  let showAbout = false;

  // Quick access settings (directly editable)
  $: theme = $ptState.settings?.theme ?? 'auto';

  // Update theme setting
  async function updateTheme(event: Event) {
    if (!$ptState.settings) return;

    const target = event.target as HTMLSelectElement;
    const newTheme = target.value as 'light' | 'dark' | 'auto';

    const newSettings: AppSettings = {
      ...$ptState.settings,
      theme: newTheme
    };

    try {
      await ptService.saveSettings(newSettings);
      const settings = await ptService.getSettings();
      ptState.update((state) => ({ ...state, settings }));
      toastStore.show('Theme updated', 'success');
    } catch (error) {
      console.error('Error updating theme:', error);
      toastStore.show('Failed to update theme', 'error');
    }
  }

</script>

<svelte:head>
  <title>Settings - My PT</title>
</svelte:head>

<div class="page-container">
  <main class="content">
    <header class="page-header">
      <h1>Settings</h1>
    </header>

    <!-- Theme Setting (no heading) -->
    <section class="settings-section quick-access">
      <div class="quick-settings">
        <div class="quick-setting-item">
          <div class="setting-info">
            <div class="setting-label">
              <span class="material-icons">palette</span>
              <span>Theme</span>
            </div>
          </div>
          <div class="setting-controls">
            <select value={theme} on:change={updateTheme} class="theme-select">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>
      </div>
    </section>

    <!-- Library Section -->
    <section class="settings-section">
      <h2 class="section-title">Library</h2>

      <div class="settings-cards">
        <!-- Manage Sessions Card -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="settings-card" on:click={() => (showSessionManagement = true)}>
          <div class="card-icon">
            <span class="material-icons">playlist_play</span>
          </div>
          <div class="card-content">
            <h3>Manage Sessions</h3>
            <p>Create and edit session definitions</p>
            <div class="card-meta">
              <span class="material-icons">folder</span>
              <span>{$ptState.sessionDefinitions.length} {$ptState.sessionDefinitions.length === 1 ? 'session' : 'sessions'}</span>
            </div>
          </div>
          <div class="card-arrow">
            <span class="material-icons">chevron_right</span>
          </div>
        </div>

        <!-- Manage Exercises Card -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="settings-card" on:click={() => (showExerciseManagement = true)}>
          <div class="card-icon">
            <span class="material-icons">fitness_center</span>
          </div>
          <div class="card-content">
            <h3>Manage Exercises</h3>
            <p>Create and edit exercises</p>
            <div class="card-meta">
              <span class="material-icons">folder</span>
              <span>{$ptState.exercises.length} {$ptState.exercises.length === 1 ? 'exercise' : 'exercises'}</span>
            </div>
          </div>
          <div class="card-arrow">
            <span class="material-icons">chevron_right</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Player Section -->
    <section class="settings-section">
      <h2 class="section-title">Player</h2>

      <div class="settings-cards">
        <!-- Timing Card -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="settings-card" on:click={() => (showTimingSettings = true)}>
          <div class="card-icon">
            <span class="material-icons">timer</span>
          </div>
          <div class="card-content">
            <h3>Timing</h3>
            <p>Adjust timing preferences for sessions</p>
            <div class="card-meta">
              <span class="material-icons">settings</span>
              <span>Countdowns, rest periods, and more</span>
            </div>
          </div>
          <div class="card-arrow">
            <span class="material-icons">chevron_right</span>
          </div>
        </div>

        <!-- Cue Settings Card -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="settings-card" on:click={() => (showAudioSettings = true)}>
          <div class="card-icon">
            <span class="material-icons">notifications_active</span>
          </div>
          <div class="card-content">
            <h3>Cues</h3>
            <p>Configure audio and haptic feedback</p>
            <div class="card-meta">
              <span class="material-icons">settings</span>
              <span>Sound, vibration, and timing cues</span>
            </div>
          </div>
          <div class="card-arrow">
            <span class="material-icons">chevron_right</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Data Section -->
    <section class="settings-section">
      <h2 class="section-title">Data</h2>

      <div class="settings-cards">
        <!-- Backup Card -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="settings-card" on:click={() => (showBackupModal = true)}>
          <div class="card-icon">
            <span class="material-icons">backup</span>
          </div>
          <div class="card-content">
            <h3>Backup</h3>
            <p>Download a backup of all your data</p>
          </div>
          <div class="card-arrow">
            <span class="material-icons">chevron_right</span>
          </div>
        </div>

        <!-- Restore Card -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="settings-card" on:click={() => (showRestoreModal = true)}>
          <div class="card-icon">
            <span class="material-icons">restore</span>
          </div>
          <div class="card-content">
            <h3>Restore</h3>
            <p>Restore data from a backup file</p>
          </div>
          <div class="card-arrow">
            <span class="material-icons">chevron_right</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Support Section -->
    <section class="settings-section">
      <h2 class="section-title">Support</h2>

      <div class="settings-cards">
        <!-- App Updates Card -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="settings-card" on:click={() => toastStore.show('Updates install automatically when available', 'info')}>
          <div class="card-icon">
            <span class="material-icons">system_update</span>
          </div>
          <div class="card-content">
            <h3>App Updates</h3>
            <p>Updates install automatically</p>
          </div>
          <div class="card-arrow">
            <span class="material-icons">info</span>
          </div>
        </div>

        <!-- User Guide Card -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="settings-card" on:click={() => (showGuide = true)}>
          <div class="card-icon">
            <span class="material-icons">help_outline</span>
          </div>
          <div class="card-content">
            <h3>User Guide</h3>
            <p>Learn how to use the app</p>
          </div>
          <div class="card-arrow">
            <span class="material-icons">chevron_right</span>
          </div>
        </div>

        <!-- About Card -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="settings-card" on:click={() => (showAbout = true)}>
          <div class="card-icon">
            <span class="material-icons">info</span>
          </div>
          <div class="card-content">
            <h3>About</h3>
            <p>App information and version</p>
          </div>
          <div class="card-arrow">
            <span class="material-icons">chevron_right</span>
          </div>
        </div>
      </div>
    </section>
  </main>

  <BottomTabs currentTab="settings" />
</div>

<!-- Modals -->
{#if showSessionManagement}
  <SessionManagementModal on:close={() => (showSessionManagement = false)} />
{/if}

{#if showExerciseManagement}
  <ExerciseManagementModal on:close={() => (showExerciseManagement = false)} />
{/if}

{#if showTimingSettings}
  <TimingSettingsModal on:close={() => (showTimingSettings = false)} />
{/if}

{#if showAudioSettings}
  <AudioSettingsModal on:close={() => (showAudioSettings = false)} />
{/if}

{#if showBackupModal}
  <BackupModal on:close={() => (showBackupModal = false)} />
{/if}

{#if showRestoreModal}
  <RestoreModal on:close={() => (showRestoreModal = false)} />
{/if}

{#if showGuide}
  <GuideDialog on:close={() => (showGuide = false)} />
{/if}

{#if showAbout}
  <AboutDialog on:close={() => (showAbout = false)} />
{/if}

<style>
  .page-container {
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: var(--background);
  }

  .content {
    flex: 1;
    padding-bottom: calc(var(--bottom-tabs-height) + var(--spacing-lg));
    overflow-y: auto;
  }

  /* Add safe area support for iOS */
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .content {
      padding-bottom: calc(var(--bottom-tabs-height) + env(safe-area-inset-bottom));
    }
  }

  .page-header {
    padding: var(--spacing-lg);
    background-color: var(--surface);
    border-bottom: 1px solid var(--divider);
  }

  .page-header h1 {
    margin: 0;
    font-size: var(--font-size-2xl);
    font-weight: 600;
    color: var(--text-primary);
  }

  /* Settings Sections */
  .settings-section {
    padding: var(--spacing-lg);
  }

  .settings-section.quick-access {
    background-color: var(--surface);
    border-bottom: 1px solid var(--divider);
  }

  .section-title {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  /* Quick Settings */
  .quick-settings {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .quick-setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md);
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
    gap: var(--spacing-md);
  }

  .setting-info {
    flex: 1;
    min-width: 0;
  }

  .setting-label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: var(--font-size-base);
    font-weight: 500;
    color: var(--text-primary);
  }

  .setting-label .material-icons {
    font-size: var(--icon-size-md);
    color: var(--primary-color);
  }

  .setting-controls {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  /* Toggle Switch */
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 3rem;
    height: 1.75rem;
    cursor: pointer;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--divider);
    border-radius: 1.75rem;
    transition: background-color 0.2s;
  }

  .toggle-slider:before {
    content: '';
    position: absolute;
    height: 1.25rem;
    width: 1.25rem;
    left: 0.25rem;
    bottom: 0.25rem;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }

  .toggle-switch input:checked + .toggle-slider {
    background-color: var(--primary-color);
  }

  .toggle-switch input:checked + .toggle-slider:before {
    transform: translateX(1.25rem);
  }

  /* Volume Slider */
  .volume-slider {
    width: 6rem;
    height: 0.25rem;
    border-radius: 0.125rem;
    background: var(--divider);
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }

  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background: var(--primary-color);
    cursor: pointer;
  }

  .volume-slider::-moz-range-thumb {
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background: var(--primary-color);
    cursor: pointer;
    border: none;
  }

  /* Theme Select */
  .theme-select {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--divider);
    border-radius: var(--border-radius);
    background: var(--surface);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .theme-select:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-alpha-10);
  }

  /* Settings Cards */
  .settings-cards {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .settings-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--surface);
    border: 1px solid var(--divider);
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: all 0.2s;
  }

  .settings-card:hover {
    background-color: var(--surface-variant);
    border-color: var(--primary-color);
  }

  .settings-card.update-available {
    border-color: var(--primary-color);
    background-color: var(--primary-alpha-10);
  }

  .settings-card.update-available .card-icon {
    background-color: var(--primary-color);
  }

  .settings-card.update-available .card-icon .material-icons {
    color: white;
  }

  .settings-card.update-available:hover {
    background-color: var(--primary-alpha-20);
  }

  .card-icon {
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--primary-alpha-10);
    border-radius: 50%;
    flex-shrink: 0;
  }

  .card-icon .material-icons {
    font-size: var(--icon-size-lg);
    color: var(--primary-color);
  }

  .card-content {
    flex: 1;
    min-width: 0;
  }

  .card-content h3 {
    margin: 0 0 var(--spacing-xs) 0;
    font-size: var(--font-size-base);
    font-weight: 500;
    color: var(--text-primary);
  }

  .card-content p {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
    font-size: var(--font-size-sm);
    color: var(--text-hint);
  }

  .card-meta .material-icons {
    font-size: var(--icon-size-sm);
  }

  .card-arrow {
    flex-shrink: 0;
  }

  .card-arrow .material-icons {
    font-size: var(--icon-size-md);
    color: var(--text-hint);
  }

  @media (max-width: 480px) {
    .page-header {
      padding: var(--spacing-md);
    }

    .settings-section {
      padding: var(--spacing-md);
    }

    .quick-setting-item {
      padding: var(--spacing-sm);
    }

    .volume-slider {
      width: 4rem;
    }
  }
</style>
