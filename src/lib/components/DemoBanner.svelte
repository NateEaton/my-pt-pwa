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
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';

  /**
   * Handle exit demo button click
   * Navigates to corresponding normal route (removes /demo prefix)
   */
  function exitDemo() {
    const currentPath = window.location.pathname;

    // Remove base path if present to get the route
    let route = currentPath;
    if (base && currentPath.startsWith(base)) {
      route = currentPath.substring(base.length);
    }

    // Remove /demo prefix from route
    const normalRoute = route.replace(/^\/demo/, '') || '/';

    // Reconstruct full path with base
    const normalPath = `${base}${normalRoute}`;

    goto(normalPath);
  }
</script>

<div class="demo-banner">
  <span class="demo-text">Demo Mode: Example data only</span>
  <button class="exit-btn" on:click={exitDemo} type="button">Exit Demo</button>
</div>

<style>
  .demo-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 32px;
    padding: 0 var(--spacing-md);
    background-color: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .demo-text {
    font-size: 14px;
    color: #666;
    font-weight: 500;
  }

  .exit-btn {
    padding: 4px 12px;
    font-size: 13px;
    color: var(--primary-color);
    background: transparent;
    border: 1px solid var(--primary-color);
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s ease;
  }

  .exit-btn:hover {
    background-color: var(--primary-alpha-10);
  }

  .exit-btn:active {
    background-color: var(--primary-alpha-20);
  }
</style>
