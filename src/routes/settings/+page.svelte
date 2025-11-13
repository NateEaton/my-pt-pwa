<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * Settings Screen - Exercise management and app configuration
 * Phase 1 placeholder - will be implemented in Phase 7
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import BottomTabs from '$lib/components/BottomTabs.svelte';
</script>

<div class="page-container">
  <main class="content">
    <header class="page-header">
      <h1>Settings</h1>
    </header>

    <section class="placeholder-section">
      <div class="placeholder-card">
        <div class="placeholder-icon">
          <span class="material-icons">settings</span>
        </div>
        <h2>Exercise Library & Configuration</h2>
        <p class="placeholder-text">
          Coming in Phase 7: Manage your exercise library, create session definitions, and configure app preferences.
        </p>
      </div>
    </section>
  </main>

  <BottomTabs currentTab="settings" />
</div>

<style>
  .page-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: var(--surface);
  }

  .content {
    flex: 1;
    padding-bottom: calc(var(--bottom-tabs-height) + var(--spacing-lg));
    overflow-y: auto;
  }

  .page-header {
    padding: var(--spacing-xl) var(--spacing-lg) var(--spacing-lg);
    background-color: var(--surface);
    border-bottom: 1px solid var(--divider);
  }

  .page-header h1 {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
  }

  .placeholder-section {
    padding: var(--spacing-xl) var(--spacing-lg);
  }

  .placeholder-card {
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
    padding: var(--spacing-2xl);
    text-align: center;
    box-shadow: var(--shadow);
  }

  .placeholder-icon {
    margin-bottom: var(--spacing-lg);
  }

  .placeholder-icon .material-icons {
    font-size: 4rem;
    color: var(--primary-color);
  }

  .placeholder-card h2 {
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--font-size-2xl);
    color: var(--text-primary);
  }

  .placeholder-text {
    margin: 0;
    font-size: var(--font-size-base);
    color: var(--text-secondary);
    line-height: 1.6;
  }

  @media (max-width: 480px) {
    .page-header {
      padding: var(--spacing-lg);
    }

    .page-header h1 {
      font-size: var(--font-size-lg);
    }

    .placeholder-section {
      padding: var(--spacing-lg);
    }

    .placeholder-card {
      padding: var(--spacing-xl);
    }
  }
</style>
