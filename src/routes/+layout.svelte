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
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import { logBuildInfo } from "$lib/utils/buildInfo";
  import { page } from "$app/stores";
  import { ptState, ptService } from "$lib/stores/pt";
  import { pwaJustUpdated, pwaOfflineReady } from "$lib/stores/pwa";
  import Toast from "$lib/components/Toast.svelte";
  import { toastStore } from "$lib/stores/toast";
  import "../app.css";

  // --- VERSION MISMATCH HANDLER ---
  // defined at top-level to ensure it runs as early as possible
  const handleChunkError = async (event: Event | PromiseRejectionEvent) => {
    let errorMsg = '';
    
    // Safely extract the error message
    if ('message' in event && typeof event.message === 'string') {
      errorMsg = event.message;
    } else if ('reason' in event && event.reason instanceof Error) {
      errorMsg = event.reason.message;
    }

    // Check for "Zombie" version errors
    const isVersionMismatch = 
      errorMsg.includes('Failed to fetch dynamically imported module') || 
      errorMsg.includes('Importing a module script failed') ||
      errorMsg.includes('text/html');

    if (isVersionMismatch) {
      // If we are offline, we can't fetch new chunks anyway, so don't loop
      if (!navigator.onLine) return;

      console.warn('Version mismatch detected. clearing cache and reloading...');

      // 1. Nuclear Option: Unregister Service Worker to kill stale cache
      if (navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // 2. Hard Reload: Append timestamp to URL to bust browser cache
      const url = new URL(window.location.href);
      url.searchParams.set('v', Date.now().toString());
      window.location.href = url.toString();
    }
  };

  // Attach listeners immediately if we are in the browser
  if (browser) {
    window.addEventListener('error', handleChunkError);
    window.addEventListener('unhandledrejection', handleChunkError);
  }

  // --- END HANDLER ---

  onMount(async () => {
    // Initialize PTService and IndexedDB
    await ptService.initialize();

    // Load initial data into store
    await loadInitialData();

    initializeTheme();

    if (browser) {
      const { useRegisterSW } = await import("virtual:pwa-register/svelte");

      useRegisterSW({
        immediate: true,
        onRegisteredSW(swUrl, registration) {
          console.log('Service worker registered:', swUrl);
        },
        onRegisterError(error) {
          console.error('Service worker registration failed:', error);
        },
        onOfflineReady() {
          console.log('App is ready to work offline');
          pwaOfflineReady.set(true);
          toastStore.show('App is ready to work offline!', 'success');
        },
        onNeedRefresh() {
          console.log('New version available, updating...');
        }
      });

      navigator.serviceWorker?.addEventListener('controllerchange', () => {
        console.log('New version activated. Reloading to apply changes...');
        
        // Force a reload to swap the UI to the new version immediately
        window.location.reload(); 
      });
    }
    logBuildInfo();
  });

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleChunkError);
    }
  });

  async function loadInitialData() {
    try {
      ptState.update(state => ({ ...state, loading: true }));

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

      if (settings?.colorScheme) {
        applyColorScheme(settings.colorScheme);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      ptState.update(state => ({
        ...state,
        loading: false,
        initialized: true
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
      const currentThemeSetting = localStorage.getItem("pt_theme") || "auto";
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
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute(
        "data-theme",
        prefersDark ? "dark" : "light"
      );
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }

  function applyColorScheme(scheme: string) {
    const colorMap = {
      blue: { primary: '#1976d2', dark: '#1565c0' },
      purple: { primary: '#7b1fa2', dark: '#6a1b9a' },
      green: { primary: '#388e3c', dark: '#2e7d32' },
      orange: { primary: '#f57c00', dark: '#ef6c00' },
      red: { primary: '#d32f2f', dark: '#c62828' },
      teal: { primary: '#00796b', dark: '#00695c' }
    };

    const colors = colorMap[scheme as keyof typeof colorMap];
    if (colors) {
      document.documentElement.style.setProperty('--primary-color', colors.primary);
      document.documentElement.style.setProperty('--primary-color-dark', colors.dark);

      const rgb = hexToRgb(colors.primary);
      if (rgb) {
        document.documentElement.style.setProperty('--primary-alpha-10', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
        document.documentElement.style.setProperty('--primary-alpha-20', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
      }

      // Update theme-color meta tag for Android system bar
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', colors.primary);
      }
    }
  }

  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
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