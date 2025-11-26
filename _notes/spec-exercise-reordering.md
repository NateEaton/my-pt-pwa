# Design/Implementation Spec: Exercise Reordering Enhancement

## Overview

Implement consistent button-based vertical reordering for exercise lists in:

1. **Session Player** (`play/+page.svelte`) - Reorder exercises during paused state for current session only
2. **Session Management Modal** (`SessionManagementModal.svelte`) - Reorder exercises within session definition

---

## UI Design

### Reorder Controls Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [ℹ] Exercise Name                              [▲]          │
│     3 sets × 10 reps • Unilateral              [▼]          │
│                                                [✕] (remove) │
└─────────────────────────────────────────────────────────────┘
```

### Button Stack Specifications

| Context | Buttons | Placement |
|---------|---------|-----------|
| Session Player (paused) | Up, Down | Right side, vertical stack |
| Session Management | Up, Down, Remove | Right side, vertical stack |

### Button Behavior

- **Up Button**: Disabled when item is first in list
- **Down Button**: Disabled when item is last in list
- **Remove Button**: Always enabled (Session Management only)
- **Boundary Handling**: Buttons at list boundaries are visually disabled

### Touch Target Requirements

- Minimum button size: 36x36px (meets 44px touch target with padding)
- Vertical gap between buttons: 2px
- Clear visual feedback on tap/hover

---

## Session Player Implementation

### When to Show Reorder Controls

Reorder controls appear **only** when:
- `timerState === 'paused'`
- Exercise is not yet completed (`index >= currentExerciseIndex`)

### Behavior

- Reordering affects the **current session instance only**
- Does **not** modify the session definition
- Order is persisted to `sessionInstance.completedExercises`
- Current exercise index updates if the active exercise moves

### Code Changes

**In `play/+page.svelte`, add to exercise item:**

```svelte
{#each exercises as exercise, index (exercise.id)}
  <div
    bind:this={exerciseElements[index]}
    class="exercise-item"
    class:active={index === currentExerciseIndex}
    class:completed={isExerciseCompleted(index)}
  >
    <!-- Existing: Info icon -->
    <button
      class="icon-button info-icon"
      class:disabled={!exercise.instructions}
      on:click|stopPropagation={() => exercise.instructions && toggleInstructions(exercise.id)}
      disabled={!exercise.instructions}
    >
      <span class="material-icons">info</span>
    </button>

    <!-- Existing: Exercise content -->
    <div class="exercise-item-content">
      <div class="exercise-item-header">
        <span class="exercise-item-name">{exercise.name}</span>
        {#if isExerciseCompleted(index)}
          <span class="material-icons check-icon">check_circle</span>
        {/if}
      </div>
      <div class="exercise-item-details">
        <!-- Exercise type and timing info -->
      </div>
    </div>

    <!-- NEW: Reorder controls (only when paused and not completed) -->
    {#if timerState === 'paused' && !isExerciseCompleted(index)}
      <div class="reorder-controls">
        <button
          class="reorder-btn"
          disabled={index === 0 || isExerciseCompleted(index - 1)}
          on:click|stopPropagation={() => moveExercise(index, -1)}
          aria-label="Move up"
          title="Move up"
        >
          <span class="material-icons">keyboard_arrow_up</span>
        </button>
        <button
          class="reorder-btn"
          disabled={index === exercises.length - 1}
          on:click|stopPropagation={() => moveExercise(index, 1)}
          aria-label="Move down"
          title="Move down"
        >
          <span class="material-icons">keyboard_arrow_down</span>
        </button>
      </div>
    {/if}
  </div>
{/each}
```

**Add move function:**

```typescript
/**
 * Move an exercise up or down in the list
 * @param fromIndex - Current index of the exercise
 * @param direction - -1 for up, 1 for down
 */
function moveExercise(fromIndex: number, direction: -1 | 1): void {
  const toIndex = fromIndex + direction;
  
  // Validate bounds
  if (toIndex < 0 || toIndex >= exercises.length) return;
  
  // Don't allow moving past completed exercises
  if (direction === -1 && isExerciseCompleted(toIndex)) return;
  
  // Swap exercises in the array
  [exercises[fromIndex], exercises[toIndex]] = [exercises[toIndex], exercises[fromIndex]];
  exercises = exercises; // Trigger Svelte reactivity
  
  // Update current exercise index if affected
  if (currentExerciseIndex === fromIndex) {
    currentExerciseIndex = toIndex;
  } else if (currentExerciseIndex === toIndex) {
    currentExerciseIndex = fromIndex;
  }
  
  // Persist to session instance
  updateSessionInstanceOrder();
}

/**
 * Persist the current exercise order to the session instance
 */
async function updateSessionInstanceOrder(): Promise<void> {
  if (!sessionInstance) return;
  
  // Update completedExercises to match new order
  const reorderedCompleted = exercises.map((exercise, index) => {
    // Find the existing completion record for this exercise
    const existing = sessionInstance!.completedExercises.find(
      ce => ce.exerciseId === exercise.id
    );
    
    if (existing) {
      return existing;
    }
    
    // Create new record if not found (shouldn't happen normally)
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      exerciseType: exercise.type,
      targetDuration: exercise.type === 'duration' ? exercise.defaultDuration : undefined,
      targetReps: exercise.type === 'reps' ? exercise.defaultReps : undefined,
      targetSets: exercise.type === 'reps' ? exercise.defaultSets : undefined,
      targetRepDuration: exercise.type === 'reps' ? exercise.defaultRepDuration : undefined,
      completed: false,
      skipped: false,
    };
  });
  
  sessionInstance.completedExercises = reorderedCompleted;
  await ptService.updateSessionInstance(sessionInstance);
}
```

---

## Session Management Modal Implementation

### Current State

The `SessionManagementModal.svelte` already has reorder buttons, but they are arranged horizontally:

```svelte
<div class="exercise-order-controls">
  <button ... on:click={() => moveExerciseUp(index)}>
    <span class="material-icons">arrow_upward</span>
  </button>
  <button ... on:click={() => moveExerciseDown(index)}>
    <span class="material-icons">arrow_downward</span>
  </button>
  <button ... on:click={() => toggleExerciseSelection(exerciseId)}>
    <span class="material-icons">close</span>
  </button>
</div>
```

### Changes Required

1. Update class to use vertical layout: `.exercise-order-controls.vertical`
2. Change icons from `arrow_upward`/`arrow_downward` to `keyboard_arrow_up`/`keyboard_arrow_down`
3. Add consistent styling matching the session player

**Updated code:**

```svelte
<div class="exercise-order-controls vertical">
  <button
    type="button"
    class="order-btn"
    disabled={index === 0}
    on:click={() => moveExerciseUp(index)}
    title="Move up"
    aria-label="Move up"
  >
    <span class="material-icons">keyboard_arrow_up</span>
  </button>
  <button
    type="button"
    class="order-btn"
    disabled={index === sessionFormData.selectedExercises.length - 1}
    on:click={() => moveExerciseDown(index)}
    title="Move down"
    aria-label="Move down"
  >
    <span class="material-icons">keyboard_arrow_down</span>
  </button>
  <button
    type="button"
    class="order-btn remove-btn"
    on:click={() => toggleExerciseSelection(exerciseId)}
    title="Remove"
    aria-label="Remove from session"
  >
    <span class="material-icons">close</span>
  </button>
</div>
```

---

## Shared Styles

Add to `app.css` under a new section:

```css
/* ==================== Reorder Controls ==================== */

.reorder-controls,
.exercise-order-controls.vertical {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
  margin-left: auto;
}

.reorder-btn,
.order-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--border-radius-sm, 4px);
  background: var(--surface-variant);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
}

