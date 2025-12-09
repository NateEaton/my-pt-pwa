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
 * @fileoverview DemoService - Manages demo mode data initialization
 *
 * Handles loading and version management of demo data when the app
 * is running in demo mode.
 */

import { DEMO_VERSION_KEY, DEMO_BACKUP_URL } from '$lib/utils/demoMode';
import { restoreBackupData, type BackupData } from '$lib/utils/restore';

/**
 * Initialize demo data by fetching and restoring demo backup
 *
 * This function:
 * 1. Fetches demo-backup.json from static assets
 * 2. Checks version against localStorage
 * 3. Restores data if version mismatch or first load
 * 4. Updates version in localStorage
 *
 * @param basePath - SvelteKit base path (from $app/paths)
 * @throws Error if demo backup cannot be fetched or restored
 */
export async function initializeDemoData(basePath: string = ''): Promise<void> {
  console.log('🎭 Initializing demo mode...');

  try {
    // Fetch demo backup file (respect base path)
    const backupUrl = `${basePath}${DEMO_BACKUP_URL}`;
    console.log('🎭 Fetching demo backup from:', backupUrl);
    const response = await fetch(backupUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch demo backup: ${response.statusText}`);
    }

    const backup: BackupData = await response.json();

    // Validate backup structure
    if (!backup.version || !backup.data || !backup.data.exercises) {
      throw new Error('Invalid demo backup file format');
    }

    // Get current version
    const demoVersion = backup.version.toString();
    const loadedVersion = localStorage.getItem(DEMO_VERSION_KEY);

    // Check if we need to load demo data
    const needsLoad = !loadedVersion || loadedVersion !== demoVersion;

    if (needsLoad) {
      console.log(`🎭 Loading demo data (version ${demoVersion})...`);

      // Restore demo backup using shared restore logic
      await restoreBackupData(backup);

      // Mark version as loaded
      localStorage.setItem(DEMO_VERSION_KEY, demoVersion);

      console.log('✅ Demo data loaded successfully');
    } else {
      console.log(`🎭 Demo data already loaded (version ${demoVersion})`);
    }
  } catch (error) {
    console.error('❌ Failed to initialize demo data:', error);
    throw error;
  }
}

/**
 * Clear demo version flag to force reload on next visit
 * Useful for development or if demo data becomes corrupted
 */
export function clearDemoVersion(): void {
  localStorage.removeItem(DEMO_VERSION_KEY);
  console.log('🎭 Demo version flag cleared');
}
