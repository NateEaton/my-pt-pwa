<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * ExerciseCard Component - Reusable exercise display card
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import type { Exercise } from '$lib/types/pt';

  export let exercise: Exercise;
  export let showActions: boolean = false;
  export let compact: boolean = false;

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
          <span class="material-icons detail-icon">fitness_center</span>
          {exercise.defaultReps} reps × {exercise.defaultSets} sets
        </span>
        {#if !compact}
          <span class="detail-item">
            <span class="material-icons detail-icon">schedule</span>
            ~{calculateTotalDuration()}
          </span>
        {/if}
      {/if}
    </div>

    {#if exercise.instructions && !compact}
      <p class="exercise-instructions">{exercise.instructions}</p>
    {/if}
  </div>

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

  .exercise-info {
    flex: 1;
  }

  .exercise-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-sm);
  }

  .exercise-name {
    margin: 0;
    font-size: var(--font-size-base);
    font-weight: 600;
    color: var(--text-primary);
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

  .exercise-actions {
    display: flex;
    gap: var(--spacing-xs);
  }

  @media (max-width: 480px) {
    .exercise-card {
      flex-direction: column;
    }

    .exercise-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
