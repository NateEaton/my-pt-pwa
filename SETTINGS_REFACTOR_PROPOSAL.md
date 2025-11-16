# Settings Page Refactor Proposal

## Current State vs Desired State

### Current My PT Settings Page (Problems)
```
Settings
├── Session Definitions
│   └── [Full list of sessions with cards - takes up lots of space]
├── Exercise Library
│   └── [Full list of exercises with cards - very long]
├── App Settings
│   └── [Summary + modal button]
└── Backup & Restore
    └── [Two subsections with buttons]
```

**Issues:**
- ❌ Very long page with all sessions and exercises displayed
- ❌ Poor information hierarchy
- ❌ Lots of scrolling to reach Backup/Restore
- ❌ Inconsistent patterns (some inline, some modals)
- ❌ Hard to scan and find specific settings

### Desired Pattern for My PT (Clean & Refined)
```
Settings (Quick Access at Top)
├── Audio (inline)
│   ├── Sound Enabled (checkbox/toggle)
│   └── Volume (slider - shown when enabled)
└── Theme (inline select)

Settings (Navigation Sections)
├── Sessions
│   └── Manage Sessions → (nav button opens full-screen modal)
├── Exercise Library
│   └── Manage Exercise Library → (nav button opens full-screen modal)
├── Timing
│   └── Timing Settings → (nav button opens full-screen modal)
├── Data
│   ├── Backup → (nav button opens full-screen modal)
│   └── Restore → (nav button opens full-screen modal)
└── Help & About
    ├── User Guide → (nav button opens full-screen dialog)
    └── About → (nav button opens full-screen dialog)
```

**Session & Exercise Modals:**
- Full-screen scrollable content
- Create/Add button in header (top right)
- Sort buttons in list header (table-column-style: Name ↕, Created ↕, Frequency ↕)
- Click any card to edit
- Delete button on each card

**Benefits:**
- ✅ Clean, scannable interface
- ✅ Clear hierarchy
- ✅ Consistent patterns
- ✅ Minimal scrolling
- ✅ Room to grow (easy to add new settings)

---

## Refactor Strategy

### Phase 1: Component Extraction
Move complex sections into dedicated modal components (like Calcium app does).

**New Components to Create:**
```
src/lib/components/
├── ExerciseManagementModal.svelte    (NEW - full-screen)
├── SessionManagementModal.svelte     (NEW - full-screen)
├── TimingSettingsModal.svelte        (NEW - full-screen)
├── BackupModal.svelte                (NEW - full-screen)
├── RestoreModal.svelte               (NEW - full-screen)
├── GuideDialog.svelte                (NEW - full-screen)
└── AboutDialog.svelte                (NEW - full-screen)
```

**Key Pattern: All Modals Full-Screen**
- Consistent user experience
- Better mobile optimization
- More room for content and controls

### Phase 2: Reorganize Settings Page
Restructure into clean sections with navigation items.

---

## Detailed Component Breakdown

### 1. ExerciseManagementModal.svelte

**Purpose:** Manage all exercises in a dedicated full-screen modal

**Structure:**
```svelte
<Modal fullScreen={true} title="Exercise Library" on:close>
  <div slot="headerActions">
    <button class="icon-button" on:click={openAddExercise} aria-label="Add exercise">
      <span class="material-icons">add</span>
    </button>
  </div>

  <!-- Search Bar -->
  <div class="search-bar">
    <span class="material-icons search-icon">search</span>
    <input
      type="text"
      placeholder="Search exercises..."
      bind:value={searchQuery}
      class="search-input"
    />
    {#if searchQuery}
      <button class="clear-search" on:click={() => searchQuery = ''}>
        <span class="material-icons">close</span>
      </button>
    {/if}
  </div>

  <!-- Sort Header (Table-Column-Style) -->
  <div class="sort-header">
    <button class="sort-button" on:click={() => toggleSort('name')}>
      <span>Name</span>
      <span class="material-icons sort-icon">
        {sortField === 'name' ? (sortAsc ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
      </span>
    </button>
    <button class="sort-button" on:click={() => toggleSort('dateAdded')}>
      <span>Created</span>
      <span class="material-icons sort-icon">
        {sortField === 'dateAdded' ? (sortAsc ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
      </span>
    </button>
    <button class="sort-button" on:click={() => toggleSort('frequency')}>
      <span>Usage</span>
      <span class="material-icons sort-icon">
        {sortField === 'frequency' ? (sortAsc ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
      </span>
    </button>
  </div>

  <!-- Exercise List (scrollable) -->
  <div class="exercise-list">
    {#if filteredExercises.length === 0}
      <div class="empty-state">
        <span class="material-icons">fitness_center</span>
        <p>{searchQuery ? 'No exercises found' : 'No exercises yet'}</p>
      </div>
    {:else}
      {#each sortedAndFilteredExercises as exercise (exercise.id)}
        <div class="exercise-card" on:click={() => openEditExercise(exercise)}>
          <!-- Exercise card content - clickable to edit -->
          <div class="exercise-info">
            <h4>{exercise.name}</h4>
            <span class="exercise-type">{exercise.type}</span>
          </div>
          <button
            class="icon-button delete"
            on:click|stopPropagation={() => confirmDeleteExercise(exercise)}
            aria-label="Delete exercise"
          >
            <span class="material-icons">delete</span>
          </button>
        </div>
      {/each}
    {/if}
  </div>
</Modal>

<!-- Nested modals for add/edit -->
{#if showExerciseFormModal}
  <Modal title="{editingExercise ? 'Edit' : 'Add'} Exercise" on:close={closeExerciseForm}>
    <!-- Exercise form -->
  </Modal>
{/if}
```

