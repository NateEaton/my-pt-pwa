/*
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
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
 */

/**
 * @fileoverview TypeScript interfaces for My PT data models
 * Based on specification in _notes/my-pt-complete-spec.md
 */

/**
 * Exercise Definition
 * Represents a single exercise that can be performed
 */
export interface Exercise {
  id: number;
  name: string;
  type: 'duration' | 'reps';

  // Duration-based exercise properties
  defaultDuration?: number; // seconds for duration-based exercises

  // Reps/sets-based exercise properties
  defaultReps?: number;
  defaultSets?: number;
  defaultRepDuration?: number; // seconds per rep for timing calculations
  pauseBetweenReps?: number; // seconds of pause between individual reps (default 0.5)
  restBetweenSets?: number; // seconds of rest between sets (optional override)

  // Optional metadata
  instructions?: string;
  includeInDefault: boolean; // Include in default session
  dateAdded: string; // ISO date string
}

/**
 * Session Exercise
 * Represents an exercise within a session definition with optional overrides
 */
export interface SessionExercise {
  exerciseId: number;

  // Override values for this session (optional)
  duration?: number; // override for duration-based
  reps?: number; // override for reps-based
  sets?: number; // override for sets
  repDuration?: number; // override for rep timing
}

/**
 * Session Definition
 * Represents a named collection of exercises (like a playlist)
 */
export interface SessionDefinition {
  id: number;
  name: string; // "Default", "Morning Routine", "Post-Workout", etc.
  exercises: SessionExercise[];
  isDefault: boolean; // Is this the default session?
  dateCreated: string; // ISO date string
  autoAdvance?: boolean; // Enable auto-advance to next exercise (optional, defaults to app setting)
}

/**
 * Completed Exercise
 * Represents the completion status of a single exercise in a session instance
 */
export interface CompletedExercise {
  exerciseId: number;

  // Snapshot data for historical preservation
  exerciseName: string;
  exerciseType: 'duration' | 'reps';

  // Target values (what was planned)
  targetDuration?: number; // For duration exercises (seconds)
  targetReps?: number; // For reps exercises
  targetSets?: number; // For reps exercises
  targetRepDuration?: number; // For reps exercises (seconds per rep)

  // Completion tracking
  completed: boolean;
  actualDuration?: number; // seconds actually spent
  skipped?: boolean;
  completedAt?: string; // ISO date string
}

/**
 * Session Instance (Journal Entry)
 * Represents a specific session performed on a specific day
 */
export interface SessionInstance {
  id: number;
  date: string; // YYYY-MM-DD format
  sessionDefinitionId: number;
  sessionName: string; // Snapshot of name at time of session
  status: 'planned' | 'in-progress' | 'completed' | 'logged';

  // Timing information
  startTime?: string; // ISO date string
  endTime?: string; // ISO date string
  cumulativeElapsedSeconds?: number; // Track cumulative time for paused/resumed sessions

  // Exercise completion tracking
  completedExercises: CompletedExercise[];

  // Indicates if exercises were modified for this specific instance
  customized: boolean;

  // Optional notes
  notes?: string;

  // Indicates if this session was manually logged (not performed with timer)
  manuallyLogged?: boolean;
}

/**
 * App Settings
 * Global configuration for the application
 */
export interface AppSettings {
  // Timing defaults (in seconds)
  defaultDuration: number; // Default duration for duration-based exercises
  defaultRepDuration: number; // Default seconds per rep
  defaultPauseBetweenReps: number; // Default pause between reps
  startCountdownDuration: number; // Countdown before exercise starts (3-2-1)
  endSessionDelay: number; // Delay before session player closes after completion
  restBetweenSets: number; // Rest period between sets
  enableAutoAdvance: boolean; // Enable automatic advance to next exercise
  pauseBetweenExercises: number; // Rest between exercises when auto-advance is enabled (seconds)
  resumeFromPausePoint: boolean; // When resuming from pause, continue from pause point (true) or restart exercise (false)

  // UI preferences
  theme: 'light' | 'dark' | 'auto';
  exerciseSortOrder: 'alphabetical' | 'dateAdded' | 'frequency';

  // Sound preferences
  soundEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0 (master volume)
  hapticsEnabled: boolean; // Enable vibration feedback

  // Audio cue preferences
  audioLeadInEnabled: boolean; // Exercise about-to-start: 3-2-1 countdown with rising tones before exercise begins
  audioExerciseAboutToEndEnabled: boolean; // Exercise about-to-end: 3-2-1 countdown with descending tones during final seconds
  audioRestCuesEnabled: boolean; // Play audio cues at start and end of rest periods

  // Feature flags (for future use)
  enableNotifications?: boolean;
}

/**
 * Database version and migration tracking
 */
export interface DBMetadata {
  version: number;
  lastMigration?: string; // ISO date string
  installDate: string; // ISO date string
}
