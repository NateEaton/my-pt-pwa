# CLAUDE.md - AI Assistant Guide

**Last Updated:** 2025-12-04
**Project:** My PT - Physical Therapy Tracker PWA
**Purpose:** Guide for AI assistants working with this codebase

---

## Quick Start for AI Assistants

This is a **privacy-focused Progressive Web App** for tracking physical therapy exercises. All data stays local (IndexedDB), no backend server, built with SvelteKit + TypeScript.

**Before making changes:**
1. Read relevant documentation in `_notes/` (see [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md))
2. Review [_notes/my-pt-complete-spec.md](_notes/my-pt-complete-spec.md) for canonical data models
3. Check [_notes/ARCHITECTURE_REVIEW.md](_notes/ARCHITECTURE_REVIEW.md) for architecture decisions
4. Review [_notes/WORKFLOW_CHEATSHEET.md](_notes/WORKFLOW_CHEATSHEET.md) for git workflow

---

## Environment Configuration

**IMPORTANT:** This project supports two different AI assistant environments with different capabilities.

### Environment A: Claude Code Web (Standard GitHub Workflow)
- ✅ **Full git operations** - Can perform add, commit, push
- ✅ **Build & test commands** - Can run `npm run build`, `npm run check`, `npm run dev`
- ✅ **Should commit changes** - Expected to create commits and PRs
- 🎯 **Use case:** GitHub issue/PR workflow, automated development

### Environment B: Containerized Code-Server (NAS-mounted workspace)
- ✅ **Git read-only** - Can use `git status`, `git log`, `git diff`, `git branch`, `git show`
- ❌ **NO git write operations** - Cannot use `git add`, `git commit`, `git push`
- ❌ **NO build/test/deploy** - User handles builds and testing separately
- 🎯 **Use case:** Local development with Q, code generation only

**How to determine environment:**
- Check the working directory path:
  - If path starts with `/mnt/projects/` → Environment B (Code-Server/NAS)
  - Otherwise → Environment A (Claude Code Web)
- Example:
  - `/mnt/projects/my-pt-pwa` → Environment B (no git/build commands)
  - `/home/user/my-pt-pwa` → Environment A (full git/build access)

---

## Coding Agent Protocol

### Rule 0
**When anything fails: STOP. Explain to Q. Wait for confirmation before proceeding.**

### Before Every Action
State your prediction before executing:

```
DOING: [action]
EXPECT: [predicted outcome]
IF WRONG: [what that means]
```

Then execute the tool call. Then compare actual vs. expected. **Mismatch = stop and surface to Q.**

### Checkpoints
Maximum 3 actions before verifying reality matches your mental model. **Thinking isn't verification—observable output is.**

### Epistemic Hygiene
- "I believe X" ≠ "I verified X"
- "I don't know" beats confident guessing
- One example is anecdote, three is maybe a pattern

### Autonomy Check
Before significant decisions: **Am I the right entity to decide this?**

Uncertain + consequential → ask Q first. **Cheap to ask, expensive to guess wrong.**

### Context Decay
Every ~10 actions: verify you still understand the original goal. Say **"losing the thread"** when degraded.

### Chesterton's Fence
**Can't explain why something exists? Don't touch it until you can.**

### Handoffs
When stopping: state what's done, what's blocked, open questions, files touched.

### Communication
When confused: stop, think, present theories, get signoff. **Never silently retry failures.**

---

## Project Overview

### Core Identity
- **Name:** My PT (Physical Therapy Tracker PWA)
- **Type:** Local-first Progressive Web App
- **License:** GPL-3.0-or-later
- **Author:** Nathan A. Eaton Jr.
- **Repository:** https://github.com/NateEaton/my-pt-pwa

### Primary Purpose
Privacy-focused app for tracking home physical therapy exercises with:
- Complete offline functionality
- No accounts, no tracking, no servers
- Exercise library management
- Session builder and guided playback
- Progress tracking with journal
- Audio cues and haptic feedback

