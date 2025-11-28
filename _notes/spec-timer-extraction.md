# Design/Implementation Spec: Timer Logic Extraction

## Overview

Extract the session timer state machine from `play/+page.svelte` (**~2,056 lines**) into a dedicated service and reactive store for improved testability, maintainability, and separation of concerns.

**Key Metrics:**
- Current component: **2,056 lines**, **116 variables**, **30 functions**, **20 timer intervals**
- Current tests: **0** (component is untestable in current form)
- After refactor: 3 focused files (~400-500 lines each), fully unit testable

---

## Current Architecture

The `play/+page.svelte` component currently contains all of the following interleaved:

### State Variables (23 variables)
- `timerState`: 'paused' | 'countdown' | 'active' | 'resting' | 'completed' | 'preparing'
- `currentExerciseIndex`, `currentExercise`
- `currentSet`, `currentRep`
- `currentSide`, `sidePhase`, `setStartingSide`
- `exerciseElapsedSeconds`, `repElapsedSeconds`
- `totalElapsedSeconds`, `restElapsedSeconds`
- `countdownSeconds`, `preparingSeconds`, `pauseRemainingSeconds`
- `autoAdvanceActive`, `isAwaitingSetContinuation`
- `isPausingBetweenReps`

### Timer Handles (5 intervals)
- `totalTimerInterval`
- `exerciseTimerInterval`
- `preparingInterval`
- `pauseInterval`
- Various countdown intervals

### Logic Functions (30+ functions)
- `startExerciseCountdown()`
- `startExercise()`
- `startDurationExercise()` / `resumeDurationExercise()`
- `startRepsExercise()` / `resumeRepsExercise()`
- `completeCurrentExercise()`
- `startRestTimer()`
- `advanceToNextExercise()`
- Side initialization and switching logic
- Rep counting algorithms (bilateral/unilateral/alternating)
- Pause between reps management

### External Integrations
- Audio cue triggers (AudioService)
- Session persistence (PTService)
- Wake lock management
- UI auto-scroll

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    play/+page.svelte                        │
│  UI Layer: Renders state, handles user gestures             │
│  - Subscribes to sessionPlayer store                        │
│  - Calls store action methods                               │
│  - Manages wake lock and scroll behavior                    │
│  - ~400-500 lines                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   sessionPlayer.ts (store)                  │
│  Reactive Layer: Svelte store wrapping the service          │
│  - Exposes reactive state for UI binding                    │
│  - Translates service callbacks to store updates            │
│  - Handles audio cue delegation                             │
│  - Handles session persistence                              │
│  - ~150-200 lines                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  SessionTimerService.ts                     │
│  Logic Layer: Pure state machine, no Svelte dependencies    │
│  - Manages all timer intervals                              │
│  - Implements exercise state transitions                    │
│  - Calculates rep/set/side progression                      │
│  - Emits state changes via callbacks                        │
│  - Testable in isolation                                    │
│  - ~500-600 lines                                           │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        AudioService    PTService       (callbacks)
```

---

## New File: `src/lib/services/SessionTimerService.ts`

### Type Definitions

```typescript
/*
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Nathan A. Eaton Jr.
 * [full copyright header]
 */

import type { Exercise, AppSettings } from '$lib/types';

// ==================== State Types ====================

/**
 * Timer state machine states
 */
export type TimerState =
  | 'idle'       // Initial state, no session loaded
  | 'paused'     // Session loaded but not running
  | 'countdown'  // 3-2-1 countdown before exercise
  | 'active'     // Exercise in progress
  | 'resting'    // Rest period between sets or sides
  | 'preparing'  // Preparation/transition between exercises
  | 'completed'; // Session finished

/**
 * Side for unilateral/alternating exercises
 */
export type Side = 'left' | 'right' | null;

/**
 * Phase within unilateral exercises
 */
export type SidePhase = 'first' | 'second';

/**
 * Current exercise execution state
 */
export interface ExerciseState {
  /** Index in the exercises array */
  index: number;
  /** Current exercise reference (null if none) */
  exercise: Exercise | null;
  /** Current set number (1-based) */
  set: number;
  /** Current rep number (1-based) */
  rep: number;
  /** Current side for unilateral/alternating */
  side: Side;
  /** Phase for unilateral exercises */
  sidePhase: SidePhase;
  /** Starting side for current set (used in alternating mode) */
  setStartingSide: Side;
  /** Seconds elapsed in current exercise */
  elapsedSeconds: number;
  /** Seconds elapsed in current rep */
  repElapsedSeconds: number;
  /** True if in pause between reps */
  isPausingBetweenReps: boolean;
  /** Countdown seconds for pause between reps */
  pauseRemainingSeconds: number;
}

/**
 * Complete timer state snapshot
 */
export interface SessionTimerState {
  timerState: TimerState;
  exerciseState: ExerciseState;
  /** Total session elapsed time (only counts active time) */
  totalElapsedSeconds: number;
  /** Seconds elapsed in current rest period */
  restElapsedSeconds: number;
  /** Countdown seconds remaining (3, 2, 1) */
  countdownSeconds: number;
  /** Preparing/transition seconds remaining */
  preparingSeconds: number;
  /** Whether auto-advance is enabled */
  autoAdvanceActive: boolean;
  /** Waiting for user to continue after set */
  isAwaitingSetContinuation: boolean;
}

// ==================== Callback Types ====================

/**
 * Audio cue events emitted by the service
 */
export type AudioCue =
  | { type: 'countdown'; step: number }      // 3-2-1 before exercise
  | { type: 'countdownEnd'; step: number }   // 3-2-1 at end of duration
  | { type: 'durationStart' }                // Duration exercise started
  | { type: 'durationEnd' }                  // Duration exercise ended
  | { type: 'repStart' }                     // Rep started
  | { type: 'repEnd' }                       // Rep ended
  | { type: 'restStart' }                    // Rest period started
  | { type: 'restEnd' }                      // Rest period ended
  | { type: 'sessionComplete' };             // Session finished

/**
 * Callbacks for external integration
 */
