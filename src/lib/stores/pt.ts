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
 * @fileoverview Core state management for My PT application
 *
 * This module provides:
 * - ptState: Reactive Svelte store for application state
 * - ptService: Re-exported singleton for database operations
 * - Derived stores for computed values
 *
 * CANONICAL IMPORTS:
 * import { ptState, ptService } from '$lib/stores/pt';
 */

import { writable, derived } from 'svelte/store';
import type {
  Exercise,
  SessionDefinition,
  SessionInstance,
  AppSettings
} from '$lib/types/pt';

/**
 * Application state interface
 */
export interface PTState {
  initialized: boolean;
  loading: boolean;
  exercises: Exercise[];
  sessionDefinitions: SessionDefinition[];
  todaySession: SessionInstance | null;
  settings: AppSettings | null;
}

/**
 * Initial state
 */
const initialState: PTState = {
  initialized: false,
  loading: false,
  exercises: [],
  sessionDefinitions: [],
  todaySession: null,
  settings: null
};

/**
 * Main application state store
 */
export const ptState = writable<PTState>(initialState);

/**
 * Derived store: Get default session definition
 */
export const defaultSessionDefinition = derived(
  ptState,
  ($ptState) => $ptState.sessionDefinitions.find((s) => s.isDefault) || null
);

/**
 * Derived store: Get exercises sorted by settings preference
 */
export const sortedExercises = derived(ptState, ($ptState) => {
  const exercises = [...$ptState.exercises];
  const sortOrder = $ptState.settings?.exerciseSortOrder || 'alphabetical';

  switch (sortOrder) {
    case 'alphabetical':
      return exercises.sort((a, b) => a.name.localeCompare(b.name));
    case 'dateAdded':
      return exercises.sort(
        (a, b) =>
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
      );
    case 'frequency':
      // Frequency sorting would require querying all session instances
      // which is expensive. For now, fall back to dateAdded (most recent first)
      // as a proxy for "frequently used" exercises.
      // TODO: Consider caching usage statistics in metadata for better performance
      return exercises.sort(
        (a, b) =>
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
      );
    default:
      return exercises;
  }
});

/**
 * Derived store: Get exercises included in default session
 */
export const defaultExercises = derived(ptState, ($ptState) =>
  $ptState.exercises.filter((e) => e.includeInDefault)
);

// Re-export service singleton as the canonical access point
export { ptService } from '$lib/services/PTService';
