<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * Today Screen - Main landing page showing daily session
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import { ptState } from '$lib/stores/pt';
  import BottomTabs from '$lib/components/BottomTabs.svelte';

  // Format today's date
  const today = new Date();
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedDate = dateFormatter.format(today);
</script>

<div class="page-container">
  <main class="content">
    <!-- Header with current date -->
    <header class="page-header">
      <h1 class="date-display">{formattedDate}</h1>
    </header>

    <!-- Session overview section -->
    <section class="session-section">
      {#if $ptState.initialized}
        <div class="placeholder-card">
          <div class="placeholder-icon">
            <span class="material-icons">fitness_center</span>
          </div>
          <h2>Welcome to My PT</h2>
          <p class="placeholder-text">
            Phase 1 complete! Your physical therapy exercise tracker is ready for development.
          </p>
          <p class="secondary-text">
            Next up: Phase 2 will add exercise management and session tracking.
          </p>
        </div>
      {:else}
        <div class="loading-indicator">
          <span class="material-icons spinning">refresh</span>
          <p>Loading...</p>
        </div>
      {/if}
    </section>
  </main>

  <BottomTabs currentTab="today" />
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

  .date-display {
    margin: 0;
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--text-primary);
  }

  .session-section {
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
    margin: 0 0 var(--spacing-lg) 0;
    font-size: var(--font-size-base);
    color: var(--text-primary);
    line-height: 1.6;
  }

  .secondary-text {
    margin: 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-2xl);
    color: var(--text-secondary);
  }

  .loading-indicator .material-icons {
    font-size: 3rem;
  }

  @media (max-width: 480px) {
    .page-header {
      padding: var(--spacing-lg);
    }

    .date-display {
      font-size: var(--font-size-lg);
    }

    .session-section {
      padding: var(--spacing-lg);
    }

    .placeholder-card {
      padding: var(--spacing-xl);
    }
  }
</style>
