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
 * @fileoverview Session-related type definitions
 */

import type { SessionExercise } from './exercise';

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
  pauseBetweenExercises?: number; // Rest between exercises in seconds (optional, defaults to app setting)
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