**Features:**
- Full-screen with scrollable content
- Search functionality
- Table-heading-style sort buttons (Name, Created, Usage)
- Click card to edit
- Delete button on each card with stopPropagation
- Add button in header
- Nested modals for add/edit forms

**Code to Move:**
- Exercise list rendering (from current Settings)
- Exercise form modal
- Exercise CRUD functions
- Add sort logic for frequency (usage tracking)

---

### 2. SessionManagementModal.svelte

**Purpose:** Manage all session definitions in a dedicated full-screen modal

**Structure:**
```svelte
<Modal fullScreen={true} title="Sessions" on:close>
  <div slot="headerActions">
    <button class="icon-button" on:click={openAddSession} aria-label="Add session">
      <span class="material-icons">add</span>
    </button>
  </div>

  <!-- Search Bar -->
  <div class="search-bar">
    <span class="material-icons search-icon">search</span>
    <input
      type="text"
      placeholder="Search sessions..."
      bind:value={searchQuery}
      class="search-input"
    />
    {#if searchQuery}
      <button class="clear-search" on:click={() => searchQuery = ''}>
        <span class="material-icons">close</span>
      </button>
    {/if}
  </div>

  <!-- Sort Header (Table-Column-Style) -->
  <div class="sort-header">
    <button class="sort-button" on:click={() => toggleSort('name')}>
      <span>Name</span>
      <span class="material-icons sort-icon">
        {sortField === 'name' ? (sortAsc ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
      </span>
    </button>
    <button class="sort-button" on:click={() => toggleSort('dateCreated')}>
      <span>Created</span>
      <span class="material-icons sort-icon">
        {sortField === 'dateCreated' ? (sortAsc ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
      </span>
    </button>
    <button class="sort-button" on:click={() => toggleSort('frequency')}>
      <span>Usage</span>
      <span class="material-icons sort-icon">
        {sortField === 'frequency' ? (sortAsc ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
      </span>
    </button>
  </div>

  <!-- Sessions List (scrollable) -->
  <div class="session-list">
    {#if filteredSessions.length === 0}
      <div class="empty-state">
        <span class="material-icons">playlist_play</span>
        <p>{searchQuery ? 'No sessions found' : 'No sessions yet'}</p>
      </div>
    {:else}
      {#each sortedAndFilteredSessions as session (session.id)}
        <div class="session-card" on:click={() => openEditSession(session)}>
          <!-- Session card content - clickable to edit -->
          <div class="session-info">
            <div class="session-header">
              <h4>{session.name}</h4>
              {#if session.isDefault}
                <span class="default-badge">DEFAULT</span>
              {/if}
            </div>
            <span class="session-detail">
              {session.exercises.length} {session.exercises.length === 1 ? 'exercise' : 'exercises'}
            </span>
          </div>
          <button
            class="icon-button delete"
            on:click|stopPropagation={() => confirmDeleteSession(session)}
            aria-label="Delete session"
          >
            <span class="material-icons">delete</span>
          </button>
        </div>
      {/each}
    {/if}
  </div>
</Modal>

<!-- Nested modals for add/edit -->
{#if showSessionFormModal}
  <Modal title="{editingSession ? 'Edit' : 'New'} Session" on:close={closeSessionForm}>
    <!-- Session form -->
  </Modal>
{/if}
```