export interface SessionTimerCallbacks {
  /** Called whenever timer state changes */
  onStateChange: (state: SessionTimerState) => void;
  /** Called when an exercise is completed or skipped */
  onExerciseComplete: (exerciseIndex: number, completed: boolean, skipped: boolean) => void;
  /** Called when the entire session is completed */
  onSessionComplete: () => void;
  /** Called to trigger an audio cue */
  onPlayAudio: (cue: AudioCue) => void;
}
```

### Service Class Implementation

```typescript
/**
 * SessionTimerService
 *
 * Pure logic service for managing session playback timing.
 * No Svelte dependencies - communicates via callbacks.
 */
export class SessionTimerService {
  // ==================== Private State ====================

  private exercises: Exercise[] = [];
  private settings: AppSettings | null = null;
  private callbacks: SessionTimerCallbacks;
  private state: SessionTimerState;

  // Timer handles
  private totalTimerInterval: number | null = null;
  private exerciseTimerInterval: number | null = null;
  private pauseInterval: number | null = null;
  private preparingInterval: number | null = null;

  // Settings cache
  private startCountdownDuration: number = 3;
  private restBetweenSets: number = 30;
  private pauseBetweenExercises: number = 10;
  private startingSide: Side = 'left';
  private audioRestCuesEnabled: boolean = true;
  private audioLeadInEnabled: boolean = false;

  // ==================== Constructor ====================

  constructor(callbacks: SessionTimerCallbacks) {
    this.callbacks = callbacks;
    this.state = this.createInitialState();
  }

  // ==================== Public: Initialization ====================

  /**
   * Initialize for a new session
   */
  initialize(
    exercises: Exercise[],
    settings: AppSettings,
    autoAdvance: boolean
  ): void {
    this.exercises = exercises;
    this.settings = settings;
    this.cacheSettings(settings);

    this.state = {
      ...this.createInitialState(),
      autoAdvanceActive: autoAdvance,
      exerciseState: {
        ...this.createInitialExerciseState(),
        index: 0,
        exercise: exercises[0] || null,
      }
    };

    if (this.state.exerciseState.exercise) {
      this.initializeSide(this.state.exerciseState.exercise);
    }

    this.startTotalTimer();
    this.notifyStateChange();
  }

  /**
   * Resume from an existing session instance
   */
  resume(
    exercises: Exercise[],
    settings: AppSettings,
    resumeState: {
      exerciseIndex: number;
      totalElapsedSeconds: number;
      autoAdvance: boolean;
      completedIndices: number[];
    }
  ): void {
    this.exercises = exercises;
    this.settings = settings;
    this.cacheSettings(settings);

    // Find first non-completed exercise at or after resumeState.exerciseIndex
    let startIndex = resumeState.exerciseIndex;
    while (startIndex < exercises.length &&
           resumeState.completedIndices.includes(startIndex)) {
      startIndex++;
    }

    this.state = {
      timerState: 'paused',
      exerciseState: {
        ...this.createInitialExerciseState(),
        index: startIndex,
        exercise: exercises[startIndex] || null,
      },
      totalElapsedSeconds: resumeState.totalElapsedSeconds,
      restElapsedSeconds: 0,
      countdownSeconds: 0,
      preparingSeconds: 0,
      autoAdvanceActive: resumeState.autoAdvance,
      isAwaitingSetContinuation: false,
    };

    if (this.state.exerciseState.exercise) {
      this.initializeSide(this.state.exerciseState.exercise);
    }

    this.startTotalTimer();
    this.notifyStateChange();
  }

  // ==================== Public: User Actions ====================

  /**
   * Start or resume playback
   */
  play(): void {
    if (this.state.timerState === 'paused') {
      if (this.state.isAwaitingSetContinuation) {
        // Continue to next set/side
        this.state.isAwaitingSetContinuation = false;
        const exercise = this.state.exerciseState.exercise;
        if (exercise?.type === 'reps') {
          this.startRepsExercise();
        } else {
          this.startDurationExercise();
        }
      } else {
        // Start countdown for exercise
        this.startExerciseCountdown();
      }
    } else if (this.state.timerState === 'resting') {
      // Skip rest and start next
      this.clearRestTimer();
      const exercise = this.state.exerciseState.exercise;
      if (exercise?.type === 'reps') {
        this.startRepsExercise();
      } else {
        this.startDurationExercise();
      }
    } else if (this.state.timerState === 'preparing') {
      // Skip preparation and start countdown
      this.clearPreparingTimer();
      this.startExerciseCountdown();
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.state.timerState === 'active' ||
        this.state.timerState === 'countdown') {
      this.clearExerciseTimer();
      this.state.timerState = 'paused';
      this.notifyStateChange();
    }
  }

  /**
   * Skip current exercise
   */
  skip(): void {
    if (this.state.timerState === 'paused') {
      const currentIndex = this.state.exerciseState.index;
      this.callbacks.onExerciseComplete(currentIndex, false, true);
      this.advanceToNextExercise();
    }
  }

  /**
   * Jump to a specific exercise
   */
  goToExercise(index: number): void {
    if (this.state.timerState !== 'paused') return;
    if (index < 0 || index >= this.exercises.length) return;

    this.clearAllTimers();

    this.state.exerciseState = {
      ...this.createInitialExerciseState(),
      index,
      exercise: this.exercises[index],
    };

    if (this.state.exerciseState.exercise) {
      this.initializeSide(this.state.exerciseState.exercise);
    }

    this.notifyStateChange();
  }

  /**
   * Toggle auto-advance setting
   */
  toggleAutoAdvance(): void {
    this.state.autoAdvanceActive = !this.state.autoAdvanceActive;
    this.notifyStateChange();
  }

  /**
   * Finish session early
   */
  finish(): void {
    this.clearAllTimers();
    this.state.timerState = 'completed';
    this.callbacks.onSessionComplete();
    this.notifyStateChange();
  }

  // ==================== Public: Accessors ====================

  /**
   * Get current state snapshot
   */
  getState(): SessionTimerState {
    return { ...this.state };
  }

  /**
   * Get exercises array
   */
  getExercises(): Exercise[] {
    return this.exercises;
  }

  // ==================== Public: Cleanup ====================

  /**
   * Clean up all resources
   */
  destroy(): void {
    this.clearAllTimers();
  }

  // ==================== Private: State Machine ====================

