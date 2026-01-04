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
 * @fileoverview Exercise-related type definitions
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
  defaultSetupTime?: number; // seconds to get into position before each set (optional)
  defaultRepDuration?: number; // seconds per rep for timing calculations
  pauseBetweenReps?: number; // seconds of pause between individual reps (default 0.5)
  restBetweenSets?: number; // seconds of rest between sets (optional override)
  sideMode?: 'bilateral' | 'unilateral' | 'alternating'; // For exercises requiring left/right side tracking

  // Optional metadata
  instructions?: string;
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
