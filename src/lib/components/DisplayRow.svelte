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
