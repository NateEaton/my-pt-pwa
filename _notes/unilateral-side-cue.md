I have designed a "Soft Gong/Chime" sound profile using the Web Audio API and updated the logic to ensure it replaces the standard rest cue during unilateral side switches.

Here are the changes.

### 1. Update Audio Service (The Sound)
I've implemented a synthetic chime. It uses a primary sine wave for the tone, but unlike the other "beeps" which stop abruptly or fade quickly, this one uses an exponential decay over 2 seconds to mimic the resonance of a chime or gong.

**File:** `src/lib/services/AudioService.ts`

```typescript:src/lib/services/AudioService.ts
// ... existing imports

export class AudioService {
  // ... existing properties

  // ... existing methods (unlock, playBeep, etc.)

  /**
   * Internal helper to play a tone at a specific time
   */
  private playToneAtTime(frequency: number, startTime: number, duration: number, type: OscillatorType = 'sine'): void {
    if (!this.unlocked || !this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    // Smooth envelope
    const attack = 0.015;
    const release = 0.030;
    const volume = this.masterVolume ?? 0.7;

    osc.frequency.value = frequency;
    osc.type = type;

    // Envelope: 0 -> volume -> volume -> 0
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + attack);
    gain.gain.setValueAtTime(volume, startTime + duration - release);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  /**
   * Play a resonating chime/gong sound (Exponential decay)
   */
  private playChime(frequency: number): void {
    if (!this.unlocked || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    const volume = this.masterVolume ?? 0.7;

    osc.frequency.value = frequency;
    osc.type = 'sine'; // Sine is best for "wind chime" purity

    // Gong Envelope: Fast attack, long exponential decay
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02); // Fast attack
    // Exponentially decay to near-silence over 2 seconds
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0); 

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + 2.0); // Allow full 2s resonance

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  // ... existing triggerHaptic ...

  // ... existing phase methods (onDurationStart, etc) ...

  /**
   * Called when switching sides in a unilateral exercise
   * Plays a "Soft Gong/Wind Chime" sound
   */
  public onSwitchSides(): void {
    // Play a single, resonant C5 note (523.25Hz)
    // This sounds like a mid-tone wind chime
    this.playChime(523.25);

    // Distinct haptic pattern: Long-Short
    this.triggerHaptic(200);
    setTimeout(() => this.triggerHaptic(50), 300);
  }

  // ... rest of file
```

### 2. Update Audio Settings Modal (The Preview)
Added the button to preview the new sound.

**File:** `src/lib/components/AudioSettingsModal.svelte`

```svelte:src/lib/components/AudioSettingsModal.svelte
<script lang="ts">
  // ... existing imports

  // ... existing preview functions

  function previewCountdownEnd() {
    audioService.setMasterVolume(soundVolume);
    audioService.setExerciseAboutToEndEnabled(true);
    audioService.setHapticsEnabled(hapticsEnabled);

    audioService.onCountdownEnd(3);
    setTimeout(() => audioService.onCountdownEnd(2), 1000);
    setTimeout(() => audioService.onCountdownEnd(1), 2000);
  }

  // NEW: Preview the gong
  function previewSwitchSides() {
    audioService.setMasterVolume(soundVolume);
    audioService.setHapticsEnabled(hapticsEnabled);
    audioService.onSwitchSides();
  }

  function previewSessionComplete() {
    // ...
  }
// ...
</script>

<!-- In the Template -->
          <button
            class="btn-preview"
            on:click={previewCountdownEnd}
            disabled={!soundEnabled}
          >
            <span class="material-icons">arrow_downward</span>
            About-to-End
          </button>
          
          <!-- NEW BUTTON -->
          <button
            class="btn-preview"
            on:click={previewSwitchSides}
            disabled={!soundEnabled}
          >
            <span class="material-icons">swap_horiz</span>
            Switch Sides
          </button>
          
          <button
            class="btn-preview"
            on:click={previewSessionComplete}
            disabled={!soundEnabled}
          >
            <span class="material-icons">celebration</span>
            Session Complete
          </button>
```

