# **Demo Mode Specification**

**Status:** ✅ IMPLEMENTATION READY
**Last Updated:** 2025-12-09
**Purpose:** Define demo mode implementation for My PT PWA

---

## **1. Goals**

* Provide a dedicated demo experience at `/demo` route
* Load a prebuilt backup into a separate demo database (`MyPT-demo`)
* Prevent demo data from mixing with real user data (in `MyPT` database)
* Allow users to exit demo mode by navigating to `/`
* Provide clear but unobtrusive UI indicators when in demo mode
* Support demo data versioning for future updates

---

## **2. Detection Logic**

### **Trigger**

Demo mode activates when the pathname starts with `/demo`:

```typescript
location.pathname.startsWith('/demo')
```

### **Implementation**

Create utility module `src/lib/utils/demoMode.ts`:

```typescript
/**
 * Detects if app is running in demo mode
 * @returns true if current path is /demo or sub-routes
 */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false; // SSR safety
  return window.location.pathname.startsWith('/demo');
}

export const DEMO_DB_NAME = 'MyPT-demo';
export const NORMAL_DB_NAME = 'MyPT';
export const DEMO_VERSION_KEY = 'myPT-demoVersion';
export const DEMO_BACKUP_URL = '/demo-backup.json';
```

---

## **3. Database Selection**

Use two completely separate IndexedDB instances to prevent data contamination.

| Mode        | Database Name | Usage                                    |
| ----------- | ------------- | ---------------------------------------- |
| Normal Mode | `MyPT`        | User's real therapy data                 |
| Demo Mode   | `MyPT-demo`   | Example data + any demo exploration      |

### **Implementation**

Update `PTService.ts` to select database based on mode:

```typescript
import { isDemoMode, DEMO_DB_NAME, NORMAL_DB_NAME } from '$lib/utils/demoMode';

// In PTService class
private openDatabase(): Promise<IDBDatabase> {
  const dbName = isDemoMode() ? DEMO_DB_NAME : NORMAL_DB_NAME;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, DB_VERSION);
    // ... existing implementation
  });
}
```

**Key Points:**
- Databases are completely independent
- Switching between `/` and `/demo` switches database context
- No cross-contamination between user data and demo data
- Demo changes persist in demo database (users can explore freely)

---

## **4. Demo Data Restore Logic**

### **Trigger Conditions**

Demo data auto-restores only when:
1. User navigates to `/demo` route
2. Demo database is empty OR version mismatch detected

### **Version-Based Loading**

Use version from `demo-backup.json` to allow data updates:

```typescript
// In demo-backup.json structure:
{
  "version": 1,  // Increment this to force fresh demo data load
  "exportDate": "2025-12-09T...",
  "data": {
    "exercises": [...],
    "sessionDefinitions": [...],
    "sessionInstances": [...],
    "settings": {...},
    "metadata": {...}
  }
}
```

### **Implementation**

Create `src/lib/services/DemoService.ts`:

```typescript
import { DEMO_VERSION_KEY, DEMO_BACKUP_URL } from '$lib/utils/demoMode';
import { ptService } from '$lib/stores/pt';

export async function initializeDemoData(): Promise<void> {
  // Fetch demo backup
  const response = await fetch(DEMO_BACKUP_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch demo backup');
  }

  const backup = await response.json();
  const demoVersion = backup.version?.toString() || '1';
  const loadedVersion = localStorage.getItem(DEMO_VERSION_KEY);

  // Check if we need to load demo data
  const needsLoad = !loadedVersion || loadedVersion !== demoVersion;

  if (needsLoad) {
    console.log('🎭 Loading demo data (version ' + demoVersion + ')');

    // Clear existing demo data
    await ptService.clearAllData();

    // Restore demo backup using existing restore logic
    await restoreDemoBackup(backup);

    // Mark version as loaded
    localStorage.setItem(DEMO_VERSION_KEY, demoVersion);

    console.log('✅ Demo data loaded');
  } else {
    console.log('🎭 Demo data already loaded (version ' + demoVersion + ')');
  }
}

async function restoreDemoBackup(backup: any): Promise<void> {
  // Use existing restore logic from RestoreModal.svelte
  // (extract to shared utility or reuse PTService methods)
  // ... implementation details
}
```

### **When to Run**

Call `initializeDemoData()` during app initialization when in demo mode:

```typescript
// In +layout.svelte or PTService initialization
if (isDemoMode()) {
  await initializeDemoData();
}
```

---

## **5. Routing Structure**

### **Route Files**

