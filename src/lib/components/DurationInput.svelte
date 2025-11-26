<script lang="ts">
	import { parseDuration, formatDurationForInput } from '$lib/utils/duration';

	export let value: number; // Always in seconds
	export let min: number = 0;
	export let max: number = 3600; // 1 hour default
	export let placeholder: string = 'MM:SS or seconds';
	export let id: string | undefined = undefined;
	export let disabled: boolean = false;

	let displayValue: string = formatDurationForInput(value);
	let inputElement: HTMLInputElement;

	// Update display value when value prop changes externally
	$: if (value !== undefined) {
		displayValue = formatDurationForInput(value);
	}

	function handleInput(event: Event) {
		const input = (event.target as HTMLInputElement).value;
		const newSeconds = parseDuration(input);
		const clampedValue = Math.min(max, Math.max(min, newSeconds));
		value = clampedValue;
	}

	function handleBlur() {
		// Reformat on blur to ensure consistent display
		displayValue = formatDurationForInput(value);
	}

	function handleFocus(event: Event) {
		// Select all text on focus for easy editing
		(event.target as HTMLInputElement).select();
	}
</script>

<input
	bind:this={inputElement}
	{id}
	type="text"
	bind:value={displayValue}
	on:input={handleInput}
	on:blur={handleBlur}
	on:focus={handleFocus}
	{placeholder}
	{disabled}
	class="duration-input"
	inputmode="numeric"
/>

<style>
	.duration-input {
		/* Match existing input styles from parent components */
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md);
		font-size: 1rem;
		border: 1px solid var(--border-color, #ccc);
		border-radius: var(--border-radius);
		background: var(--surface);
		color: var(--text-primary);
		font-variant-numeric: tabular-nums; /* Monospace numbers for alignment */
		transition: border-color 0.2s;
	}

	.duration-input:focus {
		outline: none;
		border-color: var(--primary-color);
	}

	.duration-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
