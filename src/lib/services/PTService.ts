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
 * @fileoverview PTService - Core data management service for My PT
 * Handles all IndexedDB operations, exercise/session CRUD, and settings persistence
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

const DB_NAME = 'MyPT';
const DB_VERSION = 1;

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
  defaultRepDuration: 2, // 2 seconds per rep
  startCountdownDuration: 3, // 3 second countdown before start (3-2-1)
  endSessionDelay: 5, // 5 second delay before session player closes
  restBetweenSets: 30, // 30 seconds between sets
  restBetweenExercises: 15, // 15 seconds between exercises
  theme: 'auto',
  exerciseSortOrder: 'alphabetical',
  soundEnabled: true,
  soundVolume: 0.7, // 70% volume (master volume)
  audioLeadInEnabled: true, // 3-2-1 countdown at end of periods (enabled by default)
  audioContinuousTicksEnabled: false, // Continuous ticks OFF by default
  audioPerRepBeepsEnabled: false, // Per-rep beeps OFF by default
  enableNotifications: false
};

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
      const request = indexedDB.open(DB_NAME, DB_VERSION);

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
      exerciseStore.createIndex('includeInDefault', 'includeInDefault', { unique: false });
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

    return this._add<Exercise>(STORES.EXERCISES, exerciseToAdd);
  }

  /**
   * Update existing exercise
   */
  async updateExercise(exercise: Exercise): Promise<void> {
    this.ensureInitialized();
    return this._put<Exercise>(STORES.EXERCISES, exercise);
  }

  /**
   * Delete exercise
   */
  async deleteExercise(id: number): Promise<void> {
    this.ensureInitialized();
    return this._delete(STORES.EXERCISES, id);
  }

  /**
   * Get exercises included in default session
   */
  async getDefaultExercises(): Promise<Exercise[]> {
    this.ensureInitialized();
    return this._getByIndex<Exercise>(STORES.EXERCISES, 'includeInDefault', true);
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
      true
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

    return this._add<SessionDefinition>(STORES.SESSION_DEFINITIONS, sessionToAdd);
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

    return this._put<SessionDefinition>(STORES.SESSION_DEFINITIONS, sessionDef);
  }

  /**
   * Delete session definition
   */
  async deleteSessionDefinition(id: number): Promise<void> {
    this.ensureInitialized();
    return this._delete(STORES.SESSION_DEFINITIONS, id);
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
  async getTodaySessionInstance(): Promise<SessionInstance | null> {
    const today = this.formatDate(new Date());
    const instances = await this.getSessionInstancesByDate(today);

    // First, try to find an in-progress session
    const inProgress = instances.find(inst => inst.status === 'in-progress');
    if (inProgress) {
      return inProgress;
    }

    // Otherwise, return the most recent instance (last in array)
    return instances[instances.length - 1] || null;
  }

  /**
   * Add new session instance
   */
  async addSessionInstance(
    instance: Omit<SessionInstance, 'id'>
  ): Promise<number> {
    this.ensureInitialized();
    return this._add<SessionInstance>(STORES.SESSION_INSTANCES, instance);
  }

  /**
   * Update existing session instance
   */
  async updateSessionInstance(instance: SessionInstance): Promise<void> {
    this.ensureInitialized();
    return this._put<SessionInstance>(STORES.SESSION_INSTANCES, instance);
  }

  /**
   * Delete session instance
   */
  async deleteSessionInstance(id: number): Promise<void> {
    this.ensureInitialized();
    return this._delete(STORES.SESSION_INSTANCES, id);
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