### Key Principles
1. **Privacy First:** All data stays on device (IndexedDB)
2. **Offline Always:** Must work without internet after install
3. **Zero Backend:** No server communication, pure client-side
4. **Data Portability:** Export/import for backups and migration
5. **Accessibility:** Mobile-first, touch-optimized, screen reader friendly

---

## Technology Stack

### Core Framework
- **SvelteKit** v2.5 - Full-stack framework with SSG
- **Svelte** v4.2 - Reactive UI framework
- **TypeScript** v5.0 - Strict mode enabled
- **Vite** v5.2 - Build tool and dev server

### Build & Deployment
- **@sveltejs/adapter-static** - Static site generation (SPA mode with fallback)
- **@vite-pwa/sveltekit** - PWA integration with Workbox
- **vite-plugin-pwa** - Service worker and manifest generation

### Storage & State
- **IndexedDB** - Client-side persistent storage
- **Svelte Stores** - Reactive state management
- **Service Worker** - Offline caching, auto-updates

### PWA Features
- **Web App Manifest** - Installable with icons
- **Wake Lock API** - Keep screen on during sessions
- **Vibration API** - Haptic feedback for cues
- **Web Audio API** - Exercise timing audio cues

---

## Architecture Overview

### Directory Structure

```
my-pt-pwa/
├── src/
│   ├── routes/                 # SvelteKit pages
│   │   ├── +page.svelte       # Today view (home)
│   │   ├── +layout.svelte     # App shell layout
│   │   ├── journal/           # Session history
│   │   ├── play/              # Session player
│   │   └── settings/          # Settings & management
│   │
│   ├── lib/
│   │   ├── components/        # Reusable UI components (20+)
│   │   ├── stores/            # Svelte stores (state management)
│   │   │   ├── pt.ts         # Main app state store
│   │   │   ├── toast.ts      # Toast notifications
│   │   │   └── pwa.ts        # PWA update handling
│   │   ├── services/          # Business logic
│   │   │   ├── PTService.ts  # Database CRUD operations
│   │   │   └── AudioService.ts # Audio cues management
│   │   ├── types/             # TypeScript type definitions
│   │   │   ├── index.ts      # Barrel export (CANONICAL IMPORT)
│   │   │   ├── exercise.ts   # Exercise types
│   │   │   ├── session.ts    # Session types
│   │   │   └── settings.ts   # Settings types
│   │   └── utils/             # Helper functions
│   │       ├── duration.ts   # Duration formatting
│   │       ├── markdown.ts   # Markdown rendering
│   │       ├── csvExercises.ts # CSV import/export
│   │       └── buildInfo.ts  # Build metadata
│   │
│   ├── app.html               # HTML template
│   └── app.css                # Global styles
│
├── static/                     # Static assets
│   ├── fonts/                 # Material Icons font files
│   ├── pwa-icon.svg          # PWA icon
│   └── manifest.json         # Generated PWA manifest
│
├── _notes/                     # Project documentation
│   ├── my-pt-complete-spec.md # ✅ CANONICAL REFERENCE
│   ├── ARCHITECTURE_REVIEW.md # Architecture assessment
│   ├── WORKFLOW_CHEATSHEET.md # Git workflow guide
│   └── spec-*.md             # Feature specifications
│
├── build/                      # Production build output
├── package.json
├── tsconfig.json
├── vite.config.js
├── svelte.config.js
└── DOCUMENTATION_INDEX.md     # Documentation guide
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────┐
│  UI Components (.svelte files)                      │
│  - User interactions                                │
│  - Event handlers                                   │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│  Svelte Stores (lib/stores/pt.ts)                  │
│  - Reactive state management                        │
│  - Derived stores (computed values)                 │
│  - State: exercises, sessions, settings             │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│  PTService (lib/services/PTService.ts)             │
│  - Business logic                                   │
│  - CRUD operations                                  │
│  - Data validation                                  │
└──────────────────┬──────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────┐
│  IndexedDB                                          │
│  - Persistent local storage                         │
│  - Object stores: exercises, sessionDefinitions,    │
│    sessionInstances, settings, metadata             │
└─────────────────────────────────────────────────────┘
```

