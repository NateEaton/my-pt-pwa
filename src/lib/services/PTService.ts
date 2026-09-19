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
 * @fileoverview PTService - Core data management service for My PT
 *
 * USAGE:
 * - For database operations, import { ptService } from '$lib/stores/pt'
 * - The PTService class is exported for type references only
 * - Do not instantiate PTService directly; use the singleton
 */

import type {
  Exercise,
  SessionDefinition,
  SessionInstance,
  SessionExercise,
  CompletedExercise,
  AppSettings,
  DBMetadata
} from '$lib/types/pt';
import { getDbName } from '$lib/utils/demoMode';

const DB_VERSION = 1;

// Metadata store key holding the automatic-backup directory handle
const AUTO_BACKUP_KEY = 'autoBackupDir';

// Object store names
const STORES = {
  EXERCISES: 'exercises',
  SESSION_DEFINITIONS: 'sessionDefinitions',
  SESSION_INSTANCES: 'sessionInstances',
  SETTINGS: 'settings',
  METADATA: 'metadata'
} as const;

// Default application settings
const DEFAULT_SETTINGS: AppSettings = {
  defaultDuration: 60, // 60 seconds default duration for duration-based exercises
  defaultRepDuration: 30, // 30 seconds per rep
  defaultPauseBetweenReps: 5, // 5 seconds pause between reps
  startCountdownDuration: 3, // 3 second countdown before start (3-2-1)
  endSessionDelay: 5, // 5 second delay before session player closes
  restBetweenSets: 20, // 20 seconds between sets
  enableAutoAdvance: false, // Auto-advance disabled by default
  autoAdvanceSets: true, // Auto-start next set enabled by default
  pauseBetweenExercises: 20, // 20 seconds rest between exercises when auto-advance is enabled
  resumeFromPausePoint: true, // Continue from pause point by default (vs restarting exercise)
  startingSide: 'left', // Start with left side for unilateral/alternating exercises
  defaultReps: 10, // 10 reps default for reps-based exercises
  defaultSets: 3, // 3 sets default for reps-based exercises
  theme: 'auto',
  colorScheme: 'blue', // Default color scheme (Material Blue)
  exerciseSortOrder: 'alphabetical',
  fullscreenEnabled: false, // Fullscreen mode disabled by default
  soundEnabled: false, // Sound OFF by default
  soundVolume: 0.7, // 70% volume (master volume)
  hapticsEnabled: false, // Haptic feedback OFF by default
  audioLeadInEnabled: true, // Exercise about-to-start countdown (enabled by default)
  audioExerciseAboutToEndEnabled: true, // Exercise about-to-end countdown (enabled by default)
  audioRestCuesEnabled: false, // Rest period cues enabled by default
  backupReminderInterval: 'biweekly', // Remind for a backup every two weeks when there are changes
  enableNotifications: false
};

/**
 * Everything a restore replaces, in the shape the object stores hold it.
 * IDs are kept as-is (the stores are emptied first, so nothing can collide)
 * which is what keeps session -> exercise references valid without remapping.
 */
export interface RestoreSnapshot {
  exercises: Exercise[];
  sessionDefinitions: SessionDefinition[];
  sessionInstances: SessionInstance[];
  settings?: AppSettings | null;
  metadata?: DBMetadata | null;
}

/**
 * PTService - Manages all data operations for the PT application
 */
