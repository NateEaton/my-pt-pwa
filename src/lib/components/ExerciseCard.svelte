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

<script lang="ts">
  import type { Exercise } from '$lib/types/pt';

  export let exercise: Exercise;
  export let showActions: boolean = false;
  export let compact: boolean = false;
  export let showInstructions: boolean = false;
  export let onToggleInstructions: (() => void) | null = null;
  export let onMakeActive: (() => void) | null = null;
  export let isActive: boolean = false;

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }

  function calculateTotalDuration(): string {
    if (exercise.type === 'duration') {
      return formatDuration(exercise.defaultDuration || 0);
    } else {
      // For reps: calculate total time based on reps, sets, and rep duration
      const reps = exercise.defaultReps || 0;
      const sets = exercise.defaultSets || 0;
      const repDuration = exercise.defaultRepDuration || 2;
      const totalSeconds = reps * sets * repDuration;
      return formatDuration(totalSeconds);
    }
  }
</script>

<div class="exercise-card" class:compact>
  <!-- Info icon (left side) -->
  {#if onToggleInstructions && exercise.instructions}
    <button
      class="icon-button info-icon"
      on:click|stopPropagation={onToggleInstructions}
      aria-label="Toggle instructions"
      title="Toggle instructions"
    >
      <span class="material-icons">info</span>
    </button>
  {/if}

  <div class="exercise-info">
    <div class="exercise-header">
      <h3 class="exercise-name">{exercise.name}</h3>
      {#if !compact}
        <span class="exercise-type-badge" class:is-duration={exercise.type === 'duration'}>
          {exercise.type === 'duration' ? 'Duration' : 'Reps/Sets'}
        </span>
      {/if}
    </div>

    <div class="exercise-details">
      {#if exercise.type === 'duration'}
        <span class="detail-item">
          <span class="material-icons detail-icon">timer</span>
          {formatDuration(exercise.defaultDuration || 0)}
        </span>
      {:else}
        <span class="detail-item">
          <span class="material-icons detail-icon">repeat</span>
          {exercise.defaultSets} {exercise.defaultSets === 1 ? 'set' : 'sets'} × {exercise.defaultReps} reps
          {#if exercise.sideMode && exercise.sideMode !== 'bilateral'}
            <span class="mode-badge">{exercise.sideMode === 'unilateral' ? 'Unilateral' : 'Alternating'}</span>
          {/if}
        </span>
        {#if !compact}
          <span class="detail-item">
            <span class="material-icons detail-icon">schedule</span>
            ~{calculateTotalDuration()}
          </span>
        {/if}
      {/if}
    </div>

    <!-- Expandable instructions panel -->
    {#if showInstructions && exercise.instructions}
      <div class="instructions-panel">
        {exercise.instructions}
      </div>
    {/if}
  </div>

  <!-- Make active icon (right side, Play view only) -->
  {#if onMakeActive && !isActive}
    <button
      class="icon-button make-active-icon"
      on:click|stopPropagation={onMakeActive}
      aria-label="Jump to this exercise"
      title="Jump to this exercise"
    >
      <span class="material-icons">play_circle</span>
    </button>
  {/if}

  {#if showActions}
    <div class="exercise-actions">
      <slot name="actions" />
    </div>
  {/if}
</div>

<style>
  .exercise-card {
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
    padding: var(--spacing-lg);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--spacing-md);
    box-shadow: var(--shadow);
  }

  .exercise-card.compact {
    padding: var(--spacing-md);
  }

  .icon-button {
    background: none;
    border: none;
    padding: var(--spacing-xs);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--text-secondary);
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .icon-button:hover {
    background-color: var(--primary-alpha-10);
    color: var(--primary-color);
  }

  .icon-button:active {
    transform: scale(0.95);
  }

  .icon-button .material-icons {
    font-size: var(--icon-size-md);
  }

  .info-icon {
    align-self: flex-start;
  }

  .make-active-icon {
    align-self: flex-start;
  }

  .exercise-info {
    flex: 1;
    min-width: 0;
  }

  .exercise-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
    flex-wrap: wrap;
  }

  .exercise-name {
    margin: 0;
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--text-primary);
    flex: 1;
    min-width: 0;
  }

  /* On desktop, prevent wrapping to keep exercise name beside type badge */
  @media (min-width: 481px) {
    .exercise-header {
      flex-wrap: nowrap;
    }
  }

  .exercise-type-badge {
    font-size: var(--font-size-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: calc(var(--border-radius) / 2);
    background-color: var(--primary-alpha-10);
    color: var(--primary-color);
    font-weight: 500;
  }

  .exercise-type-badge.is-duration {
    background-color: var(--primary-alpha-10);
    color: var(--primary-color);
  }

  .mode-badge {
    margin-left: var(--spacing-xs);
    font-size: var(--font-size-xs);
    padding: 2px var(--spacing-xs);
    border-radius: calc(var(--border-radius) / 2);
    background-color: rgba(156, 39, 176, 0.1);
    color: #9c27b0;
    font-weight: 500;
  }

  .exercise-details {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .detail-icon {
    font-size: var(--icon-size-sm);
  }

  .exercise-instructions {
    margin: var(--spacing-sm) 0 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .instructions-panel {
    margin-top: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--surface);
    border-left: 3px solid var(--primary-color);
    border-radius: calc(var(--border-radius) / 2);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    line-height: 1.6;
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .exercise-actions {
    display: flex;
    gap: var(--spacing-xs);
  }
</style>
