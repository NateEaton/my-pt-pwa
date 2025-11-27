# Design/Implementation Spec: Hybrid Drag-and-Drop Exercise Reordering

## Overview

Implement a hybrid drag-and-drop reordering system with accessibility fallbacks for exercise lists in:

1. **Session Player** (`play/+page.svelte`) - Reorder exercises during paused state for current session only
2. **Session Management Modal** (`SessionManagementModal.svelte`) - Reorder exercises within session definition

**Key Features:**
- Primary interaction: Touch/mouse drag-and-drop with visual feedback
- Accessibility fallback: Hidden button controls for keyboard/screen reader users
- Mobile polish: Haptic feedback, smooth animations, touch-optimized targets
- Robust state management: ID-based tracking prevents completion state loss

---

## Architecture: ID-Based State Management

### Problem with Index-Based Tracking

The current implementation tracks exercises by array index, which creates fragility:

```typescript
// FRAGILE: Index-based (current approach)
let exercises: Exercise[] = [...];
let currentExerciseIndex = 0; // ❌ Breaks when array reorders
```

When exercises reorder, indices shift, causing:
- Loss of completion state
- Current exercise pointer becoming invalid
- Mismatches between UI and session instance data

### Solution: ID-Based Tracking

```typescript
// ROBUST: ID-based tracking
let exerciseOrder: number[] = []; // Array of exercise IDs
let currentExerciseId: number | null = null; // ✅ Stable reference
let completionMap: Map<number, CompletedExercise> = new Map(); // ✅ ID-keyed

// Derived values (computed from ID-based state)
$: exercises = exerciseOrder
  .map(id => $ptState.exercises.find(ex => ex.id === id))
  .filter(Boolean) as Exercise[];

$: currentExerciseIndex = currentExerciseId
  ? exerciseOrder.indexOf(currentExerciseId)
  : 0;
```

**Benefits:**
- ✅ Exercise identity stable across reorders
- ✅ Completion state preserved in Map lookup
- ✅ Current exercise tracked by immutable ID
- ✅ Array indices derived reactively from ID array

---

## Dependencies

### Required Package

```bash
npm install svelte-dnd-action
```

**Library:** `svelte-dnd-action` v0.9.x+
- Bundle size: ~90KB
- Features: Mouse, touch, and keyboard drag-and-drop
- Mobile support: Built-in touch handling with configurable delays
- Accessibility: ARIA announcements, keyboard navigation
- Maintenance: Active (2025+)

**Alternative:** SortableJS (45KB) - Framework-agnostic but requires manual Svelte integration

---

## UI Design

### Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [≡] [ℹ] Exercise Name                               [✕]     │
│         3 sets × 10 reps • Unilateral                        │
│                                                              │
│     [Hidden: ↑ Move up] [Hidden: ↓ Move down]               │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
1. **Drag Handle** (`≡`): Visual affordance, touch target for dragging
2. **Info Icon** (`ℹ`): Existing instruction toggle
3. **Exercise Content**: Name, parameters, status
4. **Remove Button** (`✕`): Session Management only
5. **Hidden Controls**: Keyboard/screen reader buttons (off-screen)

### Interaction States

| State | Visual Feedback | Behavior |
|-------|----------------|----------|
| **Idle** | Drag handle visible, cursor: grab | Ready to drag |
| **Hover** | Drag handle opacity increases | Affordance hint |
| **Dragging** | Item opacity 70%, scale 102%, shadow | Visual lift effect |
| **Drop zone** | 2px dashed outline on target | Clear drop target |
| **Completed** | Drag handle disabled, opacity 30% | Cannot reorder |
| **Timer active** | Drag handle hidden | Prevents accidental reorder |

### Mobile Optimizations

- **Touch targets**: 44×44px minimum (WCAG AA)
- **Drag delay**: 150ms delay prevents accidental drags during scroll
- **Haptic feedback**: Vibration on successful drop (10-20ms pulse)
- **Touch-action**: `touch-action: none` on drag handle prevents scroll conflict

---

## Session Player Implementation

### State Refactor (ID-Based)

**File:** `src/routes/play/+page.svelte`