.reorder-btn:hover:not(:disabled),
.order-btn:hover:not(:disabled) {
  background: var(--hover-overlay);
  color: var(--text-primary);
}

.reorder-btn:active:not(:disabled),
.order-btn:active:not(:disabled) {
  background: var(--pressed-overlay, rgba(0, 0, 0, 0.1));
  transform: scale(0.95);
}

.reorder-btn:disabled,
.order-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.order-btn.remove-btn:hover:not(:disabled) {
  background: rgba(244, 67, 54, 0.1);
  color: var(--error-color);
}

.reorder-btn .material-icons,
.order-btn .material-icons {
  font-size: 20px;
}

/* Focus styles for accessibility */
.reorder-btn:focus-visible,
.order-btn:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* Touch-friendly spacing on mobile */
@media (max-width: 480px) {
  .reorder-controls,
  .exercise-order-controls.vertical {
    gap: 4px;
  }
  
  .reorder-btn,
  .order-btn {
    width: 40px;
    height: 40px;
  }
}
```

---

## CSS Variable Dependencies

Ensure these CSS variables exist in `app.css` (add if missing):

```css
:root {
  --border-radius-sm: 4px;
  --hover-overlay: rgba(0, 0, 0, 0.04);
  --pressed-overlay: rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] {
  --hover-overlay: rgba(255, 255, 255, 0.08);
  --pressed-overlay: rgba(255, 255, 255, 0.12);
}
```

---

## Exercise Item Layout Update

To accommodate the reorder controls, ensure the exercise item uses flexbox with proper alignment:

**Session Player (`play/+page.svelte`):**

```css
.exercise-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--surface-variant);
  border-radius: var(--border-radius);
  /* ... existing styles ... */
}