  private startExerciseCountdown(): void {
    this.state.timerState = 'countdown';
    this.state.countdownSeconds = this.startCountdownDuration;
    this.notifyStateChange();

    this.callbacks.onPlayAudio({ type: 'countdown', step: this.state.countdownSeconds });

    this.exerciseTimerInterval = window.setInterval(() => {
      this.state.countdownSeconds--;

      if (this.state.countdownSeconds >= 1) {
        this.callbacks.onPlayAudio({
          type: 'countdown',
          step: this.state.countdownSeconds
        });
      }

      this.notifyStateChange();

      if (this.state.countdownSeconds <= 0) {
        this.clearExerciseTimer();
        this.startExercise();
      }
    }, 1000);
  }

  private startExercise(): void {
    const exercise = this.state.exerciseState.exercise;
    if (!exercise) return;

    this.state.timerState = 'active';
    this.state.exerciseState.elapsedSeconds = 0;
    this.state.exerciseState.repElapsedSeconds = 0;
    this.state.exerciseState.isPausingBetweenReps = false;
    this.state.exerciseState.pauseRemainingSeconds = 0;
    this.state.exerciseState.set = 1;
    this.state.exerciseState.rep = 1;
    this.state.exerciseState.sidePhase = 'first';

    this.initializeSide(exercise);

    // Track starting side for alternating exercises
    if (exercise.sideMode === 'alternating') {
      this.state.exerciseState.setStartingSide = this.state.exerciseState.side;
    }

    if (exercise.type === 'duration') {
      this.runDurationExercise();
    } else {
      this.runRepsExercise();
    }
  }

  private runDurationExercise(): void {
    const exercise = this.state.exerciseState.exercise;
    if (!exercise) return;

    const totalDuration = exercise.defaultDuration || 60;

    this.callbacks.onPlayAudio({ type: 'durationStart' });

    this.exerciseTimerInterval = window.setInterval(() => {
      this.state.exerciseState.elapsedSeconds++;
      const remaining = totalDuration - this.state.exerciseState.elapsedSeconds;

      // End countdown audio cues (if lead-in enabled)
      if (this.audioLeadInEnabled && remaining >= 1 && remaining <= 3) {
        this.callbacks.onPlayAudio({ type: 'countdownEnd', step: remaining });
      }

      this.notifyStateChange();

      if (this.state.exerciseState.elapsedSeconds >= totalDuration) {
        this.clearExerciseTimer();

        // Play end tone if countdown wasn't used
        if (!this.audioLeadInEnabled) {
          this.callbacks.onPlayAudio({ type: 'durationEnd' });
        }

        this.completeCurrentExercise();
      }
    }, 1000);
  }

  private startDurationExercise(): void {
    this.state.timerState = 'active';
    this.runDurationExercise();
  }

  private runRepsExercise(): void {
    const exercise = this.state.exerciseState.exercise;
    if (!exercise) return;

    const reps = exercise.defaultReps || 10;
    const sets = exercise.defaultSets || 3;
    const repDuration = exercise.defaultRepDuration || this.settings?.defaultRepDuration || 2;
    const sideMode = exercise.sideMode || 'bilateral';

    this.callbacks.onPlayAudio({ type: 'repStart' });

    this.exerciseTimerInterval = window.setInterval(() => {
      // If pausing between reps, don't increment counters
      if (this.state.exerciseState.isPausingBetweenReps) {
        return;
      }

      const es = this.state.exerciseState;

      // Play end tone when counter shows "1" (last second of rep)
      if (es.repElapsedSeconds === repDuration - 1) {
        this.callbacks.onPlayAudio({ type: 'repEnd' });
      }

      es.elapsedSeconds++;
      es.repElapsedSeconds++;

      // Update current rep display based on mode
      this.updateRepDisplay(reps, repDuration, sideMode);

      // Check if rep is complete
      if (es.repElapsedSeconds >= repDuration) {
        this.handleRepComplete(reps, sets, repDuration, sideMode, exercise);
      }

      this.notifyStateChange();
    }, 1000);
  }

  private startRepsExercise(): void {
    this.state.timerState = 'active';
    this.runRepsExercise();
  }

  /**
   * Update the current rep display based on exercise mode
   *
   * Rep counting logic:
   * - Bilateral: Normal counting (1, 2, 3...)
   * - Unilateral: Normal counting per side (1, 2, 3... then switch side)
   * - Alternating: Each rep number appears twice (1L, 1R, 2L, 2R...)
   */
  private updateRepDisplay(reps: number, repDuration: number, sideMode: string): void {
    const es = this.state.exerciseState;

    if (sideMode === 'alternating') {
      // For alternating: each rep number appears twice (L then R)
      // Internal rep count: 1, 2, 3, 4, 5, 6, 7, 8 (for 4 reps)
      // Display rep count: 1, 1, 2, 2, 3, 3, 4, 4
      const timeInSet = es.elapsedSeconds % (reps * 2 * repDuration);
      const internalRepIndex = Math.floor(timeInSet / repDuration);
      es.rep = Math.floor(internalRepIndex / 2) + 1;
      if (es.rep > reps) es.rep = reps;
    } else {
      // For bilateral and unilateral: normal rep counting
      const timeInSet = es.elapsedSeconds % (reps * repDuration);
      const repIndex = Math.floor(timeInSet / repDuration);
      es.rep = (timeInSet === 0 && es.elapsedSeconds > 0) ? reps : Math.min(reps, repIndex + 1);
    }
  }