```
src/routes/
  +layout.svelte          # Main layout (normal mode)
  +page.svelte            # Today view (normal mode)
  journal/
    +page.svelte          # Journal (normal mode)
  settings/
    +page.svelte          # Settings (normal mode)
  play/
    +page.svelte          # Session player (normal mode)

  demo/
    +layout.svelte        # Demo layout with banner (demo mode)
    +page.svelte          # Today view (demo mode) - reuse main page
    journal/
      +page.svelte        # Journal (demo mode) - reuse main page
    settings/
      +page.svelte        # Settings (demo mode) - reuse main page
    play/
      +page.svelte        # Session player (demo mode) - reuse main page
```

### **Demo Route Behavior**

**`/demo/*` routes:**
- Use `MyPT-demo` database
- Show demo banner on main pages
- Show watermark on session player
- Exit Demo button navigates to corresponding `/` route

**`/*` routes (normal):**
- Use `MyPT` database
- No demo indicators
- Standard app behavior

### **Navigation Examples**

| User Action                        | Result                              |
| ---------------------------------- | ----------------------------------- |
| Navigate to `/demo`                | Loads demo DB, shows banner         |
| Click "Exit Demo" from `/demo`     | Navigate to `/`, loads normal DB    |
| Go back to `/demo` later           | Loads demo DB with prior changes    |
| Navigate to `/demo/play`           | Shows watermark during session      |
| Manually type `/demo/journal`      | Works normally with demo data       |

---

## **6. UI Indicators**

### **Main Pages Banner**

Display on all main pages EXCEPT modals/dialogs:

**Show banner on:**
- Today view (`/demo`)
- Journal (`/demo/journal`)
- Settings (`/demo/settings`)

**Do NOT show banner:**
- Inside modals (BackupModal, RestoreModal, ExerciseModal, etc.)
- Session player (`/demo/play`) - use watermark instead

**Banner Design:**
```
┌─────────────────────────────────────────────────┐
│ Demo Mode: Example data only     [Exit Demo]   │
└─────────────────────────────────────────────────┘
```

**Specifications:**
- Height: 32px
- Background: `#f5f5f5` (light grey)
- Text color: `#666` (medium grey)
- Font size: 14px
- Exit Demo button: Primary color, links to `/`
- Positioned above bottom tabs navigation
- Persists during scroll (sticky or fixed)

**Component:** `src/lib/components/DemoBanner.svelte`

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';

  function exitDemo() {
    // Navigate to corresponding normal route
    const currentPath = window.location.pathname;
    const normalPath = currentPath.replace(/^\/demo/, '') || '/';
    goto(normalPath);
  }
</script>

<div class="demo-banner">
  <span class="demo-text">Demo Mode: Example data only</span>
  <button class="exit-btn" on:click={exitDemo}>Exit Demo</button>
</div>

<style>
  .demo-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 32px;
    padding: 0 var(--spacing-md);
    background-color: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
  }

  .demo-text {
    font-size: 14px;
    color: #666;
  }

  .exit-btn {
    padding: 4px 12px;
    font-size: 13px;
    color: var(--primary-color);
    background: transparent;
    border: 1px solid var(--primary-color);
    border-radius: 4px;
    cursor: pointer;
  }

  .exit-btn:hover {
    background-color: var(--primary-alpha-10);
  }
</style>
```

### **Session Player Watermark**

During session playback (`/demo/play`), show unobtrusive watermark:

**Watermark Design:**
- Text: "DEMO"
- Position: Top-right corner
- Font size: 12px
- Color: White with 30% opacity
- Background: None (transparent)
- Z-index: High (above player UI)

**Component:** `src/lib/components/DemoWatermark.svelte`

```svelte
<div class="demo-watermark">DEMO</div>

<style>
  .demo-watermark {
    position: fixed;
    top: 16px;
    right: 16px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.3);
    font-weight: 600;
    z-index: 9999;
    pointer-events: none;
    user-select: none;
  }
