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
	import { fade } from 'svelte/transition';

	export let size: 'small' | 'big' = 'small';
	export let wrap: boolean = false;
</script>

<div class="display-row {size}" class:wrap transition:fade={{ duration: 150 }}>
	<slot />
</div>

<style>
	.display-row {
		width: 100%;
		height: 3.5rem;
		display: flex;
		justify-content: center;
		align-items: center;
		text-align: center;
		transition: opacity 200ms ease, transform 200ms ease;
	}

	.display-row.small {
		font-size: 1.125rem;
		font-weight: 500;
		opacity: 0.9;
		line-height: 1.4;
		padding: 0 var(--spacing-md);
	}

	.display-row.big {
		font-size: 3rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	/* Allow wrapping for complex context */
	.display-row.small.wrap {
		height: auto;
		max-height: 5rem;
		align-items: flex-start;
	}
</style>