  /**
   * Handle completion of a single rep
   *
   * Logic varies by mode:
   * - Bilateral: Complete all reps, then advance set
   * - Unilateral: Complete all reps on first side, then second side, then advance set
   * - Alternating: Switch sides after each rep, complete all reps, then advance set
   */
  private handleRepComplete(
    reps: number,
    sets: number,
    repDuration: number,
    sideMode: string,
    exercise: Exercise
  ): void {
    const es = this.state.exerciseState;

    // Determine if we've completed a "phase" based on mode
    let isEndOfPhase = false;

    if (sideMode === 'unilateral') {
      // For unilateral: end of phase is after one side completes (reps iterations)
      isEndOfPhase = (es.elapsedSeconds % (reps * repDuration) === 0);
    } else {
      // For bilateral and alternating: end of phase is end of set
      isEndOfPhase = (es.elapsedSeconds % (reps * repDuration) === 0);
    }

    if (isEndOfPhase) {
      // Phase is complete
      this.clearExerciseTimer();

      // For unilateral mode, check if we need to do the second side
      if (sideMode === 'unilateral' && es.sidePhase === 'first') {
        // Switch to second side, keep same set number
        es.sidePhase = 'second';
        if (es.side) {
          es.side = this.getOppositeSide(es.side);
        }
        es.elapsedSeconds = 0;
        es.repElapsedSeconds = 0;
        es.isPausingBetweenReps = false;
        es.pauseRemainingSeconds = 0;
        es.rep = 1;

        // Start rest or continue
        this.handlePhaseTransition(exercise);
      } else {
        // Either bilateral/alternating completed, or unilateral second side completed
        // Check if all sets are done
        if (es.set >= sets) {
          // Exercise complete - all sets done
          this.completeCurrentExercise();
        } else {
          // Set complete, more sets to go
          es.set++;
          es.sidePhase = 'first'; // Reset to first side for next set

          if (sideMode === 'unilateral' && es.side) {
            // Reset to starting side for next set
            es.side = this.startingSide;
          } else if (sideMode === 'alternating' && es.side && es.setStartingSide) {
            // Alternate the starting side for next set
            es.side = this.getOppositeSide(es.setStartingSide);
            es.setStartingSide = es.side; // Remember this set's starting side
          }

          es.elapsedSeconds = 0;
          es.repElapsedSeconds = 0;
          es.isPausingBetweenReps = false;
          es.pauseRemainingSeconds = 0;
          es.rep = 1;

          // Start rest or continue
          this.handlePhaseTransition(exercise);
        }
      }
    } else {
      // Rep complete, but more reps in this phase - pause between reps
      this.startPauseBetweenReps(exercise, sideMode);
    }
  }

  /**
   * Handle transition between phases (sets or sides)
   * Either starts rest timer or continues to next phase
   */
  private handlePhaseTransition(exercise: Exercise): void {
    const restDuration = exercise.restBetweenSets ?? this.restBetweenSets;

    if (restDuration > 0) {
      // Add small delay to prevent overlapping tones
      setTimeout(() => {
        this.startRestTimer();
      }, 300);
    } else {
      // No rest configured, either auto-advance or pause
      if (this.state.autoAdvanceActive) {
        this.startRepsExercise();
      } else {
        this.state.isAwaitingSetContinuation = true;
        this.state.timerState = 'paused';
        this.notifyStateChange();
      }
    }
  }

  /**
   * Start pause between individual reps within a set
   * For alternating mode, switches sides during pause
   */
  private startPauseBetweenReps(exercise: Exercise, sideMode: string): void {
    const es = this.state.exerciseState;
    es.isPausingBetweenReps = true;
    const pauseDuration = exercise.pauseBetweenReps ?? 5;
    es.pauseRemainingSeconds = pauseDuration;

    // Switch side for alternating mode
    if (sideMode === 'alternating' && es.side) {
      es.side = this.getOppositeSide(es.side);
    }

    // Clear any existing pause interval
    this.clearPauseInterval();

    // Countdown interval for pause between reps
    this.pauseInterval = window.setInterval(() => {
      es.pauseRemainingSeconds--;

      if (es.pauseRemainingSeconds <= 0) {
        this.clearPauseInterval();
        es.isPausingBetweenReps = false;
        es.repElapsedSeconds = 0;

        // Play start tone for next rep
        this.callbacks.onPlayAudio({ type: 'repStart' });
      }

      this.notifyStateChange();
    }, 1000);
  }

  private completeCurrentExercise(): void {
    const currentIndex = this.state.exerciseState.index;
    this.callbacks.onExerciseComplete(currentIndex, true, false);

    // Check if this was the last exercise
    if (currentIndex >= this.exercises.length - 1) {
      this.state.timerState = 'completed';
      this.callbacks.onPlayAudio({ type: 'sessionComplete' });
      this.callbacks.onSessionComplete();
      this.notifyStateChange();
      return;
    }

    // Start preparation/rest or advance
    if (this.state.autoAdvanceActive && this.pauseBetweenExercises > 0) {
      this.startPreparingTimer();
    } else if (this.state.autoAdvanceActive) {
      this.advanceToNextExercise();
    } else {
      this.state.timerState = 'paused';
      this.advanceToNextExercise();
    }
  }

  private startRestTimer(): void {
    const exercise = this.state.exerciseState.exercise;
    if (!exercise) return;

    const restDuration = exercise.restBetweenSets ?? this.restBetweenSets;

    this.state.restElapsedSeconds = 0;
    this.state.timerState = 'resting';

    // Play rest start tone only if rest cues are enabled
    if (this.audioRestCuesEnabled) {
      this.callbacks.onPlayAudio({ type: 'restStart' });
    }

    this.notifyStateChange();

    this.exerciseTimerInterval = window.setInterval(() => {
      this.state.restElapsedSeconds++;
      this.notifyStateChange();

      if (this.state.restElapsedSeconds >= restDuration) {
        this.clearRestTimer();

        // Play rest end tone only if rest cues are enabled
        if (this.audioRestCuesEnabled) {
          this.callbacks.onPlayAudio({ type: 'restEnd' });
        }

        this.state.restElapsedSeconds = 0;

        // If auto-advance is enabled, continue automatically
        if (this.state.autoAdvanceActive) {
          this.state.timerState = 'active';

          // Add delay to prevent overlapping tones
          setTimeout(() => {
            if (exercise.type === 'reps') {
              this.startRepsExercise();
            } else {
              this.startDurationExercise();
            }
          }, 300);
        } else {
          this.state.isAwaitingSetContinuation = true;
          this.state.timerState = 'paused';
          this.notifyStateChange();
        }
      }
    }, 1000);
  }

  private startPreparingTimer(): void {
    this.state.timerState = 'preparing';
    this.state.preparingSeconds = this.pauseBetweenExercises;
    this.notifyStateChange();

    this.preparingInterval = window.setInterval(() => {
      this.state.preparingSeconds--;
      this.notifyStateChange();

      if (this.state.preparingSeconds <= 0) {
        this.clearPreparingTimer();
        this.advanceToNextExercise();
      }
    }, 1000);
  }

