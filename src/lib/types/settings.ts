/*
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
 */

/**
 * @fileoverview Settings and metadata type definitions
 */

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
  startingSide: 'left' | 'right'; // Starting side for unilateral/alternating exercises

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
