<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * AboutDialog Component - App information and version
 * PLACEHOLDER - To be filled in with full about content
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

  // Build info placeholders - will be filled in later
  const appVersion = __APP_VERSION__ || '1.0.0';
  const buildId = __BUILD_ID__ || 'dev';
</script>

<Modal fullScreen={true} title="About My PT" on:close={handleClose}>
  <div class="about-content">
    <div class="app-info">
      <h3 class="app-name">My PT</h3>
      <p class="app-description">
        A simple, privacy-focused Progressive Web App to help you track physical
        therapy exercises and maintain consistent rehabilitation routines.
      </p>
    </div>

    <div class="placeholder-section">
      <p class="version-info">Version {appVersion}</p>
      <p class="build-info">Build: {buildId.substring(0, 8)}</p>
    </div>

    <div class="placeholder-message">
      <p>Detailed app information, features list, and credits will be added here.</p>
    </div>
  </div>
</Modal>

<style>
  .about-content {
    padding: var(--spacing-xl);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xl);
  }

  .app-info {
    text-align: center;
  }

  .app-name {
    color: var(--primary-color);
    font-size: var(--font-size-2xl);
    margin: 0 0 var(--spacing-md) 0;
  }

  .app-description {
    color: var(--text-secondary);
    line-height: 1.6;
    margin: 0;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }

  .placeholder-section {
    text-align: center;
    padding: var(--spacing-lg);
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
  }

  .version-info {
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-primary);
    font-size: var(--font-size-lg);
    font-weight: 500;
  }

  .build-info {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    font-family: monospace;
  }

  .placeholder-message {
    text-align: center;
    padding: var(--spacing-lg);
  }

  .placeholder-message p {
    margin: 0;
    color: var(--text-hint);
    font-style: italic;
  }
</style>
