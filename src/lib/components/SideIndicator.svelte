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
	export let side: 'left' | 'right';
	export let active: boolean = false;
</script>

<div class="side-indicator" class:active>
	<div class="circle">
		{side === 'left' ? 'L' : 'R'}
	</div>
</div>

<style>
	.side-indicator {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.circle {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		border: 3px solid rgba(255, 255, 255, 0.5);
		background-color: rgba(255, 255, 255, 0.1);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 400;
		font-size: 24px;
		color: rgba(255, 255, 255, 0.5);
		transition: all 0.3s ease;
	}

	.active .circle {
		background-color: white;
		border-color: white;
		color: var(--primary-color);
		font-weight: 700;
		box-shadow: 0 0 12px rgba(255, 255, 255, 0.6);
	}
</style>