  private advanceToNextExercise(): void {
    const nextIndex = this.state.exerciseState.index + 1;

    if (nextIndex >= this.exercises.length) {
      this.state.timerState = 'completed';
      this.callbacks.onPlayAudio({ type: 'sessionComplete' });
      this.callbacks.onSessionComplete();
      this.notifyStateChange();
      return;
    }

    this.state.exerciseState = {
      ...this.createInitialExerciseState(),
      index: nextIndex,
      exercise: this.exercises[nextIndex],
    };

    if (this.state.exerciseState.exercise) {
      this.initializeSide(this.state.exerciseState.exercise);
    }

    if (this.state.autoAdvanceActive) {
      this.startExerciseCountdown();
    } else {
      this.state.timerState = 'paused';
      this.notifyStateChange();
    }
  }

  // ==================== Private: Timer Management ====================

  private startTotalTimer(): void {
    if (this.totalTimerInterval) return;

    this.totalTimerInterval = window.setInterval(() => {
      // Only count active time (not rest/pause)
      if (this.state.timerState === 'active' ||
          this.state.timerState === 'countdown') {
        this.state.totalElapsedSeconds++;
      }
    }, 1000);
  }

  private clearExerciseTimer(): void {
    if (this.exerciseTimerInterval) {
      clearInterval(this.exerciseTimerInterval);
      this.exerciseTimerInterval = null;
    }
  }

  private clearRestTimer(): void {
    if (this.exerciseTimerInterval) {
      clearInterval(this.exerciseTimerInterval);
      this.exerciseTimerInterval = null;
    }
  }

  private clearPauseInterval(): void {
    if (this.pauseInterval) {
      clearInterval(this.pauseInterval);
      this.pauseInterval = null;
    }
  }

  private clearPreparingTimer(): void {
    if (this.preparingInterval) {
      clearInterval(this.preparingInterval);
      this.preparingInterval = null;
    }
  }

  private clearAllTimers(): void {
    this.clearExerciseTimer();
    this.clearRestTimer();
    this.clearPauseInterval();
    this.clearPreparingTimer();

    if (this.totalTimerInterval) {
      clearInterval(this.totalTimerInterval);
      this.totalTimerInterval = null;
    }
  }

  // ==================== Private: Helpers ====================

  private createInitialState(): SessionTimerState {
    return {
      timerState: 'idle',
      exerciseState: this.createInitialExerciseState(),
      totalElapsedSeconds: 0,
      restElapsedSeconds: 0,
      countdownSeconds: 0,
      preparingSeconds: 0,
      autoAdvanceActive: false,
      isAwaitingSetContinuation: false,
    };
  }

  private createInitialExerciseState(): ExerciseState {
    return {
      index: 0,
      exercise: null,
      set: 1,
      rep: 1,
      side: null,
      sidePhase: 'first',
      setStartingSide: null,
      elapsedSeconds: 0,
      repElapsedSeconds: 0,
      isPausingBetweenReps: false,
      pauseRemainingSeconds: 0,
    };
  }

  private cacheSettings(settings: AppSettings): void {
    this.startCountdownDuration = settings.startCountdownDuration || 3;
    this.restBetweenSets = settings.restBetweenSets || 30;
    this.pauseBetweenExercises = settings.pauseBetweenExercises || 10;
    this.startingSide = settings.startingSide || 'left';
    this.audioRestCuesEnabled = settings.audioRestCuesEnabled ?? true;
    this.audioLeadInEnabled = settings.audioLeadInEnabled ?? false;
  }

  private initializeSide(exercise: Exercise): void {
    const sideMode = exercise.sideMode || 'bilateral';
    if (sideMode === 'bilateral') {
      this.state.exerciseState.side = null;
    } else {
      this.state.exerciseState.side = this.startingSide;
    }
  }

  private getOppositeSide(side: Side): Side {
    if (side === 'left') return 'right';
    if (side === 'right') return 'left';
    return null;
  }

  private notifyStateChange(): void {
    // Validate state in development
    if (import.meta.env.DEV) {
      this.validateState();
      console.log('[SessionTimerService] State:', {
        timerState: this.state.timerState,
        exercise: this.state.exerciseState.index,
        set: this.state.exerciseState.set,
        rep: this.state.exerciseState.rep,
        side: this.state.exerciseState.side,
      });
    }

    this.callbacks.onStateChange({ ...this.state });
  }

  /**
   * Validate state invariants (development only)
   */
  private validateState(): void {
    const es = this.state.exerciseState;

    // Basic invariants
    if (es.set < 1) {
      console.error('Invalid state: set number < 1');
    }
    if (es.rep < 1) {
      console.error('Invalid state: rep number < 1');
    }
    if (es.index < 0) {
      console.error('Invalid state: exercise index < 0');
    }
    if (es.index >= this.exercises.length && this.state.timerState !== 'completed') {
      console.error('Invalid state: exercise index out of bounds');
    }

    // Timer state invariants
    if (this.state.timerState === 'active' && !this.exerciseTimerInterval) {
      console.warn('Warning: active state but no exercise timer running');
    }
    if (this.state.timerState === 'resting' && !this.exerciseTimerInterval) {
      console.warn('Warning: resting state but no rest timer running');
    }
  }
}
```

---

## New File: `src/lib/stores/sessionPlayer.ts`

```typescript
/*
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Nathan A. Eaton Jr.
 * [full copyright header]
 */

/**
 * @fileoverview Reactive store wrapper for SessionTimerService
 *
 * Provides:
 * - Reactive state for Svelte component binding
 * - Audio cue delegation to AudioService
 * - Session persistence to PTService/IndexedDB
 */

import { writable, derived } from 'svelte/store';
import {
  SessionTimerService,
  type SessionTimerState,
  type AudioCue
} from '$lib/services/SessionTimerService';
import { audioService } from '$lib/services/AudioService';
import { ptService } from '$lib/stores/pt';
import type {
  Exercise,
  SessionDefinition,
  SessionInstance,
  CompletedExercise,
  AppSettings
} from '$lib/types';

// ==================== Store State ====================

