# User Guide & About Dialog - Architecture Proposal

**Status:** ✅ IMPLEMENTED
**Implementation Date:** November 2024
**Related Commit:** 11bdc84
**Notes:** User Guide and About dialog completed with comprehensive content integrated into Settings page.

## Executive Summary

This document proposes the architecture for adding in-app user guide and About dialog to My PT PWA, based on analysis of Ca-pwa's implementation and My PT's current bottom-tab navigation paradigm.

**Recommendation:** Use a **hybrid approach** - Settings-integrated access with modal dialogs, not full routes.

---

## Current State Analysis

### My PT Architecture
- **Navigation:** Fixed 3-tab bottom navigation (Today | Journal | Settings)
- **Mobile-first:** Centered layout, max-width 480px
- **Modal Pattern:** Already using Modal.svelte for all dialogs
- **No Menu:** No hamburger menu or slideout navigation

### Ca-pwa Architecture
- **Navigation:** Hamburger menu with slideout drawer
- **Full Routes:** Guide is `/guide` route, About is `AboutDialog.svelte` component
- **Access Pattern:** Menu items for both Guide and About
- **Content Pattern:** Guide uses `<details>` accordion sections

---

## Architectural Decision

### ❌ What Won't Work for My PT

**1. Adding a 4th Bottom Tab for "Guide"**
- **Problem:** Bottom tabs should be limited to 3-4 primary destinations
- **Issue:** Guide/About are secondary/tertiary features
- **UX Impact:** Clutters primary navigation

**2. Full Route Pages (/guide, /about)**
- **Problem:** Breaks the 3-tab mental model
- **Issue:** How do users get back? Need back button
- **Inconsistency:** Everything else uses modals

**3. Hamburger Menu (Like Ca-pwa)**
- **Problem:** Adds navigation complexity
- **Issue:** My PT deliberately uses simple 3-tab navigation
- **Overhead:** Would need Header.svelte refactor

### ✅ Recommended Approach

**Settings Page Integration with Full-Screen Modals**

Access both Guide and About from the Settings page as prominent buttons/sections that open full-screen modals.

---

## Proposed Implementation

### 1. File Structure

```
src/
├── lib/
│   └── components/
│       ├── Modal.svelte                    (existing)
│       ├── GuideDialog.svelte              (NEW - full-screen modal)
│       └── AboutDialog.svelte              (NEW - full-screen modal)
├── routes/
│   └── settings/
│       └── +page.svelte                    (modify - add buttons)
```

### 2. Settings Page Layout

Add a new "Help & About" section to Settings page:

```svelte
<!-- Settings page: src/routes/settings/+page.svelte -->

<div class="settings-section">
  <h3 class="section-title">Help & About</h3>

  <button class="settings-button" on:click={() => showGuideDialog = true}>
    <span class="material-icons">help</span>
    <div class="button-content">
      <span class="button-label">User Guide</span>
      <span class="button-description">
        Learn how to use My PT effectively
      </span>
    </div>
    <span class="material-icons chevron">chevron_right</span>
  </button>

  <button class="settings-button" on:click={() => showAboutDialog = true}>
    <span class="material-icons">info</span>
    <div class="button-content">
      <span class="button-label">About</span>
      <span class="button-description">
        Version, credits, and build information
      </span>
    </div>
    <span class="material-icons chevron">chevron_right</span>
  </button>
</div>

{#if showGuideDialog}
  <GuideDialog on:close={() => showGuideDialog = false} />
{/if}

{#if showAboutDialog}
  <AboutDialog on:close={() => showAboutDialog = false} />
{/if}
```

**Visual Position:** Place this section between "App Settings" and "Data Management" in Settings page.

---

## Component Design

### GuideDialog.svelte

