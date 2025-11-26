# Design/Implementation Spec: Codebase Cleanup & Refactoring

## Overview

This specification covers five cleanup and refactoring tasks to prepare the My PT codebase for open source release:

1. Copyright Header Standardization
2. PTService Export Pattern Consolidation
3. TypeScript Strict Mode Enforcement
4. Modal Component Style Consolidation
5. Types File Split

---

## 1. Copyright Header Standardization

### Objective

Update all source files to use consistent GPL-3.0-or-later copyright headers with correct author name.

### Header Templates

**For `.svelte` files (HTML comment at top of file):**

```html
<!--
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
-->
```

**For `.ts` and `.js` files (JS block comment):**

```typescript
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
```

**For `.css` files (CSS block comment):**

```css
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
```

### Files to Update

| Directory | Files | Comment Type |
|-----------|-------|--------------|
| `src/lib/components/` | `AboutDialog.svelte`, `AudioSettingsModal.svelte`, `BackupModal.svelte`, `BottomTabs.svelte`, `ConfirmDialog.svelte`, `DisplayRow.svelte`, `DurationInput.svelte`, `ExerciseCard.svelte`, `ExerciseManagementModal.svelte`, `GuideDialog.svelte`, `Modal.svelte`, `RestoreModal.svelte`, `SessionManagementModal.svelte`, `SideIndicator.svelte`, `TimingSettingsModal.svelte`, `Toast.svelte` | HTML |
| `src/lib/services/` | `AudioService.ts`, `PTService.ts` | JS |
| `src/lib/stores/` | `pt.ts`, `pwa.ts`, `toast.ts` | JS |
| `src/lib/types/` | `pt.ts` | JS |
| `src/lib/utils/` | `buildInfo.ts`, `duration.ts` | JS |
| `src/routes/` | `+layout.svelte`, `+page.svelte` | HTML |
| `src/routes/journal/` | `+page.svelte` | HTML |
| `src/routes/play/` | `+page.svelte` | HTML |
| `src/routes/settings/` | `+page.svelte` | HTML |
| `src/` | `app.css` | CSS |
| Root | `vite.config.js`, `svelte.config.js` | JS |

### Implementation Notes

- For `.svelte` files, place the HTML comment at the very top of the file, before any `<script>` tag
- For files that already have headers with "Your Name", replace the entire header block
- For files without headers, add the header at the top
- Do **not** add headers to: `app.html`, `app.d.ts`, config JSON files, or static assets
- Preserve any existing `@fileoverview` JSDoc comments that follow the copyright header

---

## 2. PTService Export Pattern Consolidation

### Objective

Clarify the canonical import path for PTService to reduce contributor confusion.

### Current State

- `PTService.ts` exports both `PTService` class and `ptService` singleton
- `pt.ts` store re-exports `ptService` from the service file
- Code inconsistently imports from either location

### Recommended Solution

Keep the current dual-export but add documentation and establish convention.

### Changes Required

**In `src/lib/services/PTService.ts`**, add documentation header after copyright:

```typescript
/**
 * @fileoverview PTService - Core data management service for My PT
 * 
 * USAGE:
 * - For database operations, import { ptService } from '$lib/stores/pt'
 * - The PTService class is exported for type references only
 * - Do not instantiate PTService directly; use the singleton
 */
```

**In `src/lib/stores/pt.ts`**, add documentation header after copyright:

```typescript
/**
 * @fileoverview Core state management for My PT application
 * 
 * This module provides:
 * - ptState: Reactive Svelte store for application state
 * - ptService: Re-exported singleton for database operations
 * - Derived stores for computed values
 * 
 * CANONICAL IMPORTS:
 * import { ptState, ptService } from '$lib/stores/pt';
 */

// Re-export service singleton as the canonical access point
export { ptService } from '$lib/services/PTService';
```

### Migration Steps

1. Add documentation comments to both files
2. Audit all imports of `ptService` across the codebase
3. Update any imports from `'$lib/services/PTService'` to `'$lib/stores/pt'`
4. Keep the `PTService` class export for type annotations where needed

### Files to Audit for Import Updates

```bash
grep -r "from '\$lib/services/PTService'" src/
```

---

## 3. TypeScript Strict Mode Enforcement

### Objective

Remove `// @ts-ignore` and `// @ts-nocheck` comments and fix underlying type issues.

### Audit Command

```bash
grep -r "@ts-ignore\|@ts-nocheck\|@ts-expect-error" src/
```

### Common Patterns and Solutions

