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
  import { toastStore } from '$lib/stores/toast';
  import { fade, fly } from 'svelte/transition';

  function getIconForType(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  }

  function handleToastKeydown(event: KeyboardEvent, toastId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toastStore.dismiss(toastId);
    }
  }
</script>

<div class="toast-container">
  {#each $toastStore as toast (toast.id)}
    <div
      class="toast toast-{toast.type}"
      transition:fly={{ y: 50, duration: 300 }}
      on:click={() => toastStore.dismiss(toast.id)}
      on:keydown={(e) => handleToastKeydown(e, toast.id)}
      role="button"
      tabindex="0"
      aria-label="Dismiss notification"
    >
      <span class="material-icons toast-icon">{getIconForType(toast.type)}</span>
      <span class="toast-message">{toast.message}</span>
      <button
        class="toast-close"
        on:click|stopPropagation={() => toastStore.dismiss(toast.id)}
        aria-label="Dismiss"
      >
        <span class="material-icons">close</span>
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: calc(var(--bottom-tabs-height) + var(--spacing-lg));
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    max-width: 480px;
    width: calc(100% - var(--spacing-xl));
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md) var(--spacing-lg);
    background-color: var(--surface);
    color: var(--text-primary);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    pointer-events: auto;
    cursor: pointer;
    min-height: var(--touch-target-min);
    border-left: 4px solid var(--primary-color);
  }

  .toast-success {
    border-left-color: var(--success-color);
  }

  .toast-error {
    border-left-color: var(--error-color);
  }

  .toast-warning {
    border-left-color: var(--warning-color);
  }

  .toast-info {
    border-left-color: var(--info-color);
  }

  .toast-icon {
    font-size: var(--icon-size-lg);
    flex-shrink: 0;
  }

  .toast-success .toast-icon {
    color: var(--success-color);
  }

  .toast-error .toast-icon {
    color: var(--error-color);
  }

  .toast-warning .toast-icon {
    color: var(--warning-color);
  }

  .toast-info .toast-icon {
    color: var(--info-color);
  }

  .toast-message {
    flex: 1;
    font-size: var(--font-size-base);
  }

  .toast-close {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--icon-size-lg);
    height: var(--icon-size-lg);
  }

  .toast-close:hover {
    color: var(--text-primary);
  }

  .toast-close .material-icons {
    font-size: var(--icon-size-md);
  }

  @media (max-width: 480px) {
    .toast-container {
      width: calc(100% - var(--spacing-lg));
    }
  }
</style>
