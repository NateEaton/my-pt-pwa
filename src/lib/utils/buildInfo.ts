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
 * @fileoverview Build information utilities for version tracking and debugging.
 * Provides access to build-time constants injected by Vite.
 */

export interface BuildInfo {
  buildId: string;
  buildTime: string;
  gitBranch: string | null;
  appVersion: string;
  nodeVersion: string;
  buildPlatform: string;
}

/**
 * Gets all build information as a structured object
 * @returns BuildInfo object with all build details
 */
export function getBuildInfo(): BuildInfo {
  return {
    buildId: __BUILD_ID__,
    buildTime: __BUILD_TIME__,
    gitBranch: __GIT_BRANCH__,
    appVersion: __APP_VERSION__,
    nodeVersion: __NODE_VERSION__,
    buildPlatform: __BUILD_PLATFORM__
  };
}

/**
 * Gets a formatted build time string for display
 * @returns Human-readable build time
 */
export function getFormattedBuildTime(): string {
  try {
    const buildDate = new Date(__BUILD_TIME__);
    return buildDate.toLocaleString();
  } catch (error) {
    return __BUILD_TIME__;
  }
}

/**
 * Gets a short version of the build ID for display
 * @returns Short build ID (first part before timestamp)
 */
export function getShortBuildId(): string {
  const parts = __BUILD_ID__.split('-');
  return parts[0];
}

/**
 * Checks if the app is running in development mode
 * @returns True if in development mode, false otherwise
 */
export function isDevelopment(): boolean {
  // Check both Vite environment variables for development mode
  return import.meta.env.MODE === 'development' || import.meta.env.DEV === true;
}

/**
 * Logs build information to console for debugging
 */
export function logBuildInfo(): void {
  // Only log build info in development mode
  if (!isDevelopment()) {
    return;
  }

  const buildInfo = getBuildInfo();
  console.group('🏗️ My PT Build Information');
  console.log('App Version:', buildInfo.appVersion);
  console.log('Build ID:', buildInfo.buildId);
  console.log('Build Time:', getFormattedBuildTime());
  if (buildInfo.gitBranch) {
    console.log('Git Branch:', buildInfo.gitBranch);
  }
  console.log('Node Version:', buildInfo.nodeVersion);
  console.log('Build Platform:', buildInfo.buildPlatform);
  console.groupEnd();
}