### 3. Update Play Page (The Logic)
This implements the logic to play the gong *only* on unilateral side switches, and suppressing the standard "Rest Start" beep in that specific instance to avoid clashing audio.

**File:** `src/routes/play/+page.svelte`

```typescript:src/routes/play/+page.svelte
// ... existing imports and variables ...

  // ... inside startRepsExercise ...
        if (isEndOfPhase) {
          // Phase is complete
          clearInterval(exerciseTimerInterval);

          // For unilateral mode, check if we need to do the second side
          if (sideMode === 'unilateral' && sidePhase === 'first') {
            
            // --- NEW: Play Switch Sides Cue ---
            if (shouldPlayAudio()) {
              audioService.onSwitchSides();
            }
            // ----------------------------------

            // Switch to second side, keep same set number
            sidePhase = 'second';
            if (currentSide) {
              currentSide = getOppositeSide(currentSide);
            }
            exerciseElapsedSeconds = 0;
            repElapsedSeconds = 0;
            isPausingBetweenReps = false;
            currentRep = 1;

            // Get rest duration
            const restDuration = currentExercise.restBetweenSets ?? restBetweenSets;

            // Automatically start rest timer if there's a non-zero rest time
            if (restDuration > 0) {
              setTimeout(() => {
                // Pass FALSE to skip the standard "Rest Start" beep
                // because the Gong just played
                startRestTimer(false); 
              }, 300);
            } else {
              // ... Auto-Start Logic from previous step ...
              if (autoAdvanceActive || autoAdvanceSets) {
                startRepsExercise();
              } else {
                isAwaitingSetContinuation = true;
                timerState = 'paused';
              }
            }
          } else {
            // Either bilateral/alternating completed, or unilateral second side completed
            if (currentSet >= sets) {
              completeCurrentExercise();
            } else {
              // Set complete, more sets to go
              currentSet++;
              // ... reset variables ...
              sidePhase = 'first'; 
              if (sideMode === 'unilateral' && currentSide) {
                currentSide = startingSide;
              } else if (sideMode === 'alternating' && currentSide && setStartingSide) {
                currentSide = getOppositeSide(setStartingSide);
                setStartingSide = currentSide;
              }
              exerciseElapsedSeconds = 0;
              repElapsedSeconds = 0;
              isPausingBetweenReps = false;
              currentRep = 1;

              // Get rest duration
              const restDuration = currentExercise.restBetweenSets ?? restBetweenSets;

              if (restDuration > 0) {
                setTimeout(() => {
                  // Pass TRUE (default) to play standard rest beep
                  startRestTimer(true); 
                }, 300);
              } else {
                // ... Auto-Start Logic ...
                if (autoAdvanceActive || autoAdvanceSets) {
                  startRepsExercise();
                } else {
                  isAwaitingSetContinuation = true;
                  timerState = 'paused';
                }
              }
            }
          }
        } 
        // ... rep completion logic ...

  // MODIFIED FUNCTION SIGNATURE: accept playStartCue
  function startRestTimer(playStartCue: boolean = true) {
    if (!currentExercise) return;

    // Get rest duration
    const restDuration = currentExercise.restBetweenSets ?? restBetweenSets;

    restElapsedSeconds = 0;
    timerState = 'resting';

    // Play rest start tone only if:
    // 1. Audio enabled
    // 2. Setting enabled
    // 3. We weren't told to skip it (by the Switch Sides logic)
    if (shouldPlayAudio() && $ptState.settings?.audioRestCuesEnabled && playStartCue) {
      audioService.onRestStart();
    }

    exerciseTimerInterval = window.setInterval(() => {
      restElapsedSeconds++;

      // Check if rest period is complete
      if (restElapsedSeconds >= restDuration) {
        clearInterval(exerciseTimerInterval);

        // Play rest end tone only if rest cues are enabled
        if (shouldPlayAudio() && $ptState.settings?.audioRestCuesEnabled) {
          audioService.onRestEnd();
        }

        restElapsedSeconds = 0;

        // Auto-Start Logic
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

The previous response covers about 95% of the work. However, there is **one critical spot** in `src/routes/play/+page.svelte` that was missed in the previous snippets.

Because the logic for handling the end of a set is duplicated in the **resume** function (used when you pause mid-rep and then hit play), you must apply the exact same logic changes there. If you don't, the new features (Auto-Start Sets and the Gong sound) won't work if the user happens to pause and resume right before the set ends.

Here is the final piece to make the handoff complete:

### 7. Update Resume Logic (Missing Piece)
**File:** `src/routes/play/+page.svelte`

Apply the same changes to `resumeRepsExercise` that we applied to `startRepsExercise`.

```typescript
  function resumeRepsExercise() {
    // ... existing setup ...

    exerciseTimerInterval = window.setInterval(() => {
      // ... existing counter logic ...

      // Check if rep is complete
      if (repElapsedSeconds >= repDuration) {
        // ... existing phase check logic ...

        if (isEndOfPhase) {
          // Phase is complete
          clearInterval(exerciseTimerInterval);

          // For unilateral mode, check if we need to do the second side
          if (sideMode === 'unilateral' && sidePhase === 'first') {
            
            // --- NEW: Play Switch Sides Cue ---
            if (shouldPlayAudio()) {
              audioService.onSwitchSides();
            }
            // ----------------------------------

            // Switch to second side...
            sidePhase = 'second';
            if (currentSide) {
              currentSide = getOppositeSide(currentSide);
            }
            // ... reset counters ...

            const restDuration = currentExercise.restBetweenSets ?? restBetweenSets;

            if (restDuration > 0) {
              setTimeout(() => {
                // --- UPDATE: Pass false to skip beep ---
                startRestTimer(false); 
              }, 300);
            } else {
              // --- UPDATE: Check autoAdvanceSets ---
              if (autoAdvanceActive || autoAdvanceSets) {
                startRepsExercise();
              } else {
                isAwaitingSetContinuation = true;
                timerState = 'paused';
              }
            }
          } else {
            // Either bilateral/alternating completed...
            if (currentSet >= sets) {
              completeCurrentExercise();
            } else {
              // Set complete, more sets to go
              currentSet++;
              // ... reset logic ...

              const restDuration = currentExercise.restBetweenSets ?? restBetweenSets;

              if (restDuration > 0) {
                setTimeout(() => {
                  startRestTimer(true);
                }, 300);
              } else {
                // --- UPDATE: Check autoAdvanceSets ---
                if (autoAdvanceActive || autoAdvanceSets) {
                  startRepsExercise();
                } else {
                  isAwaitingSetContinuation = true;
                  timerState = 'paused';
                }
              }
            }
          }
        } else {
          // ... pause between reps logic ...
        }
      }
    }, 1000);
  }