| Pattern | Problem | Solution |
|---------|---------|----------|
| Missing event types | `event` parameter implicit `any` | Add `event: Event` or `event: CustomEvent<T>` |
| Null/undefined access | Property access on potentially null | Add null check or use optional chaining `?.` |
| Dynamic property access | Indexing object with string | Use `Record<string, T>` type or type guard |
| DOM element types | Element might be null | Add null check before use |
| Svelte component events | Custom event dispatch typing | Use `createEventDispatcher<{eventName: PayloadType}>()` |

### Example Fixes

**Event handler typing:**
```typescript
// Before
function handleClick(event) { ... }

// After
function handleClick(event: MouseEvent) { ... }
```

**Custom event dispatch:**
```typescript
// Before
const dispatch = createEventDispatcher();
dispatch('close');

// After
const dispatch = createEventDispatcher<{ close: void; save: DataType }>();
dispatch('close');
```

**Null checks:**
```typescript
// Before
// @ts-ignore
element.focus();

// After
if (element) {
  element.focus();
}
```

### Implementation Notes

- Fix each `@ts-ignore` individually with proper typing
- If a legitimate case exists where ignore is truly needed, replace with `@ts-expect-error` and add explanatory comment
- Run `npm run check` after each file to verify no regressions
- Address any new errors that appear after removing ignores

---

## 4. Modal Component Style Consolidation

### Objective

Extract duplicated modal styles into shared CSS in `app.css`.

### Current Duplication

Multiple modal components define similar styles for:
- `.modal-description`
- `.settings-list` / `.setting-item`
- `.form-group` / `.form-row`
- Button variants (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`)
- Toggle switches (`.toggle-switch`, `.toggle-slider`)
- Info boxes (`.info-box`, `.info-title`, `.info-text`)

### Recommended Approach

Add shared modal styles to `app.css` under a dedicated section.

### Styles to Add to `app.css`

```css
/* ==================== Modal Shared Styles ==================== */

.modal-description {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-lg);
  line-height: 1.5;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) 0;
  border-bottom: 1px solid var(--divider);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
  min-width: 0;
}

.setting-label {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.setting-description {
  display: block;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.4;
}

.setting-control {
  flex-shrink: 0;
}

/* Form Groups */
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.form-group label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--text-primary);
}

.form-group .required {
  color: var(--error-color);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

@media (max-width: 480px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}

/* Info Boxes */
.info-box {
  background-color: var(--surface-variant);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
}

.info-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.info-title .material-icons {
  font-size: var(--icon-size-md);
  color: var(--primary-color);
}

.info-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.5;
}

.info-text ul {
  margin: var(--spacing-sm) 0 0 0;
  padding-left: var(--spacing-lg);
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--divider);
  transition: 0.3s;
  border-radius: 28px;
}

.toggle-slider::before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--primary-color);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(24px);
}

