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
  import { onMount } from "svelte";
  import { logBuildInfo } from "$lib/utils/buildInfo";
  import { page } from "$app/stores";
  import { ptState, ptService } from "$lib/stores/pt";
  import { pwaUpdateAvailable, pwaUpdateFunction, pwaOfflineReady } from "$lib/stores/pwa";
  import Toast from "$lib/components/Toast.svelte";
  import { toastStore } from "$lib/stores/toast";
  import "../app.css";

  onMount(async () => {
    // Initialize PTService and IndexedDB
    await ptService.initialize();

    // Load initial data into store
    await loadInitialData();

    initializeTheme();

    if (typeof window !== "undefined") {
      const { useRegisterSW } = await import("virtual:pwa-register/svelte");

      const {
        needRefresh,
        offlineReady,
        updateServiceWorker
      } = useRegisterSW({
        onNeedRefresh() {
          console.log('New version available');
        },
        onOfflineReady() {
          console.log('App is ready to work offline');
        }
      });

      // Subscribe to needRefresh and show notification if not on Settings page
      needRefresh.subscribe((value: boolean) => {
        pwaUpdateAvailable.set(value);
        if (value) {
          // Only show "Go to Settings" toast if user is not already on Settings page
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/settings')) {
            toastStore.show(
              'Update available! Go to Settings to update.',
              'info',
              0  // Don't auto-dismiss
            );
          }
        }
      });

      // Store update function for use in Settings
      pwaUpdateFunction.set(updateServiceWorker);

      // Subscribe to offlineReady
      offlineReady.subscribe((value: boolean) => {
        pwaOfflineReady.set(value);
        if (value) {
          toastStore.show('App is ready to work offline!', 'success');
        }
      });
    }
    logBuildInfo();
  });

  async function loadInitialData() {
    try {
      ptState.update(state => ({ ...state, loading: true }));

      // Load all data in parallel
      const [exercises, sessionDefinitions, settings, todaySession] = await Promise.all([
        ptService.getExercises(),
        ptService.getSessionDefinitions(),
        ptService.getSettings(),
        ptService.getTodaySessionInstance()
      ]);

      ptState.update(state => ({
        ...state,
        initialized: true,
        loading: false,
        exercises,
        sessionDefinitions,
        settings,
        todaySession
      }));
    } catch (error) {
      console.error('Failed to load initial data:', error);
      ptState.update(state => ({
        ...state,
        loading: false,
        initialized: true // Still mark as initialized even if data load fails
      }));
    }
  }

  $: pageTitle = (() => {
    switch ($page.route?.id) {
      case "/journal":
        return "Journal";
      case "/settings":
        return "Settings";
      default:
        return "Today";
    }
  })();

  function initializeTheme() {
    const savedTheme = localStorage.getItem("pt_theme") || "auto";
    applyTheme(savedTheme);

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    prefersDark.addEventListener("change", (e) => {
      const currentThemeSetting =
        localStorage.getItem("pt_theme") || "auto";
      if (currentThemeSetting === "auto") {
        document.documentElement.setAttribute(
          "data-theme",
          e.matches ? "dark" : "light"
        );
      }
    });
  }

  function applyTheme(theme: string) {
    if (theme === "auto") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      document.documentElement.setAttribute(
        "data-theme",
        prefersDark ? "dark" : "light"
      );
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }
</script>

<svelte:head>
  <title>My PT - {pageTitle}</title>
</svelte:head>

<div class="app-container">
  <slot />
</div>

<Toast />

<style>
  .app-container {
    max-width: 480px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: var(--surface);
    position: relative;
    box-shadow: var(--shadow);
  }

  @media (max-width: 480px) {
    .app-container {
      max-width: 100%;
      box-shadow: none;
    }
  }
</style>