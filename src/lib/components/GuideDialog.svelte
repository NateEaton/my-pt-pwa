<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * GuideDialog Component - User guide and help
 * PLACEHOLDER - To be filled in with full guide content
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';

  const dispatch = createEventDispatcher();

  function handleClose() {
    dispatch('close');
  }
</script>

<Modal fullScreen={true} title="User Guide" on:close={handleClose}>
  <div class="guide-content">
    <div class="placeholder-message">
      <span class="material-icons placeholder-icon">help_outline</span>
      <h3>User Guide Coming Soon</h3>
      <p>Comprehensive user guide content will be added here.</p>
      <p>
        For now, explore the app to learn about tracking your physical therapy
        exercises and sessions.
      </p>
    </div>
  </div>
</Modal>

<style>
  .guide-content {
    padding: var(--spacing-xl);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .placeholder-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--spacing-2xl);
    min-height: 300px;
  }

  .placeholder-icon {
    font-size: 4rem;
    color: var(--text-hint);
    margin-bottom: var(--spacing-lg);
  }

  .placeholder-message h3 {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--text-primary);
    font-size: var(--font-size-xl);
  }

  .placeholder-message p {
    margin: var(--spacing-sm) 0;
    color: var(--text-secondary);
    max-width: 400px;
  }
</style>