.toggle-switch input:disabled + .toggle-slider {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Migration Steps

1. Add the shared styles section to `app.css`
2. For each modal component, remove duplicated style definitions
3. Keep only component-specific overrides in component `<style>` blocks
4. Test each modal to ensure styling is preserved
5. Run through all modals visually to verify consistency

### Components to Update

- `AudioSettingsModal.svelte`
- `TimingSettingsModal.svelte`
- `BackupModal.svelte`
- `RestoreModal.svelte`
- `ExerciseManagementModal.svelte`
- `SessionManagementModal.svelte`

---

## 5. Types File Split

### Objective

Split `src/lib/types/pt.ts` into logical modules for better organization and maintainability.

### Proposed Structure

```
src/lib/types/
├── index.ts          # Barrel export (re-exports all types)
├── exercise.ts       # Exercise, SessionExercise
├── session.ts        # SessionDefinition, SessionInstance, CompletedExercise
└── settings.ts       # AppSettings, DBMetadata
```

### File Contents

**`src/lib/types/exercise.ts`:**

```typescript
/*
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Nathan A. Eaton Jr.
 * [full copyright header]
 */

/**
 * Exercise Definition
 * Represents a single exercise that can be performed
 */
export interface Exercise {
  id: number;
  name: string;
  type: 'duration' | 'reps';

  // Duration-based exercise properties
  defaultDuration?: number;

  // Reps/sets-based exercise properties
  defaultReps?: number;
  defaultSets?: number;
  defaultRepDuration?: number;
  pauseBetweenReps?: number;
  restBetweenSets?: number;
  sideMode?: 'bilateral' | 'unilateral' | 'alternating';

  // Optional metadata
  instructions?: string;
  includeInDefault: boolean;
  dateAdded: string;
}

/**
 * Session Exercise
 * Represents an exercise within a session definition with optional overrides
 */
export interface SessionExercise {
  exerciseId: number;
  duration?: number;
  reps?: number;
  sets?: number;
  repDuration?: number;
}
```

**`src/lib/types/session.ts`:**

```typescript
/*
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Nathan A. Eaton Jr.
 * [full copyright header]
 */

import type { SessionExercise } from './exercise';

/**
 * Session Definition
 * Represents a named collection of exercises (like a playlist)
 */
export interface SessionDefinition {
  id: number;
  name: string;
  exercises: SessionExercise[];
  isDefault: boolean;
  dateCreated: string;
  autoAdvance?: boolean;
}

/**
 * Completed Exercise
 * Represents the completion status of a single exercise in a session instance
 */
export interface CompletedExercise {
  exerciseId: number;
  exerciseName: string;
  exerciseType: 'duration' | 'reps';
  targetDuration?: number;
  targetReps?: number;
  targetSets?: number;
  targetRepDuration?: number;
  completed: boolean;
  actualDuration?: number;
  skipped?: boolean;
  completedAt?: string;
}

/**
 * Session Instance (Journal Entry)
 * Represents a specific session performed on a specific day
 */
export interface SessionInstance {
  id: number;
  date: string;
  sessionDefinitionId: number;
  sessionName: string;
  status: 'planned' | 'in-progress' | 'completed' | 'logged';
  startTime?: string;
  endTime?: string;
  cumulativeElapsedSeconds?: number;
  completedExercises: CompletedExercise[];
  customized: boolean;
  notes?: string;
  manuallyLogged?: boolean;
}
```

**`src/lib/types/settings.ts`:**

```typescript
/*
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Nathan A. Eaton Jr.
 * [full copyright header]
 */

/**
 * App Settings
 * Global configuration for the application
 */
export interface AppSettings {
  // Timing defaults (in seconds)
  defaultDuration: number;
  defaultRepDuration: number;
  defaultPauseBetweenReps: number;
  startCountdownDuration: number;
  endSessionDelay: number;
  restBetweenSets: number;
  enableAutoAdvance: boolean;
  pauseBetweenExercises: number;
  resumeFromPausePoint: boolean;
  startingSide: 'left' | 'right';

  // UI preferences
  theme: 'light' | 'dark' | 'auto';
  exerciseSortOrder: 'alphabetical' | 'dateAdded' | 'frequency';

  // Sound preferences
  soundEnabled: boolean;
  soundVolume: number;
  hapticsEnabled: boolean;

  // Audio cue preferences
  audioLeadInEnabled: boolean;
  audioExerciseAboutToEndEnabled: boolean;
  audioRestCuesEnabled: boolean;

  // Feature flags
  enableNotifications?: boolean;
}

/**
 * Database version and migration tracking
 */
export interface DBMetadata {
  version: number;
  lastMigration?: string;
  installDate: string;
}
```

**`src/lib/types/index.ts`:**

```typescript
/*
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Nathan A. Eaton Jr.
 * [full copyright header]
 */

/**
 * @fileoverview Barrel export for all type definitions
 */

export type { Exercise, SessionExercise } from './exercise';
export type { SessionDefinition, SessionInstance, CompletedExercise } from './session';
export type { AppSettings, DBMetadata } from './settings';
```

### Migration Steps

1. Create the new type files with proper copyright headers
2. Create `index.ts` barrel export
3. Test that existing imports still work: `import type { Exercise } from '$lib/types/pt'`
4. Update the path alias if needed (should work automatically via barrel)
5. Optionally update imports to use `'$lib/types'` instead of `'$lib/types/pt'`
6. Delete the original `pt.ts` after verification
7. Run `npm run check` to verify no type errors

### Import Compatibility

The barrel export ensures backward compatibility:

```typescript
// Both of these will work:
import type { Exercise } from '$lib/types';        // New preferred
import type { Exercise } from '$lib/types/index';  // Also works
```

---

## Implementation Order

Recommended order for implementation:

1. **Copyright Headers** - Quick win, no functional changes
2. **Types File Split** - Low risk, improves organization
3. **PTService Export Pattern** - Documentation only, minimal changes
4. **TypeScript Strict Mode** - Medium effort, may surface bugs
5. **Modal Style Consolidation** - Higher effort, visual testing required

---

## Verification Checklist

After completing all tasks:

- [ ] `npm run check` passes with no errors
- [ ] `npm run build` completes successfully
- [ ] All pages render correctly
- [ ] All modals display with correct styling
- [ ] Dark mode works correctly
- [ ] No console errors in browser
