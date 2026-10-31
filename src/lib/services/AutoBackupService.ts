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
 * @fileoverview Automatic backup to a user-chosen folder
 *
 * Uses the File System Access API (desktop Chromium, including Chrome OS) to
 * write backup files to a real directory the user picked once. Files on disk
 * survive the browser evicting its storage, which is the whole point. Where
 * the folder is synced (Google Drive on Chrome OS, OneDrive, etc.) the copy
 * leaves the device without this app ever making a network call.
 *
 * Not available on Android or iOS; those rely on the reminder + share flow.
 *
 * Every path is best-effort: failures are recorded in the store for Settings
 * to show and never thrown into the app.
 */

import { writable, get } from 'svelte/store';
import { ptService } from '$lib/stores/pt';
import { buildBackup, BACKUP_FILE_PREFIX } from '$lib/utils/backup';
import { isDemoMode } from '$lib/utils/demoMode';

// showDirectoryPicker, the handle permission methods, and async iteration
// (DOM.AsyncIterable is not in the project's lib list) are not typed in the
// DOM lib in use; declare the slice used here.
type PermissionMode = { mode?: 'read' | 'readwrite' };
type HandleWithPermissions = FileSystemDirectoryHandle & {
  queryPermission?: (descriptor?: PermissionMode) => Promise<PermissionState>;
  requestPermission?: (descriptor?: PermissionMode) => Promise<PermissionState>;
  keys(): AsyncIterableIterator<string>;
};
type WindowWithPicker = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
    startIn?: string;
  }) => Promise<FileSystemDirectoryHandle>;
};
type NavigatorWithUAData = Navigator & { userAgentData?: { mobile?: boolean } };

/** Number of daily backups kept in the folder; older ones are pruned */
export const KEEP_BACKUPS = 5;

/** Name of the always-current copy, overwritten on every run */
export const LATEST_FILENAME = `${BACKUP_FILE_PREFIX}latest.json`;

/** Shortest gap between two writes while the app is in use */
export const MIN_INTERVAL_MS = 15 * 60_000;

/** Quiet period after the last data change before a write, once the interval allows */
const SETTLE_MS = 30_000;

/** Daily history files look like my-pt-backup-2026-09-19.json; nothing else is pruned */
const DAILY_PATTERN = new RegExp(`^${BACKUP_FILE_PREFIX}\\d{4}-\\d{2}-\\d{2}\\.json$`);

export type AutoBackupPermission = 'granted' | 'prompt' | 'denied' | 'unknown';

export interface AutoBackupState {
  /** showDirectoryPicker exists in this browser */
  supported: boolean;
  /** A folder handle is stored */
  configured: boolean;
  folderName: string | null;
  permission: AutoBackupPermission;
  /** ISO timestamp of the last successful write in this session or stored run */
  lastRunAt: string | null;
  /** Human-readable reason the last run failed, null when healthy */
  lastError: string | null;
  running: boolean;
}

const initialState: AutoBackupState = {
  supported: false,
  configured: false,
  folderName: null,
  permission: 'unknown',
  lastRunAt: null,
  lastError: null,
  running: false
};

export const autoBackupState = writable<AutoBackupState>(initialState);

function patchState(patch: Partial<AutoBackupState>): void {
  autoBackupState.update((state) => ({ ...state, ...patch }));
}

/**
 * True on desktop-class Chromium (including Chrome OS). Android Chrome does
 * expose showDirectoryPicker but forgets the folder permission every time the
 * app closes, so it would need re-authorizing on each launch; not "automatic"
 * in any useful sense. iOS has no picker at all.
 */
export function isAutoBackupSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof (window as WindowWithPicker).showDirectoryPicker !== 'function') return false;

  const nav = navigator as NavigatorWithUAData;
  if (nav.userAgentData?.mobile === true) return false;
  return !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}

class AutoBackupService {
  private handle: HandleWithPermissions | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending = false;
  private lastWriteMs = 0;
  private unsubscribe: (() => void) | null = null;
  private initialized = false;

