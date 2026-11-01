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
 * @fileoverview Builds the backup file
 *
 * Single source of the export format, shared by the manual Backup modal
 * (download / share) and the automatic backup folder. The shape here is what
 * validateBackupData() in restore.ts accepts; keep them in step.
 */

import { ptService } from '$lib/stores/pt';

/** Backup format version written into every file */
export const BACKUP_FORMAT_VERSION = 1;

export const BACKUP_FILE_PREFIX = 'my-pt-backup-';

export interface BuiltBackup {
  /** Pretty-printed JSON of the backup */
  json: string;
  /** Timestamped filename, e.g. my-pt-backup-2026-09-19T14-02-11.json */
  filename: string;
  /** ISO timestamp recorded inside the file; pass to recordBackupTaken on success */
  exportDate: string;
}

/**
 * Gather everything from IndexedDB into a backup file.
 */
export async function buildBackup(): Promise<BuiltBackup> {
  const exercises = await ptService.getExercises();
  const sessionDefinitions = await ptService.getSessionDefinitions();
  const sessionInstances = await ptService.getSessionInstances();
  const settings = await ptService.getSettings();
  const metadata = await ptService.getMetadata();

  const exportDate = new Date().toISOString();
  const backupData = {
    version: BACKUP_FORMAT_VERSION,
    exportDate,
    data: {
      exercises,
      sessionDefinitions,
      sessionInstances,
      settings,
      metadata
    }
  };

  return {
    json: JSON.stringify(backupData, null, 2),
    filename: backupFilename(exportDate),
    exportDate
  };
}

/** Filename for a backup taken at the given ISO timestamp */
export function backupFilename(exportDate: string): string {
  const timestamp = exportDate.replace(/[:.]/g, '-').slice(0, -5);
  return `${BACKUP_FILE_PREFIX}${timestamp}.json`;
}