export class PTService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database connection
   */
  async initialize(): Promise<void> {
    // Return existing initialization if in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._performInitialization();
    return this.initPromise;
  }

  private async _performInitialization(): Promise<void> {
    console.log('🏥 Initializing PT Service...');

    try {
      this.db = await this.openDatabase();
      await this.ensureDefaultSettings();
      await this.ensureMetadata();
      console.log('✅ PT Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize PT Service:', error);
      throw error;
    }
  }

  /**
   * Open IndexedDB connection and set up schema
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const dbName = getDbName();
      const request = indexedDB.open(dbName, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createSchema(db, event.oldVersion);
      };
    });
  }

  /**
   * Create database schema
   */
  private createSchema(db: IDBDatabase, oldVersion: number): void {
    console.log(`📊 Creating database schema (upgrading from version ${oldVersion})`);

    // Exercises store
    if (!db.objectStoreNames.contains(STORES.EXERCISES)) {
      const exerciseStore = db.createObjectStore(STORES.EXERCISES, {
        keyPath: 'id',
        autoIncrement: true
      });
      exerciseStore.createIndex('name', 'name', { unique: false });
      exerciseStore.createIndex('type', 'type', { unique: false });
      exerciseStore.createIndex('dateAdded', 'dateAdded', { unique: false });
    }

    // Session Definitions store
    if (!db.objectStoreNames.contains(STORES.SESSION_DEFINITIONS)) {
      const sessionDefStore = db.createObjectStore(STORES.SESSION_DEFINITIONS, {
        keyPath: 'id',
        autoIncrement: true
      });
      sessionDefStore.createIndex('name', 'name', { unique: false });
      sessionDefStore.createIndex('isDefault', 'isDefault', { unique: false });
      sessionDefStore.createIndex('dateCreated', 'dateCreated', { unique: false });
    }

    // Session Instances store (journal entries)
    if (!db.objectStoreNames.contains(STORES.SESSION_INSTANCES)) {
      const sessionInstanceStore = db.createObjectStore(STORES.SESSION_INSTANCES, {
        keyPath: 'id',
        autoIncrement: true
      });
      sessionInstanceStore.createIndex('date', 'date', { unique: false });
      sessionInstanceStore.createIndex('status', 'status', { unique: false });
      sessionInstanceStore.createIndex('sessionDefinitionId', 'sessionDefinitionId', { unique: false });
    }

    // Settings store (key-value pairs)
    if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
      db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
    }

    // Metadata store
    if (!db.objectStoreNames.contains(STORES.METADATA)) {
      db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
    }
  }

  /**
   * Ensure default settings exist
   */
  private async ensureDefaultSettings(): Promise<void> {
    const existingSettings = await this.getSettings();
    if (!existingSettings) {
      await this.saveSettings(DEFAULT_SETTINGS);
    }
  }

  /**
   * Ensure metadata exists
   */
  private async ensureMetadata(): Promise<void> {
    const metadata = await this.getMetadata();
    if (!metadata) {
      await this.saveMetadata({
        version: DB_VERSION,
        installDate: new Date().toISOString()
      });
    }
  }

  /**
   * Ensure database is initialized
   */
  private ensureInitialized(): void {
    if (!this.db) {
      throw new Error('PTService not initialized. Call initialize() first.');
    }
  }

  // ==================== Exercise Operations ====================

  /**
   * Get all exercises
   */
  async getExercises(): Promise<Exercise[]> {
    this.ensureInitialized();
    return this._getAllFromStore<Exercise>(STORES.EXERCISES);
  }

  /**
   * Get exercise by ID
   */
  async getExercise(id: number): Promise<Exercise | null> {
    this.ensureInitialized();
    return this._getByKey<Exercise>(STORES.EXERCISES, id);
  }

  /**
   * Add new exercise
   */
  async addExercise(exercise: Omit<Exercise, 'id'>): Promise<number> {
    this.ensureInitialized();

    const exerciseToAdd: Omit<Exercise, 'id'> = {
      ...exercise,
      dateAdded: exercise.dateAdded || new Date().toISOString()
    };

    const id = await this._add<Exercise>(STORES.EXERCISES, exerciseToAdd);
    this.noteDataChange();
    return id;
  }

  /**
   * Update existing exercise
   */
  async updateExercise(exercise: Exercise): Promise<void> {
    this.ensureInitialized();
    await this._put<Exercise>(STORES.EXERCISES, exercise);
    this.noteDataChange();
  }

  /**
   * Delete exercise
   */
  async deleteExercise(id: number): Promise<void> {
    this.ensureInitialized();
    await this._delete(STORES.EXERCISES, id);
    this.noteDataChange();
  }

  // ==================== Session Definition Operations ====================

  /**
   * Get all session definitions
   */
  async getSessionDefinitions(): Promise<SessionDefinition[]> {
    this.ensureInitialized();
    return this._getAllFromStore<SessionDefinition>(STORES.SESSION_DEFINITIONS);
  }

  /**
   * Get session definition by ID
   */
  async getSessionDefinition(id: number): Promise<SessionDefinition | null> {
    this.ensureInitialized();
    return this._getByKey<SessionDefinition>(STORES.SESSION_DEFINITIONS, id);
  }

  /**
   * Get default session definition
   */
  async getDefaultSessionDefinition(): Promise<SessionDefinition | null> {
    this.ensureInitialized();
    const defaults = await this._getByIndex<SessionDefinition>(
      STORES.SESSION_DEFINITIONS,
      'isDefault',
      true as unknown as IDBValidKey
    );
    return defaults[0] || null;
  }

  /**
   * Add new session definition
   */
  async addSessionDefinition(
    sessionDef: Omit<SessionDefinition, 'id'>
  ): Promise<number> {
    this.ensureInitialized();

    const sessionToAdd: Omit<SessionDefinition, 'id'> = {
      ...sessionDef,
      dateCreated: sessionDef.dateCreated || new Date().toISOString()
    };

    // If this is being set as default, unset other defaults
    if (sessionToAdd.isDefault) {
      await this.clearDefaultSessionDefinition();
    }

    const id = await this._add<SessionDefinition>(STORES.SESSION_DEFINITIONS, sessionToAdd);
    this.noteDataChange();
    return id;
  }

  /**
   * Update existing session definition
   */
  async updateSessionDefinition(sessionDef: SessionDefinition): Promise<void> {
    this.ensureInitialized();

    // If this is being set as default, unset other defaults
    if (sessionDef.isDefault) {
      await this.clearDefaultSessionDefinition(sessionDef.id);
    }

    await this._put<SessionDefinition>(STORES.SESSION_DEFINITIONS, sessionDef);
    this.noteDataChange();
  }

  /**
   * Delete session definition
   */
  async deleteSessionDefinition(id: number): Promise<void> {
    this.ensureInitialized();
    await this._delete(STORES.SESSION_DEFINITIONS, id);
    this.noteDataChange();
  }

  /**
   * Clear default flag from all session definitions except the specified one
   */
  private async clearDefaultSessionDefinition(exceptId?: number): Promise<void> {
    const allSessions = await this.getSessionDefinitions();
    const updates = allSessions
      .filter((s) => s.isDefault && s.id !== exceptId)
      .map((s) => this.updateSessionDefinition({ ...s, isDefault: false }));
    await Promise.all(updates);
  }

  // ==================== Session Instance Operations ====================

  /**
   * Get all session instances
   */
  async getSessionInstances(): Promise<SessionInstance[]> {
    this.ensureInitialized();
    return this._getAllFromStore<SessionInstance>(STORES.SESSION_INSTANCES);
  }

  /**
   * Get session instance by ID
   */
  async getSessionInstance(id: number): Promise<SessionInstance | null> {
    this.ensureInitialized();
    return this._getByKey<SessionInstance>(STORES.SESSION_INSTANCES, id);
  }

  /**
   * Get session instances for a specific date
   */
  async getSessionInstancesByDate(date: string): Promise<SessionInstance[]> {
    this.ensureInitialized();
    return this._getByIndex<SessionInstance>(STORES.SESSION_INSTANCES, 'date', date);
  }

  /**
   * Get today's session instance
   */
  async getTodaySessionInstance(sessionDefinitionId?: number): Promise<SessionInstance | null> {
    const today = this.formatDate(new Date());
    const instances = await this.getSessionInstancesByDate(today);

    // Filter by session definition ID if provided
    const filteredInstances = sessionDefinitionId
      ? instances.filter(inst => inst.sessionDefinitionId === sessionDefinitionId)
      : instances;

    // First, try to find an in-progress session
    const inProgress = filteredInstances.find(inst => inst.status === 'in-progress');
    if (inProgress) {
      return inProgress;
    }

    // Otherwise, return the most recent instance (last in array)
    return filteredInstances[filteredInstances.length - 1] || null;
  }

  /**
   * Add new session instance
   */
  async addSessionInstance(
    instance: Omit<SessionInstance, 'id'>
  ): Promise<number> {
    this.ensureInitialized();
    const id = await this._add<SessionInstance>(STORES.SESSION_INSTANCES, instance);
    this.noteDataChange();
    return id;
  }

  /**
   * Update existing session instance
   */
  async updateSessionInstance(instance: SessionInstance): Promise<void> {
    this.ensureInitialized();
    await this._put<SessionInstance>(STORES.SESSION_INSTANCES, instance);
    this.noteDataChange();
  }

  /**
   * Delete session instance
   */
  async deleteSessionInstance(id: number): Promise<void> {
    this.ensureInitialized();
    await this._delete(STORES.SESSION_INSTANCES, id);
    this.noteDataChange();
  }

  // ==================== Settings Operations ====================

  /**
   * Get application settings (merges with defaults for any missing fields)
   */
  async getSettings(): Promise<AppSettings | null> {
    this.ensureInitialized();
    const stored = await this._getByKey<AppSettings>(STORES.SETTINGS, 'appSettings');

    // Merge stored settings with defaults to ensure all fields exist
    // This handles schema updates where new settings fields are added
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...stored };
    }

    return stored;
  }

  /**
   * Save application settings
   */
  async saveSettings(settings: AppSettings): Promise<void> {
    this.ensureInitialized();
    return this._put(STORES.SETTINGS, { key: 'appSettings', ...settings });
  }

  // ==================== Metadata Operations ====================

  /**
   * Get database metadata
   */
  async getMetadata(): Promise<DBMetadata | null> {
    this.ensureInitialized();
    return this._getByKey<DBMetadata>(STORES.METADATA, 'dbMetadata');
  }

  /**
   * Save database metadata
   */
  async saveMetadata(metadata: DBMetadata): Promise<void> {
    this.ensureInitialized();
    return this._put(STORES.METADATA, { key: 'dbMetadata', ...metadata });
  }

  private dataChangeListeners = new Set<() => void>();

  /**
   * Be told after any user-data write (exercises, sessions, journal).
   * Used by the automatic backup to schedule a write. Returns an unsubscribe.
   */
  onDataChange(listener: () => void): () => void {
    this.dataChangeListeners.add(listener);
    return () => this.dataChangeListeners.delete(listener);
  }

  // ==================== Automatic Backup Folder ====================
  // The directory handle lives in the metadata store under its own key so it
  // is never part of a backup file (which only carries 'dbMetadata') and can
  // survive a restore.

  async getAutoBackupHandle(): Promise<FileSystemDirectoryHandle | null> {
    this.ensureInitialized();
    const record = await this._getByKey<{ handle: FileSystemDirectoryHandle }>(
      STORES.METADATA,
      AUTO_BACKUP_KEY
    );
    return record?.handle ?? null;
  }

  async saveAutoBackupHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    this.ensureInitialized();
    return this._put(STORES.METADATA, {
      key: AUTO_BACKUP_KEY,
      handle,
      chosenAt: new Date().toISOString()
    });
  }

  async clearAutoBackupHandle(): Promise<void> {
    this.ensureInitialized();
    return this._delete(STORES.METADATA, AUTO_BACKUP_KEY);
  }

  /**
   * Count a user-data write towards the backup reminder.
   *
   * Fire-and-forget: callers don't await it, so a failure here can never
   * turn a successful save into an error. The read and write happen inside
   * one transaction so concurrent saves can't lose increments.
   */
  private noteDataChange(): void {
    if (!this.db) return;
    try {
      const transaction = this.db.transaction([STORES.METADATA], 'readwrite');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.get('dbMetadata');
      request.onsuccess = () => {
        const current = (request.result ?? {
          key: 'dbMetadata',
          version: DB_VERSION,
          installDate: new Date().toISOString()
        }) as DBMetadata & { key: string };
        store.put({
          ...current,
          changesSinceBackup: (current.changesSinceBackup ?? 0) + 1
        });
      };
      transaction.onerror = () => {
        console.warn('Failed to count data change for backup reminder:', transaction.error);
      };
    } catch (error) {
      console.warn('Failed to count data change for backup reminder:', error);
    }

    for (const listener of this.dataChangeListeners) {
      try {
        listener();
      } catch (error) {
        console.warn('Data change listener failed:', error);
      }
    }
  }

  /**
   * Record a successful backup: stamps the date, resets the change counter
   * and clears any reminder snooze.
   */
  async recordBackupTaken(date: string = new Date().toISOString()): Promise<void> {
    this.ensureInitialized();
    const current = (await this.getMetadata()) ?? {
      version: DB_VERSION,
      installDate: date
    };
    const { backupReminderSnoozedUntil, ...rest } = current;
    await this.saveMetadata({
      ...rest,
      lastBackupDate: date,
      changesSinceBackup: 0
    });
  }

  /**
   * Hide the backup reminder until the given time
   */
  async snoozeBackupReminder(until: string): Promise<void> {
    this.ensureInitialized();
    const current = (await this.getMetadata()) ?? {
      version: DB_VERSION,
      installDate: new Date().toISOString()
    };
    await this.saveMetadata({ ...current, backupReminderSnoozedUntil: until });
  }

  // ==================== Generic IndexedDB Operations ====================

  /**
   * Get all items from a store
   */
  private _getAllFromStore<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get item by key from a store
   */
  private _getByKey<T>(storeName: string, key: number | string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get items by index value
   */
  private _getByIndex<T>(
    storeName: string,
    indexName: string,
    value: IDBValidKey
  ): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add item to store
   */
  private _add<T>(storeName: string, item: Omit<T, 'id'>): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(item);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update item in store
   */
  private _put<T>(storeName: string, item: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete item from store
   */
  private _delete(storeName: string, key: number | string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== Utility Functions ====================

  /**
   * Format date as YYYY-MM-DD in local timezone
   */
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  /**
   * Replace every store's contents with the given snapshot, atomically.
   *
   * Runs as a single readwrite transaction across all stores: clear, then
   * add every record. If any request fails (a duplicate ID, a value that
   * can't be cloned, a quota error) IndexedDB aborts the whole transaction
   * and the previous data is left exactly as it was. Nothing is awaited
   * outside the request callbacks, so the transaction can't auto-commit
   * part-way through.
   *
   * Missing settings/metadata in the snapshot are replaced with defaults so
   * the app never comes back up with those stores empty.
   */
  async restoreAllData(snapshot: RestoreSnapshot): Promise<void> {
    this.ensureInitialized();

    const stores = [
      STORES.EXERCISES,
      STORES.SESSION_DEFINITIONS,
      STORES.SESSION_INSTANCES,
      STORES.SETTINGS,
      STORES.METADATA
    ];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(stores, 'readwrite');
      let settled = false;

      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        reject(error instanceof Error ? error : new Error('Restore failed'));
      };

      transaction.oncomplete = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      transaction.onerror = () => fail(transaction.error ?? new Error('Restore transaction failed'));
      transaction.onabort = () => fail(transaction.error ?? new Error('Restore was aborted'));

      const abortWith = (error: unknown) => {
        // A synchronous throw (e.g. DataCloneError from add()) doesn't abort
        // the transaction by itself; do it explicitly so nothing partial commits.
        try {
          transaction.abort();
        } catch {
          // already aborted
        }
        fail(error);
      };

      const writeSnapshot = () => {
        // add() rather than put(): a duplicate ID in the file is a corrupt
        // backup and should abort the restore, not overwrite silently.
        const exerciseStore = transaction.objectStore(STORES.EXERCISES);
        for (const exercise of snapshot.exercises) {
          exerciseStore.add(exercise);
        }

        const sessionDefStore = transaction.objectStore(STORES.SESSION_DEFINITIONS);
        for (const sessionDef of snapshot.sessionDefinitions) {
          sessionDefStore.add(sessionDef);
        }

        const sessionInstanceStore = transaction.objectStore(STORES.SESSION_INSTANCES);
        for (const instance of snapshot.sessionInstances) {
          sessionInstanceStore.add(instance);
        }

        transaction.objectStore(STORES.SETTINGS).put({
          key: 'appSettings',
          ...(snapshot.settings ?? DEFAULT_SETTINGS)
        });

        transaction.objectStore(STORES.METADATA).put({
          key: 'dbMetadata',
          ...(snapshot.metadata ?? {
            version: DB_VERSION,
            installDate: new Date().toISOString()
          })
        });
      };

      // The automatic-backup folder handle is device state, not user data:
      // read it before clearing so it can be written back in the same
      // transaction.
      const metadataStore = transaction.objectStore(STORES.METADATA);
      const handleRequest = metadataStore.get(AUTO_BACKUP_KEY);

      handleRequest.onsuccess = () => {
        const autoBackupRecord = handleRequest.result;
        try {
          for (const storeName of stores) {
            transaction.objectStore(storeName).clear();
          }

          if (autoBackupRecord) {
            metadataStore.put(autoBackupRecord);
          }

          writeSnapshot();
        } catch (error) {
          abortWith(error);
        }
      };
    });
  }

  /**
   * Clear all data (for testing/reset)
   */
  async clearAllData(): Promise<void> {
    this.ensureInitialized();

    const stores = [
      STORES.EXERCISES,
      STORES.SESSION_DEFINITIONS,
      STORES.SESSION_INSTANCES,
      STORES.SETTINGS,
      STORES.METADATA
    ];

    const transaction = this.db!.transaction(stores, 'readwrite');

    for (const storeName of stores) {
      const store = transaction.objectStore(storeName);
      store.clear();
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// Export singleton instance
export const ptService = new PTService();