```typescript
// ==================== State Management ====================

// ID-based exercise tracking (replaces index-based)
let exerciseOrder: number[] = []; // Exercise IDs in display order
let currentExerciseId: number | null = null; // Active exercise ID
let completionMap: Map<number, CompletedExercise> = new Map(); // ID → completion data

// Derived reactive state
$: exercises = exerciseOrder
  .map(id => $ptState.exercises.find(ex => ex.id === id))
  .filter(Boolean) as Exercise[];

$: currentExerciseIndex = currentExerciseId
  ? exerciseOrder.indexOf(currentExerciseId)
  : 0;

// Initialize from session instance
function initializeExerciseOrder() {
  if (!sessionInstance) return;

  // Build ID array from session instance
  exerciseOrder = sessionInstance.completedExercises.map(ce => ce.exerciseId);

  // Build completion map
  completionMap = new Map(
    sessionInstance.completedExercises.map(ce => [ce.exerciseId, ce])
  );

  // Set current exercise ID
  const incompleteIndex = sessionInstance.completedExercises
    .findIndex(ce => !ce.completed && !ce.skipped);

  if (incompleteIndex >= 0) {
    currentExerciseId = sessionInstance.completedExercises[incompleteIndex].exerciseId;
  }
}

// ==================== Reordering Logic ====================

/**
 * Reorder exercises (immutable, validated)
 */
function reorderExercises(newOrder: number[]): void {
  // Validation: prevent corruption
  if (newOrder.length !== exerciseOrder.length) {
    console.error('Reorder failed: length mismatch');
    return;
  }

  const uniqueIds = new Set(newOrder);
  if (uniqueIds.size !== newOrder.length) {
    console.error('Reorder failed: duplicate IDs detected');
    return;
  }

  // Atomic update
  exerciseOrder = newOrder;

  // Persist to database
  updateSessionInstanceOrder();
}

/**
 * Persist new order to session instance
 * CRITICAL: Preserves all completion metadata
 */
async function updateSessionInstanceOrder(): Promise<void> {
  if (!sessionInstance) return;

  // Rebuild completedExercises array in new order
  const reorderedCompleted = exerciseOrder.map(exerciseId => {
    // Lookup existing completion record (preserves ALL fields)
    const existing = completionMap.get(exerciseId);

    if (existing) {
      return existing; // ✅ Preserves: completed, actualDuration, completedAt, skipped
    }

    // Shouldn't happen during reorder, but handle gracefully
    const exercise = $ptState.exercises.find(ex => ex.id === exerciseId);
    if (!exercise) {
      console.error(`Exercise ${exerciseId} not found in library`);
      return null;
    }

    return createCompletedExerciseRecord(exercise);
  }).filter(Boolean) as CompletedExercise[];

  // Atomic update to session instance
  sessionInstance.completedExercises = reorderedCompleted;
  sessionInstance.customized = true; // Mark as customized

  await ptService.updateSessionInstance(sessionInstance);
}

/**
 * Helper: Create fresh completion record
 */
function createCompletedExerciseRecord(exercise: Exercise): CompletedExercise {
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
}
```

### Drag-and-Drop Integration

