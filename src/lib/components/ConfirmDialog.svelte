<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * ConfirmDialog Component - Confirmation prompt
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';

  export let title: string = 'Confirm';
  export let message: string = '';
  export let confirmText: string = 'Confirm';
  export let cancelText: string = 'Cancel';
  export let confirmVariant: 'primary' | 'danger' = 'primary';

  const dispatch = createEventDispatcher();

  function handleConfirm() {
    dispatch('confirm');
  }

  function handleCancel() {
    dispatch('cancel');
  }
</script>

<Modal {title} on:close={handleCancel} closeOnBackdrop={false}>
  <div class="confirm-message">
    {message}
  </div>

  <div slot="footer" class="confirm-actions">
    <button class="btn btn-secondary" on:click={handleCancel}>
      {cancelText}
    </button>
    <button
      class="btn"
      class:btn-primary={confirmVariant === 'primary'}
      class:btn-danger={confirmVariant === 'danger'}
      on:click={handleConfirm}
    >
      {confirmText}
    </button>
  </div>
</Modal>

<style>
  .confirm-message {
    font-size: var(--font-size-base);
    color: var(--text-primary);
    line-height: 1.6;
    margin: var(--spacing-md) 0;
  }

  .confirm-actions {
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
    width: 100%;
  }

  .btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--border-radius);
    font-size: var(--font-size-base);
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
    min-height: var(--touch-target-min);
  }

  .btn-primary {
    background-color: var(--primary-color);
    color: white;
  }

  .btn-primary:hover {
    background-color: var(--primary-color-dark);
  }

  .btn-danger {
    background-color: var(--error-color);
    color: white;
  }

  .btn-danger:hover {
    background-color: #d32f2f;
  }

  .btn-secondary {
    background-color: var(--surface-variant);
    color: var(--text-primary);
  }

  .btn-secondary:hover {
    background-color: var(--divider);
  }
</style>