interface SessionPlayerState extends SessionTimerState {
  /** Whether the store has been initialized */
  initialized: boolean;
  /** The session definition being played */
  sessionDefinition: SessionDefinition | null;
  /** The session instance (journal entry) */
  sessionInstance: SessionInstance | null;
  /** Resolved exercises with full data */
  exercises: Exercise[];
}

function createInitialState(): SessionPlayerState {
  return {
    initialized: false,
    sessionDefinition: null,
    sessionInstance: null,
    exercises: [],
    timerState: 'idle',
    exerciseState: {
      index: 0,
      exercise: null,
      set: 1,
      rep: 1,
      side: null,
      sidePhase: 'first',
      setStartingSide: null,
      elapsedSeconds: 0,
      repElapsedSeconds: 0,
      isPausingBetweenReps: false,
      pauseRemainingSeconds: 0,
    },
    totalElapsedSeconds: 0,
    restElapsedSeconds: 0,
    countdownSeconds: 0,
    preparingSeconds: 0,
    autoAdvanceActive: false,
    isAwaitingSetContinuation: false,
  };
}

// ==================== Store Implementation ====================

function createSessionPlayerStore() {
  const { subscribe, set, update } = writable<SessionPlayerState>(createInitialState());

  let timerService: SessionTimerService | null = null;
  let currentSessionInstance: SessionInstance | null = null;

  // -------------------- Callback Handlers --------------------

  function handleAudioCue(cue: AudioCue): void {
    switch (cue.type) {
      case 'countdown':
        audioService.onCountdown(cue.step);
        break;
      case 'countdownEnd':
        audioService.onCountdownEnd(cue.step);
        break;
      case 'durationStart':
        audioService.onDurationStart();
        break;
      case 'durationEnd':
        audioService.onDurationEnd();
        break;
      case 'repStart':
        audioService.onRepStart();
        break;
      case 'repEnd':
        audioService.onRepEnd();
        break;
      case 'restStart':
        audioService.onRestStart();
        break;
      case 'restEnd':
        audioService.onRestEnd();
        break;
      case 'sessionComplete':
        audioService.onSessionComplete();
        break;
    }
  }

  function handleStateChange(timerState: SessionTimerState): void {
    update(state => ({
      ...state,
      ...timerState,
    }));

    // Persist cumulative elapsed time
    if (currentSessionInstance) {
      currentSessionInstance.cumulativeElapsedSeconds = timerState.totalElapsedSeconds;
      ptService.updateSessionInstance(currentSessionInstance);
    }
  }

  async function handleExerciseComplete(
    exerciseIndex: number,
    completed: boolean,
    skipped: boolean
  ): Promise<void> {
    if (!currentSessionInstance) return;

    const exerciseRecord = currentSessionInstance.completedExercises[exerciseIndex];
    if (exerciseRecord) {
      exerciseRecord.completed = completed;
      exerciseRecord.skipped = skipped;
      exerciseRecord.completedAt = new Date().toISOString();
    }

    await ptService.updateSessionInstance(currentSessionInstance);
  }

  async function handleSessionComplete(): Promise<void> {
    if (!currentSessionInstance) return;

    currentSessionInstance.status = 'completed';
    currentSessionInstance.endTime = new Date().toISOString();

    await ptService.updateSessionInstance(currentSessionInstance);

    update(state => ({
      ...state,
      sessionInstance: currentSessionInstance,
    }));
  }

  // -------------------- Public Methods --------------------

  return {
    subscribe,

    /**
     * Start a new session
     */
    async startSession(
      sessionDef: SessionDefinition,
      settings: AppSettings
    ): Promise<void> {
      // Load exercises
      const exercises = await loadExercisesForSession(sessionDef);

      // Create session instance
      const instance = await createSessionInstance(sessionDef, exercises);
      currentSessionInstance = instance;

      // Create timer service
      timerService = new SessionTimerService({
        onStateChange: handleStateChange,
        onExerciseComplete: handleExerciseComplete,
        onSessionComplete: handleSessionComplete,
        onPlayAudio: handleAudioCue,
      });

      // Initialize
      const autoAdvance = sessionDef.autoAdvance ?? settings.enableAutoAdvance;
      timerService.initialize(exercises, settings, autoAdvance);

      // Update store
      set({
        ...createInitialState(),
        initialized: true,
        sessionDefinition: sessionDef,
        sessionInstance: instance,
        exercises,
        ...timerService.getState(),
      });
    },

    /**
     * Resume an existing in-progress session
     */
    async resumeSession(
      instance: SessionInstance,
      settings: AppSettings
    ): Promise<void> {
      // Load session definition
      const sessionDef = await ptService.getSessionDefinition(instance.sessionDefinitionId);
      if (!sessionDef) throw new Error('Session definition not found');

      // Load exercises
      const exercises = await loadExercisesForSession(sessionDef);
      currentSessionInstance = instance;

      // Find completed exercise indices
      const completedIndices = instance.completedExercises
        .map((ce, i) => ce.completed || ce.skipped ? i : -1)
        .filter(i => i >= 0);

      // Create timer service
      timerService = new SessionTimerService({
        onStateChange: handleStateChange,
        onExerciseComplete: handleExerciseComplete,
        onSessionComplete: handleSessionComplete,
        onPlayAudio: handleAudioCue,
      });

      // Resume
      timerService.resume(exercises, settings, {
        exerciseIndex: findResumeIndex(instance),
        totalElapsedSeconds: instance.cumulativeElapsedSeconds || 0,
        autoAdvance: sessionDef.autoAdvance ?? settings.enableAutoAdvance,
        completedIndices,
      });

      // Update store
      set({
        ...createInitialState(),
        initialized: true,
        sessionDefinition: sessionDef,
        sessionInstance: instance,
        exercises,
        ...timerService.getState(),
      });
    },

    // User actions (delegate to service)
    play(): void {
      timerService?.play();
    },

    pause(): void {
      timerService?.pause();
    },

    skip(): void {
      timerService?.skip();
    },

    goToExercise(index: number): void {
      timerService?.goToExercise(index);
    },

    toggleAutoAdvance(): void {
      timerService?.toggleAutoAdvance();
    },

    finish(): void {
      timerService?.finish();
    },

    /**
     * Clean up resources
     */
    destroy(): void {
      timerService?.destroy();
      timerService = null;
      currentSessionInstance = null;
      set(createInitialState());
    },
  };
}