```svelte
<script lang="ts">
  import { dndzone, TRIGGERS, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
  import type { DndEvent } from 'svelte-dnd-action';

  // DnD configuration
  const flipDurationMs = 200; // Animation duration for position changes

  // Convert exercises to DnD item format
  $: dndItems = exercises.map((exercise, index) => ({
    id: exercise.id, // CRITICAL: Must be unique ID
    exercise,
    index,
    isCompleted: isExerciseCompleted(index),
    isActive: index === currentExerciseIndex,
    isDraggable: timerState === 'paused' && !isExerciseCompleted(index)
  }));

  /**
   * Handle drag start/move (visual feedback only)
   */
  function handleDndConsider(e: CustomEvent<DndEvent<typeof dndItems[0]>>) {
    dndItems = e.detail.items;
  }

  /**
   * Handle drop finalization (commit change)
   */
  function handleDndFinalize(e: CustomEvent<DndEvent<typeof dndItems[0]>>) {
    dndItems = e.detail.items;

    // Extract new ID order
    const newOrder = dndItems.map(item => item.id as number);

    // Validate and apply
    reorderExercises(newOrder);

    // Mobile haptic feedback
    triggerHaptic('light');

    // Optional: Success toast
    // toastStore.show('Exercise reordered', 'success');
  }

  /**
   * Button-based move (accessibility fallback)
   */
  function moveExercise(exerciseId: number, direction: -1 | 1): void {
    const currentIndex = exerciseOrder.indexOf(exerciseId);
    const newIndex = currentIndex + direction;

    // Bounds check
    if (newIndex < 0 || newIndex >= exerciseOrder.length) return;

    // Don't allow moving past completed exercises
    const targetExercise = completionMap.get(exerciseOrder[newIndex]);
    if (direction === -1 && targetExercise?.completed) return;

    // Create new order with swapped positions
    const newOrder = [...exerciseOrder];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];

    reorderExercises(newOrder);

    // Screen reader announcement
    const exerciseName = exercises[newIndex].name;
    announceMove(exerciseName, direction, newIndex);
  }

  /**
   * Haptic feedback for mobile
   */
  function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'medium'): void {
    if ('vibrate' in navigator) {
      const patterns = { light: 10, medium: 20, heavy: 50 };
      navigator.vibrate(patterns[type]);
    }
  }

  /**
   * Screen reader announcements
   */
  let lastMoveAnnouncement = '';

  function announceMove(exerciseName: string, direction: -1 | 1, newPosition: number): void {
    lastMoveAnnouncement = `${exerciseName} moved ${direction === -1 ? 'up' : 'down'} to position ${newPosition + 1}`;

    // Clear after announcement
    setTimeout(() => { lastMoveAnnouncement = ''; }, 3000);
  }
</script>

<!-- Exercise List with Drag-and-Drop -->
<div
  class="exercise-list"
  bind:this={exerciseListContainer}
  use:dndzone={{
    items: dndItems,
    flipDurationMs,
    dragDisabled: timerState !== 'paused',
    dropTargetStyle: { outline: '2px dashed var(--primary-color)', borderRadius: '8px' },
    transformDraggedElement: (element) => {
      element.style.opacity = '0.7';
      element.style.transform = 'scale(1.02)';
      element.style.cursor = 'grabbing';
      element.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    },
    type: 'exercise-reorder',
    delayTouchStart: 150 // Prevent accidental drags on scroll
  }}
  on:consider={handleDndConsider}
  on:finalize={handleDndFinalize}
  role="list"
  aria-label="Exercise list"
>
  {#each dndItems as item (item.id)}
    <div
      class="exercise-item"
      class:active={item.isActive}
      class:completed={item.isCompleted}
      class:draggable={item.isDraggable}
      bind:this={exerciseElements[item.index]}
      role="listitem"
      aria-label="{item.exercise.name}, {item.isCompleted ? 'completed' : item.isActive ? 'current' : 'upcoming'}"
    >
      <!-- Drag Handle (visible, primary interaction) -->
      {#if item.isDraggable}
        <button
          class="drag-handle"
          aria-label="Drag {item.exercise.name} to reorder"
          tabindex="-1"
        >
          <span class="material-icons">drag_indicator</span>
        </button>
      {/if}

      <!-- Info Icon -->
      <button
        class="icon-button info-icon"
        class:disabled={!item.exercise.instructions}
        on:click|stopPropagation={() => item.exercise.instructions && toggleInstructions(item.exercise.id)}
        disabled={!item.exercise.instructions}
        aria-label="{item.exercise.instructions ? 'Show instructions' : 'No instructions available'}"
      >
        <span class="material-icons">info</span>
      </button>

      <!-- Exercise Content -->
      <div class="exercise-item-content">
        <div class="exercise-item-header">
          <span class="exercise-item-name">{item.exercise.name}</span>
          {#if item.isCompleted}
            <span class="material-icons check-icon" aria-label="Completed">check_circle</span>
          {/if}
        </div>
        <div class="exercise-item-details">
          <!-- Exercise type and timing info -->
          {#if item.exercise.type === 'duration'}
            {formatDuration(item.exercise.defaultDuration || 0)}
          {:else}
            {item.exercise.defaultSets} sets × {item.exercise.defaultReps} reps
            {#if item.exercise.sideMode !== 'bilateral'}
              • {item.exercise.sideMode === 'unilateral' ? 'Unilateral' : 'Alternating'}
            {/if}
          {/if}
        </div>
      </div>

      <!-- Accessibility Fallback: Hidden Button Controls -->
      {#if item.isDraggable}
        <div class="sr-only-controls" role="group" aria-label="Reorder {item.exercise.name}">
          <button
            class="sr-button"
            disabled={item.index === 0 || (item.index > 0 && dndItems[item.index - 1].isCompleted)}
            on:click|stopPropagation={() => moveExercise(item.id, -1)}
            aria-label="Move {item.exercise.name} up"
          >
            Move up
          </button>
          <button
            class="sr-button"
            disabled={item.index === exercises.length - 1}
            on:click|stopPropagation={() => moveExercise(item.id, 1)}
            aria-label="Move {item.exercise.name} down"
          >
            Move down
          </button>
        </div>
      {/if}

      <!-- Instructions Expansion -->
      {#if expandedExerciseId === item.exercise.id && item.exercise.instructions}
        <div class="exercise-instructions" transition:slide={{ duration: 200 }}>
          <p>{item.exercise.instructions}</p>
        </div>
      {/if}
    </div>
  {/each}
</div>

<!-- ARIA Live Region for Screen Reader Announcements -->
<div class="visually-hidden" aria-live="polite" aria-atomic="true">
  {#if lastMoveAnnouncement}
    {lastMoveAnnouncement}
  {/if}
</div>
```

