# Material Symbols Migration Plan
## My PT PWA - Complete Refactoring Strategy

**Document Version:** 1.0
**Date:** 2025-11-24
**Status:** Planning Phase

---

## Executive Summary

This document outlines the complete strategy for migrating My PT PWA from **Material Icons v143** (classic icon font, no longer updated) to **Material Symbols** (modern variable font system, actively maintained by Google).

### Key Benefits of Migration

- **Active Maintenance**: Material Symbols is Google's current icon system (introduced April 2022)
- **Variable Font Technology**: Single font file with customizable weight, fill, grade, and optical size
- **More Icons**: Access to newer icons not available in Material Icons v143
- **Better Performance**: Smaller file sizes with variable font format
- **Future-Proof**: Ongoing updates and new icon additions

### Migration Complexity

- **Scope**: 67 unique icons across 16 files with 130+ instances
- **Risk Level**: Medium (CSS changes required, potential alignment issues)
- **Estimated Effort**: 2-4 hours
- **User Impact**: None (if properly tested)

---

## Current State Analysis

### Font Configuration

**Current Setup** ([app.css:12-21](src/app.css#L12-L21)):
```css
@font-face {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: 400;
  src: url('/fonts/material-icons-v143-latin-regular.woff2') format('woff2'),
       url('/fonts/material-icons-v143-latin-regular.woff') format('woff'),
       url('/fonts/material-icons-v143-latin-regular.ttf') format('truetype');
  font-display: block;
}
```

**Font Files** (static/fonts/):
- `material-icons-v143-latin-regular.woff2` (128 KB)
- `material-icons-v143-latin-regular.woff` (165 KB)
- `material-icons-v143-latin-regular.ttf` (357 KB)
- `material-icons-v143-latin-regular.eot` (147 KB)
- `material-icons-v143-latin-regular.svg` (1.4 KB)

**Total Size**: ~798 KB (multiple format files)

### CSS Class Definition

**Current** ([app.css:118-133](src/app.css#L118-L133)):
```css
.material-icons {
  font-family: 'Material Icons';
  font-weight: normal;
  font-style: normal;
  font-size: var(--icon-size-md);
  display: inline-block;
  line-height: 1;
  text-transform: none;
  letter-spacing: normal;
  word-wrap: normal;
  white-space: nowrap;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
  vertical-align: middle;
}
```

### Icon Size Variables

```css
--icon-size-sm: 1rem;      /* 16px */
--icon-size-md: 1.25rem;   /* 20px */
--icon-size-lg: 1.5rem;    /* 24px */
--icon-size-xl: 2rem;      /* 32px */
```

---

## Complete Icon Inventory

### All 67 Unique Icons Currently Used

1. `add` - Add/create actions
2. `arrow_back` - Back navigation
3. `arrow_downward` - Move down/sort
4. `arrow_upward` - Move up/sort
5. `autorenew` - Auto-advance toggle (active state)
6. `backup` - Backup data
7. `bedtime` - Rest period indicator
8. `book` - Journal/documentation
9. `celebration` - Completion celebration
10. `check` - Mark complete
11. `check_circle` - Success/completed status
12. `chevron_left` - Navigate previous
13. `chevron_right` - Navigate next/disclosure
14. `circle` - Default status indicator
15. `close` - Close/dismiss
16. `cloud_off` - Offline capability
17. `code` - Open source indicator
18. `delete` - Delete actions
19. `devices` - Audio device settings
20. `download` - Download/export
21. `edit_note` - Manual entry indicator
22. `error` - Error notifications
23. `event_busy` - No sessions
24. `exit_to_app` - Exit/save
25. `expand_less` - Collapse
26. `expand_more` - Expand
27. `fitness_center` - Exercise/workout (general)
28. `folder` - Data management
29. `help_outline` - Help/guide
30. `hourglass_empty` - Loading state
31. `info` - Information
32. `lightbulb` - Tips/hints
33. `lock` - Privacy/security
34. `notifications_active` - Notifications
35. `palette` - Theme/appearance
36. `pause` - Pause action
37. `pending` - In-progress status
38. `play_arrow` - Play action
39. `play_circle` - Start session
40. `playlist_add` - Add session
41. `playlist_play` - Session/playlist
42. `preview` - Preview action
43. `radio_button_unchecked` - Pending status
44. `refresh` - Refresh/update
45. `repeat` - Reps/sets indicator
46. `replay` - Replay session
47. `restore` - Restore data
48. `rocket_launch` - Launch/start
49. `schedule` - Scheduled status
50. `search` - Search functionality
51. `search_off` - No search results
52. `self_improvement` - PT/personal development
53. `settings` - Settings/configuration
54. `skip_next` - Skip/advance
55. `skip_previous` - Previous in sequence
56. `stop` - Stop action
57. `stop_circle` - Auto-advance toggle (off state)
58. `swap_horiz` - Swap sides
59. `sync` - Syncing/processing
60. `system_update` - App update
61. `timer` - Duration/time
62. `today` - Today view
63. `upload_file` - Upload/import
64. `vibration` - Haptic feedback
65. `visibility` - View/show
66. `volume_off` - Audio muted
67. `volume_up` - Audio enabled

### Dynamic Icon Mappings

**Toast Component** ([Toast.svelte:15-23](src/lib/components/Toast.svelte#L15-L23)):
```typescript
function getIconForType(type: string): string {
  switch (type) {
    case 'success': return 'check_circle';
    case 'error': return 'error';
    case 'warning': return 'warning';
    case 'info': return 'info';
    default: return 'info';
  }
}
```

**Journal Status** ([journal/+page.svelte:248-262](src/routes/journal/+page.svelte#L248-L262)):
```typescript
function getStatusIcon(status: string, manuallyLogged?: boolean): string {
  if (manuallyLogged) {
    return 'edit_note';
  }
  switch (status) {
    case 'completed': return 'check_circle';
    case 'in-progress': return 'play_circle';
    case 'planned': return 'schedule';
    default: return 'circle';
  }
}
```

---

## Icon Compatibility Matrix

### Verification Status

Good news: **Material Symbols maintains icon name compatibility** with Material Icons. The icon names remain the same, so no icon name changes are required during migration.

### Icons Requiring Verification

While most icons transfer directly, these should be manually verified in Material Symbols:

- `bedtime` - Newer icon, verify availability
- `celebration` - Newer icon, verify availability
- `edit_note` - Newer icon, verify availability
- `rocket_launch` - Newer icon, verify availability
- `self_improvement` - Newer icon, verify availability
- `system_update` - Newer icon, verify availability

**Verification Method**: Check https://fonts.google.com/icons?icon.set=Material+Symbols for each icon name.

### Potential Replacements (If Needed)

If any icons are not available in Material Symbols, here are suggested alternatives:

| Original Icon | Alternative | Rationale |
|---------------|-------------|-----------|
| `bedtime` | `nightlight` | Rest/sleep indicator |
| `celebration` | `emoji_events` | Success/achievement |
| `edit_note` | `edit` | Manual entry |
| `rocket_launch` | `launch` | Start action |
| `self_improvement` | `spa` | Wellness/PT |
| `system_update` | `update` | Update indicator |

---

## Technical Changes Required

### 1. Font File Replacement

**New Font Files Needed**:
- Material Symbols Outlined (variable font format)
- Download from: https://github.com/google/material-design-icons
- Format: `.woff2` (primary), `.woff` (fallback)
- Expected size: ~50-100 KB (much smaller due to variable font)

**Font File Location**: `/static/fonts/`

**Files to Add**:
- `material-symbols-outlined.woff2`
- `material-symbols-outlined.woff`

**Files to Remove**:
- `material-icons-v143-latin-regular.woff2`
- `material-icons-v143-latin-regular.woff`
- `material-icons-v143-latin-regular.ttf`
- `material-icons-v143-latin-regular.eot`
- `material-icons-v143-latin-regular.svg`

### 2. CSS @font-face Update

**New Configuration** (app.css):
```css
@font-face {
  font-family: 'Material Symbols Outlined';
  font-style: normal;
  font-weight: 100 700; /* Variable font weight range */
  src: url('/fonts/material-symbols-outlined.woff2') format('woff2'),
       url('/fonts/material-symbols-outlined.woff') format('woff');
  font-display: block;
}
```

### 3. CSS Class Updates

**Replace Existing Class** (app.css):
```css
.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  font-size: var(--icon-size-md);
  display: inline-block;
  line-height: 1;
  text-transform: none;
  letter-spacing: normal;
  word-wrap: normal;
  white-space: nowrap;
  direction: ltr;

  /* Material Symbols specific settings */
  font-variation-settings:
    'FILL' 0,    /* 0 = outlined, 1 = filled */
    'wght' 400,  /* Weight: 100-700 */
    'GRAD' 0,    /* Grade: -25 to 200 */
    'opsz' 24;   /* Optical size: 20, 24, 40, 48 */

  /* Font rendering */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;

  /* Vertical alignment fix for Material Symbols */
  vertical-align: middle;
  position: relative;
  top: -0.05em; /* Adjust baseline padding */
}
```

**Optional: Create Filled Variant Class**:
```css
.material-symbols-filled {
  font-variation-settings:
    'FILL' 1,
    'wght' 400,
    'GRAD' 0,
    'opsz' 24;
}
```

### 4. HTML Class Name Changes

**Global Find & Replace**:
- Find: `class="material-icons"`
- Replace: `class="material-symbols-outlined"`

**Combined Classes** (preserve additional classes):
- Find: `class="material-icons <other-class>"`
- Replace: `class="material-symbols-outlined <other-class>"`

**Example**:
```html
<!-- Before -->
<span class="material-icons">timer</span>
<span class="material-icons detail-icon">repeat</span>

<!-- After -->
<span class="material-symbols-outlined">timer</span>
<span class="material-symbols-outlined detail-icon">repeat</span>
```

### 5. Compound Class Styles

**Update All CSS Selectors** (search across all files):
- Find: `.material-icons.`
- Replace: `.material-symbols-outlined.`

**Examples**:
```css
/* Before */
.material-icons.toast-icon { }
.material-icons.tab-icon { }
.material-icons.detail-icon { }

/* After */
.material-symbols-outlined.toast-icon { }
.material-symbols-outlined.tab-icon { }
.material-symbols-outlined.detail-icon { }
```

### 6. Spinning Animation Class

**Verify Compatibility** (should work unchanged):
```css
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## File-by-File Migration Checklist

### Core Files (Required)

- [ ] `/src/app.css` - Update @font-face and .material-icons class definition
- [ ] `/static/fonts/` - Replace font files

### Component Files (16 files)

**Utility Components:**
- [ ] `/src/lib/components/Toast.svelte` (5 icon instances)
- [ ] `/src/lib/components/Modal.svelte` (2 icon instances)
- [ ] `/src/lib/components/BottomTabs.svelte` (3 icon instances)

**Feature Components:**
- [ ] `/src/lib/components/ExerciseCard.svelte` (4 icon instances)
- [ ] `/src/lib/components/SessionManagementModal.svelte` (11 icon instances)
- [ ] `/src/lib/components/ExerciseManagementModal.svelte` (11 icon instances)
- [ ] `/src/lib/components/AudioSettingsModal.svelte` (12 icon instances)
- [ ] `/src/lib/components/RestoreModal.svelte` (8 icon instances)
- [ ] `/src/lib/components/BackupModal.svelte` (5 icon instances)
- [ ] `/src/lib/components/GuideDialog.svelte` (21 icon instances)
- [ ] `/src/lib/components/AboutDialog.svelte` (3 icon instances)

**Route Pages:**
- [ ] `/src/routes/+page.svelte` (Today - 16 icon instances)
- [ ] `/src/routes/play/+page.svelte` (Session Player - 18 icon instances)
- [ ] `/src/routes/settings/+page.svelte` (Settings - 17 icon instances)
- [ ] `/src/routes/journal/+page.svelte` (Journal - 17 icon instances)

### CSS Styling Files

Search all component `.svelte` files for scoped styles:
- [ ] Look for `<style>` blocks with `.material-icons` selectors
- [ ] Update to `.material-symbols-outlined`

---

## Breaking Changes & Gotchas

### Known Issues from Research

1. **Vertical Alignment**
   - Material Symbols has different font metrics vs Material Icons
   - Icons may appear slightly higher/lower than before
   - **Fix**: Add `top: -0.05em` to base class (already included in CSS above)
   - **Test**: Check button alignment, inline text icons, form fields

2. **Font Loading Flash**
   - Variable fonts may load differently
   - **Fix**: Keep `font-display: block` to prevent icon name text flash
   - **Test**: Hard refresh on slow connection

3. **Icon Size Perception**
   - Variable fonts may appear slightly different in size
   - **Fix**: May need to adjust `opsz` (optical size) setting
   - **Test**: Compare icon sizes at different viewport sizes

4. **PWA Caching**
   - Service worker may cache old font files
   - **Fix**: Update service worker version/cache name
   - **Test**: Clear cache and verify new fonts load

5. **CSS Specificity**
   - Longer class name may affect specificity in complex selectors
   - **Fix**: Verify all icon styling still applies correctly
   - **Test**: Check all icon color overrides, hover states

### Browser Compatibility

**Variable Font Support**:
- Chrome/Edge: ✅ Full support (Chrome 62+)
- Firefox: ✅ Full support (Firefox 62+)
- Safari: ✅ Full support (Safari 11+)
- iOS Safari: ✅ Full support (iOS 11+)
- Android Chrome: ✅ Full support

**Fallback Strategy**:
- Modern browsers: Use `.woff2` variable font
- Older browsers: Use `.woff` format
- Very old browsers: Not supported (graceful degradation)

---

## Migration Execution Plan

### Phase 1: Preparation (30 minutes)

1. **Download Font Files**
   - Visit https://github.com/google/material-design-icons
   - Download Material Symbols Outlined variable font
   - Formats needed: woff2, woff

2. **Create Backup**
   - Create git branch: `feature/material-symbols-migration`
   - Commit current state: "Pre-migration snapshot"
   - Backup `/static/fonts/` directory

3. **Verify Icon Availability**
   - Check all 67 icons exist in Material Symbols
   - Use https://fonts.google.com/icons?icon.set=Material+Symbols
   - Document any missing icons and alternatives

### Phase 2: Font Replacement (15 minutes)

1. **Add New Font Files**
   - Copy new font files to `/static/fonts/`
   - Verify file sizes are reasonable (~50-100 KB)

2. **Update CSS @font-face**
   - Modify `/src/app.css` font-face declaration
   - Update font-family references

3. **Update Base Class**
   - Replace `.material-icons` class definition
   - Add variable font settings
   - Add vertical alignment fix

### Phase 3: HTML Updates (45 minutes)

1. **Global Class Name Replacement**
   - Use find & replace across all 16 component files
   - Find: `material-icons`
   - Replace: `material-symbols-outlined`
   - **IMPORTANT**: Review each change manually

2. **Update Compound Class Styles**
   - Search for `.material-icons.` in CSS
   - Replace with `.material-symbols-outlined.`

3. **Test Build**
   - Run `npm run build`
   - Verify no build errors
   - Check bundle size changes

### Phase 4: Testing (60 minutes)

1. **Visual Regression Testing**
   - [ ] Home/Today page - All icons render correctly
   - [ ] Exercise Library - Icons in cards and modals
   - [ ] Session Player - Play/pause, navigation icons
   - [ ] Journal - Status icons, date navigation
   - [ ] Settings - All settings icons
   - [ ] Bottom tabs - Navigation icons
   - [ ] Toasts - Success/error/warning/info icons

2. **Interaction Testing**
   - [ ] Click all icon buttons (ensure hit areas unchanged)
   - [ ] Test icon buttons on mobile viewport
   - [ ] Verify icon animations (spinning sync icon)
   - [ ] Check icon hover states

3. **Cross-Browser Testing**
   - [ ] Chrome/Edge (desktop)
   - [ ] Firefox (desktop)
   - [ ] Safari (desktop)
   - [ ] Chrome (Android)
   - [ ] Safari (iOS)

4. **PWA Testing**
   - [ ] Clear cache and reload
   - [ ] Test offline mode (fonts should cache)
   - [ ] Verify no icon name text appears during load

### Phase 5: Refinement (30 minutes)

1. **Visual Adjustments**
   - Fine-tune vertical alignment if needed
   - Adjust optical size (`opsz`) for different icon sizes
   - Verify icon spacing in complex layouts

2. **Performance Verification**
   - Check font file size reduction
   - Verify faster load times
   - Test font caching behavior

3. **Documentation**
   - Update README if it mentions icons
   - Document any custom icon usage patterns
   - Note any icons that needed alternatives

### Phase 6: Cleanup (15 minutes)

1. **Remove Old Font Files**
   - Delete all Material Icons v143 font files
   - Clean up `/static/fonts/` directory

2. **Final Verification**
   - Run full test suite
   - Check bundle size delta
   - Verify PWA manifest unchanged

3. **Commit Changes**
   - Commit message: "Migrate from Material Icons to Material Symbols"
   - Push to branch
   - Create pull request

---

## Testing Strategy

### Visual Testing Checklist

**Icon Rendering:**
- [ ] All icons display correctly (no blank squares)
- [ ] Icon sizes match previous implementation
- [ ] Icon colors inherit from text color
- [ ] Icon spacing is consistent

**Alignment:**
- [ ] Icons aligned with text in buttons
- [ ] Icons centered in circular containers
- [ ] Icons aligned in lists/cards
- [ ] Icons positioned correctly in form fields

**Responsive:**
- [ ] Icons scale properly at all viewport sizes
- [ ] Touch targets maintain proper size on mobile
- [ ] Icons don't overlap text on small screens

**States:**
- [ ] Default state
- [ ] Hover state (color changes work)
- [ ] Active state
- [ ] Disabled state
- [ ] Loading state (spinning animation)

### Functional Testing Checklist

**Navigation:**
- [ ] Bottom tabs icons clickable
- [ ] Back button icon functions
- [ ] Skip next/previous icons work
- [ ] Expand/collapse icons toggle

**Actions:**
- [ ] Add/delete icons trigger correct actions
- [ ] Play/pause icons toggle properly
- [ ] Settings icons open modals
- [ ] Search icon activates search

**Status Indicators:**
- [ ] Toast icons match severity
- [ ] Session status icons correct
- [ ] Exercise type icons accurate

### Performance Testing

**Metrics to Track:**
- [ ] Font file size (should decrease ~80%)
- [ ] Page load time
- [ ] Time to first icon render
- [ ] PWA cache size

**Before Migration:**
- Font files: ~798 KB total
- Material Icons v143 (multiple formats)

**After Migration (Expected):**
- Font files: ~50-100 KB total
- Material Symbols (variable font)
- **Savings: ~700 KB (~87% reduction)**

---

## Rollback Plan

### If Migration Fails

**Immediate Rollback** (Git):
```bash
git checkout main
git branch -D feature/material-symbols-migration
```

**Restore Font Files**:
- Restore backup of `/static/fonts/` directory
- Material Icons v143 files should still be in git history

**Revert CSS Changes**:
```bash
git checkout HEAD -- src/app.css
```

**Rebuild**:
```bash
npm run build
```

### Partial Rollback

If only specific icons have issues:

1. **Keep Material Symbols** for most icons
2. **Add Material Icons** as secondary font
3. **Use specific class** for problematic icons:

```css
.material-icons-legacy {
  font-family: 'Material Icons';
  /* ... */
}
```

This allows gradual migration of problematic icons.

---

## Post-Migration Enhancements

### Optional Improvements (Future)

1. **Use Filled Variants for Active States**
   ```css
   .active .material-symbols-outlined {
     font-variation-settings: 'FILL' 1;
   }
   ```

2. **Responsive Icon Weights**
   ```css
   @media (max-width: 768px) {
     .material-symbols-outlined {
       font-variation-settings: 'wght' 300; /* Lighter on mobile */
     }
   }
   ```

3. **Custom Optical Sizes**
   ```css
   .icon-sm { font-variation-settings: 'opsz' 20; }
   .icon-lg { font-variation-settings: 'opsz' 40; }
   ```

4. **Animated Fill on Interaction**
   ```css
   .icon-button:hover .material-symbols-outlined {
     font-variation-settings: 'FILL' 1;
     transition: font-variation-settings 0.2s;
   }
   ```

---

## Resources

### Official Documentation
- [Material Symbols Guide](https://developers.google.com/fonts/docs/material_symbols)
- [Material Symbols GitHub](https://github.com/google/material-design-icons)
- [Icon Browser](https://fonts.google.com/icons?icon.set=Material+Symbols)

### Migration Guides
- [Migrate from Material Icons to Material Symbols - DEV Community](https://dev.to/zijianhuang/migrating-from-material-icons-to-material-symbols-1mn)
- [Material Symbols vs Material Icons - DeepWiki](https://deepwiki.com/google/material-design-icons/1.2-material-icons-vs.-material-symbols)

### Font Downloads
- GitHub Releases: https://github.com/google/material-design-icons/releases
- Google Fonts CDN: https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined
- Fontsource Package: https://www.npmjs.com/package/@fontsource/material-symbols-outlined

---

## Decision Log

### Why Migrate Now?

1. **Material Icons v143 is outdated** (2023, no longer updated)
2. **Missing newer icons** (cycle, pending, and others)
3. **Material Symbols is the future** (Google's active focus)
4. **Performance improvement** (~87% file size reduction)
5. **Better customization** (variable font features)

### Why Self-Host vs CDN?

**Self-Hosting Chosen Because:**
- ✅ Offline PWA functionality required
- ✅ No external dependencies
- ✅ Better privacy (no Google Fonts tracking)
- ✅ Guaranteed availability
- ✅ Controlled update cycle

**CDN Would Provide:**
- ❌ Requires internet connection
- ❌ External dependency
- ❌ Privacy concerns
- ✅ Auto-updates (could be breaking)
- ✅ Edge caching

### Style Variant Choice

**Material Symbols Outlined** chosen over Filled/Rounded/Sharp because:
- Matches current Material Icons style (outlined)
- Maintains visual consistency
- Works well with current design system
- Can add filled variants later via CSS

---

## Success Criteria

Migration is considered successful when:

- [ ] All 67 icons render correctly across all pages
- [ ] No visual regressions in icon size, alignment, or spacing
- [ ] Font file size reduced by >80%
- [ ] PWA works offline with icons cached
- [ ] All interactions with icon buttons work
- [ ] Toast notifications show correct icons
- [ ] Session status icons display accurately
- [ ] Cross-browser testing passes
- [ ] Mobile testing passes (iOS + Android)
- [ ] Build size is reduced
- [ ] No console errors related to fonts
- [ ] Page load performance maintained or improved

---

## Appendix A: Icon Usage by File

### Component Files

**ExerciseCard.svelte** (4 icons):
- `timer`, `repeat`, `schedule`, `info`

**SessionManagementModal.svelte** (11 icons):
- `close`, `playlist_add`, `search`, `search_off`, `fitness_center`, `add`, `delete`, `arrow_upward`, `arrow_downward`, `check`, `circle`

**ExerciseManagementModal.svelte** (11 icons):
- `close`, `add`, `search`, `search_off`, `timer`, `repeat`, `fitness_center`, `self_improvement`, `delete`, `arrow_upward`, `arrow_downward`

**AudioSettingsModal.svelte** (12 icons):
- `close`, `devices`, `volume_up`, `vibration`, `bedtime`, `play_arrow`, `stop`, `celebration`, `settings`, `info`, `fitness_center`, `arrow_upward`

**Toast.svelte** (5 icons - dynamic):
- `check_circle`, `error`, `warning`, `info`, `close`

**Modal.svelte** (2 icons):
- `close`, `arrow_back`

**BottomTabs.svelte** (3 icons - hardcoded):
- `today`, `book`, `settings`

**RestoreModal.svelte** (8 icons):
- `close`, `arrow_back`, `upload_file`, `preview`, `sync`, `restore`, `warning`, `check_circle`

**BackupModal.svelte** (5 icons):
- `close`, `download`, `book`, `fitness_center`, `playlist_play`

**GuideDialog.svelte** (21 icons):
- `close`, `help_outline`, `today`, `playlist_play`, `fitness_center`, `settings`, `book`, `rocket_launch`, `self_improvement`, `lightbulb`, `play_arrow`, `pause`, `skip_next`, `skip_previous`, `info`, `check_circle`

**AboutDialog.svelte** (3 icons):
- `close`, `self_improvement`, `code`, `lock`, `cloud_off`

### Route Files

**+page.svelte (Today)** (16 icons):
- `fitness_center`, `schedule`, `play_circle`, `check_circle`, `event_busy`, `search`, `search_off`, `refresh`, `info`

**play/+page.svelte** (18 icons):
- `autorenew`, `stop_circle`, `volume_up`, `volume_off`, `info`, `timer`, `repeat`, `swap_horiz`, `exit_to_app`, `replay`, `skip_previous`, `skip_next`, `play_arrow`, `pause`, `expand_more`, `expand_less`, `pending`, `visibility`, `check`

**settings/+page.svelte** (17 icons):
- `palette`, `notifications_active`, `backup`, `restore`, `help_outline`, `info`, `system_update`, `refresh`, `chevron_right`, `download`, `folder`, `playlist_play`, `fitness_center`

**journal/+page.svelte** (17 icons):
- `book`, `chevron_left`, `chevron_right`, `today`, `check_circle`, `play_circle`, `schedule`, `edit_note`, `circle`, `radio_button_unchecked`, `event_busy`, `hourglass_empty`, `timer`, `fitness_center`, `skip_next`, `delete`, `search`

---

## Appendix B: CSS Class Variants

All these selectors need updating from `.material-icons` to `.material-symbols-outlined`:

- `.material-icons` (base class)
- `.material-icons.toast-icon`
- `.material-icons.tab-icon`
- `.material-icons.detail-icon`
- `.material-icons.stat-icon`
- `.material-icons.check-icon`
- `.material-icons.card-icon`
- `.material-icons.empty-icon`
- `.material-icons.status-icon`
- `.material-icons.sort-icon`
- `.material-icons.search-icon`
- `.material-icons.spinning`
- `.material-icons.inline-icon`
- `.material-icons.selected-icon`
- `.material-icons.meta-icon`
- `.material-icons.status-check`
- `.material-icons.status-skip`
- `.material-icons.status-pending`

---

## Appendix C: Variable Font Settings Reference

Material Symbols supports customization via `font-variation-settings`:

### FILL (Fill vs Outline)
- `0` - Outlined (default)
- `1` - Filled

### wght (Weight)
- `100` - Thin
- `200` - Extra Light
- `300` - Light
- `400` - Regular (default)
- `500` - Medium
- `600` - Semi Bold
- `700` - Bold

### GRAD (Grade - visual weight adjustment)
- `-25` - Low emphasis
- `0` - Normal (default)
- `200` - High emphasis

### opsz (Optical Size - optimized for icon size)
- `20` - Small icons (16-20px)
- `24` - Medium icons (default, 20-24px)
- `40` - Large icons (32-40px)
- `48` - Extra large icons (48px+)

**Example Custom Settings**:
```css
/* Filled icon with heavy weight for emphasis */
font-variation-settings: 'FILL' 1, 'wght' 700, 'GRAD' 0, 'opsz' 24;

/* Outlined light icon for mobile */
font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20;
```

---

**End of Document**