  /**
   * Load the stored folder handle, check its permission, and start listening
   * for data changes. Called once from the layout after PTService is ready.
   * Never throws.
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const supported = isAutoBackupSupported();
    patchState({ supported });
    if (!supported || isDemoMode()) return;

    try {
      this.handle = (await ptService.getAutoBackupHandle()) as HandleWithPermissions | null;
    } catch (error) {
      console.warn('Automatic backup: failed to load folder handle:', error);
      this.handle = null;
    }

    if (!this.handle) {
      patchState({ configured: false, folderName: null, permission: 'unknown' });
      return;
    }

    patchState({ configured: true, folderName: this.handle.name });
    const permission = await this.checkPermission();
    this.attachListeners();

    // Catch up on anything that changed while the folder wasn't reachable
    // or a page-hide flush didn't finish. Unconditional: the reminder counter
    // skips the player's per-exercise saves, so it can't tell us whether the
    // last write is current. One file write per launch is cheap.
    if (permission === 'granted') {
      void this.runBackup();
    }
  }

  /**
   * Let the user pick (or change) the backup folder. Must be called from a
   * user gesture. Runs a first backup immediately on success.
   */
  async chooseFolder(): Promise<boolean> {
    const picker = (window as WindowWithPicker).showDirectoryPicker;
    if (!picker) return false;

    let handle: HandleWithPermissions;
    try {
      handle = (await picker({
        id: 'my-pt-backups',
        mode: 'readwrite',
        startIn: 'documents'
      })) as HandleWithPermissions;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return false; // user cancelled the picker
      }
      console.warn('Automatic backup: folder picker failed:', error);
      patchState({ lastError: 'Could not open the folder picker' });
      return false;
    }

    try {
      await ptService.saveAutoBackupHandle(handle);
    } catch (error) {
      console.warn('Automatic backup: failed to store folder handle:', error);
      patchState({ lastError: 'Could not remember the chosen folder' });
      return false;
    }

    this.handle = handle;
    patchState({ configured: true, folderName: handle.name, lastError: null });
    this.attachListeners();