---

## Session Management Modal Implementation

### Current State

The modal already has button-based reordering. We'll enhance it with drag-and-drop.

**File:** `src/lib/components/SessionManagementModal.svelte`

### Changes Required

```svelte
<script lang="ts">
  import { dndzone } from 'svelte-dnd-action';
  import type { DndEvent } from 'svelte-dnd-action';

  // Convert selectedExercises to DnD format
  $: selectedDndItems = sessionFormData.selectedExercises.map((exerciseId, index) => {
    const exercise = $ptState.exercises.find(ex => ex.id === exerciseId);
    return {
      id: exerciseId,
      exercise,
      index
    };
  });

  function handleDndConsider(e: CustomEvent<DndEvent<typeof selectedDndItems[0]>>) {
    selectedDndItems = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent<DndEvent<typeof selectedDndItems[0]>>) {
    selectedDndItems = e.detail.items;
    sessionFormData.selectedExercises = selectedDndItems.map(item => item.id as number);
  }

  // Keep existing button functions for accessibility fallback
  function moveExerciseUp(index: number) {
    if (index === 0) return;
    const newList = [...sessionFormData.selectedExercises];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    sessionFormData.selectedExercises = newList;
  }

  function moveExerciseDown(index: number) {
    if (index === sessionFormData.selectedExercises.length - 1) return;
    const newList = [...sessionFormData.selectedExercises];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    sessionFormData.selectedExercises = newList;
  }
</script>

<!-- Selected Exercises with Drag-and-Drop -->
<div
  class="selected-exercises-list"
  use:dndzone={{
    items: selectedDndItems,
    flipDurationMs: 200,
    delayTouchStart: true, // Prevent accidental drags on scroll
    dropTargetStyle: { outline: '2px dashed var(--primary-color)' },
    type: 'session-exercise-reorder'
  }}
  on:consider={handleDndConsider}
  on:finalize={handleDndFinalize}
  role="list"
  aria-label="Selected exercises"
>
  {#each selectedDndItems as item (item.id)}
    <div class="selected-exercise-item" role="listitem">
      <!-- Drag Handle -->
      <button class="drag-handle" aria-label="Drag to reorder" tabindex="-1">
        <span class="material-icons">drag_indicator</span>
      </button>

      <!-- Exercise Info -->
      <div class="selected-exercise-info">
        <span class="exercise-name">{item.exercise?.name || 'Unknown Exercise'}</span>
        <span class="exercise-type">
          {#if item.exercise?.type === 'duration'}
            {formatDuration(item.exercise.defaultDuration || 0)}
          {:else if item.exercise}
            {item.exercise.defaultSets}×{item.exercise.defaultReps}
          {/if}
        </span>
      </div>

      <!-- Remove Button -->
      <button
        type="button"
        class="remove-btn"
        on:click|stopPropagation={() => toggleExerciseSelection(item.id)}
        title="Remove from session"
        aria-label="Remove {item.exercise?.name} from session"
      >
        <span class="material-icons">close</span>
      </button>

      <!-- Accessibility Fallback: Hidden Reorder Buttons -->
      <div class="sr-only-controls" role="group" aria-label="Reorder {item.exercise?.name}">
        <button
          class="sr-button"
          disabled={item.index === 0}
          on:click|stopPropagation={() => moveExerciseUp(item.index)}
          aria-label="Move {item.exercise?.name} up"
        >
          Move up
        </button>
        <button
          class="sr-button"
          disabled={item.index === selectedDndItems.length - 1}
          on:click|stopPropagation={() => moveExerciseDown(item.index)}
          aria-label="Move {item.exercise?.name} down"
        >
          Move down
        </button>
      </div>
    </div>
  {/each}
</div>

{#if sessionFormData.selectedExercises.length === 0}
  <p class="empty-state">No exercises selected. Choose exercises from the library above.</p>
{/if}
```

