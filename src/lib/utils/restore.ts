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
 * @fileoverview Shared restore logic for backup and demo data
 *
 * Provides utilities for restoring backup data into the database,
 * used by both RestoreModal and DemoService.
 */

import { ptService, ptState } from '$lib/stores/pt';
import type { RestoreSnapshot } from '$lib/services/PTService';

/**
 * Backup data structure
 */
export interface BackupData {
  version: number;
  exportDate: string;
  data: {
    exercises: any[];
    sessionDefinitions: any[];
    sessionInstances: any[];
    settings?: any;
    metadata?: any;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkArray(value: unknown, label: string): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`Invalid backup file: "${label}" is not a list`);
  }
  return value;
}

function checkIds(items: Record<string, unknown>[], label: string): void {
  const seen = new Set<number>();
  items.forEach((item, index) => {
    const id = item.id;
    if (typeof id !== 'number' || !Number.isInteger(id)) {
      throw new Error(`Invalid backup file: ${label} entry ${index + 1} has no numeric id`);
    }
    if (seen.has(id)) {
      throw new Error(`Invalid backup file: duplicate ${label} id ${id}`);
    }
    seen.add(id);
  });
}

/**
 * Validate a parsed backup file before anything is written.
 *
 * Checks the shape every store depends on (ids, names, the reference fields
 * used by sessions and journal entries) and rejects duplicate ids up front
 * with a readable message. Anything this misses is still caught by the
 * atomic write in PTService.restoreAllData, which leaves existing data
 * untouched on failure.
 *
 * @throws Error with a user-readable message describing the first problem found
 */
export function validateBackupData(input: unknown): BackupData {
  if (!isRecord(input)) {
    throw new Error('Invalid backup file: not a backup object');
  }
  if (typeof input.version !== 'number') {
    throw new Error('Invalid backup file: missing version');
  }
  if (!isRecord(input.data)) {
    throw new Error('Invalid backup file: missing data section');
  }

  const data = input.data;

  if (!Array.isArray(data.exercises)) {
    throw new Error('Invalid backup file: missing exercises list');
  }
  const exercises = data.exercises.map((item, index) => {
    if (!isRecord(item) || typeof item.name !== 'string') {
      throw new Error(`Invalid backup file: exercise entry ${index + 1} is malformed`);
    }
    // Early versions of the app stored 'rep'; a backup the app itself wrote
    // must always restore, so normalize rather than reject
    if (item.type === 'rep') {
      return { ...item, type: 'reps' };
    }
    if (item.type !== 'duration' && item.type !== 'reps') {
      throw new Error(`Invalid backup file: exercise "${item.name}" has no valid type`);
    }
    return item;
  });
  checkIds(exercises, 'exercise');

  const sessionDefinitions = checkArray(data.sessionDefinitions, 'sessionDefinitions').map(
    (item, index) => {
      if (!isRecord(item) || typeof item.name !== 'string' || !Array.isArray(item.exercises)) {
        throw new Error(`Invalid backup file: session entry ${index + 1} is malformed`);
      }
      item.exercises.forEach((se, seIndex) => {
        if (!isRecord(se) || typeof se.exerciseId !== 'number') {
          throw new Error(
            `Invalid backup file: session "${item.name}" exercise ${seIndex + 1} has no exerciseId`
          );
        }
      });
      return item;
    }
  );
  checkIds(sessionDefinitions, 'session');

  const sessionInstances = checkArray(data.sessionInstances, 'sessionInstances').map(
    (item, index) => {
      const dateLabel = isRecord(item) && typeof item.date === 'string' ? ` (${item.date})` : '';
      if (
        !isRecord(item) ||
        typeof item.date !== 'string' ||
        typeof item.sessionDefinitionId !== 'number' ||
        typeof item.sessionName !== 'string' ||
        typeof item.status !== 'string' ||
        !Array.isArray(item.completedExercises)
      ) {
        throw new Error(
          `Invalid backup file: journal entry ${index + 1}${dateLabel} is missing a required field`
        );
      }
      item.completedExercises.forEach((ce, ceIndex) => {
        if (!isRecord(ce) || typeof ce.exerciseId !== 'number') {
          throw new Error(
            `Invalid backup file: journal entry ${index + 1} (${item.date}) exercise ${ceIndex + 1} has no exerciseId`
          );
        }
      });
      return item;
    }
  );
  checkIds(sessionInstances, 'journal');

  if (data.settings !== undefined && data.settings !== null && !isRecord(data.settings)) {
    throw new Error('Invalid backup file: settings section is malformed');
  }
  if (data.metadata !== undefined && data.metadata !== null && !isRecord(data.metadata)) {
    throw new Error('Invalid backup file: metadata section is malformed');
  }

  return {
    version: input.version,
    exportDate: typeof input.exportDate === 'string' ? input.exportDate : '',
    data: {
      exercises,
      sessionDefinitions,
      sessionInstances,
      settings: data.settings ?? undefined,
      metadata: data.metadata ?? undefined
    }
  };
}

/**
 * Restores backup data into the current database
 *
 * This function:
 * 1. Validates the backup (throws before anything is touched if it is malformed)
 * 2. Replaces all stores in a single atomic transaction, keeping the backup's
 *    ids so session and journal references stay intact without remapping
 * 3. Reloads state
 *
 * If the write fails for any reason the transaction is rolled back by
 * IndexedDB and the existing data is left as it was.
 *
 * @param backupData - The backup data to restore (validated again here; callers
 *   may pass raw parsed JSON)
 * @throws Error if validation or the restore fails
 */
export async function restoreBackupData(backupData: BackupData): Promise<void> {
  const validated = validateBackupData(backupData);

  const snapshot: RestoreSnapshot = {
    exercises: validated.data.exercises,
    sessionDefinitions: validated.data.sessionDefinitions,
    sessionInstances: validated.data.sessionInstances,
    settings: validated.data.settings ?? null,
    metadata: validated.data.metadata ?? null
  };

  await ptService.restoreAllData(snapshot);

  // The device now holds exactly what the file holds, so that file is the
  // current backup: stamp its date and reset the change counter so the
  // reminder doesn't fire straight after a restore.
  if (validated.exportDate && !Number.isNaN(new Date(validated.exportDate).getTime())) {
    try {
      await ptService.recordBackupTaken(validated.exportDate);
    } catch (error) {
      console.warn('Failed to record restore as last backup:', error);
    }
  }

  // Reload all data into state
  const exercises = await ptService.getExercises();
  const sessionDefinitions = await ptService.getSessionDefinitions();
  const sessionInstances = await ptService.getSessionInstances();
  const settings = await ptService.getSettings();
  const metadata = await ptService.getMetadata();

  ptState.update((state) => ({
    ...state,
    exercises,
    sessionDefinitions,
    sessionInstances,
    settings,
    metadata
  }));
}
