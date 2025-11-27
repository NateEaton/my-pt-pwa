/*
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
 */

/**
 * @fileoverview Duration utility functions for parsing and formatting time values
 */

/**
 * Parse duration input string to seconds
 * Supports formats:
 * - "90" → 90 seconds
 * - "1:30" → 90 seconds
 * - "0:45" → 45 seconds
 * - "10:00" → 600 seconds
 *
 * @param input - Duration string in seconds or MM:SS format
 * @returns Duration in seconds
 */
export function parseDuration(input: string): number {
	input = input.trim();

	// Format: MM:SS or M:SS
	if (input.includes(':')) {
		const [minStr, secStr] = input.split(':');
		const mins = parseInt(minStr) || 0;
		const secs = parseInt(secStr) || 0;
		return mins * 60 + secs;
	}

	// Format: Plain number (seconds)
	return parseInt(input) || 0;
}

/**
 * Format seconds for display in input field
 * - Values <60s: "45"
 * - Values ≥60s: "1:30"
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string for input display
 */
export function formatDurationForInput(seconds: number): string {
	if (seconds < 60) {
		return seconds.toString();
	}
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds for display in cards/lists
 * - Values <60s: "45s"
 * - Values ≥60s with remainder: "1m 30s"
 * - Values ≥60s without remainder: "2m"
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string with units
 */
export function formatDuration(seconds: number): string {
	if (seconds < 60) {
		return `${seconds}s`;
	}
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Format seconds as MM:SS for timer display
 * - "0:05" for 5 seconds
 * - "1:30" for 90 seconds
 * - "10:00" for 600 seconds
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string in MM:SS format
 */
export function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, '0')}`;
}