### State Management Pattern

**CANONICAL IMPORT PATTERN:**
```typescript
// ✅ CORRECT - Import from stores/pt
import { ptState, ptService } from '$lib/stores/pt';
import { toastStore } from '$lib/stores/toast';

// ✅ CORRECT - Import types from barrel export
import type { Exercise, SessionDefinition, AppSettings } from '$lib/types';

// ❌ WRONG - Don't import types from old path
import type { Exercise } from '$lib/types/pt'; // Old pattern, avoid
```

**Store Usage:**
```typescript
// Read state (reactive)
$: exercises = $ptState.exercises;

// Update state through service
await ptService.createExercise(newExercise);
await ptService.loadData(); // Reloads state from DB
```

---

## Core Data Models

### Exercise
Two types: `duration` (timed) or `reps` (repetition-based)

```typescript
interface Exercise {
  id: number;
  name: string;
  type: 'duration' | 'reps';

  // Duration-based
  defaultDuration?: number; // seconds

  // Reps-based
  defaultReps?: number;
  defaultSets?: number;
  defaultRepDuration?: number; // seconds per rep
  pauseBetweenReps?: number;  // seconds
  restBetweenSets?: number;   // seconds
  sideMode?: 'bilateral' | 'unilateral' | 'alternating';

  instructions?: string;
  dateAdded: string; // ISO date string
}
```

### Session Definition
A named collection of exercises (reusable template)

```typescript
interface SessionDefinition {
  id: number;
  name: string;
  exercises: SessionExercise[]; // References to exercises with overrides
  isDefault: boolean;
  dateCreated: string;
  autoAdvance?: boolean;
  pauseBetweenExercises?: number;
  allowMultiplePerDay?: boolean;
}
```

### Session Instance
A specific performance of a session on a date

```typescript
interface SessionInstance {
  id: number;
  date: string; // YYYY-MM-DD
  sessionDefinitionId: number;
  sessionName: string; // Snapshot
  status: 'planned' | 'in-progress' | 'completed' | 'logged';
  startTime?: string; // ISO
  endTime?: string;
  cumulativeElapsedSeconds?: number;
  completedExercises: CompletedExercise[];
  customized: boolean;
  notes?: string;
  manuallyLogged?: boolean;
}
```

### App Settings
See `DEFAULT_SETTINGS` in `src/lib/services/PTService.ts:51-74` for all settings with defaults.

---

## Development Guidelines

### Code Standards

#### 1. TypeScript Strict Mode
- **Always enabled** via `tsconfig.json`
- No implicit `any` types
- Strict null checks
- Full type coverage required

#### 2. Copyright Headers
**REQUIRED on all `.ts` and `.svelte` files:**

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

#### 3. Import Conventions

```typescript
// ✅ CORRECT - Use SvelteKit aliases
import { ptState, ptService } from '$lib/stores/pt';
import type { Exercise } from '$lib/types';
import { formatDuration } from '$lib/utils/duration';

// ❌ WRONG - Relative imports in src/
import { ptService } from '../../stores/pt';
```

#### 4. File Organization
- **Components:** `src/lib/components/ComponentName.svelte` (PascalCase)
- **Stores:** `src/lib/stores/storeName.ts` (camelCase)
- **Services:** `src/lib/services/ServiceName.ts` (PascalCase for class)
- **Types:** `src/lib/types/category.ts` (lowercase)
- **Utils:** `src/lib/utils/utilName.ts` (camelCase)

#### 5. Naming Conventions
- **Components:** PascalCase (e.g., `ExerciseCard.svelte`)
- **Stores:** camelCase with `Store` suffix (e.g., `toastStore`)
- **Services:** PascalCase class, camelCase instance (e.g., `PTService`, `ptService`)
- **Types:** PascalCase (e.g., `Exercise`, `SessionDefinition`)
- **Functions:** camelCase (e.g., `formatDuration`, `createExercise`)

### Service Layer Rules

