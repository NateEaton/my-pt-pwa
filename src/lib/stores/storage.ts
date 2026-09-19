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
 * @fileoverview Browser storage durability state
 *
 * Requests persistent storage from the browser so IndexedDB data is moved out
 * of the "best-effort" bucket that can be evicted under storage pressure, and
 * records the outcome (plus usage/quota) so the Settings page can show it.
 *
 * Every path here is best-effort: the Storage API is feature-detected, every
 * call is wrapped, and nothing in this module can block app startup. Note that
 * persistence only guards against eviction; it does not protect against the
 * user clearing site data, deleting the app, or losing the device.
 */

import { writable } from 'svelte/store';
import { isDemoMode } from '$lib/utils/demoMode';

/**
 * Result of the persistent storage check/request.
 * - unknown: not checked yet, or the check threw
 * - unsupported: navigator.storage.persist/persisted not available (e.g. older Safari)
 * - persisted: browser has granted persistent storage for this origin
 * - not-persisted: request was made and denied (or not made in demo mode)
 */
export type PersistenceStatus = 'unknown' | 'unsupported' | 'persisted' | 'not-persisted';

/**
 * How the app is being displayed. Installed (standalone) is what makes
 * Chromium grant persistence silently and what exempts iOS from ITP purges.
 */
export type DisplayMode = 'unknown' | 'standalone' | 'browser';

export interface StorageHealth {
  persistence: PersistenceStatus;
  displayMode: DisplayMode;
  /** True on iPhone/iPad, where the advice differs (see Settings storage panel) */
  isIOS: boolean;
  /** Bytes in use, from navigator.storage.estimate(); null if unavailable */
  usage: number | null;
  /** Bytes available to this origin, from navigator.storage.estimate(); null if unavailable */
  quota: number | null;
  /** ISO timestamp of the last successful check, null if never checked */
  checkedAt: string | null;
}

const initialState: StorageHealth = {
  persistence: 'unknown',
  displayMode: 'unknown',
  isIOS: false,
  usage: null,
  quota: null,
  checkedAt: null
};

export const storageHealth = writable<StorageHealth>(initialState);

function getStorageManager(): StorageManager | null {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return null;
  return navigator.storage ?? null;
}

function detectDisplayMode(): DisplayMode {
  if (typeof window === 'undefined') return 'unknown';
  try {
    // navigator.standalone is the iOS Safari home-screen flag
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
    return standalone || iosStandalone ? 'standalone' : 'browser';
  } catch {
    return 'unknown';
  }
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPadOS reports as Mac; the touch-point check tells them apart
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

/**
 * Check whether storage is already persisted and, if not, ask the browser to
 * persist it. Safe to call repeatedly; never throws.
 *
 * Chromium grants this silently once the PWA is installed (or the site is
 * bookmarked / has high engagement) and may deny it for a plain tab visit.
 * Firefox shows a permission prompt. In demo mode we only read the current
 * state and never request, so demo visitors are not prompted.
 */
export async function requestPersistentStorage(): Promise<PersistenceStatus> {
  const storage = getStorageManager();
  if (!storage || typeof storage.persisted !== 'function' || typeof storage.persist !== 'function') {
    // Also the path taken on plain http (non-localhost), since the Storage
    // API is only exposed in secure contexts.
    console.log('ℹ️ Persistent storage API not available in this context');
    updateHealth({ persistence: 'unsupported' });
    return 'unsupported';
  }

  try {
    let persisted = await storage.persisted();

    if (!persisted && !isDemoMode()) {
      persisted = await storage.persist();
    }

    const status: PersistenceStatus = persisted ? 'persisted' : 'not-persisted';
    updateHealth({ persistence: status });
    console.log(persisted ? '💾 Persistent storage granted' : '⚠️ Persistent storage not granted');
    return status;
  } catch (error) {
    console.warn('Persistent storage check failed:', error);
    updateHealth({ persistence: 'unknown' });
    return 'unknown';
  }
}

/**
 * Refresh usage/quota from navigator.storage.estimate(). Never throws.
 */
export async function refreshStorageEstimate(): Promise<void> {
  const storage = getStorageManager();
  if (!storage || typeof storage.estimate !== 'function') {
    updateHealth({ usage: null, quota: null });
    return;
  }

  try {
    const estimate = await storage.estimate();
    updateHealth({
      usage: typeof estimate.usage === 'number' ? estimate.usage : null,
      quota: typeof estimate.quota === 'number' ? estimate.quota : null
    });
  } catch (error) {
    console.warn('Storage estimate failed:', error);
    updateHealth({ usage: null, quota: null });
  }
}

/**
 * Run the full storage health check: request persistence, then read the
 * estimate. Called once from the layout after PTService is initialized.
 * Fire-and-forget; it can't reject.
 */
export async function initStorageHealth(): Promise<void> {
  try {
    updateHealth({ displayMode: detectDisplayMode(), isIOS: detectIOS() });
    await requestPersistentStorage();
    await refreshStorageEstimate();
  } catch (error) {
    // Both helpers catch internally; this is a belt-and-braces guard so a
    // storage problem can never surface as an unhandled rejection at startup.
    console.warn('Storage health check failed:', error);
  }
}

function updateHealth(patch: Partial<StorageHealth>): void {
  storageHealth.update(state => ({
    ...state,
    ...patch,
    checkedAt: new Date().toISOString()
  }));
}