---

## Shared Styles

**File:** `src/app.css`

```css
/* ==================== Drag-and-Drop Controls ==================== */

/* Drag Handle */
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  min-width: 32px; /* Prevent shrinking */
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: grab;
  flex-shrink: 0;
  touch-action: none; /* Prevent scroll interference */
  transition: opacity 0.15s ease;
}

.drag-handle:hover {
  color: var(--text-primary);
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-handle .material-icons {
  font-size: 24px;
  opacity: 0.5;
}

.drag-handle:hover .material-icons {
  opacity: 0.8;
}

/* Draggable Item States */
.exercise-item.draggable {
  cursor: grab;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.exercise-item.draggable:active {
  cursor: grabbing;
}

/* Visual Feedback During Drag */
.exercise-item[aria-grabbed="true"],
.selected-exercise-item[aria-grabbed="true"] {
  opacity: 0.7;
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

/* Prevent Dragging Completed Exercises */
.exercise-item.completed .drag-handle {
  opacity: 0.3;
  cursor: not-allowed;
  pointer-events: none;
}

/* Drop Zone Indicator */
.exercise-list[data-dnd-dropzone],
.selected-exercises-list[data-dnd-dropzone] {
  min-height: 100px; /* Ensure droppable area when empty */
}

/* Remove Button (Session Management) */
.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--border-radius-sm, 4px);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.remove-btn:hover {
  background: rgba(244, 67, 54, 0.1);
  color: var(--error-color, #f44336);
}

.remove-btn:active {
  transform: scale(0.95);
}

.remove-btn .material-icons {
  font-size: 20px;
}

/* ==================== Accessibility: Screen Reader Only ==================== */

/* Hidden controls for keyboard/screen reader users */
.sr-only-controls {
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

/* Make focusable buttons visible when focused */
.sr-button {
  padding: 8px 12px;
  background: var(--surface-variant);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  cursor: pointer;
}

.sr-button:focus {
  position: static;
  width: auto;
  height: auto;
}

.sr-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Visually hidden live region for announcements */
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

/* ==================== Focus Indicators (Accessibility) ==================== */

.drag-handle:focus-visible,
.remove-btn:focus-visible,
.sr-button:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
  border-radius: 4px;
}

/* ==================== Mobile Optimizations ==================== */

@media (max-width: 480px) {
  /* Larger touch targets */
  .drag-handle {
    width: 44px;
    height: 44px;
    min-width: 44px;
  }

  .remove-btn {
    width: 44px;
    height: 44px;
  }

  /* Increase drag handle icon size */
  .drag-handle .material-icons {
    font-size: 28px;
  }
}

/* ==================== Dark Mode ==================== */

[data-theme="dark"] .drag-handle {
  color: var(--text-secondary);
}

[data-theme="dark"] .drag-handle:hover {
  color: var(--text-primary);
}

[data-theme="dark"] .exercise-item[aria-grabbed="true"],
[data-theme="dark"] .selected-exercise-item[aria-grabbed="true"] {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
```

---

## CSS Variable Dependencies

Ensure these variables exist in `app.css`:

```css
:root {
  --border-radius-sm: 4px;
  --border-radius: 8px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --primary-color: #1976d2;
  --error-color: #f44336;
  --text-primary: #212121;
  --text-secondary: #757575;
  --surface-variant: #f5f5f5;
  --border-color: #e0e0e0;
  --hover-overlay: rgba(0, 0, 0, 0.04);
  --pressed-overlay: rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] {
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
  --surface-variant: #2c2c2c;
  --border-color: #424242;
  --hover-overlay: rgba(255, 255, 255, 0.08);
  --pressed-overlay: rgba(255, 255, 255, 0.12);
}
```

---

## Accessibility Considerations

### Multi-Input Support

| Input Method | Implementation | User Experience |
|--------------|----------------|-----------------|
| **Mouse** | Drag-and-drop via drag handle | Click-drag-release |
| **Touch** | Touch drag with 150ms delay | Press-hold-drag-release |
| **Keyboard** | Hidden button controls | Tab to exercise, Tab to buttons, Enter to activate |
| **Screen Reader** | ARIA labels + live announcements | "Move [exercise] up/down" buttons |

