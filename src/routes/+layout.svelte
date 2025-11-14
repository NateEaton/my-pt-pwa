<!--
 * My PT - Physical Therapy Tracker PWA
 * Copyright (C) 2025 Your Name
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

<script>
  import { onMount } from "svelte";
  import { logBuildInfo } from "$lib/utils/buildInfo";
  import { page } from "$app/stores";
  import { ptState, ptService } from "$lib/stores/pt";
  import Toast from "$lib/components/Toast.svelte";
  import "../app.css";

  onMount(async () => {
    // Initialize PTService and IndexedDB
    await ptService.initialize();

    // Load initial data into store
    await loadInitialData();

    initializeTheme();

    if (typeof window !== "undefined") {
      const { registerSW } = await import("virtual:pwa-register");
      registerSW({
        onNeedRefresh() {},
        onOfflineReady() {},
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

  function applyTheme(theme) {
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