**Features:**
- Full-screen with scrollable content
- Search functionality
- Table-heading-style sort buttons (Name, Created, Usage)
- Click card to edit
- Delete button on each card with stopPropagation
- Default badge prominently displayed
- Add button in header
- Nested modals for add/edit forms

**Code to Move:**
- Session list rendering (from current Settings)
- Session form modal
- Session CRUD functions
- Add sort logic for frequency (usage tracking)

---

### 3. TimingSettingsModal.svelte

**Purpose:** Manage all timing-related settings in one dedicated full-screen modal

**Structure:**
```svelte
<Modal fullScreen={true} title="Timing Settings" on:close>
  <div class="timing-settings-content">
    <p class="modal-description">
      Adjust timing preferences for your exercise sessions and rest periods.
    </p>

    <!-- Settings List -->
    <div class="settings-list">
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Default Rep Duration</span>
          <span class="setting-description">Seconds per rep (for timing estimates)</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={defaultRepDuration}
            min="1"
            max="60"
            class="setting-input"
          />
          <span class="input-suffix">s</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Start Countdown</span>
          <span class="setting-description">Countdown before exercise starts</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={startCountdownDuration}
            min="0"
            max="30"
            class="setting-input"
          />
          <span class="input-suffix">s</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">End Countdown</span>
          <span class="setting-description">Countdown shown at end of exercise</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={endCountdownDuration}
            min="0"
            max="30"
            class="setting-input"
          />
          <span class="input-suffix">s</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Rest Between Sets</span>
          <span class="setting-description">Default rest time between sets</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={restBetweenSets}
            min="0"
            max="300"
            step="5"
            class="setting-input"
          />
          <span class="input-suffix">s</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">Rest Between Exercises</span>
          <span class="setting-description">Transition time between exercises</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={restBetweenExercises}
            min="0"
            max="300"
            step="5"
            class="setting-input"
          />
          <span class="input-suffix">s</span>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">End Session Delay</span>
          <span class="setting-description">Delay before closing session player after completion</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={endSessionDelay}
            min="0"
            max="60"
            class="setting-input"
          />
          <span class="input-suffix">s</span>
        </div>
      </div>
    </div>
  </div>

  <div slot="footer" class="modal-actions">
    <button class="btn btn-secondary" on:click={() => dispatch('close')}>
      Cancel
    </button>
    <button class="btn btn-primary" on:click={saveTimingSettings}>
      <span class="material-icons">save</span>
      Save Settings
    </button>
  </div>
</Modal>
```

**Features:**
- Full-screen modal for all timing settings
- Clear labels and descriptions for each setting
- Number inputs with min/max validation
- Save/Cancel actions in footer
- Changes saved on explicit Save button

**Code to Move:**
- App settings timing fields (from current Settings modal)
- `saveTimingSettings` function

---

### 4. BackupModal.svelte

**Purpose:** Create and download backup files

**Structure:**
```svelte
<Modal title="Create Backup" on:close>
  <div class="backup-content">
    <p class="modal-description">
      Download all your exercises, sessions, and journal entries as a JSON file.
      This file can be used to restore your data later.
    </p>

    <!-- Data Summary -->
    <div class="backup-summary">
      <div class="summary-item">
        <span class="material-icons">fitness_center</span>
        <span>{exercisesCount} exercises</span>
      </div>
      <div class="summary-item">
        <span class="material-icons">playlist_play</span>
        <span>{sessionsCount} sessions</span>
      </div>
      <div class="summary-item">
        <span class="material-icons">book</span>
        <span>{journalEntriesCount} journal entries</span>
      </div>
      <div class="summary-item">
        <span class="material-icons">settings</span>
        <span>App settings</span>
      </div>
    </div>

    <div class="info-box">
      <span class="material-icons">info</span>
      <p>The backup file will include all your data. Keep it safe!</p>
    </div>
  </div>

  <div slot="footer" class="modal-actions">
    <button class="btn btn-secondary" on:click={() => dispatch('close')}>
      Cancel
    </button>
    <button class="btn btn-primary" on:click={handleBackup}>
      <span class="material-icons">download</span>
      Download Backup
    </button>
  </div>
</Modal>
```

**Features:**
- Shows what will be backed up
- Clear download action
- Uses modal footer for actions

**Code to Move:**
- Backup summary (lines 750-764 from current Settings)
- `exportBackup` function

---

### 4. RestoreModal.svelte

**Purpose:** Upload and restore from backup files