### ARIA Labels

```svelte
<!-- List container -->
<div role="list" aria-label="Exercise list">

<!-- List items -->
<div role="listitem" aria-label="Push-ups, current exercise">

<!-- Drag handle -->
<button aria-label="Drag Push-ups to reorder" tabindex="-1">

<!-- Reorder buttons (hidden) -->
<button aria-label="Move Push-ups up">
<button aria-label="Move Push-ups down">

<!-- Live announcements -->
<div aria-live="polite" aria-atomic="true">
  Push-ups moved up to position 2
</div>
```

### Keyboard Navigation Flow

1. **Tab** → Focus drag handle (visual only, non-interactive via keyboard)
2. **Tab** → Focus info icon
3. **Tab** → Focus hidden "Move up" button (becomes visible when focused)
4. **Enter/Space** → Trigger move
5. **Tab** → Focus hidden "Move down" button
6. **Tab** → Next exercise

---

## Edge Cases & Validation

### Session Player

| Scenario | Handling |
|----------|----------|
| Drag first exercise up | Drop zone at top disabled |
| Drag last exercise down | Drop zone at bottom disabled |
| Drag over completed exercise | Drop zone disabled (cannot move past completed) |
| Drag while timer active | Drag handle hidden, dndzone disabled |
| Current exercise moved | `currentExerciseId` remains stable, index updates reactively |
| Rapid reordering | Debounce persistence to avoid DB thrashing |
| Network failure during save | Retry 3x, show error toast if all fail |

### Session Management

| Scenario | Handling |
|----------|----------|
| Empty list | Show "No exercises selected" message |
| Single exercise | Drag handle visible but no effect (nowhere to move) |
| Add exercise after reorder | Appended to end of list |
| Remove during drag | Drop cancels, item removed |

### Validation on Reorder

```typescript
function reorderExercises(newOrder: number[]): void {
  // 1. Length check
  if (newOrder.length !== exerciseOrder.length) {
    console.error('Reorder rejected: length mismatch');
    return;
  }

  // 2. Duplicate check
  const uniqueIds = new Set(newOrder);
  if (uniqueIds.size !== newOrder.length) {
    console.error('Reorder rejected: duplicate IDs');
    return;
  }

  // 3. ID validity check
  const allIdsValid = newOrder.every(id =>
    $ptState.exercises.some(ex => ex.id === id)
  );
  if (!allIdsValid) {
    console.error('Reorder rejected: invalid exercise ID');
    return;
  }

  // All checks passed, commit
  exerciseOrder = newOrder;
  updateSessionInstanceOrder();
}
```

---

## Performance Optimizations

### Debounced Persistence

Prevent excessive database writes during rapid reordering:

```typescript
import { debounce } from '$lib/utils/debounce';

const debouncedPersist = debounce(async (order: number[]) => {
  if (!sessionInstance) return;

  const reorderedCompleted = order.map(id => completionMap.get(id)).filter(Boolean);
  sessionInstance.completedExercises = reorderedCompleted;
  sessionInstance.customized = true;

  await ptService.updateSessionInstance(sessionInstance);
}, 500); // Wait 500ms after last reorder

function reorderExercises(newOrder: number[]): void {
  // Validation...

  exerciseOrder = newOrder;
  debouncedPersist(newOrder); // ✅ Debounced
}
```

### Virtual Scrolling (Future Enhancement)

For sessions with 20+ exercises, consider virtual scrolling:

```svelte
<!-- Use svelte-virtual-list for large lists -->
<script>
  import VirtualList from '@sveltejs/svelte-virtual-list';
</script>

<VirtualList items={dndItems} let:item>
  <div class="exercise-item">
    <!-- ... -->
  </div>
</VirtualList>
```

---

## Testing Checklist

### Functional Tests

#### Session Player
- [ ] Drag-and-drop reorders exercises
- [ ] Button controls reorder exercises (keyboard users)
- [ ] Drag handle hidden when timer active
- [ ] Drag handle hidden for completed exercises
- [ ] Cannot drag past completed exercises
- [ ] Current exercise ID stable after reorder
- [ ] Current exercise index updates correctly
- [ ] Completion state preserved after reorder
- [ ] Session instance persists new order
- [ ] Order preserved after app restart