    const permission = await this.checkPermission();
    if (permission === 'granted') {
      await this.runBackup();
    }
    return true;
  }

  /**
   * Re-request access to the stored folder. Must be called from a user
   * gesture. Chrome remembers the grant for installed PWAs; a browser tab
   * may be asked again each session.
   */
  async requestPermission(): Promise<AutoBackupPermission> {
    if (!this.handle?.requestPermission) return 'unknown';
    try {
      const result = await this.handle.requestPermission({ mode: 'readwrite' });
      const permission = this.toPermission(result);
      patchState({ permission, lastError: permission === 'granted' ? null : get(autoBackupState).lastError });
      if (permission === 'granted') {
        await this.runBackup();
      }
      return permission;
    } catch (error) {
      console.warn('Automatic backup: permission request failed:', error);
      patchState({ permission: 'unknown', lastError: 'Could not request folder access' });
      return 'unknown';
    }
  }

  /**
   * Forget the folder. Files already written are left alone.
   */
  async disable(): Promise<void> {
    this.cancelTimer();
    this.pending = false;
    this.handle = null;
    try {
      await ptService.clearAutoBackupHandle();
    } catch (error) {
      console.warn('Automatic backup: failed to clear folder handle:', error);
    }
    patchState({
      configured: false,
      folderName: null,
      permission: 'unknown',
      lastError: null
    });
  }

  /**
   * Write a backup now. Also used by the "Back up now" button. Never throws;
   * the outcome is reflected in autoBackupState.
   */
  async runBackup(): Promise<boolean> {
    if (!this.handle || get(autoBackupState).running) return false;

    this.cancelTimer();
    this.pending = false;
    patchState({ running: true });

    try {
      const permission = await this.checkPermission();
      if (permission !== 'granted') {
        patchState({ lastError: 'Folder access needs to be re-enabled' });
        return false;
      }

      const { json, exportDate } = await buildBackup();

      await this.writeFile(LATEST_FILENAME, json);
      await this.writeFile(dailyFilename(new Date(exportDate)), json);
      await this.prune();

      await ptService.recordBackupTaken(exportDate);
      this.lastWriteMs = Date.now();
      patchState({ lastRunAt: exportDate, lastError: null });
      console.log(`💾 Automatic backup written to "${this.handle.name}"`);
      return true;
    } catch (error) {
      console.warn('Automatic backup failed:', error);
      patchState({ lastError: this.describe(error) });
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        patchState({ permission: 'prompt' });
      }
      return false;
    } finally {
      patchState({ running: false });
    }
  }

  // ---- internals ----

  /** Subscribe to data changes and page-hide once, however the folder was set up */
  private attachListeners(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = ptService.onDataChange(() => this.schedule());

    // Flush a pending write if the page is being hidden or closed; the
    // debounce may otherwise never fire.
    window.addEventListener('pagehide', this.flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });
  }

  /**
   * Coalesce writes: wait for changes to settle, but never write more often
   * than MIN_INTERVAL_MS while the app is in use. A session that saves after
   * every exercise therefore produces one or two files, not one per exercise.
   * Hiding or closing the app flushes whatever is pending regardless.
   */
  private schedule(): void {
    if (!this.handle || get(autoBackupState).permission !== 'granted') return;
    this.pending = true;
    this.cancelTimer();

    const sinceLast = Date.now() - this.lastWriteMs;
    const delay = Math.max(SETTLE_MS, MIN_INTERVAL_MS - sinceLast);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runBackup();
    }, delay);
  }

  private flush = (): void => {
    if (!this.pending) return;
    this.cancelTimer();
    void this.runBackup();
  };

  private cancelTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async checkPermission(): Promise<AutoBackupPermission> {
    if (!this.handle) return 'unknown';
    let permission: AutoBackupPermission = 'unknown';
    try {
      if (this.handle.queryPermission) {
        permission = this.toPermission(await this.handle.queryPermission({ mode: 'readwrite' }));
      } else {
        // No permission API: assume granted and let the write tell us otherwise
        permission = 'granted';
      }
    } catch (error) {
      console.warn('Automatic backup: permission check failed:', error);
    }
    patchState({ permission });
    return permission;
  }

  private toPermission(state: PermissionState): AutoBackupPermission {
    return state === 'granted' || state === 'prompt' || state === 'denied' ? state : 'unknown';
  }

  private async writeFile(name: string, contents: string): Promise<void> {
    const fileHandle = await this.handle!.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    try {
      await writable.write(contents);
    } finally {
      await writable.close();
    }
  }

  /**
   * Keep the newest KEEP_BACKUPS daily files. Only names matching the daily
   * pattern are considered, so the latest copy and any manual backups the
   * user saved to the same folder are never touched.
   */
  private async prune(): Promise<void> {
    const names: string[] = [];
    for await (const name of this.handle!.keys()) {
      if (DAILY_PATTERN.test(name)) {
        names.push(name);
      }
    }
    // Dates in the filename sort lexically, so newest is last
    names.sort();
    const stale = names.slice(0, Math.max(0, names.length - KEEP_BACKUPS));
    for (const name of stale) {
      try {
        await this.handle!.removeEntry(name);
      } catch (error) {
        console.warn(`Automatic backup: failed to prune ${name}:`, error);
      }
    }
  }

  private describe(error: unknown): string {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          return 'Folder access needs to be re-enabled';
        case 'NotFoundError':
          return 'The backup folder no longer exists';
        case 'QuotaExceededError':
          return 'Not enough space in the backup folder';
        default:
          return error.message || error.name;
      }
    }
    return error instanceof Error ? error.message : 'Backup failed';
  }
}

/** my-pt-backup-YYYY-MM-DD.json in local time */
function dailyFilename(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${BACKUP_FILE_PREFIX}${y}-${m}-${d}.json`;
}

export const autoBackupService = new AutoBackupService();