**Structure:**
```svelte
<Modal title="Restore Data" on:close>
  <div class="restore-content">
    <div class="warning-box">
      <span class="material-icons">warning</span>
      <p><strong>Warning:</strong> Restoring from a backup will replace ALL your current data. This action cannot be undone.</p>
    </div>

    <p class="modal-description">
      Select a backup file to restore your data. Make sure you trust the source of this file.
    </p>

    <!-- File Upload Area -->
    <div class="file-upload-area" on:click={() => fileInput.click()}>
      {#if selectedFile}
        <span class="material-icons file-icon">insert_drive_file</span>
        <span class="file-name">{selectedFile.name}</span>
        <span class="file-size">{formatFileSize(selectedFile.size)}</span>
      {:else}
        <span class="material-icons upload-icon">cloud_upload</span>
        <span>Click to select backup file</span>
        <span class="file-hint">JSON files only</span>
      {/if}
    </div>

    <input
      type="file"
      accept=".json"
      bind:this={fileInput}
      on:change={handleFileSelect}
      style="display: none;"
    />

    <!-- Backup Preview (if file selected and valid) -->
    {#if backupPreview}
      <div class="backup-preview">
        <h4>Backup Contents:</h4>
        <div class="preview-summary">
          <div class="preview-item">
            <span class="material-icons">fitness_center</span>
            <span>{backupPreview.exercises} exercises</span>
          </div>
          <!-- ... other items -->
        </div>
        <p class="preview-date">Created: {formatDate(backupPreview.date)}</p>
      </div>
    {/if}
  </div>

  <div slot="footer" class="modal-actions">
    <button class="btn btn-secondary" on:click={() => dispatch('close')}>
      Cancel
    </button>
    <button
      class="btn btn-error"
      on:click={handleRestore}
      disabled={!selectedFile}
    >
      <span class="material-icons">restore</span>
      Restore Data
    </button>
  </div>
</Modal>

<!-- Confirmation Dialog (nested) -->
{#if showRestoreConfirm}
  <ConfirmDialog
    title="Confirm Restore"
    message="Are you sure you want to restore from this backup? All current data will be replaced."
    confirmText="Restore"
    confirmVariant="error"
    on:confirm={performRestore}
    on:cancel={() => showRestoreConfirm = false}
  />
{/if}
```

**Features:**
- Clear warning about data replacement
- File preview before restore
- Drag-and-drop support (future enhancement)
- Confirmation dialog before proceeding

**Code to Move:**
- Restore logic (lines 773-792 from current Settings)
- `handleFileSelect`, `confirmRestore`, `performRestore` functions

---

## New Settings Page Structure

### HTML Structure

