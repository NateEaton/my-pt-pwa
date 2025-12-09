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
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { ptState } from '$lib/stores/pt';
  import { initializeDemoData } from '$lib/services/DemoService';
  import { toastStore } from '$lib/stores/toast';
  import DemoBanner from '$lib/components/DemoBanner.svelte';

  // Determine if we should show the banner (hide on play page)
  $: isPlayPage = $page.route?.id === '/demo/play';

  onMount(async () => {
    // Initialize demo data if not already loaded
    try {
      // Wait for PTService to be initialized (from parent layout)
      if (!$ptState.initialized) {
        await new Promise(resolve => {
          const unsubscribe = ptState.subscribe(state => {
            if (state.initialized) {
              unsubscribe();
              resolve(null);
            }
          });
        });
      }

      // Pass base path to demo service
      await initializeDemoData(base);
    } catch (error) {
      console.error('Failed to initialize demo mode:', error);
      toastStore.show('Demo mode unavailable. Redirecting to main app...', 'error');

      // Redirect to normal mode on failure (respect base path)
      setTimeout(() => {
        goto(`${base}/`);
      }, 2000);
    }
  });
</script>

<!-- Show demo banner on all pages except play page -->
{#if !isPlayPage}
  <DemoBanner />
{/if}

<slot />
