# Design/Implementation Spec: Timer Logic Extraction

## Overview

Extract the session timer state machine from `play/+page.svelte` (~1200 lines) into a dedicated service and reactive store for improved testability, maintainability, and separation of concerns.

---

## Current Architecture

The `play/+page.svelte` component currently contains all of the following interleaved:

### State Variables
- `timerState`: 'paused' | 'countdown' | 'active' | 'rest' | 'completed'
- `currentExerciseIndex`, `currentExercise`
- `currentSet`, `currentRep`
- `currentSide`, `sidePhase`
- `exerciseElapsedSeconds`, `repElapsedSeconds`
- `totalElapsedSeconds`, `restElapsedSeconds`
- `countdownSeconds`
- `autoAdvanceActive`, `isAwaitingSetContinuation`
- `isPausingBetweenReps`

### Timer Handles
- `totalTimerInterval`
- `exerciseTimerInterval`
- `restTimerInterval`
- Various countdown/pause intervals

### Logic Functions
- `startExerciseCountdown()`
- `startExercise()`
- `startDurationExercise()` / `resumeDurationExercise()`
- `startRepsExercise()` / `resumeRepsExercise()`
- `completeCurrentExercise()`
- `startRestTimer()`
- `advanceToNextExercise()`
- Side initialization and switching logic

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
│  - ~400-500 lines                                           │
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
  | 'rest'       // Rest period between sets or exercises
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
  /** Seconds elapsed in current exercise */
  elapsedSeconds: number;
  /** Seconds elapsed in current rep */
  repElapsedSeconds: number;
  /** True if in pause between reps */
  isPausingBetweenReps: boolean;
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

