# PWA Auto-Update Implementation Specification

**Status:** ✅ IMPLEMENTED
**Implementation Date:** November 2024
**Related Commits:** 096581f, 00fc8c4
**Notes:** PWA auto-update with silent installation successfully implemented. App now automatically activates new service worker versions with toast notifications.

---

### Overview

Convert from manual prompt-based updates to silent auto-updates. The app will automatically activate new service worker versions, with a simple toast notification informing users when a new version has been loaded.

---

### Changes Required

#### 1. vite.config.js - Simplify PWA Configuration

**Location:** `vite.config.js`, within the `VitePWA({...})` block

**Change:** Remove `skipWaiting` and `clientsClaim` from workbox config. These are only needed when you want to force-activate a waiting SW. With true auto-update, the plugin handles this automatically.

```javascript
// BEFORE
VitePWA({
  registerType: "autoUpdate",
  workbox: {
    cleanupOutdatedCaches: true,
    skipWaiting: true,
    clientsClaim: true,
    // ... rest
  },
  // ...
})

// AFTER
VitePWA({
  registerType: "autoUpdate",
  workbox: {
    cleanupOutdatedCaches: true,
    // Remove skipWaiting and clientsClaim
    globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
    // ... rest unchanged
  },
  // ...
})
```

---

#### 2. src/lib/stores/pwa.ts - Simplify Stores

**Change:** Remove the update function store since we won't need manual triggering.

```typescript
// BEFORE
import { writable } from 'svelte/store';

export const pwaUpdateAvailable = writable<boolean>(false);
export const pwaUpdateFunction = writable<(() => Promise<void>) | null>(null);
export const pwaOfflineReady = writable<boolean>(false);

// AFTER
import { writable } from 'svelte/store';

/**
 * Store to track if the app was just updated (for showing notification)
 */
export const pwaJustUpdated = writable<boolean>(false);

/**
 * Store to track if the app is ready for offline use
 */
export const pwaOfflineReady = writable<boolean>(false);
```

---

#### 3. src/routes/+layout.svelte - Simplified Registration

**Change:** Replace the complex needRefresh/updateServiceWorker logic with simple auto-update callbacks.

**In the `<script>` section, replace the PWA registration block:**

```javascript
// BEFORE (the entire PWA block starting with "if (typeof window !== 'undefined')")

// AFTER
if (typeof window !== "undefined") {
  const { useRegisterSW } = await import("virtual:pwa-register/svelte");

  useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      console.log('Service worker registered:', swUrl);
      // Check for updates periodically (every hour)
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
    },
    onOfflineReady() {
      console.log('App is ready to work offline');
      pwaOfflineReady.set(true);
      toastStore.show('App is ready to work offline!', 'success');
    },
    onNeedRefresh() {
      // With autoUpdate, this triggers automatic update
      // The page will reload automatically when the new SW activates
      console.log('New version available, updating...');
    }
  });

  // Listen for when a new service worker takes control
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    // New SW has taken control - this happens after auto-update
    pwaJustUpdated.set(true);
    toastStore.show('App updated to latest version!', 'success');
  });
}
```

**Also update the imports at the top:**

```javascript
// Change this import
import { pwaUpdateAvailable, pwaUpdateFunction, pwaOfflineReady } from "$lib/stores/pwa";

// To this
import { pwaJustUpdated, pwaOfflineReady } from "$lib/stores/pwa";
```

---

#### 4. src/routes/settings/+page.svelte - Remove Manual Update UI

**Changes:**

**A. Remove imports no longer needed:**
```javascript
// Remove these from imports
import { pwaUpdateAvailable, pwaUpdateFunction } from '$lib/stores/pwa';
```

**B. Remove these variables and functions entirely:**
```javascript
// DELETE all of this:
let checkingForUpdate = false;
let updateCheckTimeout: number | undefined;

$: if (checkingForUpdate && $pwaUpdateAvailable) {
  // ... entire reactive block
}

async function checkForUpdate() {
  // ... entire function
}

async function installUpdate() {
  // ... entire function
}
```

**C. Replace the "Check for Updates" card with a simpler version:**

```svelte
<!-- BEFORE: The update card with conditional logic -->

<!-- AFTER: Simple info-only card -->
<div class="settings-card" on:click={() => toastStore.show('Updates install automatically when available', 'info')}>
  <div class="card-icon">
    <span class="material-icons">system_update</span>
  </div>
  <div class="card-content">
    <h3>App Updates</h3>
    <p>Updates install automatically</p>
  </div>
  <div class="card-arrow">
    <span class="material-icons">info</span>
  </div>
</div>
```

---

### Testing Steps

1. **Build and deploy** a new version
2. **Open the app** in browser (should load old cached version initially)
3. **Wait or navigate** - within seconds, the new SW should install and activate
4. **Observe toast** - "App updated to latest version!" should appear
5. **Check About dialog** - build ID should show new version
6. **Verify offline** - put device in airplane mode, app should still work

### Optional Enhancement

If you want users to be able to manually trigger an update check (even though it's automatic), you could add a simple button that calls `registration.update()`. But for most users, the automatic hourly check plus check-on-page-load should be sufficient.

---

### Summary of Files to Modify

| File | Change |
|------|--------|
| `vite.config.js` | Remove `skipWaiting` and `clientsClaim` |
| `src/lib/stores/pwa.ts` | Replace stores with simpler version |
| `src/routes/+layout.svelte` | Simplified SW registration with `controllerchange` listener |
| `src/routes/settings/+page.svelte` | Remove manual update UI, add info-only card |