```svelte
<div class="page-container">
  <main class="content">
    <header class="page-header">
      <h1>Settings</h1>
    </header>

    <!-- Quick Access Settings (Inline at Top) -->
    <div class="settings-section">
      <h3 class="section-title">Quick Access</h3>

      <!-- Audio (inline) -->
      <div class="setting-item inline">
        <span class="material-icons setting-icon">volume_up</span>
        <div class="setting-info">
          <span class="setting-title">Audio</span>
          <span class="setting-subtitle">Sound cues during sessions</span>
        </div>
        <div class="setting-control">
          <label class="toggle-switch">
            <input
              type="checkbox"
              bind:checked={soundEnabled}
              on:change={saveSoundSettings}
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <!-- Volume (shown when audio enabled) -->
      {#if soundEnabled}
        <div class="setting-item inline sub-setting">
          <span class="material-icons setting-icon">tune</span>
          <div class="setting-info">
            <span class="setting-title">Volume</span>
            <span class="setting-subtitle">Audio playback level</span>
          </div>
          <div class="setting-control">
            <input
              type="range"
              bind:value={soundVolume}
              on:change={saveSoundSettings}
              min="0"
              max="1"
              step="0.1"
              class="volume-slider"
            />
            <span class="volume-value">{Math.round(soundVolume * 100)}%</span>
          </div>
        </div>
      {/if}

      <!-- Theme (inline) -->
      <div class="setting-item inline">
        <span class="material-icons setting-icon">palette</span>
        <div class="setting-info">
          <span class="setting-title">Theme</span>
          <span class="setting-subtitle">Choose your appearance</span>
        </div>
        <div class="setting-control">
          <select bind:value={theme} on:change={saveTheme} class="theme-select">
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Sessions Section -->
    <div class="settings-section">
      <h3 class="section-title">Sessions</h3>

      <button class="setting-nav-item" on:click={() => showSessionManagement = true}>
        <span class="material-icons setting-icon">playlist_play</span>
        <div class="setting-info">
          <span class="setting-title">Manage Sessions</span>
          <span class="setting-subtitle">
            {$ptState.sessionDefinitions.length} {$ptState.sessionDefinitions.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>
        <span class="material-icons nav-chevron">chevron_right</span>
      </button>
    </div>

    <!-- Exercise Library Section -->
    <div class="settings-section">
      <h3 class="section-title">Exercise Library</h3>

      <button class="setting-nav-item" on:click={() => showExerciseManagement = true}>
        <span class="material-icons setting-icon">fitness_center</span>
        <div class="setting-info">
          <span class="setting-title">Manage Exercise Library</span>
          <span class="setting-subtitle">
            {$ptState.exercises.length} {$ptState.exercises.length === 1 ? 'exercise' : 'exercises'}
          </span>
        </div>
        <span class="material-icons nav-chevron">chevron_right</span>
      </button>
    </div>

    <!-- Timing Section -->
    <div class="settings-section">
      <h3 class="section-title">Timing</h3>

      <button class="setting-nav-item" on:click={() => showTimingSettings = true}>
        <span class="material-icons setting-icon">timer</span>
        <div class="setting-info">
          <span class="setting-title">Timing Settings</span>
          <span class="setting-subtitle">Adjust countdowns and rest periods</span>
        </div>
        <span class="material-icons nav-chevron">chevron_right</span>
      </button>
    </div>

    <!-- Data Section -->
    <div class="settings-section">
      <h3 class="section-title">Data</h3>

      <button class="setting-nav-item" on:click={() => showBackupModal = true}>
        <span class="material-icons setting-icon">backup</span>
        <div class="setting-info">
          <span class="setting-title">Create Backup</span>
          <span class="setting-subtitle">Download your data</span>
        </div>
        <span class="material-icons nav-chevron">chevron_right</span>
      </button>

      <button class="setting-nav-item" on:click={() => showRestoreModal = true}>
        <span class="material-icons setting-icon">restore</span>
        <div class="setting-info">
          <span class="setting-title">Restore Data</span>
          <span class="setting-subtitle">Import from backup file</span>
        </div>
        <span class="material-icons nav-chevron">chevron_right</span>
      </button>
    </div>

    <!-- Help & About Section -->
    <div class="settings-section">
      <h3 class="section-title">Help & About</h3>

      <button class="setting-nav-item" on:click={() => showGuideDialog = true}>
        <span class="material-icons setting-icon">help</span>
        <div class="setting-info">
          <span class="setting-title">User Guide</span>
          <span class="setting-subtitle">Learn how to use My PT</span>
        </div>
        <span class="material-icons nav-chevron">chevron_right</span>
      </button>

      <button class="setting-nav-item" on:click={() => showAboutDialog = true}>
        <span class="material-icons setting-icon">info</span>
        <div class="setting-info">
          <span class="setting-title">About</span>
          <span class="setting-subtitle">Version and build information</span>
        </div>
        <span class="material-icons nav-chevron">chevron_right</span>
      </button>
    </div>
  </main>

  <BottomTabs currentTab="settings" />
</div>

<!-- Modal Components (All Full-Screen) -->
{#if showSessionManagement}
  <SessionManagementModal on:close={() => showSessionManagement = false} />
{/if}

{#if showExerciseManagement}
  <ExerciseManagementModal on:close={() => showExerciseManagement = false} />
{/if}

{#if showTimingSettings}
  <TimingSettingsModal on:close={() => showTimingSettings = false} />
{/if}

{#if showBackupModal}
  <BackupModal on:close={() => showBackupModal = false} />
{/if}

{#if showRestoreModal}
  <RestoreModal on:close={() => showRestoreModal = false} />
{/if}

{#if showGuideDialog}
  <GuideDialog on:close={() => showGuideDialog = false} />
{/if}

{#if showAboutDialog}
  <AboutDialog on:close={() => showAboutDialog = false} />
{/if}
```

**Section Order (Top to Bottom):**
1. **Quick Access** - Audio toggle/volume, Theme select (inline)
2. **Sessions** - Manage Sessions button
3. **Exercise Library** - Manage Exercise Library button
4. **Timing** - Timing Settings button
5. **Data** - Backup and Restore buttons
6. **Help & About** - User Guide and About buttons

**All modals are full-screen for consistent UX**

---

## CSS Updates