// ==================== Helper Functions ====================

async function loadExercisesForSession(
  sessionDef: SessionDefinition
): Promise<Exercise[]> {
  const allExercises = await ptService.getExercises();
  const exerciseMap = new Map(allExercises.map(e => [e.id, e]));

  return sessionDef.exercises
    .map(se => exerciseMap.get(se.exerciseId))
    .filter((e): e is Exercise => e !== undefined);
}

async function createSessionInstance(
  sessionDef: SessionDefinition,
  exercises: Exercise[]
): Promise<SessionInstance> {
  const today = ptService.formatDate(new Date());

  const completedExercises: CompletedExercise[] = exercises.map(ex => ({
    exerciseId: ex.id,
    exerciseName: ex.name,
    exerciseType: ex.type,
    targetDuration: ex.type === 'duration' ? ex.defaultDuration : undefined,
    targetReps: ex.type === 'reps' ? ex.defaultReps : undefined,
    targetSets: ex.type === 'reps' ? ex.defaultSets : undefined,
    targetRepDuration: ex.type === 'reps' ? ex.defaultRepDuration : undefined,
    completed: false,
    skipped: false,
  }));

  const instance: Omit<SessionInstance, 'id'> = {
    date: today,
    sessionDefinitionId: sessionDef.id,
    sessionName: sessionDef.name,
    status: 'in-progress',
    startTime: new Date().toISOString(),
    completedExercises,
    customized: false,
  };

  const id = await ptService.addSessionInstance(instance);
  return { ...instance, id };
}

function findResumeIndex(instance: SessionInstance): number {
  const idx = instance.completedExercises.findIndex(
    ce => !ce.completed && !ce.skipped
  );
  return idx >= 0 ? idx : 0;
}

// ==================== Exports ====================

export const sessionPlayer = createSessionPlayerStore();

// Derived stores for common UI needs
export const currentExercise = derived(
  sessionPlayer,
  $sp => $sp.exercises[$sp.exerciseState.index] ?? null
);

export const isPlaying = derived(
  sessionPlayer,
  $sp => $sp.timerState === 'active' || $sp.timerState === 'countdown'
);

