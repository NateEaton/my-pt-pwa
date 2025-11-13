<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
 *
 * Bottom Navigation Tabs Component
 * Three-tab navigation: Today | Journal | Settings
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
-->

<script lang="ts">
  import { goto } from '$app/navigation';

  export let currentTab: 'today' | 'journal' | 'settings' = 'today';

  interface Tab {
    id: 'today' | 'journal' | 'settings';
    label: string;
    icon: string;
    path: string;
  }

  const tabs: Tab[] = [
    { id: 'today', label: 'Today', icon: 'today', path: '/' },
    { id: 'journal', label: 'Journal', icon: 'book', path: '/journal' },
    { id: 'settings', label: 'Settings', icon: 'settings', path: '/settings' }
  ];

  function handleTabClick(tab: Tab) {
    goto(tab.path);
  }
</script>

<nav class="bottom-tabs" aria-label="Main navigation">
  {#each tabs as tab (tab.id)}
    <button
      class="tab"
      class:active={currentTab === tab.id}
      on:click={() => handleTabClick(tab)}
      aria-label={tab.label}
      aria-current={currentTab === tab.id ? 'page' : undefined}
    >
      <span class="material-icons tab-icon">{tab.icon}</span>
      <span class="tab-label">{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .bottom-tabs {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 480px;
    height: var(--bottom-tabs-height);
    background-color: var(--surface);
    border-top: 1px solid var(--divider);
    display: flex;
    justify-content: space-around;
    align-items: stretch;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
    z-index: 100;
  }

  .tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--spacing-sm);
    color: var(--text-secondary);
    transition: color 0.2s ease, background-color 0.2s ease;
    position: relative;
    min-height: var(--touch-target-min);
  }

  .tab:hover {
    background-color: var(--hover-overlay);
  }

  .tab:active {
    background-color: var(--primary-alpha-10);
  }

  .tab.active {
    color: var(--primary-color);
  }

  .tab.active::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background-color: var(--primary-color);
  }

  .tab-icon {
    font-size: var(--icon-size-lg);
  }

  .tab-label {
    font-size: var(--font-size-xs);
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  /* Dark theme adjustments */
  [data-theme="dark"] .bottom-tabs {
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 480px) {
    .bottom-tabs {
      max-width: 100%;
    }
  }

  /* Support for devices with safe area insets (iPhone notch) */
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .bottom-tabs {
      padding-bottom: env(safe-area-inset-bottom);
      height: calc(var(--bottom-tabs-height) + env(safe-area-inset-bottom));
    }
  }
</style>