Copy the Calcium app's styles for:
- `.settings-section`
- `.section-title`
- `.setting-item.inline`
- `.setting-nav-item`
- `.setting-icon`
- `.setting-info`
- `.setting-title`
- `.setting-subtitle`
- `.setting-control`
- `.nav-chevron`

**Additional needed:**
- Toggle switch styles
- Volume slider styles
- Input/select consistent styling

---

## State Management Simplification

### Before (Current)
```typescript
// 10+ boolean flags for modals
let showExerciseModal = false;
let showDeleteExerciseConfirm = false;
let showSessionModal = false;
let showDeleteSessionConfirm = false;
let showAppSettingsModal = false;
let showRestoreConfirm = false;
// ... etc
```

### After (Cleaner)
```typescript
// Only 6 top-level modal flags
let showExerciseManagement = false;
let showSessionManagement = false;
let showBackupModal = false;
let showRestoreModal = false;
let showGuideDialog = false;
let showAboutDialog = false;

// Sub-modals handled within their respective components
```

---

## Implementation Plan

### Step 1: Create New Components
1. Create `ExerciseManagementModal.svelte`
   - Move exercise list rendering
   - Move exercise form modal
   - Move exercise CRUD functions
   - Add search/filter capabilities

2. Create `SessionManagementModal.svelte`
   - Move session list rendering
   - Move session form modal
   - Move session CRUD functions

3. Create `BackupModal.svelte`
   - Move backup summary
   - Move backup logic
   - Improve UI with better feedback

4. Create `RestoreModal.svelte`
   - Move restore file upload
   - Move restore logic
   - Add file preview
   - Better warnings

### Step 2: Refactor Settings Page
1. Remove old sections
2. Add new section structure
3. Wire up navigation buttons
4. Add inline settings controls
5. Update styling to match Calcium app

### Step 3: Polish & Test
1. Test all modal workflows
2. Verify data persistence
3. Test responsive design
4. Add loading states
5. Improve error handling

---

## Benefits Summary

### User Experience
- ✅ **Cleaner interface** - No more scrolling through long lists
- ✅ **Faster access** - Direct navigation to what you need
- ✅ **Better organization** - Logical grouping of related settings
- ✅ **Consistent patterns** - All complex operations use modals

### Developer Experience
- ✅ **Better separation of concerns** - Each modal is self-contained
- ✅ **Easier to maintain** - Smaller, focused components
- ✅ **More testable** - Components can be tested independently
- ✅ **Easier to extend** - Adding new settings is straightforward

### Code Quality
- ✅ **Reduced complexity** - Settings page goes from 1800+ lines to ~400
- ✅ **Reusable components** - Modals can be used elsewhere if needed
- ✅ **Better state management** - Less coupling, clearer data flow
- ✅ **Consistent styling** - Shared patterns across all settings

---

## Migration Path

1. **Phase 1** (This session):
   - Create BackupModal and RestoreModal
   - Add Help & About section with Guide and About dialogs
   - Test modal patterns

2. **Phase 2** (Next session):
   - Create ExerciseManagementModal
   - Create SessionManagementModal
   - Update Settings page structure

3. **Phase 3** (Polish):
   - Add inline settings controls (Theme, Sort, Timing, Sound)
   - Remove old App Settings modal
   - Final styling and responsive testing

---

## Questions to Resolve

1. **Sound settings:** Currently in App Settings modal. Should we make them inline settings or keep in a modal?
   - **Recommendation:** Make inline (toggle + slider) for better UX

2. **Timing settings:** Currently in App Settings modal. Should they be inline or keep in modal?
   - **Recommendation:** Make inline (number inputs) - commonly adjusted

3. **Exercise search:** Should ExerciseManagementModal have search/filter?
   - **Recommendation:** Yes - essential for large exercise libraries

4. **Default session badge:** Should it be more prominent in SessionManagementModal?
   - **Recommendation:** Yes - use visual badge like "DEFAULT" chip

---

## Conclusion

This refactor aligns My PT's Settings page with the proven Calcium app pattern, resulting in:
- Cleaner, more professional UI
- Better user experience
- More maintainable codebase
- Foundation for future enhancements (Guide, About, etc.)

**Estimated Effort:**
- Component extraction: 3-4 hours
- Settings page restructure: 2-3 hours
- Styling & polish: 1-2 hours
- **Total: 6-9 hours** for complete refactor

---

**Author:** Claude Code
**Date:** 2025-11-15
**Status:** Proposal - Awaiting Approval
