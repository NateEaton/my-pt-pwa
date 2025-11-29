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
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';

  const dispatch = createEventDispatcher();

  function handleClose() {
    dispatch('close');
  }

  // Build information
  const appVersion = __APP_VERSION__ || '1.0.0';
  const buildId = __BUILD_ID__ || 'dev';
  const buildTime = __BUILD_TIME__ || new Date().toISOString();

  // Format build ID for display (first 8 characters)
  function getShortBuildId(): string {
    return buildId.substring(0, 8);
  }

  // Format build time for display
  function getFormattedBuildTime(): string {
    try {
      const date = new Date(buildTime);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  }
</script>

<Modal fullScreen={true} title="About My PT" iosStyle={true} on:close={handleClose}>
  <div class="about-content">
    <!-- App Info -->
    <div class="app-info">
      <div class="app-icon">
        <span class="material-icons">self_improvement</span>
      </div>
      <h3 class="app-name">My PT</h3>
      <p class="app-tagline">Physical Therapy Home Exercise Tracker</p>
      <p class="app-description">
        A simple, privacy-focused Progressive Web App to help you track physical
        therapy exercises and maintain consistent rehabilitation routines.
      </p>
    </div>

    <!-- Features -->
    <div class="features-section">
      <h4>Key Features</h4>
      <ul class="features-list">
        <li>Track duration-based and rep-based exercises</li>
        <li>Create custom session routines</li>
        <li>Guided session player with timers and rest periods</li>
        <li>View your progress in the journal</li>
        <li>Customizable timing settings and audio cues</li>
        <li>Export and restore data with backups</li>
      </ul>
    </div>

    <!-- Privacy & Technology -->
    <div class="tech-section">
      <h4>Privacy & Technology</h4>
      <div class="info-cards">
        <div class="info-card">
          <span class="material-icons card-icon">lock</span>
          <div class="card-content">
            <h5>Local-First</h5>
            <p>
              All your data is stored locally on your device using IndexedDB.
              Nothing is sent to any servers.
            </p>
          </div>
        </div>

        <div class="info-card">
          <span class="material-icons card-icon">cloud_off</span>
          <div class="card-content">
            <h5>Offline-Ready</h5>
            <p>
              Works completely offline once installed as a PWA. No internet
              connection required.
            </p>
          </div>
        </div>

        <div class="info-card">
          <span class="material-icons card-icon">code</span>
          <div class="card-content">
            <h5>Open Source</h5>
            <p>
              Built with modern web technologies: SvelteKit, TypeScript, and
              Vite. Licensed under GPL-3.0.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- App Meta -->
    <div class="app-meta">
      <p class="version-info">
        Version {appVersion} • Built with ❤️ for better rehabilitation outcomes
      </p>
    </div>

    <!-- Build Info -->
    <div class="build-info-compact">
      <span class="build-id" title="Build ID: {buildId}">
        Build: {getShortBuildId()}
      </span>
      <span class="build-time">
        {getFormattedBuildTime()}
      </span>
    </div>

    <!-- Legal -->
    <div class="legal-section">
      <p class="legal-text">
        Copyright © 2025 Nathan Eaton Jr.
      </p>
      <p class="legal-text">
        This program is free software: you can redistribute it and/or modify
        it under the terms of the GNU General Public License as published by
        the Free Software Foundation, either version 3 of the License, or
        (at your option) any later version.
      </p>
      <p class="legal-text">
        This program is distributed in the hope that it will be useful,
        but WITHOUT ANY WARRANTY; without even the implied warranty of
        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
        GNU General Public License for more details.
      </p>
    </div>
  </div>
</Modal>

<style>
  .about-content {
    padding: var(--spacing-xl);
    padding-bottom: var(--spacing-2xl);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2xl);
  }

  /* App Info */
  .app-info {
    text-align: center;
  }

  .app-icon {
    width: 4rem;
    height: 4rem;
    margin: 0 auto var(--spacing-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-dark) 100%);
    border-radius: 20%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .app-icon .material-icons {
    font-size: 2.5rem;
    color: white;
  }

  .app-name {
    color: var(--primary-color);
    font-size: var(--font-size-2xl);
    font-weight: 600;
    margin: 0 0 var(--spacing-xs) 0;
  }

  .app-tagline {
    color: var(--text-secondary);
    font-size: var(--font-size-base);
    font-weight: 500;
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

  /* Features Section */
  .features-section h4,
  .tech-section h4 {
    color: var(--text-primary);
    font-size: var(--font-size-lg);
    font-weight: 600;
    margin: 0 0 var(--spacing-md) 0;
  }

  .features-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .features-list li {
    position: relative;
    padding-left: var(--spacing-xl);
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .features-list li::before {
    content: "✓";
    color: var(--primary-color);
    font-weight: bold;
    font-size: var(--font-size-lg);
    position: absolute;
    left: var(--spacing-sm);
  }

  /* Tech Section */
  .info-cards {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .info-card {
    display: flex;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background-color: var(--surface-variant);
    border-radius: var(--border-radius);
    border: 1px solid var(--divider);
  }

  .card-icon {
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--primary-alpha-10);
    border-radius: 50%;
    color: var(--primary-color);
    font-size: var(--icon-size-lg);
  }

  .card-content h5 {
    margin: 0 0 var(--spacing-xs) 0;
    color: var(--text-primary);
    font-size: var(--font-size-base);
    font-weight: 500;
  }

  .card-content p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    line-height: 1.5;
  }

  /* App Meta */
  .app-meta {
    text-align: center;
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--divider);
  }

  .version-info {
    color: var(--text-hint);
    font-size: var(--font-size-sm);
    margin: 0;
  }

  /* Build Info */
  .build-info-compact {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    font-family: monospace;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    flex-wrap: wrap;
  }

  .build-id {
    opacity: 0.7;
  }

  .build-time {
    font-style: italic;
    opacity: 0.7;
  }

  /* Legal */
  .legal-section {
    padding-top: var(--spacing-lg);
    border-top: 1px solid var(--divider);
  }

  .legal-text {
    color: var(--text-hint);
    font-size: var(--font-size-xs);
    line-height: 1.5;
    margin: var(--spacing-sm) 0;
    text-align: center;
  }

  @media (max-width: 480px) {
    .about-content {
      padding: var(--spacing-lg);
    }

    .app-icon {
      width: 3.5rem;
      height: 3.5rem;
    }

    .app-icon .material-icons {
      font-size: 2rem;
    }

    .app-name {
      font-size: var(--font-size-xl);
    }

    .info-card {
      padding: var(--spacing-sm);
    }

    .card-icon {
      width: 2rem;
      height: 2rem;
      font-size: var(--icon-size-md);
    }
  }
</style>
