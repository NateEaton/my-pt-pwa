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

### Desired Calcium App Pattern (Clean)
```
Settings
├── App Settings (section)
│   ├── Theme (inline select)
│   └── Exercise Sort Order (inline select)
├── Timing (section)
│   ├── Default Rep Duration (inline input)
│   ├── Start Countdown (inline input)
│   └── ... (other timing settings)
├── Sound (section)
│   ├── Sound Enabled (inline toggle)
│   └── Volume (inline slider/input)
├── Exercises (section)
│   └── Manage Exercises → (nav button opens modal)
├── Sessions (section)
│   └── Manage Sessions → (nav button opens modal)
├── Data (section)
│   ├── Backup → (nav button opens modal)
│   └── Restore → (nav button opens modal)
└── Help & About (section)
    ├── User Guide → (nav button opens dialog)
    └── About → (nav button opens dialog)
```

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
├── ExerciseManagementModal.svelte    (NEW)
├── SessionManagementModal.svelte     (NEW)
├── BackupModal.svelte                (NEW)
├── RestoreModal.svelte               (NEW)
└── GuideDialog.svelte                (NEW - from other proposal)
└── AboutDialog.svelte                (NEW - from other proposal)
```

### Phase 2: Reorganize Settings Page
Restructure into clean sections with navigation items.

---

## Detailed Component Breakdown

### 1. ExerciseManagementModal.svelte

**Purpose:** Manage all exercises in a dedicated modal

**Structure:**
```svelte
<Modal fullScreen={true} title="Manage Exercises" on:close>
  <div slot="headerActions">
    <button on:click={openAddExercise}>
      <span class="material-icons">add</span>
    </button>
  </div>

  <!-- Search/Filter Bar -->
  <div class="exercise-filters">
    <input type="text" placeholder="Search exercises..." bind:value={searchQuery} />
    <select bind:value={filterType}>
      <option value="all">All Exercises</option>
      <option value="duration">Duration-based</option>
      <option value="reps">Reps-based</option>
      <option value="default">In Default Session</option>
    </select>
  </div>

  <!-- Exercise List (current content from Settings page) -->
  <div class="exercise-list">
    {#each filteredExercises as exercise}
      <div class="exercise-card">
        <!-- Current exercise card content -->
      </div>
    {/each}
  </div>
</Modal>

<!-- Nested modals for add/edit -->
{#if showExerciseFormModal}
  <Modal title="{editingExercise ? 'Edit' : 'Add'} Exercise">
    <!-- Exercise form -->
  </Modal>
{/if}
```

**Features:**
- Full-screen modal for desktop, takes over screen on mobile
- Search/filter capabilities
- Add button in header
- Nested modals for add/edit forms
- Delete confirmations

**Code to Move:**
- Exercise list rendering (lines 648-710 from current Settings)
- Exercise form modal (lines ~800-950)
- Exercise CRUD functions

---

### 2. SessionManagementModal.svelte

**Purpose:** Manage all session definitions in a dedicated modal

**Structure:**
```svelte
<Modal fullScreen={true} title="Manage Sessions" on:close>
  <div slot="headerActions">
    <button on:click={openAddSession}>
      <span class="material-icons">add</span>
    </button>
  </div>

  <!-- Sessions List -->
  <div class="session-list">
    {#each sessions as session}
      <div class="session-card">
        <!-- Current session card content -->
        <!-- Show default badge, exercise count, etc. -->
      </div>
    {/each}
  </div>
</Modal>

<!-- Nested modals for add/edit -->
{#if showSessionFormModal}
  <Modal title="{editingSession ? 'Edit' : 'New'} Session">
    <!-- Session form -->
  </Modal>
{/if}
```

**Features:**
- Full-screen modal
- Add button in header
- Nested modals for add/edit forms
- Delete confirmations with empty session warnings

**Code to Move:**
- Session list rendering (lines 574-636 from current Settings)
- Session form modal (lines ~800-900)
- Session CRUD functions

---

### 3. BackupModal.svelte

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

    <!-- App Settings Section -->
    <div class="settings-section">
      <h3 class="section-title">App Settings</h3>

      <div class="setting-item inline">
        <span class="material-icons setting-icon">palette</span>
        <div class="setting-info">
          <span class="setting-title">Theme</span>
          <span class="setting-subtitle">Choose your preferred appearance</span>
        </div>
        <div class="setting-control">
          <select bind:value={theme} on:change={saveTheme}>
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      <div class="setting-item inline">
        <span class="material-icons setting-icon">sort</span>
        <div class="setting-info">
          <span class="setting-title">Exercise Sort Order</span>
          <span class="setting-subtitle">How exercises are sorted</span>
        </div>
        <div class="setting-control">
          <select bind:value={exerciseSortOrder} on:change={saveSortOrder}>
            <option value="alphabetical">Alphabetical</option>
            <option value="dateAdded">Recently Added</option>
            <option value="frequency">Most Used</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Timing Section -->
    <div class="settings-section">
      <h3 class="section-title">Timing</h3>

      <div class="setting-item inline">
        <span class="material-icons setting-icon">timer</span>
        <div class="setting-info">
          <span class="setting-title">Default Rep Duration</span>
          <span class="setting-subtitle">Seconds per rep</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={defaultRepDuration}
            on:blur={saveTimingSettings}
            min="1"
            max="60"
            class="setting-input"
          />
          <span class="input-suffix">s</span>
        </div>
      </div>

      <div class="setting-item inline">
        <span class="material-icons setting-icon">hourglass_top</span>
        <div class="setting-info">
          <span class="setting-title">Start Countdown</span>
          <span class="setting-subtitle">Countdown before exercise starts</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={startCountdownDuration}
            on:blur={saveTimingSettings}
            min="0"
            max="30"
            class="setting-input"
          />
          <span class="input-suffix">s</span>
        </div>
      </div>

      <div class="setting-item inline">
        <span class="material-icons setting-icon">pause</span>
        <div class="setting-info">
          <span class="setting-title">Rest Between Sets</span>
          <span class="setting-subtitle">Default rest time</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={restBetweenSets}
            on:blur={saveTimingSettings}
            min="0"
            max="300"
            step="5"
            class="setting-input"
          />
          <span class="input-suffix">s</span>
        </div>
      </div>

      <div class="setting-item inline">
        <span class="material-icons setting-icon">fast_forward</span>
        <div class="setting-info">
          <span class="setting-title">Rest Between Exercises</span>
          <span class="setting-subtitle">Transition time</span>
        </div>
        <div class="setting-control">
          <input
            type="number"
            bind:value={restBetweenExercises}
            on:blur={saveTimingSettings}
            min="0"
            max="300"
            step="5"
            class="setting-input"
          />
          <span class="input-suffix">s</span>
        </div>
      </div>
    </div>

    <!-- Sound Section -->
    <div class="settings-section">
      <h3 class="section-title">Sound</h3>

      <div class="setting-item inline">
        <span class="material-icons setting-icon">volume_up</span>
        <div class="setting-info">
          <span class="setting-title">Sound Enabled</span>
          <span class="setting-subtitle">Audio cues during sessions</span>
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

      {#if soundEnabled}
        <div class="setting-item inline">
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
    </div>

    <!-- Exercises Section -->
    <div class="settings-section">
      <h3 class="section-title">Exercises</h3>

      <button class="setting-nav-item" on:click={() => showExerciseManagement = true}>
        <span class="material-icons setting-icon">fitness_center</span>
        <div class="setting-info">
          <span class="setting-title">Manage Exercises</span>
          <span class="setting-subtitle">
            {exercisesCount} {exercisesCount === 1 ? 'exercise' : 'exercises'}
          </span>
        </div>
        <span class="material-icons nav-chevron">chevron_right</span>
      </button>
    </div>

    <!-- Sessions Section -->
    <div class="settings-section">
      <h3 class="section-title">Sessions</h3>

      <button class="setting-nav-item" on:click={() => showSessionManagement = true}>
        <span class="material-icons setting-icon">playlist_play</span>
        <div class="setting-info">
          <span class="setting-title">Manage Sessions</span>
          <span class="setting-subtitle">
            {sessionsCount} {sessionsCount === 1 ? 'session' : 'sessions'}
          </span>
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

    <!-- Help & About Section (NEW) -->
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

<!-- Modal Components -->
{#if showExerciseManagement}
  <ExerciseManagementModal on:close={() => showExerciseManagement = false} />
{/if}

{#if showSessionManagement}
  <SessionManagementModal on:close={() => showSessionManagement = false} />
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