```

### Summary of Complete Implementation Package
To hand this off to a developer, they need:

1.  **`src/lib/types/settings.ts`**: Add `autoAdvanceSets` boolean.
2.  **`src/lib/services/PTService.ts`**: Set default for `autoAdvanceSets` to `true`.
3.  **`src/lib/services/AudioService.ts`**: Add `playToneAtTime` helper, `playChime` (Gong), and `onSwitchSides`.
4.  **`src/lib/components/AudioSettingsModal.svelte`**: Add "Switch Sides" preview button.
5.  **`src/lib/components/TimingSettingsModal.svelte`**: Add the "Auto-Start Next Set" toggle (disabled when global auto-advance is on).
6.  **`src/routes/play/+page.svelte`**:
    *   Update `loadSession` to read the new setting.
    *   Update `startRestTimer` signature to accept `playStartCue` (boolean).
    *   Update `startRepsExercise` **AND** `resumeRepsExercise` to use `autoAdvanceSets` and trigger `onSwitchSides` / `startRestTimer(false)`.

With this final addition, the feature set is complete and robust.

---

Back to the side switch but for unilateral exercise. What would change if instead of the cue being a tone played after the end-rep tone (or instead of the start-rest tone if enabled) if the tone to switch sides is played instead of the normal end-rep tone when it's the last rep of a side and not the last rep of a set?

---

This is a significant refinement in "audio UX."

**The Impact of the Change:**
Functionally, this shifts the cue from being **reactionary** (the rep is done -> now play a sound to switch) to being **anticipatory/conclusive** (this specific sound marks the completion of the side).

1.  **Better Flow:** By replacing the generic "Rep End" beep with the "Switch" gong, you allow the user to mentally disengage from the rep slightly earlier and transition immediately, rather than waiting for a beep, finishing the motion, hearing a second sound, and *then* moving.
2.  **Less Audio Clutter:** You avoid the "double beep" scenario (Beep... Gong... Rest).
3.  **Code Complexity:** It simplifies the phase-change logic block but adds a conditional check to the per-second ticker.

Here is exactly what needs to change in the code to implement this.

### Implementation Logic

We need to modify **`src/routes/play/+page.svelte`** in two specific places (inside `startRepsExercise` and `resumeRepsExercise`).

We are moving the `onSwitchSides()` call **out** of the "Phase Complete" block and **into** the "Every Second Tick" block, specifically where it currently handles the rep-end beep.

### Updated Code (`src/routes/play/+page.svelte`)

I will apply this change to `startRepsExercise`. You should apply the exact same pattern to `resumeRepsExercise`.

```typescript
// Inside startRepsExercise (and resumeRepsExercise) ...

    exerciseTimerInterval = window.setInterval(() => {
      // ... check for pausing ...

      // --- CHANGED SECTION START ---
      // Determine audio cues at the end of the rep (1 second remaining)
      if (repElapsedSeconds === repDuration - 1 && shouldPlayAudio()) {
        const reps = currentExercise.defaultReps || 10;
        
        // Check if this is the very last rep of the first side in a unilateral exercise
        const isLastRepOfFirstSide = 
          sideMode === 'unilateral' && 
          sidePhase === 'first' && 
          currentRep === reps;

        if (isLastRepOfFirstSide) {
          // Play distinctive Gong INSTEAD of standard rep beep
          audioService.onSwitchSides();
        } else {
          // Play standard high beep
          audioService.onRepEnd();
        }
      }
      // --- CHANGED SECTION END ---

      exerciseElapsedSeconds++;
      repElapsedSeconds++;

      // ... existing rep calculation logic ...

      // Check if rep is complete
      if (repElapsedSeconds >= repDuration) {
        // ... existing phase check ...

        if (isEndOfPhase) {
          clearInterval(exerciseTimerInterval);

          if (sideMode === 'unilateral' && sidePhase === 'first') {
            
            // --- REMOVED CODE ---
            // We removed audioService.onSwitchSides() from here
            // because it played 1 second ago.
            // --------------------

            // Switch to second side
            sidePhase = 'second';
            if (currentSide) {
              currentSide = getOppositeSide(currentSide);
            }
            
            // ... reset counters ...

            const restDuration = currentExercise.restBetweenSets ?? restBetweenSets;

            if (restDuration > 0) {
              setTimeout(() => {
                // We still pass FALSE here. 
                // Since the Gong is long (2s decay), we don't want the 
                // Rest Start beep to interrupt the tail of the Gong.
                startRestTimer(false); 
              }, 300);
            } else {
               // ... auto advance logic ...
            }
          } 
          // ... rest of logic
```

### Summary of Differences

| Feature | Previous Logic | New Logic |
| :--- | :--- | :--- |
| **Trigger Time** | End of Rep (`t=0` of Rest) | End of Rep duration (`t-1` of Rep) |
| **Audio Sequence** | High Beep (Rep End) -> Gong (Switch) | Gong (Switch/Rep End combined) |
| **User Experience** | "Rep done. Oh, switch sides." | "Side done. Switch." |

This approach is cleaner and fits your "Gong" sound choice better, as the long decay of the gong effectively fills the silence of the transition period.