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

import { writable } from 'svelte/store';

/**
 * Store to track if a PWA update is available
 */
export const pwaUpdateAvailable = writable<boolean>(false);

/**
 * Store to hold the update function provided by the service worker
 */
export const pwaUpdateFunction = writable<(() => Promise<void>) | null>(null);

/**
 * Store to track if the app is ready for offline use
 */
export const pwaOfflineReady = writable<boolean>(false);
