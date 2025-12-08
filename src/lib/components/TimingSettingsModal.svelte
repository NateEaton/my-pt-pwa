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
  import DurationInput from './DurationInput.svelte';
  import { ptState, ptService } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';
  import type { AppSettings } from '$lib/types/pt';

  const dispatch = createEventDispatcher();

  // Form state
  let defaultDuration = 60;
  let defaultRepDuration = 30;
  let defaultReps = 10;
  let defaultSets = 3;
  let defaultPauseBetweenReps = 5;
  let startCountdownDuration = 3;
  let endSessionDelay = 5;
  let restBetweenSets = 20;
  let enableAutoAdvance = true;
  let autoAdvanceSets = true;
  let pauseBetweenExercises = 20;
  let startingSide: 'left' | 'right' = 'left';

  // Load current settings
  onMount(() => {
    if ($ptState.settings) {
      defaultDuration = $ptState.settings.defaultDuration;
      defaultRepDuration = $ptState.settings.defaultRepDuration;
      defaultReps = $ptState.settings.defaultReps;
      defaultSets = $ptState.settings.defaultSets;
      defaultPauseBetweenReps = $ptState.settings.defaultPauseBetweenReps;
      startCountdownDuration = $ptState.settings.startCountdownDuration;
      endSessionDelay = $ptState.settings.endSessionDelay;
      restBetweenSets = $ptState.settings.restBetweenSets;
      enableAutoAdvance = $ptState.settings.enableAutoAdvance;
      autoAdvanceSets = $ptState.settings.autoAdvanceSets ?? true;
      pauseBetweenExercises = $ptState.settings.pauseBetweenExercises;
      startingSide = $ptState.settings.startingSide || 'left';
    }
  });

  function handleClose() {
    dispatch('close');
  }

  async function saveSettings() {
    if (!$ptState.settings) return;

    const newSettings: AppSettings = {
      ...$ptState.settings,
      defaultDuration,
      defaultRepDuration,
      defaultReps,
      defaultSets,
      defaultPauseBetweenReps,
      startCountdownDuration,
      endSessionDelay,
      restBetweenSets,
      enableAutoAdvance,
      autoAdvanceSets,
      pauseBetweenExercises,
      startingSide
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

<Modal fullScreen={true} title="Timing Settings" iosStyle={true} on:close={handleClose}>
  <div class="timing-settings-content">
    <p class="modal-description">
      Adjust timing preferences for your exercise sessions and rest periods.
    </p>

    <!-- Settings List -->
    <div class="settings-list">
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Exercise Duration</span>
          <span class="setting-description">Default period for timed exercises</span>
        </div>
        <div class="setting-control">
          <DurationInput
            bind:value={defaultDuration}
            min={1}
            max={600}
            placeholder="MM:SS or seconds"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Rep Duration</span>
          <span class="setting-description">Default period per repetition</span>
        </div>
        <div class="setting-control">
          <DurationInput
            bind:value={defaultRepDuration}
            min={1}
            max={120}
            placeholder="MM:SS or seconds"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Default Reps</span>
          <span class="setting-description">Default number of repetitions for reps-based exercises</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={defaultReps}
            min="1"
            max="100"
            class="number-input"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Default Sets</span>
          <span class="setting-description">Default number of sets for reps-based exercises</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={defaultSets}
            min="1"
            max="20"
            class="number-input"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Pause Between Reps</span>
          <span class="setting-description">Default pause between individual reps (e.g., to switch legs)</span>
        </div>
        <div class="setting-control">
          <DurationInput
            bind:value={defaultPauseBetweenReps}
            min={0}
            max={60}
            placeholder="MM:SS or seconds"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Rest Between Sets</span>
          <span class="setting-description">Default rest period between sets</span>
        </div>
        <div class="setting-control">
          <DurationInput
            bind:value={restBetweenSets}
            min={0}
            max={300}
            placeholder="MM:SS or seconds"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Start Countdown</span>
          <span class="setting-description">Countdown before exercise starts (3-2-1)</span>
        </div>
        <div class="setting-control">
          <DurationInput
            bind:value={startCountdownDuration}
            min={0}
            max={10}
            placeholder="MM:SS or seconds"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Enable Auto-Advance</span>
          <span class="setting-description">Automatically advance to the next exercise when current exercise completes</span>
        </div>
        <div class="setting-control">
          <label class="toggle-switch">
            <input type="checkbox" bind:checked={enableAutoAdvance} />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="setting-item sub-setting" class:disabled={!enableAutoAdvance}>
        <div class="setting-info">
          <span class="setting-label">Rest Between Exercises</span>
          <span class="setting-description">Rest time before automatically starting next exercise</span>
        </div>
        <div class="setting-control">
          <DurationInput
            bind:value={pauseBetweenExercises}
            min={0}
            max={120}
            placeholder="MM:SS or seconds"
            disabled={!enableAutoAdvance}
          />
        </div>
      </div>

      <div class="setting-item sub-setting" class:disabled={enableAutoAdvance}>
        <div class="setting-info">
          <span class="setting-label">Auto-Start Next Set</span>
          <span class="setting-description">
            {#if enableAutoAdvance}
              Controlled by Auto-Advance above
            {:else}
              Automatically start next set/side after rest period ends
            {/if}
          </span>
        </div>
        <div class="setting-control">
          <label class="toggle-switch">
            <input type="checkbox" bind:checked={autoAdvanceSets} disabled={enableAutoAdvance} />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">End Session Delay</span>
          <span class="setting-description">Delay before closing session player after completion</span>
        </div>
        <div class="setting-control">
          <DurationInput
            bind:value={endSessionDelay}
            min={0}
            max={10}
            placeholder="MM:SS or seconds"
          />
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Starting Side</span>
          <span class="setting-description">For exercises marked as Unilateral or Alternating, which side should be performed first?</span>
        </div>
        <div class="setting-control">
          <select bind:value={startingSide} class="setting-input">
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
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
  .timing-settings-content {
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
  }

  /* Component-specific setting item styling (card-based) */
  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
    gap: var(--spacing-md);
  }

  .setting-item.sub-setting {
    margin-left: var(--spacing-xl);
    background-color: var(--surface);
    border-left: 3px solid var(--primary-color);
  }

  .setting-item.disabled {
    opacity: 0.5;
    pointer-events: none;
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

  .number-input {
      width: 5rem;
      padding: var(--spacing-sm) var(--spacing-md); /* match DurationInput */
      font-size: 1rem;                              /* match DurationInput */
      border: 1px solid var(--border-color, #ccc);  /* same variable & fallback */
      border-radius: var(--border-radius);          /* match */
      background: var(--surface);                   /* match */
      color: var(--text-primary);                   /* match */
      font-variant-numeric: tabular-nums;           /* match */
      transition: border-color 0.2s;                /* match */
      text-align: center;
      box-sizing: border-box;
  }

  .number-input:focus {
      outline: none;
      border-color: var(--primary-color);
  }

  .number-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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
  }
</style>