#### PTService Singleton Pattern
```typescript
// In PTService.ts - export singleton instance
export const ptService = new PTService();

// Everywhere else - import singleton
import { ptService } from '$lib/stores/pt';

// ❌ NEVER instantiate directly
const service = new PTService(); // WRONG!
```

#### CRUD Operations Pattern
```typescript
// Create
const exercise = await ptService.createExercise({
  name: 'Plank',
  type: 'duration',
  defaultDuration: 60
});

// Read
await ptService.loadData(); // Loads into ptState
const exercises = get(ptState).exercises;

// Update
await ptService.updateExercise(id, updates);

// Delete
await ptService.deleteExercise(id);

// Always reload state after mutations
await ptService.loadData();
```

### Component Guidelines

#### Component Structure
```svelte
<script lang="ts">
  // 1. Imports
  import { ptState, ptService } from '$lib/stores/pt';
  import type { Exercise } from '$lib/types';

  // 2. Props (with defaults)
  export let exercise: Exercise;
  export let compact = false;

  // 3. Local state
  let editing = false;

  // 4. Derived values
  $: displayName = exercise.name.toUpperCase();

  // 5. Functions
  async function handleSave() {
    await ptService.updateExercise(exercise.id, { name: displayName });
    await ptService.loadData();
  }

  // 6. Lifecycle
  import { onMount } from 'svelte';
  onMount(() => {
    console.log('Component mounted');
  });
</script>

<!-- Template -->
<div class="exercise-card">
  <h3>{displayName}</h3>
  <!-- ... -->
</div>

<style>
  /* Scoped styles */
  .exercise-card {
    padding: 1rem;
  }
</style>
```

#### Component Communication
```svelte
<!-- Parent passes data down -->
<ExerciseCard exercise={exercise} on:edit={handleEdit} />

<!-- Child dispatches events up -->
<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('edit', { exerciseId: exercise.id });
  }
</script>
```

### Build Configuration

#### Vite Build Variables
Injected at build time via `vite.config.js`:

```typescript
declare global {
  const __BUILD_ID__: string;       // e.g., "a1b2c3d-20240817143022"
  const __BUILD_TIME__: string;     // ISO timestamp
  const __GIT_BRANCH__: string;     // Current branch
  const __APP_VERSION__: string;    // package.json version
  const __NODE_VERSION__: string;   // Node version used
  const __BUILD_PLATFORM__: string; // OS platform
}

// Usage in code
console.log('Build ID:', __BUILD_ID__);
```

#### PWA Configuration
- **Register Type:** `prompt` (user controls updates)
- **Workbox Strategy:**
  - Navigation: NetworkFirst (3s timeout)
  - Assets: StaleWhileRevalidate (30-day cache)
- **Manifest:** Auto-generated from `vite.config.js`

---

## Common Development Tasks

### Adding a New Exercise Field

1. **Update Type Definition** (`src/lib/types/exercise.ts`)
   ```typescript
   export interface Exercise {
     // ... existing fields
     newField?: string; // Add new field
   }
   ```

2. **Update PTService Default** (`src/lib/services/PTService.ts`)
   - Add to default values in `createExercise` method

3. **Update UI Components**
   - `ExerciseManagementModal.svelte` - Add form field
   - `ExerciseCard.svelte` - Display new field

4. **Migration** (if needed)
   - Increment `DB_VERSION` in PTService
   - Add upgrade handler in `openDatabase()`

### Adding a New Setting

1. **Update Type** (`src/lib/types/settings.ts`)
   ```typescript
   export interface AppSettings {
     // ... existing settings
     newSetting: boolean;
   }
   ```

2. **Update Default** (`src/lib/services/PTService.ts`)
   ```typescript
   const DEFAULT_SETTINGS: AppSettings = {
     // ... existing defaults
     newSetting: false
   };
   ```

3. **Add UI Control** (`src/routes/settings/+page.svelte`)
   - Add toggle/input in appropriate section

4. **Use in Components**
   ```typescript
   $: newSettingValue = $ptState.settings?.newSetting ?? false;
   ```