.exercise-item-content {
  flex: 1;
  min-width: 0; /* Allow text truncation */
}
```

**Session Management (`SessionManagementModal.svelte`):**

```css
.selected-exercise-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-sm);
  background-color: var(--surface-variant);
  border-radius: var(--border-radius);
}

.selected-exercise-info {
  flex: 1;
  min-width: 0;
}
```

---

## Accessibility Considerations

### Keyboard Navigation

- All buttons are focusable via Tab
- Enter/Space activates the focused button
- Focus indicators are clearly visible

### Screen Reader Support

```svelte
<button
  aria-label="Move exercise up"
  title="Move up"
  disabled={index === 0}
>
```

### ARIA Live Announcements (Optional Enhancement)

For better screen reader feedback, consider adding:

```svelte
<div class="visually-hidden" aria-live="polite" aria-atomic="true">
  {#if lastMoveAnnouncement}
    {lastMoveAnnouncement}
  {/if}
</div>

<script>
  let lastMoveAnnouncement = '';
  
  function moveExercise(fromIndex: number, direction: -1 | 1): void {
    // ... existing logic ...
    
    // Announce the move
    const exerciseName = exercises[toIndex].name;
    lastMoveAnnouncement = `${exerciseName} moved ${direction === -1 ? 'up' : 'down'} to position ${toIndex + 1}`;
  }
</script>

<style>
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
```

---

## Edge Cases

### Session Player

| Scenario | Behavior |
|----------|----------|
| Move first exercise up | Up button disabled |
| Move last exercise down | Down button disabled |
| Move exercise past completed | Up button disabled if previous is completed |
| Reorder while active exercise | Not possible (controls hidden when not paused) |
| Current exercise moved | `currentExerciseIndex` updated to follow |

### Session Management

| Scenario | Behavior |
|----------|----------|
| Move first exercise up | Up button disabled |
| Move last exercise down | Down button disabled |
| Remove only exercise | List becomes empty, validation message shown |
| Add exercise after reordering | New exercise added to end of list |

---

## Testing Checklist

### Session Player Tests

- [ ] Reorder controls appear only when paused
- [ ] Reorder controls hidden for completed exercises
- [ ] Move first exercise down works
- [ ] Move last exercise up works
- [ ] First item's up button is disabled
- [ ] Last item's down button is disabled
- [ ] Cannot move past completed exercises
- [ ] Current exercise index follows when active exercise moves
- [ ] Session instance persists new order
- [ ] Order preserved after pause/resume
- [ ] Order preserved after app restart (via session instance)

### Session Management Tests

- [ ] Move exercise up works
- [ ] Move exercise down works
- [ ] Remove exercise works
- [ ] First item's up button is disabled
- [ ] Last item's down button is disabled
- [ ] Session definition saves new order
- [ ] Order visible when reopening session for edit
- [ ] Adding new exercise appends to end

### Accessibility Tests

- [ ] Tab navigation reaches all reorder buttons
- [ ] Enter/Space activates buttons
- [ ] Focus indicator is visible
- [ ] Screen reader announces button purpose
- [ ] Disabled buttons announced as disabled

### Visual Tests

- [ ] Buttons align vertically
- [ ] Proper spacing between buttons
- [ ] Hover state visible
- [ ] Disabled state visually distinct
- [ ] Dark mode colors correct
- [ ] Mobile touch targets adequate (40px+)

---

## Implementation Order

1. **Add shared styles to `app.css`**
2. **Update `SessionManagementModal.svelte`**
   - Change to vertical layout
   - Update icon names
   - Test in isolation
3. **Update `play/+page.svelte`**
   - Add reorder controls to exercise items
   - Implement `moveExercise()` function
   - Implement `updateSessionInstanceOrder()` function
   - Add conditional rendering based on timer state
4. **Test both implementations**
5. **Verify persistence and state management**

---

## Future Considerations

If button-based reordering proves insufficient for longer lists, consider these alternatives for a future enhancement:

1. **Drag-and-Drop**: Using `svelte-dnd-action` library for full drag support
2. **Long-press to enter reorder mode**: Show drag handles after long-press
3. **Swipe gestures**: Swipe left/right to move up/down

However, for typical PT sessions (5-15 exercises), button-based reordering should be adequate and provides better accessibility than drag-and-drop.
