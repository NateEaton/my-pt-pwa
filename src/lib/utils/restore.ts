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
import type { SessionExercise, CompletedExercise } from '$lib/types/pt';

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

/**
 * Restores backup data into the current database
 *
 * This function:
 * 1. Clears all existing data
 * 2. Restores exercises with ID remapping
 * 3. Restores session definitions with remapped exercise IDs
 * 4. Restores session instances with remapped IDs
 * 5. Restores settings and metadata
 * 6. Reloads state
 *
 * @param backupData - The backup data to restore
 * @throws Error if restore fails
 */
export async function restoreBackupData(backupData: BackupData): Promise<void> {
  // Clear all existing data
  await ptService.clearAllData();

  // Create ID mapping for exercises (old ID -> new ID)
  const exerciseIdMap = new Map<number, number>();

  // Restore exercises and build mapping
  for (const exercise of backupData.data.exercises) {
    const oldId = exercise.id;
    const { id, ...exerciseData } = exercise;
    const newId = await ptService.addExercise(exerciseData);
    exerciseIdMap.set(oldId, newId);
  }

  // Create ID mapping for session definitions (old ID -> new ID)
  const sessionDefIdMap = new Map<number, number>();

  // Restore session definitions with remapped exercise IDs
  for (const session of backupData.data.sessionDefinitions) {
    const oldId = session.id;
    const { id, ...sessionData } = session;

    // Remap exercise IDs in the exercises array
    const remappedExercises = sessionData.exercises.map((se: SessionExercise) => ({
      ...se,
      exerciseId: exerciseIdMap.get(se.exerciseId) ?? se.exerciseId
    }));

    const newId = await ptService.addSessionDefinition({
      ...sessionData,
      exercises: remappedExercises
    });
    sessionDefIdMap.set(oldId, newId);
  }

  // Restore session instances with remapped IDs
  for (const instance of backupData.data.sessionInstances) {
    const { id, ...instanceData } = instance;

    // Remap session definition ID
    const remappedSessionDefId =
      sessionDefIdMap.get(instanceData.sessionDefinitionId) ?? instanceData.sessionDefinitionId;

    // Remap exercise IDs in completed exercises
    const remappedCompletedExercises = instanceData.completedExercises.map(
      (ce: CompletedExercise) => ({
        ...ce,
        exerciseId: exerciseIdMap.get(ce.exerciseId) ?? ce.exerciseId
      })
    );

    await ptService.addSessionInstance({
      ...instanceData,
      sessionDefinitionId: remappedSessionDefId,
      completedExercises: remappedCompletedExercises
    });
  }

  // Restore settings
  if (backupData.data.settings) {
    await ptService.saveSettings(backupData.data.settings);
  }

  // Restore metadata
  if (backupData.data.metadata) {
    await ptService.saveMetadata(backupData.data.metadata);
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