export const sessionProgress = derived(
  sessionPlayer,
  $sp => {
    if ($sp.exercises.length === 0) return 0;
    const completed = $sp.exerciseState.index;
    return Math.round((completed / $sp.exercises.length) * 100);
  }
);
```

---

## Migration Steps

### Phase 0: Baseline Testing (REQUIRED - Do First)

**Purpose:** Establish baseline behavior and catch regressions

1. **Document Current Behavior**
   - Record video of all exercise types:
     - Duration exercise (full playthrough)
     - Reps exercise - bilateral mode
     - Reps exercise - unilateral mode
     - Reps exercise - alternating mode
   - Record pause/resume behavior
   - Record skip functionality
   - Record auto-advance on/off
   - Record session resume from IndexedDB

2. **Create State Transition Truth Table**
   - Document expected state for each scenario
   - Include edge cases (0 rest time, 1 rep sets, etc.)

3. **Write Integration Tests** (Optional but recommended)
   - Test current `play/+page.svelte` if possible
   - At minimum, create manual test checklist

4. **Verify All Features Work**
   - Test on actual device (not just desktop)
   - Test wake lock
   - Test audio cues with all settings
   - Test persistence (refresh during session)

**Deliverables:**
- Video recordings showing current behavior
- State transition documentation
- Manual test checklist
- Notes on any existing bugs

---

### Phase 1: Create Service Layer

1. **Create `src/lib/services/SessionTimerService.ts`**
   - Copy all type definitions from spec
   - Implement constructor and initialization methods
   - Implement public API (play, pause, skip, etc.)

2. **Implement State Machine Logic**
   - Port countdown logic
   - Port duration exercise logic
   - Port reps exercise logic (all three modes)
   - Port side switching logic
   - Port rest timer logic
   - Port preparing timer logic

3. **Add Development Features**
   - State validation in `validateState()`
   - Console logging in `notifyStateChange()`
   - Error handling for edge cases

4. **Write Unit Tests** (`SessionTimerService.test.ts`)
   - Test state transitions
   - Test rep counting algorithms
   - Test side switching (all modes)
   - Test timer progression
   - Test callbacks fire correctly
   - Aim for >90% coverage

**Testing Focus:**
- Mock callbacks and verify they're called correctly
- Test without browser (Node environment)
- Test edge cases (0 reps, 1 set, etc.)

---

### Phase 2: Create Store Layer

1. **Create `src/lib/stores/sessionPlayer.ts`**
   - Implement store wrapper
   - Implement callback handlers
   - Connect to PTService for persistence
   - Connect to AudioService for cues

2. **Add Derived Stores**
   - `currentExercise`
   - `isPlaying`
   - `sessionProgress`
   - Any others needed by UI

3. **Test Store Integration**
   - Verify state updates propagate
   - Verify persistence works
   - Verify audio cues fire

---

### Phase 3: Refactor Page Component

1. **Update Imports in `play/+page.svelte`**
   ```svelte
   import { sessionPlayer, currentExercise, isPlaying } from '$lib/stores/sessionPlayer';
   ```

2. **Remove All Timer Logic**
   - Delete all state variables (23 variables)
   - Delete all timer intervals (5 intervals)
   - Delete all timer functions (30+ functions)
   - Keep: UI rendering, wake lock, scroll, navigation

3. **Replace with Store Subscriptions**
   ```svelte
   $: exercise = $currentExercise;
   $: playing = $isPlaying;
   $: timerState = $sessionPlayer.timerState;
   ```

4. **Replace Function Calls**
   ```svelte
   <!-- Before -->
   <button on:click={play}>Play</button>

   <!-- After -->
   <button on:click={() => sessionPlayer.play()}>Play</button>
   ```

5. **Verify UI Still Works**
   - All displays update correctly
   - All buttons work
   - Wake lock still functions
   - Auto-scroll still functions

**Expected Result:**
- Component reduced from **2,056 lines → ~400-500 lines**
- All timer logic removed
- Clean separation: UI only

---

### Phase 4: Comprehensive Testing

1. **Automated Tests**
   - Run unit tests for SessionTimerService
   - Run integration tests (if created)
   - Verify all tests pass

2. **Manual Testing** (Use Phase 0 checklist)
   - [ ] New session start flow
   - [ ] Session resume flow
   - [ ] Pause/resume during exercise
   - [ ] Skip functionality
   - [ ] Auto-advance toggle
   - [ ] Duration exercises (with/without lead-in audio)
   - [ ] Reps exercises - bilateral mode
   - [ ] Reps exercises - unilateral mode (both sides)
   - [ ] Reps exercises - alternating mode
   - [ ] Rest between sets (with/without audio cues)
   - [ ] Pause between reps
   - [ ] Preparing between exercises
   - [ ] Session completion
   - [ ] Audio cue triggers (all types)
   - [ ] Session persistence (refresh mid-session)
   - [ ] Wake lock acquire/release
   - [ ] Exercise list auto-scroll

3. **Regression Testing**
   - Compare with Phase 0 video recordings
   - Verify behavior matches exactly
   - Document any differences

4. **Edge Case Testing**
   - Exercise with 0 rest time
   - Exercise with 1 rep, 1 set
   - Session with 1 exercise
   - Rapid pause/play/skip
   - Browser refresh during countdown
   - Browser refresh during rest

5. **Device Testing**
   - Test on mobile (Android/iOS)
   - Test on tablet
   - Test on desktop
   - Verify wake lock on all devices

**Acceptance Criteria:**
- All manual tests pass
- Behavior matches Phase 0 baseline
- No console errors
- Performance is equivalent or better

---

## Estimated Line Counts

| File | Current | After | Change |
|------|---------|-------|--------|
| `play/+page.svelte` | 2,056 | 400-500 | -76% |
| `SessionTimerService.ts` | 0 | 500-600 | +600 |
| `sessionPlayer.ts` | 0 | 150-200 | +200 |
| **Total** | **2,056** | **1,050-1,300** | **-37%** |

**Additional:**
- `SessionTimerService.test.ts`: 300-500 lines
- Net result: Similar total lines, vastly better organization

---

## Benefits

1. **Testability** ⭐⭐⭐⭐⭐
   - `SessionTimerService` can be unit tested without browser APIs
   - No Svelte dependencies in business logic
   - Can achieve >90% test coverage

2. **Maintainability** ⭐⭐⭐⭐⭐
   - Clear separation between logic, state, and UI
   - Each file has single responsibility
   - Easier to debug and modify

3. **Reusability** ⭐⭐⭐☆☆
   - Timer logic could be reused in different contexts
   - Service works outside of Svelte

4. **Debugging** ⭐⭐⭐⭐☆
   - State changes traceable through callbacks
   - Development logging shows state flow
   - Validation catches invariant violations

5. **Type Safety** ⭐⭐⭐⭐☆
   - Explicit state interfaces
   - Compile-time error detection
   - Self-documenting code

---

## Risk Mitigation

### High-Risk Areas

1. **Rep Counting Logic** (lines 534-549, 700-710 in current)
   - Complex calculations for alternating mode
   - **Mitigation:** Extensive unit tests, video comparison

2. **Side Switching** (lines 550-650 in current)
   - Different logic for bilateral/unilateral/alternating
   - **Mitigation:** Test all three modes thoroughly

3. **Phase Transitions** (lines 562-636 in current)
   - Complex conditions for set/side completion
   - **Mitigation:** State validation, truth table

4. **Timer Coordination** (5 separate intervals)
   - Must cleanup properly to avoid leaks
   - **Mitigation:** Comprehensive cleanup tests

### Testing Strategy

- **Unit tests** for business logic (SessionTimerService)
- **Manual tests** for integration (UI → Store → Service)
- **Video comparison** for regression detection
- **Edge case testing** for robustness

---

## Success Criteria

✅ **Phase 0 Complete When:**
- Video recordings captured
- Truth table documented
- Manual test checklist created
- Current behavior verified

✅ **Phase 1 Complete When:**
- SessionTimerService implemented
- All state machine logic ported
- Unit tests written
- >90% test coverage achieved

✅ **Phase 2 Complete When:**
- sessionPlayer store implemented
- All callbacks connected
- Persistence working
- Audio cues firing

✅ **Phase 3 Complete When:**
- play/+page.svelte refactored
- All timer logic removed
- UI still functions correctly
- Component < 500 lines

✅ **Phase 4 Complete When:**
- All manual tests pass
- Behavior matches Phase 0 baseline
- No regressions detected
- Ready for production

---

## Rollback Plan

If issues are discovered:

1. **Feature flag the new implementation**
   ```typescript
   const USE_NEW_TIMER = false; // Toggle to rollback
   ```

2. **Keep old implementation** in parallel until stable

3. **A/B test** with subset of users first

4. **Monitor** for errors in production

---

## Timeline Estimate

| Phase | Optimistic | Realistic | Pessimistic |
|-------|-----------|-----------|-------------|
| Phase 0 | 2 hours | 4 hours | 8 hours |
| Phase 1 | 8 hours | 12 hours | 20 hours |
| Phase 2 | 4 hours | 6 hours | 10 hours |
| Phase 3 | 4 hours | 8 hours | 16 hours |
| Phase 4 | 4 hours | 10 hours | 20 hours |
| **Total** | **22 hours** | **40 hours** | **74 hours** |

**Recommended:** Budget 40-50 hours for thorough implementation

---

## Next Steps

1. ✅ **Review and approve this spec**
2. 🔄 **Complete Phase 0** (you'll handle this)
3. ⏭️ **Begin Phase 1** (come back for help with implementation)

---

## Notes

- This refactor prioritizes **testability** and **maintainability** over code reduction
- The ~37% reduction in total lines is a bonus, not the primary goal
- Success depends on thorough Phase 0 baseline establishment
- Phase 1 is the most critical - get the service layer right
- Phases 2-3 are mostly mechanical once Phase 1 is solid

**Key Insight:** Current component is **untestable**. This refactor makes the complex state machine **fully unit testable**, which is invaluable for a 2,000+ line state machine with 30 functions and 20 timers.