### Service Class

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
  private restTimerInterval: number | null = null;

  // Settings cache
  private startCountdown: number = 3;
  private restBetweenSets: number = 20;
  private pauseBetweenExercises: number = 20;
  private startingSide: Side = 'left';

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
        this.startRepsExercise();
      } else {
        // Start countdown for exercise
        this.startExerciseCountdown();
      }
    } else if (this.state.timerState === 'rest') {
      // Skip rest and start next
      this.clearRestTimer();
      this.advanceToNextExercise();
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
    this.state.countdownSeconds = 3;
    this.notifyStateChange();
    
    this.callbacks.onPlayAudio({ type: 'countdown', step: 3 });
    
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
    this.state.exerciseState.set = 1;
    this.state.exerciseState.rep = 1;
    this.state.exerciseState.sidePhase = 'first';
    
    this.initializeSide(exercise);
    
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
      
      // End countdown audio cues
      if (remaining >= 1 && remaining <= 3) {
        this.callbacks.onPlayAudio({ type: 'countdownEnd', step: remaining });
      }
      
      this.notifyStateChange();
      
      if (this.state.exerciseState.elapsedSeconds >= totalDuration) {
        this.clearExerciseTimer();
        this.callbacks.onPlayAudio({ type: 'durationEnd' });
        this.completeCurrentExercise();
      }
    }, 1000);
  }

  private runRepsExercise(): void {
    const exercise = this.state.exerciseState.exercise;
    if (!exercise) return;
    
    const reps = exercise.defaultReps || 10;
    const sets = exercise.defaultSets || 3;
    const repDuration = exercise.defaultRepDuration || 2;
    const sideMode = exercise.sideMode || 'bilateral';
    
    this.callbacks.onPlayAudio({ type: 'repStart' });
    
    this.exerciseTimerInterval = window.setInterval(() => {
      if (this.state.exerciseState.isPausingBetweenReps) {
        return;
      }
      
      const es = this.state.exerciseState;
      
      // Check for rep end tone
      if (es.repElapsedSeconds === repDuration - 1) {
        this.callbacks.onPlayAudio({ type: 'repEnd' });
      }
      
      es.elapsedSeconds++;
      es.repElapsedSeconds++;
      
      // Update current rep display
      this.updateRepDisplay(reps, repDuration, sideMode);
      
      // Check if rep is complete
      if (es.repElapsedSeconds >= repDuration) {
        this.handleRepComplete(reps, sets, repDuration, sideMode, exercise);
      }
      
      this.notifyStateChange();
    }, 1000);
  }

  private startRepsExercise(): void {
    // Alias for runRepsExercise when resuming after pause
    this.state.timerState = 'active';
    this.runRepsExercise();
  }

  // ... (additional private methods for rep handling, side switching, etc.)

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
    
    // Start rest or advance
    if (this.state.autoAdvanceActive && this.pauseBetweenExercises > 0) {
      this.startRestTimer();
    } else if (this.state.autoAdvanceActive) {
      this.advanceToNextExercise();
    } else {
      this.state.timerState = 'paused';
      this.advanceToNextExercise();
    }
  }

  private startRestTimer(): void {
    this.state.timerState = 'rest';
    this.state.restElapsedSeconds = 0;
    this.callbacks.onPlayAudio({ type: 'restStart' });
    this.notifyStateChange();
    
    this.restTimerInterval = window.setInterval(() => {
      this.state.restElapsedSeconds++;
      this.notifyStateChange();
      
      if (this.state.restElapsedSeconds >= this.pauseBetweenExercises) {
        this.clearRestTimer();
        this.callbacks.onPlayAudio({ type: 'restEnd' });
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
    if (this.restTimerInterval) {
      clearInterval(this.restTimerInterval);
      this.restTimerInterval = null;
    }
  }

  private clearAllTimers(): void {
    this.clearExerciseTimer();
    this.clearRestTimer();
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
      elapsedSeconds: 0,
      repElapsedSeconds: 0,
      isPausingBetweenReps: false,
    };
  }

  private cacheSettings(settings: AppSettings): void {
    this.startCountdown = settings.startCountdownDuration || 3;
    this.restBetweenSets = settings.restBetweenSets || 20;
    this.pauseBetweenExercises = settings.pauseBetweenExercises || 20;
    this.startingSide = settings.startingSide || 'left';
  }

  private initializeSide(exercise: Exercise): void {
    const sideMode = exercise.sideMode || 'bilateral';
    if (sideMode === 'bilateral') {
      this.state.exerciseState.side = null;
    } else {
      this.state.exerciseState.side = this.startingSide;
    }
  }

  private notifyStateChange(): void {
    this.callbacks.onStateChange({ ...this.state });
  }

  // Additional helper methods for rep display, side switching, etc.
  // (Implementation details omitted for brevity)
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

import { writable, derived, get } from 'svelte/store';
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
      elapsedSeconds: 0,
      repElapsedSeconds: 0,
      isPausingBetweenReps: false,
    },
    totalElapsedSeconds: 0,
    restElapsedSeconds: 0,
    countdownSeconds: 0,
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
    const settings = get({ subscribe }).sessionInstance;
    // Check if audio is enabled before playing
    // (AudioService handles its own enabled state)
    
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

## Refactored `play/+page.svelte`

After extraction, the page component becomes UI-focused:

```svelte
<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Nathan A. Eaton Jr.
 * [full copyright header]
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { sessionPlayer, currentExercise, isPlaying } from '$lib/stores/sessionPlayer';
  import { ptState, ptService } from '$lib/stores/pt';
  import { toastStore } from '$lib/stores/toast';
  
  // Wake lock state (UI concern)
  let wakeLock: WakeLockSentinel | null = null;
  
  // Scroll container ref
  let exerciseListContainer: HTMLDivElement;
  let exerciseElements: HTMLDivElement[] = [];
  
  // Initialize on mount
  onMount(async () => {
    await initializeSession();
    await acquireWakeLock();
  });
  
  onDestroy(() => {
    releaseWakeLock();
    sessionPlayer.destroy();
  });
  
  async function initializeSession() {
    const sessionId = localStorage.getItem('pt-active-session-id');
    const instanceId = localStorage.getItem('pt-active-session-instance-id');
    
    if (instanceId) {
      // Resume existing session
      const instance = await ptService.getSessionInstance(parseInt(instanceId));
      if (instance && instance.status === 'in-progress') {
        await sessionPlayer.resumeSession(instance, $ptState.settings!);
        return;
      }
    }
    
    if (sessionId) {
      // Start new session
      const sessionDef = await ptService.getSessionDefinition(parseInt(sessionId));
      if (sessionDef) {
        await sessionPlayer.startSession(sessionDef, $ptState.settings!);
        return;
      }
    }
    
    // No session to play
    toastStore.show('No session selected', 'error');
    goto('/');
  }
  
  // Wake lock management
  async function acquireWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake lock failed:', err);
      }
    }
  }
  
  function releaseWakeLock() {
    wakeLock?.release();
    wakeLock = null;
  }
  
  // Auto-scroll to active exercise
  $: if ($sessionPlayer.exerciseState.index >= 0 && exerciseElements.length > 0) {
    const activeElement = exerciseElements[$sessionPlayer.exerciseState.index];
    activeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
  // Format helpers
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Navigation
  function handleFinish() {
    sessionPlayer.finish();
    localStorage.removeItem('pt-active-session-id');
    localStorage.removeItem('pt-active-session-instance-id');
    goto('/');
  }
</script>

<div class="player-container">
  <!-- Top Section: Current Exercise Display -->
  <div class="player-top">
    <div class="session-info-bar">
      <button
        class="auto-advance-toggle"
        class:active={$sessionPlayer.autoAdvanceActive}
        on:click={() => sessionPlayer.toggleAutoAdvance()}
      >
        <span class="material-icons">
          {$sessionPlayer.autoAdvanceActive ? 'autorenew' : 'stop_circle'}
        </span>
      </button>
      
      <div class="session-center">
        <div class="session-name">
          {$sessionPlayer.sessionDefinition?.name || 'Session'}
        </div>
        <div class="session-timer">
          {formatTime($sessionPlayer.totalElapsedSeconds)}
        </div>
      </div>
      
      <!-- Audio mute toggle -->
      <button
        class="audio-mute-toggle"
        class:muted={!$ptState.settings?.soundEnabled}
        on:click={() => {
          if ($ptState.settings) {
            $ptState.settings.soundEnabled = !$ptState.settings.soundEnabled;
            ptService.saveSettings($ptState.settings);
          }
        }}
      >
        <span class="material-icons">
          {$ptState.settings?.soundEnabled ? 'volume_up' : 'volume_off'}
        </span>
      </button>
    </div>
    
    <!-- Current exercise display -->
    {#if $currentExercise}
      <div class="current-exercise-display">
        <!-- Exercise name, timer, set/rep display -->
        <!-- (Implementation similar to current, but reading from store) -->
      </div>
    {/if}
  </div>
  
  <!-- Controls -->
  <div class="player-controls">
    <button 
      class="vcr-btn" 
      on:click={() => sessionPlayer.goToExercise($sessionPlayer.exerciseState.index - 1)}
      disabled={$sessionPlayer.timerState !== 'paused' || $sessionPlayer.exerciseState.index === 0}
    >
      <span class="material-icons">skip_previous</span>
    </button>
    
    <button 
      class="vcr-btn vcr-play"
      on:click={() => $isPlaying ? sessionPlayer.pause() : sessionPlayer.play()}
      disabled={$sessionPlayer.timerState === 'completed'}
    >
      <span class="material-icons">
        {$isPlaying ? 'pause' : 'play_arrow'}
      </span>
    </button>
    
    <button 
      class="vcr-btn"
      on:click={() => sessionPlayer.skip()}
      disabled={$sessionPlayer.timerState !== 'paused'}
    >
      <span class="material-icons">skip_next</span>
    </button>
    
    <button class="vcr-btn vcr-finish" on:click={handleFinish}>
      <span class="material-icons">check_circle</span>
      <span class="vcr-label">Finish</span>
    </button>
  </div>
  
  <!-- Exercise list -->
  <div class="player-bottom" bind:this={exerciseListContainer}>
    <div class="exercise-list">
      {#each $sessionPlayer.exercises as exercise, index (exercise.id)}
        <div
          bind:this={exerciseElements[index]}
          class="exercise-item"
          class:active={index === $sessionPlayer.exerciseState.index}
          class:completed={index < $sessionPlayer.exerciseState.index}
        >
          <!-- Exercise item content -->
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  /* Styles remain largely the same, but simplified */
</style>
```

---

## Migration Steps

### Phase 1: Create Service

1. Create `src/lib/services/SessionTimerService.ts`
2. Implement all type definitions
3. Implement core state machine logic
4. Add unit tests for state transitions

### Phase 2: Create Store

1. Create `src/lib/stores/sessionPlayer.ts`
2. Implement callback handlers
3. Implement session persistence
4. Add derived stores

### Phase 3: Refactor Page

1. Remove all timer state variables from `play/+page.svelte`
2. Remove all `setInterval` logic
3. Import and subscribe to `sessionPlayer` store
4. Replace direct state access with store subscriptions
5. Replace timer function calls with store method calls
6. Keep: UI rendering, wake lock, scroll behavior, navigation

### Phase 4: Testing

1. Test new session start flow
2. Test session resume flow
3. Test pause/resume
4. Test skip functionality
5. Test auto-advance toggle
6. Test all exercise types (duration, reps)
7. Test all side modes (bilateral, unilateral, alternating)
8. Test audio cue triggers
9. Test session persistence

---

## Estimated Line Counts

| File | Lines (Est.) | Complexity |
|------|--------------|------------|
| `SessionTimerService.ts` | 400-500 | High (state machine) |
| `sessionPlayer.ts` | 150-200 | Medium |
| `play/+page.svelte` (refactored) | 400-500 | Low (UI only) |

**Total**: Similar overall lines, but much better separation of concerns.

---

## Benefits

1. **Testability**: `SessionTimerService` can be unit tested without Svelte or browser APIs
2. **Maintainability**: Clear separation between logic, state, and UI
3. **Reusability**: Timer logic could be reused in different UI contexts
4. **Debugging**: Easier to trace state changes through the callback pattern
5. **Type Safety**: Explicit state interfaces catch errors at compile time
