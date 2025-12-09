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
 * @fileoverview Demo mode detection and configuration utilities
 *
 * Provides functions and constants for detecting and managing demo mode,
 * which uses a separate database and loads example data for demonstration.
 */

/**
 * Database name for normal user mode
 */
export const NORMAL_DB_NAME = 'MyPT';

/**
 * Database name for demo mode
 */
export const DEMO_DB_NAME = 'MyPT-demo';

/**
 * localStorage key for tracking demo data version
 */
export const DEMO_VERSION_KEY = 'myPT-demoVersion';

/**
 * URL path to demo backup JSON file
 */
export const DEMO_BACKUP_URL = '/demo-backup.json';

/**
 * Detects if app is currently running in demo mode
 * @returns true if current path is /demo or sub-routes
 */
export function isDemoMode(): boolean {
  // SSR safety check
  if (typeof window === 'undefined') return false;

  // Demo mode is active when path starts with /demo
  return window.location.pathname.startsWith('/demo');
}

/**
 * Gets the appropriate database name based on current mode
 * @returns Database name for current mode (normal or demo)
 */
export function getDbName(): string {
  return isDemoMode() ? DEMO_DB_NAME : NORMAL_DB_NAME;
}