</style>
```

---

## **7. Reset Demo (Not Implemented)**

**Decision:** No dedicated "Reset Demo" feature in initial implementation.

**Rationale:**
- Demo data persists across sessions (users can explore freely)
- Returning to `/demo` shows their prior demo exploration
- If user wants fresh demo, they can clear browser data manually

**Future Enhancement:** Could add "Reset Demo to Original" button in Settings (demo mode only) if needed.

---

## **8. Service Worker Configuration**

Add `demo-backup.json` to precache manifest for offline support.

### **Update `vite.config.js`**

```javascript
VitePWA({
  // ... existing config
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
    additionalManifestEntries: [
      { url: '/demo-backup.json', revision: null } // Cache-bust via version in file
    ]
  }
})
```

This ensures:
- Demo mode works offline after first load
- `demo-backup.json` is cached by service worker
- Users can explore demo without network after installation

---

## **9. Implementation Checklist**

### **Phase 1: Core Infrastructure**
- [ ] Create `src/lib/utils/demoMode.ts` with detection logic
- [ ] Update `PTService.ts` to select database based on mode
- [ ] Create `src/lib/services/DemoService.ts` with restore logic
- [ ] Extract restore logic to shared utility (from `RestoreModal.svelte`)

### **Phase 2: Routing**
- [ ] Create `src/routes/demo/+layout.svelte` with demo banner
- [ ] Create `src/routes/demo/+page.svelte` (reuse main Today view)
- [ ] Create `src/routes/demo/journal/+page.svelte` (reuse main Journal)
- [ ] Create `src/routes/demo/settings/+page.svelte` (reuse main Settings)
- [ ] Create `src/routes/demo/play/+page.svelte` (reuse player with watermark)

### **Phase 3: UI Components**
- [ ] Create `src/lib/components/DemoBanner.svelte`
- [ ] Create `src/lib/components/DemoWatermark.svelte`
- [ ] Update play page to conditionally show watermark in demo mode

### **Phase 4: Integration**
- [ ] Update app initialization to call `initializeDemoData()` when in demo mode
- [ ] Update service worker config to cache demo backup
- [ ] Add demo-backup.json to `/static` directory (provided by user)

### **Phase 5: Testing**
- [ ] Test demo mode database separation
- [ ] Test version-based loading (update version, verify reload)
- [ ] Test navigation between demo and normal modes
- [ ] Test demo works offline after first load
- [ ] Test Exit Demo button functionality
- [ ] Verify no cross-contamination between databases

---

## **10. Technical Notes**

### **Database Isolation**

```
IndexedDB Browser Storage:
├── MyPT (normal mode)
│   ├── exercises
│   ├── sessionDefinitions
│   ├── sessionInstances
│   ├── settings
│   └── metadata
│
└── MyPT-demo (demo mode)
    ├── exercises
    ├── sessionDefinitions
    ├── sessionInstances
    ├── settings
    └── metadata

localStorage:
├── myPT-demoVersion: "1"  (version of loaded demo data)
└── [other app settings]
```

### **User Experience Flow**

**First-time demo user:**
1. Visits `/demo`
2. App detects demo mode
3. Creates `MyPT-demo` database
4. Fetches `/demo-backup.json`
5. Restores demo data
6. Stores version in localStorage
7. Shows demo banner
8. User explores demo

**Returning demo user:**
1. Visits `/demo` again
2. App detects demo mode
3. Opens existing `MyPT-demo` database
4. Checks version (matches, no reload needed)
5. Shows demo with prior exploration intact

**Demo data update (version bump):**
1. Developer updates `demo-backup.json` version field
2. User visits `/demo`
3. App detects version mismatch
4. Clears old demo data
5. Restores new demo data
6. Updates localStorage version

### **Error Handling**

```typescript
// In DemoService.ts
try {
  await initializeDemoData();
} catch (error) {
  console.error('Failed to initialize demo data:', error);
  toastStore.show('Demo mode unavailable', 'error');
  // Optionally redirect to normal mode
  goto('/');
}
```

---

## **11. Future Enhancements**

**Not in initial implementation, consider for future:**

1. **Reset Demo Button**
   - In Settings page (demo mode only)
   - Clears demo database and reloads original data
   - Useful for users who want fresh demo experience

2. **Demo Introduction Modal**
   - First-time demo users see welcome message
   - Explains demo mode features
   - One-time display (localStorage flag)

3. **Demo Analytics**
   - Track demo usage (privacy-respecting)
   - Understand which features users explore
   - Requires opt-in and privacy considerations

4. **Multiple Demo Scenarios**
   - `/demo/beginner` - Simple demo data
   - `/demo/advanced` - Complex demo data
   - Different use cases showcased

5. **Demo Tour/Tooltips**
   - Guided walkthrough of features
   - Contextual tips during demo exploration

---

## **12. Success Criteria**

Demo mode implementation is successful when:

- ✅ Users can access demo at `/demo` route
- ✅ Demo data loads automatically on first visit
- ✅ Demo database completely separate from real data
- ✅ Clear visual indicators (banner/watermark) shown
- ✅ Exit Demo button navigates cleanly to normal mode
- ✅ Demo works offline after initial load
- ✅ Version updates trigger fresh demo data load
- ✅ No performance impact on normal mode
- ✅ Mobile-friendly banner and watermark design

---

**End of Specification**