**Pattern:** Full-screen modal (like Ca-pwa's AboutDialog) with scrollable content

**Structure:**
```svelte
<Modal fullScreen={true} title="User Guide" on:close>
  <div class="guide-content">
    <!-- Accordion sections using <details> -->
    <details class="guide-section">
      <summary>Getting Started</summary>
      <div class="section-content">...</div>
    </details>

    <details class="guide-section">
      <summary>Tracking Sessions</summary>
      <div class="section-content">...</div>
    </details>

    <!-- More sections... -->
  </div>
</Modal>
```

**Content Sections (Recommended):**
1. **Getting Started**
   - Setting up your first session
   - Understanding exercises
   - Daily workflow overview

2. **Tracking Sessions**
   - Creating custom sessions
   - Playing/timing sessions
   - Pausing and resuming
   - Manual logging

3. **Managing Exercises**
   - Adding exercises
   - Duration vs reps-based exercises
   - Default session exercises
   - Editing and deleting

4. **Journal & History**
   - Viewing past sessions
   - Editing journal entries
   - Filtering by date
   - Statistics overview

5. **Customization & Settings**
   - Timing preferences
   - Theme settings
   - Sound controls
   - Sorting preferences

6. **Data Management**
   - Backup and restore
   - Export functionality
   - Privacy considerations

**Style:** Reuse Ca-pwa's accordion pattern (proven, familiar to you)

---

### AboutDialog.svelte

**Pattern:** Full-screen modal with app information

**Structure:**
```svelte
<Modal fullScreen={true} title="About My PT" on:close>
  <div class="about-content">
    <div class="app-info">
      <h3>My PT</h3>
      <p>A simple, privacy-focused app to track physical therapy exercises</p>
    </div>

    <div class="features-section">
      <h4>Features</h4>
      <ul>
        <li>Track duration and rep-based exercises</li>
        <li>Create custom sessions and routines</li>
        <li>Audio cues and timer support</li>
        <li>Privacy-first - all data stored locally</li>
        <li>Full offline support as a PWA</li>
        <li>Backup and restore your data</li>
      </ul>
    </div>

    <div class="version-info">
      <p>Version {appVersion} • Built with ❤️ for better health</p>
    </div>

    <div class="build-info">
      <span>Build: {buildId}</span>
      <span>Date: {buildTime}</span>
    </div>

    <div class="license-info">
      <p>Licensed under GNU GPL v3</p>
      <a href="https://github.com/NateEaton/my-pt-pwa">View on GitHub</a>
    </div>
  </div>
</Modal>
```

**Build Info:** Leverage existing build metadata from `vite.config.js` (already injected)

---

## User Experience Flow

### Discovery Path
```
User opens app
  └→ Taps Settings tab
      └→ Scrolls to "Help & About" section
          ├→ Taps "User Guide" → Full-screen guide opens
          └→ Taps "About" → Full-screen about opens
```

### First-Time User Experience (Optional Enhancement)

**Option 1: Welcome Modal (Recommended for v1)**
```javascript
// In +layout.svelte, check if first visit
onMount(async () => {
  const hasSeenWelcome = localStorage.getItem('pt-welcome-shown');
  if (!hasSeenWelcome) {
    showWelcomeModal = true;
    localStorage.setItem('pt-welcome-shown', 'true');
  }
});
```

**Welcome Modal Content:**
- Brief intro (2-3 sentences)
- "Get Started" button → Closes modal
- "View Guide" button → Opens GuideDialog

**Option 2: Contextual Tips (Future Enhancement)**
- Add `?` icon next to key features
- Shows tooltip on first interaction
- Dismissible, never shows again

---

## Technical Implementation Details

### 1. Modal.svelte Enhancement

**Current:** Modal supports `fullScreen` prop but has mobile bottom-sheet behavior

**Needed:** Ensure full-screen modals work well for Guide/About

**Changes:**
```svelte
<!-- Modal.svelte -->
<script>
  export let fullScreen = false;
  export let scrollable = true; // NEW: for long-form content
</script>

<div class="modal-container"
     class:full-screen={fullScreen}
     class:scrollable={scrollable}>
  <!-- ... -->
</div>

<style>
  .modal-container.scrollable .modal-body {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch; /* iOS smooth scrolling */
  }

  .modal-container.full-screen {
    max-height: 100vh;
    height: 100%;
  }
</style>
```

### 2. Build Information Utility

**Create:** `src/lib/utils/buildInfo.ts`

```typescript
export function getBuildInfo() {
  return {
    appVersion: __APP_VERSION__,
    buildId: __BUILD_ID__,
    buildTime: __BUILD_TIME__,
    gitBranch: __GIT_BRANCH__,
    platform: __BUILD_PLATFORM__,
    nodeVersion: __NODE_VERSION__
  };
}

export function getShortBuildId(): string {
  const buildId = __BUILD_ID__;
  return buildId.split('-')[0].substring(0, 8);
}

export function getFormattedBuildTime(): string {
  const buildTime = __BUILD_TIME__;
  return new Date(buildTime).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
```

**These are already injected by your `vite.config.js`!**

### 3. Settings Page Modifications

**Add to:** `src/routes/settings/+page.svelte`

**Section Position:** After "App Settings" section, before "Data" section

**State Management:**
```svelte
<script lang="ts">
  let showGuideDialog = false;
  let showAboutDialog = false;
</script>
```

**Styling:** Reuse existing `.settings-section` and button styles

---

## Content Strategy

### Guide Content - Outline

**Tone:** Friendly, conversational, concise
**Format:** Short paragraphs, bulleted lists, inline icons
**Length:** Each section = 3-5 short paragraphs max

**Sections:**

1. **Getting Started** (Collapsed by default: No, show first)
   - What is My PT?
   - Setting up your first session
   - Your first tracked session

2. **Tracking Sessions**
   - Playing a session
   - Understanding the timer
   - Pausing and resuming
   - Manually logging sessions

3. **Managing Exercises**
   - Adding new exercises
   - Duration vs reps exercises
   - Editing exercise defaults
   - Deleting exercises

4. **Custom Sessions**
   - Creating session definitions
   - Adding exercises to sessions
   - Setting as default session
   - Managing multiple sessions

5. **Journal & History**
   - Viewing past sessions
   - Session statistics
   - Editing journal entries
   - Deleting entries

6. **Settings & Customization**
   - Timing preferences
   - Theme selection
   - Sound settings
   - Exercise sorting

7. **Data Management**
   - Backup your data
   - Restore from backup
   - Privacy & data storage
   - Export functionality

**Visual Elements:**
- Use `<span class="material-icons inline-icon">icon_name</span>` for UI references
- Use `<strong>` for button/feature names
- Use blockquotes for tips: `> **Tip:** Message here`

### About Content - Structure

**App Description:**
"My PT is a simple, privacy-focused Progressive Web App designed to help you track physical therapy exercises and maintain consistent rehabilitation routines. All your data stays private and secure on your device."

**Features List:**
- Track duration-based and rep-based exercises
- Create custom exercise routines (sessions)
- Built-in timer with audio cues
- Pause and resume sessions
- View exercise history and statistics
- Customize timing, sounds, and theme
- Backup and restore your data
- Works offline as a PWA
- Privacy-first - no accounts, no tracking

**Credits/License:**
- Copyright year and name
- GPL v3 license
- Link to GitHub repository
- Build information

---

## Responsive Design Considerations

### Desktop (> 480px)
- Guide dialog: Centered modal, max-width 600px
- About dialog: Centered modal, max-width 500px
- Scrollable content within modal

### Mobile (≤ 480px)
- Both dialogs: Full-screen overlays
- Back button in header (arrow_back icon)
- Bottom padding for safe areas
- Smooth scrolling

### Accessibility
- ARIA labels on all buttons
- Keyboard navigation (Tab, Escape)
- Focus management (already in Modal.svelte)
- Screen reader friendly headings

---

## Implementation Phases

### Phase 1: Core Infrastructure (This session)
- [ ] Create `GuideDialog.svelte` skeleton
- [ ] Create `AboutDialog.svelte` skeleton
- [ ] Create `buildInfo.ts` utility
- [ ] Add Help & About section to Settings page
- [ ] Test modal opening/closing

### Phase 2: About Dialog Content (This session)
- [ ] Add app description
- [ ] Add features list
- [ ] Add build information display
- [ ] Add license/credits
- [ ] Style and polish

### Phase 3: Guide Content - Basic (Next session)
- [ ] Write Getting Started section
- [ ] Write Tracking Sessions section
- [ ] Write Managing Exercises section
- [ ] Basic styling with accordion

### Phase 4: Guide Content - Complete (Future)
- [ ] Write Custom Sessions section
- [ ] Write Journal section
- [ ] Write Settings section
- [ ] Write Data Management section
- [ ] Add screenshots/visuals (optional)

### Phase 5: First-Time Experience (Future)
- [ ] Create welcome modal
- [ ] Add localStorage tracking
- [ ] Test onboarding flow

### Phase 6: Polish & Enhancements (Future)
- [ ] Add contextual help icons (?)
- [ ] Add tooltips
- [ ] Search within guide (advanced)
- [ ] Print-friendly guide (advanced)

---

## Alternative Approaches Considered

### Alt 1: Header Menu Icon
**Approach:** Add "?" icon to Today page header
**Pros:** Discoverable, always accessible
**Cons:** Clutters header, breaks clean design
**Decision:** ❌ Rejected - Settings integration is cleaner

### Alt 2: Floating Help Button
**Approach:** Floating "?" FAB on all pages
**Pros:** Always visible
**Cons:** Obstructs content, feels cluttered
**Decision:** ❌ Rejected - Not minimal enough

### Alt 3: In-App Tutorial Overlay
**Approach:** First-time walkthrough with highlights
**Pros:** Interactive onboarding
**Cons:** Complex to build, can be annoying
**Decision:** 🔄 Consider for future v2

---

## Success Metrics

**Discoverability:**
- Users can find guide within 30 seconds from Settings page
- About dialog clearly shows version and build info

**Usability:**
- Guide sections load instantly (< 100ms)
- All content readable on 320px screens
- Scroll performance smooth on mobile

**Maintainability:**
- Guide content easy to update (markdown-like format)
- Build info auto-updates from vite.config.js
- Reuses existing Modal component

---

## Migration from Ca-pwa

**What to Reuse:**
1. ✅ `<details>` accordion pattern for Guide
2. ✅ AboutDialog full-screen layout
3. ✅ Build info display pattern
4. ✅ Features list structure
5. ✅ CSS styling for guide sections

**What to Adapt:**
1. 🔄 Remove route-based navigation (use modals)
2. 🔄 Remove hamburger menu references
3. 🔄 Simplify header (no back button needed - use Modal's close)
4. 🔄 Update content for PT app specifics
5. 🔄 Remove sync-related feature flags (not applicable yet)

**What's New:**
1. ✨ Settings page integration
2. ✨ Simpler access pattern
3. ✨ Consistent with My PT's navigation paradigm

---

## Questions to Resolve

1. **Welcome Modal:** Should we show a welcome modal on first app launch?
   - **Recommendation:** Yes, but simple - just "Welcome to My PT" + link to guide

2. **Guide Auto-Open:** Should guide open automatically for first-time users?
   - **Recommendation:** No - let welcome modal offer it as optional

3. **Guide State:** Should we remember which guide sections were expanded?
   - **Recommendation:** No - keep stateless for simplicity

4. **About Auto-Update Check:** Should About show "Update Available"?
   - **Recommendation:** Future enhancement - service worker already handles updates

5. **Print Guide:** Should users be able to print the guide?
   - **Recommendation:** Future enhancement - add print stylesheet

---

## Conclusion

**Recommended Architecture:**
- ✅ Settings page integration
- ✅ Full-screen modal dialogs
- ✅ Reuse existing Modal component
- ✅ Accordion-style guide content
- ✅ Build info integration

**Next Steps:**
1. Create `GuideDialog.svelte` and `AboutDialog.svelte` components
2. Add Help & About section to Settings page
3. Implement build info utility
4. Write initial guide content
5. Test on mobile and desktop

**Estimated Effort:**
- Phase 1 (Infrastructure): 1-2 hours
- Phase 2 (About Dialog): 30 minutes
- Phase 3 (Basic Guide): 2-3 hours
- Total: ~4-6 hours for MVP

---

**Author:** Claude Code
**Date:** 2025-11-15
**Status:** Proposal - Awaiting Approval
