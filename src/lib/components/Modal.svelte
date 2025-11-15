<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * Modal Component - Reusable modal dialog
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  export let title: string = '';
  export let showCloseButton: boolean = true;
  export let closeOnBackdrop: boolean = true;
  export let fullScreen: boolean = false;

  const dispatch = createEventDispatcher();

  function handleClose() {
    dispatch('close');
  }

  function handleBackdropClick(event: MouseEvent) {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div
  class="modal-backdrop"
  class:full-screen={fullScreen}
  on:click={handleBackdropClick}
  transition:fade={{ duration: 200 }}
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <div class="modal-container" class:full-screen={fullScreen}>
    {#if title || showCloseButton || $$slots.headerActions}
      <header class="modal-header">
        <h2 id="modal-title" class="modal-title">{title}</h2>
        <div class="modal-header-actions">
          {#if $$slots.headerActions}
            <slot name="headerActions" />
          {/if}
          {#if showCloseButton}
            <button
              class="modal-close-button"
              on:click={handleClose}
              aria-label="Close modal"
            >
              <span class="material-icons">close</span>
            </button>
          {/if}
        </div>
      </header>
    {/if}

    <div class="modal-body">
      <slot />
    </div>

    {#if $$slots.footer}
      <footer class="modal-footer">
        <slot name="footer" />
      </footer>
    {/if}
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--modal-backdrop);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-lg);
  }

  .modal-container {
    background-color: var(--surface);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--divider);
    flex-shrink: 0;
  }

  .modal-title {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
  }

  .modal-header-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .modal-close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-xs);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    width: 2rem;
    height: 2rem;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .modal-close-button:hover {
    background-color: var(--hover-overlay);
    color: var(--text-primary);
  }

  .modal-close-button .material-icons {
    font-size: var(--icon-size-lg);
  }

  .modal-body {
    padding: var(--spacing-lg);
    overflow-y: auto;
    flex: 1;
  }

  .modal-footer {
    padding: var(--spacing-lg);
    border-top: 1px solid var(--divider);
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
    flex-shrink: 0;
  }

  /* Full-screen modal styles */
  .modal-backdrop.full-screen {
    padding: 0;
  }

  .modal-container.full-screen {
    max-width: 480px;
    width: 100%;
    height: 100%;
    max-height: 100vh;
    border-radius: 0;
    margin: 0 auto;
  }

  /* Mobile optimizations */
  @media (max-width: 480px) {
    .modal-backdrop {
      padding: 0;
      align-items: flex-end;
    }

    .modal-container {
      max-width: 100%;
      max-height: 95vh;
      border-radius: var(--border-radius) var(--border-radius) 0 0;
    }

    .modal-container.full-screen {
      max-height: 100vh;
      border-radius: 0;
    }

    .modal-header {
      padding: var(--spacing-md);
    }

    .modal-body {
      padding: var(--spacing-md);
    }

    .modal-footer {
      padding: var(--spacing-md);
    }
  }
</style>