#### Session Management
- [ ] Drag-and-drop reorders selected exercises
- [ ] Button controls reorder exercises
- [ ] Remove button works during reorder
- [ ] Add exercise appends to end
- [ ] Session definition saves new order
- [ ] Order visible when reopening for edit

### Accessibility Tests

- [ ] Tab reaches all interactive elements
- [ ] Drag handle skipped by Tab (tabindex="-1")
- [ ] Hidden buttons appear on focus
- [ ] Enter/Space activates buttons
- [ ] Screen reader announces exercise state
- [ ] Screen reader announces reorder actions
- [ ] ARIA live region announces moves
- [ ] Focus indicator visible on all controls
- [ ] Disabled controls announced as disabled

### Mobile Tests

- [ ] Touch drag works smoothly
- [ ] 150ms delay prevents accidental drags
- [ ] Haptic feedback on successful drop
- [ ] Touch targets ≥44px
- [ ] No scroll conflict during drag
- [ ] Portrait orientation supported
- [ ] Landscape orientation supported

### Edge Case Tests

- [ ] Dragging first item up does nothing
- [ ] Dragging last item down does nothing
- [ ] Rapid reordering doesn't crash
- [ ] Network failure shows error
- [ ] Empty list shows helpful message
- [ ] Single item list handles gracefully
- [ ] Validation catches duplicate IDs
- [ ] Validation catches length mismatches

### Visual Tests

- [ ] Drag handle visible and clear
- [ ] Hover state provides feedback
- [ ] Dragged item has visual lift effect
- [ ] Drop zone clearly indicated
- [ ] Animations smooth (200ms flip)
- [ ] Dark mode colors correct
- [ ] Focus indicators visible
- [ ] Touch targets adequate

---

## Implementation Order

### Phase 1: State Refactor (4 hours)
1. Refactor `play/+page.svelte` to use ID-based tracking
   - Convert `currentExerciseIndex` → `currentExerciseId`
   - Create `exerciseOrder` array
   - Create `completionMap`
   - Add reactive derivations
2. Update `initializeExerciseOrder()` function
3. Refactor all functions using `currentExerciseIndex` to derive from ID
4. Test: Verify session player still works with new state model

### Phase 2: Drag-and-Drop Core (4 hours)
1. Install `svelte-dnd-action`
2. Add drag-and-drop to session player
   - Convert exercises to `dndItems` format
   - Add `dndzone` directive
   - Implement `handleDndConsider` and `handleDndFinalize`
3. Implement `reorderExercises()` with validation
4. Implement `updateSessionInstanceOrder()` with completion preservation
5. Test: Verify drag-and-drop reorders correctly

### Phase 3: Accessibility Fallback (2 hours)
1. Add hidden button controls to exercise items
2. Implement `moveExercise()` function for button-based reorder
3. Add ARIA live region for announcements
4. Implement `announceMove()` function
5. Test: Verify keyboard navigation and screen reader announcements

### Phase 4: Mobile Polish (2 hours)
1. Add haptic feedback to `handleDndFinalize`
2. Configure `delayTouchStart: 150` in dndzone
3. Test touch drag on mobile devices
4. Adjust touch target sizes if needed
5. Test: Verify no scroll conflicts

### Phase 5: Session Management Modal (2 hours)
1. Add drag-and-drop to `SessionManagementModal.svelte`
2. Keep existing button functions as fallback
3. Add hidden button controls
4. Test: Verify both drag and buttons work

### Phase 6: Styling & Polish (2 hours)
1. Add shared styles to `app.css`
2. Ensure CSS variables defined
3. Test dark mode
4. Test mobile responsive design
5. Add animations/transitions

### Phase 7: Testing & Validation (2 hours)
1. Run through full testing checklist
2. Test on multiple devices (desktop, tablet, mobile)
3. Test with screen reader (NVDA/JAWS/VoiceOver)
4. Test keyboard-only navigation
5. Fix any bugs found

**Total Estimated Effort: 18-20 hours**

---

## Migration Strategy

### Backward Compatibility

If deploying to users with existing in-progress sessions:

```typescript
/**
 * Migrate legacy index-based sessions to ID-based
 */
function migrateLegacySession(instance: SessionInstance): SessionInstance {
  // Check if already migrated
  if (instance.completedExercises.every(ce => ce.exerciseId)) {
    return instance; // Already ID-based
  }

  // Migrate: Add exerciseId field if missing
  const sessionDef = $ptState.sessionDefinitions.find(sd => sd.id === instance.sessionDefinitionId);
  if (!sessionDef) {
    console.warn('Session definition not found, cannot migrate');
    return instance;
  }

  instance.completedExercises = instance.completedExercises.map((ce, index) => {
    if (!ce.exerciseId && sessionDef.exercises[index]) {
      ce.exerciseId = sessionDef.exercises[index].exerciseId;
    }
    return ce;
  });

  return instance;
}
```

---

## Future Enhancements

### Long-Press Menu (Mobile)

Add long-press context menu for additional actions:

```svelte
<div
  class="exercise-item"
  on:contextmenu|preventDefault={showContextMenu}
  use:longpress={{ duration: 500 }}
  on:longpress={showContextMenu}
>
  <!-- ... -->
</div>

{#if contextMenuVisible}
  <div class="context-menu">
    <button on:click={moveToTop}>Move to Top</button>
    <button on:click={moveToBottom}>Move to Bottom</button>
    <button on:click={skipExercise}>Skip Exercise</button>
  </div>
{/if}
```

### Batch Operations

For power users managing large sessions:

- **Select multiple exercises** (checkbox mode)
- **Move selected as group**
- **Remove selected**

### Undo/Redo

Track reorder history:

```typescript
let orderHistory: number[][] = [];
let historyIndex = 0;

function reorderExercises(newOrder: number[]): void {
  // Validation...

  // Add to history
  orderHistory = [...orderHistory.slice(0, historyIndex + 1), newOrder];
  historyIndex++;

  exerciseOrder = newOrder;
  updateSessionInstanceOrder();
}

function undo(): void {
  if (historyIndex > 0) {
    historyIndex--;
    exerciseOrder = orderHistory[historyIndex];
    updateSessionInstanceOrder();
  }
}

function redo(): void {
  if (historyIndex < orderHistory.length - 1) {
    historyIndex++;
    exerciseOrder = orderHistory[historyIndex];
    updateSessionInstanceOrder();
  }
}
```

### Visual Improvements

- **Drag preview**: Show mini card of exercise being dragged
- **Drop animation**: Smooth snap-into-place animation
- **Reorder count badge**: "5 exercises reordered" indicator

---

## Comparison: Button vs Hybrid

| Aspect | Button-Based | Hybrid Drag-and-Drop |
|--------|--------------|----------------------|
| **Bundle Size** | 0 KB | +90 KB |
| **Implementation Time** | 4-6 hours | 18-20 hours |
| **State Complexity** | Index-based (fragile) | ID-based (robust) |
| **UX for 5 exercises** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **UX for 15 exercises** | ⭐⭐ (60+ taps) | ⭐⭐⭐⭐⭐ (1 drag) |
| **Accessibility** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ (with fallback) |
| **Mobile Feel** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Discoverability** | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Data Integrity** | ⚠️ Risk of state loss | ✅ Validated, preserved |

---

## Success Metrics

### Usability
- **Drag success rate**: ≥95% of drags complete successfully
- **Reorder time**: <2 seconds per reorder operation
- **Discovery rate**: ≥80% of users discover feature within first session

### Accessibility
- **Keyboard completion rate**: 100% of functionality accessible via keyboard
- **Screen reader rating**: ≥4/5 from blind user testing
- **WCAG compliance**: Level AA or higher

### Performance
- **Drag latency**: <50ms from touch to visual feedback
- **Persistence time**: <200ms to save reorder to database
- **Animation smoothness**: 60fps during drag and drop

### Reliability
- **Data loss incidents**: 0 reports of lost completion state
- **Crash rate**: <0.01% during reorder operations
- **Validation catches**: 100% of invalid reorders blocked

---

## References

- **svelte-dnd-action**: https://github.com/isaacHagoel/svelte-dnd-action
- **WCAG Touch Target Size**: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
- **Haptic Patterns**: https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
- **ARIA Live Regions**: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions

---

## Approval & Sign-off

**Spec Version:** 1.0
**Date:** 2025-11-27
**Status:** Design Complete - Pending Implementation
**Priority:** Future Enhancement
**Estimated Effort:** 18-20 hours
**Dependencies:** svelte-dnd-action package (~90KB)

**Recommended Approach:** Implement when average session size >10 exercises or user feedback requests improved reordering UX.