### Creating a New Component

1. **Create File** (`src/lib/components/NewComponent.svelte`)
2. **Add Copyright Header**
3. **Follow Component Structure Pattern** (see above)
4. **Export if Reusable** (components are auto-discovered)

### Adding a New Route

1. **Create Directory** (`src/routes/new-route/`)
2. **Add Page** (`src/routes/new-route/+page.svelte`)
3. **Update Navigation** (`src/lib/components/BottomTabs.svelte`)
4. **Test Navigation Flow**

---

## Testing & Debugging

**Environment Note:** Build/test commands availability depends on your environment (see [Environment Configuration](#environment-configuration)).

### Development Server

**Environment A (Claude Code Web):**
```bash
npm run dev          # Start dev server at http://localhost:5173
npm run build        # Production build
npm run preview      # Preview production build
npm run check        # TypeScript/Svelte type checking
npm run check:watch  # Type checking in watch mode
```

**Environment B (Code-Server):**
- ❌ **Do not run npm commands** - User (Q) handles builds and testing separately
- ✅ **Generate code only** - Create/modify files, user will test
- ✅ **Read-only git** - Use `git status`, `git diff` to verify changes

### Browser DevTools

#### IndexedDB Inspection
1. Open DevTools → Application → Storage → IndexedDB
2. Expand `MyPT` database
3. Inspect object stores:
   - `exercises`
   - `sessionDefinitions`
   - `sessionInstances`
   - `settings`
   - `metadata`

#### Service Worker Debugging
1. DevTools → Application → Service Workers
2. Check registration status
3. Test offline mode: DevTools → Network → Offline checkbox
4. Clear cache: Application → Clear storage

#### Console Debugging
PTService logs initialization:
```
🏥 Initializing PT Service...
✅ PT Service initialized successfully
```

### Common Issues

#### "Settings not loading"
```typescript
// Check if PTService initialized
console.log('Initialized?', get(ptState).initialized);

// Force reload
await ptService.loadData();
```

#### "Data not persisting"
- Check IndexedDB in DevTools
- Verify not in private/incognito mode
- Check for quota errors in console

#### "Build fails"

**Environment A (Claude Code Web):**
```bash
# Clear cache and reinstall
rm -rf node_modules .svelte-kit build
npm install
npm run build
```

**Environment B (Code-Server):**
- Report the issue to Q with file changes made
- Q will handle build troubleshooting separately

---

## Git Workflow

**Git capabilities differ by environment** (see [Environment Configuration](#environment-configuration)).

### Environment A: Claude Code Web (Full Git)

#### Branch Strategy
- **Main branch:** `main` (production-ready code)
- **Feature branches:** `claude/feature-name-sessionid` (auto-created by Claude)
- **Development flow:** Feature branch → PR → Main

#### Typical Workflow
1. Claude creates feature branch from `main`
2. Make changes, commit, push to feature branch
3. Create PR when feature complete
4. Review and merge PR on GitHub
5. Keep feature branch for continued work in same session
6. Delete branch when chat session archived

#### Git Commands (Full Access)
```bash
# Check status
git status
git branch                    # See current branch

# Switch branches
git checkout main
git checkout claude/feature-branch-name

# Update from remote
git fetch origin
git pull

# Commit and push changes
git add .
git commit -m "Description"
git push -u origin claude/branch-name

# After PR merge, update main
git checkout main
git pull

# Continue work on feature branch
git checkout claude/feature-branch-name
```

### Environment B: Code-Server (Read-Only Git)

#### Workflow
1. **Generate code changes only** - Create/modify/delete files as needed
2. **Use read-only git for context** - Understand current state
3. **Q handles all git operations** - No commits, branches, or pushes

#### Git Commands (Read-Only)
```bash
# ✅ ALLOWED - Read-only operations
git status              # Check current state
git diff               # See changes
git diff --staged      # See staged changes
git log                # View history
git log --oneline -10  # Recent commits
git branch             # List branches
git show <commit>      # Show commit details
git blame <file>       # See file history

# ❌ FORBIDDEN - Write operations
git add .              # Q will do this
git commit             # Q will do this
git push               # Q will do this
git checkout           # Q will switch branches
git merge              # Q will handle merges
```

#### Handoff to Q
When work is complete, provide:
- **Files modified:** List all changed files with paths
- **Changes summary:** What was added/modified/removed
- **Next steps:** What Q should do (test, commit, etc.)
- **Open questions:** Any decisions Q needs to make

**See [_notes/WORKFLOW_CHEATSHEET.md](_notes/WORKFLOW_CHEATSHEET.md) for detailed git workflows (Environment A).**

---

## Deployment

**Note:** Deployment commands are only available in Environment A.

### Environment A: Claude Code Web

#### Static Site Generation
```bash
npm run build
# Outputs to: build/
```

#### Deployment Targets

**GitHub Pages:**
```bash
./deploy.sh
```

**Netlify/Vercel:**
- Build command: `npm run build`
- Publish directory: `build`

**Firebase Hosting:**
```bash
npm run build
firebase deploy
```

#### Environment Variables
```bash
# Optional base path for subdirectory deployment
BASE_PATH=/my-pt-pwa npm run build
```

#### Build Verification
```bash
npm run build        # Ensure clean build
npm run preview      # Test locally
# Open http://localhost:4173
# Test PWA install prompt (requires HTTPS in production)
```

### Environment B: Code-Server

- **Deployment:** Q handles all build and deployment operations
- **Your role:** Generate code changes, Q will test and deploy

---

## Important Files Reference

### Configuration Files
- **package.json** - Dependencies, scripts, project metadata
- **tsconfig.json** - TypeScript configuration (strict mode enabled)
- **vite.config.js** - Build config, PWA settings, build variables
- **svelte.config.js** - SvelteKit config, adapter settings

### Source Files
- **src/app.html** - HTML template (PWA meta tags, fonts)
- **src/app.css** - Global styles, CSS variables, themes
- **src/routes/+layout.svelte** - App shell layout
- **src/lib/services/PTService.ts** - Core data service (850+ lines)
- **src/lib/stores/pt.ts** - Main state management

### Documentation
- **README.md** - User-facing documentation
- **DOCUMENTATION_INDEX.md** - Documentation navigation
- **_notes/my-pt-complete-spec.md** - ✅ CANONICAL SPEC
- **_notes/ARCHITECTURE_REVIEW.md** - Architecture assessment (9/10 score)

### Build Outputs
- **build/** - Production build (gitignored)
- **.svelte-kit/** - SvelteKit internals (gitignored)

---

## Security & Privacy Considerations

### Data Privacy Rules
1. **NO server communication** - All operations must be client-side
2. **NO analytics/tracking** - Don't add any telemetry
3. **NO external API calls** - Everything works offline
4. **User data never leaves device** - Enforce in all features

### Security Best Practices
1. **Input validation** - Sanitize user input in PTService
2. **XSS prevention** - Use Svelte's auto-escaping, sanitize markdown
3. **HTTPS only** - PWA requires HTTPS in production
4. **CSP headers** - Configured via hosting (not in app code)

### Sensitive Operations
- **Export data** - JSON download (client-side only)
- **Import data** - Validate structure before IndexedDB write
- **CSV export/import** - Sanitize exercise data

---

## Performance Considerations

### Bundle Size
- Current: ~200KB (gzipped)
- Keep dependencies minimal
- Tree-shake unused code
- Use dynamic imports for large features

### Runtime Performance
- IndexedDB operations are async (use await)
- Debounce frequent updates (e.g., settings changes)
- Lazy load routes (SvelteKit default)
- Service Worker caches assets (instant loading)

### Mobile Optimization
- Touch targets: minimum 44x44px
- Reduce animations on low-end devices
- Test on real mobile devices
- Wake Lock for session player (prevent screen sleep)

---

## Troubleshooting Guide

### Common Errors

#### "Cannot read property of undefined"
```typescript
// ❌ Unsafe
const duration = $ptState.settings.defaultDuration;

// ✅ Safe with optional chaining
const duration = $ptState.settings?.defaultDuration ?? 60;
```

#### "Store not initialized"
```typescript
// Ensure PTService initialized before use
import { onMount } from 'svelte';

onMount(async () => {
  if (!get(ptState).initialized) {
    await ptService.initialize();
    await ptService.loadData();
  }
});
```

#### "Build errors with types"
```bash
# Run type checker
npm run check

# Fix import paths
import type { Exercise } from '$lib/types'; // ✅
import type { Exercise } from '$lib/types/pt'; // ❌
```

### Debug Checklist
- [ ] Check browser console for errors
- [ ] Verify IndexedDB has data (DevTools → Application)
- [ ] Confirm service worker registered (DevTools → Application)
- [ ] Test in incognito (rules out extension conflicts)
- [ ] Clear service worker cache and reload
- [ ] Run `npm run check` for type errors
- [ ] Check git branch is correct

---

## Resources

### Project Documentation
- **[README.md](README.md)** - Main project docs
- **[DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)** - Doc navigation
- **[_notes/my-pt-complete-spec.md](_notes/my-pt-complete-spec.md)** - Canonical spec
- **[_notes/ARCHITECTURE_REVIEW.md](_notes/ARCHITECTURE_REVIEW.md)** - Architecture guide
- **[_notes/WORKFLOW_CHEATSHEET.md](_notes/WORKFLOW_CHEATSHEET.md)** - Git workflow

### External Documentation
- **SvelteKit:** https://kit.svelte.dev/docs
- **Svelte:** https://svelte.dev/docs
- **TypeScript:** https://www.typescriptlang.org/docs
- **Vite:** https://vitejs.dev/guide/
- **PWA:** https://vite-pwa-org.netlify.app/
- **IndexedDB:** https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

### Community
- **Repository:** https://github.com/NateEaton/my-pt-pwa
- **Issues:** https://github.com/NateEaton/my-pt-pwa/issues
- **License:** GPL-3.0-or-later

---

## Quick Reference Cheat Sheet

### Essential Commands
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run check        # Type checking
git status           # Check git state
git checkout main    # Switch to main branch
```

### Essential Imports
```typescript
// State management
import { ptState, ptService } from '$lib/stores/pt';
import { toastStore } from '$lib/stores/toast';

// Types
import type { Exercise, SessionDefinition, SessionInstance, AppSettings } from '$lib/types';

// Utils
import { formatDuration } from '$lib/utils/duration';
import { parseMarkdown } from '$lib/utils/markdown';
```

### Essential Patterns
```typescript
// Read state
$: exercises = $ptState.exercises;

// Update data
await ptService.createExercise(data);
await ptService.loadData(); // Reload state

// Show toast
toastStore.show('Success!', 'success');

// Dispatch event
dispatch('eventName', { data });
```

---

## Final Notes for AI Assistants

### Before Making Changes
1. **Read the spec:** Check `_notes/my-pt-complete-spec.md` for canonical models
2. **Review architecture:** See `_notes/ARCHITECTURE_REVIEW.md` (9/10 score)
3. **Check conventions:** Follow patterns in existing code
4. **Test thoroughly:** Run `npm run check` and `npm run build`

### When Proposing Features
1. **Privacy first:** Ensure no server communication needed
2. **Offline compatible:** Must work without internet
3. **Mobile optimized:** Test on mobile viewports
4. **Documented:** Update relevant docs in `_notes/`

### When Debugging
1. **Check console:** Browser DevTools console for errors
2. **Inspect IndexedDB:** DevTools → Application → Storage
3. **Review service worker:** DevTools → Application → Service Workers
4. **Run type checker:** `npm run check` catches many issues

### Communication Style
- Be specific about file paths and line numbers
- Explain reasoning for architectural decisions
- Reference existing patterns when suggesting changes
- Ask for clarification on ambiguous requirements

---

**This guide is maintained for AI assistants working with the My PT codebase. Keep it updated as architecture evolves.**
