Here is the step-by-step implementation plan to achieve the logic you described: **Auto-Start Sets** acts as a fallback continuity setting that is active when the global **Auto-Advance** is off.

This involves modifying 4 files.

### 1. Update Type Definitions
**File:** `src/lib/types/settings.ts`

Add the new boolean property to the interface.

```typescript:src/lib/types/settings.ts
export interface AppSettings {
  // ... existing fields ...
  enableAutoAdvance: boolean; // Enable automatic advance to next exercise
  autoAdvanceSets: boolean; // NEW: Enable automatic advance to next set/side (if global auto-advance is off)
  pauseBetweenExercises: number; // Rest between exercises when auto-advance is enabled (seconds)
  // ... existing fields ...
}
```

### 2. Set Default Value
**File:** `src/lib/services/PTService.ts`

Initialize the default settings. `true` is usually the preferred UX for sets (timers usually continue), but users can disable it.

```typescript:src/lib/services/PTService.ts
const DEFAULT_SETTINGS: AppSettings = {
  // ... existing defaults ...
  enableAutoAdvance: false, 
  autoAdvanceSets: true, // NEW: Default to true
  pauseBetweenExercises: 20,
  // ... existing defaults ...
};
```

### 3. Add Settings Toggle
**File:** `src/lib/components/TimingSettingsModal.svelte`

We will add the toggle directly below "Enable Auto-Advance". We will use the `sub-setting` class and `disabled` class to visual indicate hierarchy and state, matching your requirement that it greys out when Auto-Advance is On.

```svelte:src/lib/components/TimingSettingsModal.svelte
<script lang="ts">
  // ... existing imports ...

  // Form state
  // ... existing variables ...
  let enableAutoAdvance = true;
  let autoAdvanceSets = true; // NEW
  let pauseBetweenExercises = 20;
  
  // Load current settings
  onMount(() => {
    if ($ptState.settings) {
      // ... existing assignments ...
      enableAutoAdvance = $ptState.settings.enableAutoAdvance;
      autoAdvanceSets = $ptState.settings.autoAdvanceSets ?? true; // NEW
      pauseBetweenExercises = $ptState.settings.pauseBetweenExercises;
      // ...
    }
  });

  async function saveSettings() {
    if (!$ptState.settings) return;

    const newSettings: AppSettings = {
      ...$ptState.settings,
      // ... existing fields ...
      enableAutoAdvance,
      autoAdvanceSets, // NEW
      pauseBetweenExercises,
      // ...
    };
    // ... rest of save logic
  }
</script>

<!-- In the HTML structure -->

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Enable Auto-Advance (Exercises)</span>
          <span class="setting-description">Automatically advance to the next exercise when current exercise completes</span>
        </div>
        <div class="setting-control">
          <label class="toggle-switch">
            <input type="checkbox" bind:checked={enableAutoAdvance} />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- NEW SETTING START -->
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
      <!-- NEW SETTING END -->

      <div class="setting-item sub-setting" class:disabled={!enableAutoAdvance}>
        <!-- ... existing Rest Between Exercises logic ... -->
```

### 4. Update Player Logic
**File:** `src/routes/play/+page.svelte`

This is the core logic change. We define the logic such that sets continue if `autoAdvanceActive` (global) OR `autoAdvanceSets` (local) is true.

**A. Add state variable and load setting:**

```typescript:src/routes/play/+page.svelte
  // ... existing Settings variables
  let enableAutoAdvance = true;
  let autoAdvanceSets = true; // NEW
  let pauseBetweenExercises = 10;

  // ... inside loadSession() ...
    if ($ptState.settings) {
      // ...
      enableAutoAdvance = $ptState.settings.enableAutoAdvance;
      autoAdvanceSets = $ptState.settings.autoAdvanceSets ?? true; // NEW
      // ...
    }
```

**B. Update `startRepsExercise` (Immediate transition logic):**
This handles the case where `restBetweenSets` is 0 and the app moves instantly to the next set/side.

*Find the blocks handling unilateral phase switches and set increments (around lines 525 and 553).*

```typescript:src/routes/play/+page.svelte
            // ... inside startRepsExercise ...
            
            // AUTOMATICALLY START REST TIMER CHECK
            if (restDuration > 0) {
              setTimeout(() => {
                startRestTimer();
              }, 300);
            } else {
              // CHANGE LOGIC HERE:
              // No rest configured, auto-advance based on EITHER setting
              if (autoAdvanceActive || autoAdvanceSets) {
                startRepsExercise();
              } else {
                isAwaitingSetContinuation = true;
                timerState = 'paused';
              }
            }
```

**C. Update `startRestTimer` (Rest Timer transition logic):**
This handles the transition when the rest timer hits zero. Note that `startRestTimer` is **only** used for sets/sides. There is a different function (`startPreparingForNextExercise`) for moving between exercises.

```typescript:src/routes/play/+page.svelte
  function startRestTimer() {
    if (!currentExercise) return;

    // ... setup code ...

    exerciseTimerInterval = window.setInterval(() => {
      restElapsedSeconds++;

      // Check if rest period is complete
      if (restElapsedSeconds >= restDuration) {
        clearInterval(exerciseTimerInterval);

        // ... audio cues logic ...

        restElapsedSeconds = 0;

        // CHANGE LOGIC HERE:
        // If GLOBAL auto-advance OR SET auto-advance is enabled, continue.
        if (autoAdvanceActive || autoAdvanceSets) {
          timerState = 'active';

          setTimeout(() => {
            if (currentExercise.type === 'reps') {
              startRepsExercise();
            } else {
              startDurationExercise();
            }
          }, 300);
        } else {
          isAwaitingSetContinuation = true;
          timerState = 'paused';
        }
      }
    }, 1000);
  }
```

### Logic Verification based on your requirements:

1.  **If `Auto-Advance Exercises` (Play page toggle) is ON:**
    *   `autoAdvanceActive` is `true`.
    *   Logic `if (autoAdvanceActive || autoAdvanceSets)` evaluates to `true`.
    *   **Result:** Sets continue automatically.

2.  **If `Auto-Advance Exercises` is OFF:**
    *   `autoAdvanceActive` is `false`.
    *   Logic becomes `if (false || autoAdvanceSets)`.
    *   **Result:** Behavior depends entirely on the `autoAdvanceSets` toggle.

3.  **End of Exercise (moving to next Exercise):**
    *   Handled by `completeCurrentExercise`.
    *   This function still checks `if (autoAdvanceActive && pauseBetweenExercises > 0)`.
    *   **Result:** Moving to a *new* exercise still strictly respects the main Auto-Advance toggle, ignoring the "Sets" toggle.