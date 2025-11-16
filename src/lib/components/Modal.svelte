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
  let modalElement: HTMLDivElement;
  let previouslyFocusedElement: HTMLElement | null = null;

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

  // Focus trap: keep focus within modal
  function handleTabKey(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !modalElement) return;

    const focusableElements = modalElement.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const focusableArray = Array.from(focusableElements);
    const firstElement = focusableArray[0];
    const lastElement = focusableArray[focusableArray.length - 1];

    if (event.shiftKey) {
      // Shift + Tab: going backwards
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab: going forwards
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }

  // Prevent background scroll and gestures when modal is open
  onMount(() => {
    // Store the previously focused element
    previouslyFocusedElement = document.activeElement as HTMLElement;

    // Store original overflow values
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    // Get current scroll position
    const scrollY = window.scrollY;

    // Lock body scroll - iOS-safe method
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    // Prevent touch move events on the backdrop
    const preventTouchMove = (e: TouchEvent) => {
      // Allow scrolling inside the modal container
      const target = e.target as HTMLElement;
      const modalContainer = target.closest('.modal-container');
      if (!modalContainer) {
        e.preventDefault();
      }
    };

    // Focus the modal element or first focusable element
    setTimeout(() => {
      const focusableElements = modalElement?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements?.[0];
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        modalElement?.focus();
      }
    }, 100);

    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('touchmove', preventTouchMove, { passive: false });

    return () => {
      // Restore original styles
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;

      // Restore scroll position
      window.scrollTo(0, scrollY);

      // Restore focus to previously focused element
      if (previouslyFocusedElement) {
        previouslyFocusedElement.focus();
      }

      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('touchmove', preventTouchMove);
    };
  });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  bind:this={modalElement}
  class="modal-backdrop"
  class:full-screen={fullScreen}
  on:click={handleBackdropClick}
  transition:fade={{ duration: 200 }}
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  tabindex="-1"
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
    width: var(--touch-target-min);
    height: var(--touch-target-min);
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
      padding: var(--spacing-md);
      /* Center modals on mobile instead of bottom sheet */
      align-items: center;
    }

    .modal-container {
      max-width: 100%;
      max-height: 90vh;
      /* Keep rounded corners for centered modals */
      border-radius: var(--border-radius);
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
