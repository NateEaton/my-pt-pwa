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
