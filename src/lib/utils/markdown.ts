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
 * @fileoverview Lightweight markdown utilities for exercise instructions
 */

/**
 * Parse limited markdown in text
 * Supports: bold (**text**), italic (*text* or _text_), underline (__text__), line breaks
 */
export function parseMarkdown(text: string): string {
  if (!text) return '';

  // Escape HTML entities to prevent XSS
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // Apply markdown transformations (order matters!)
  return escaped
    // Bold: **text** (must come before italic to avoid conflicts)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Underline: __text__ (must come before italic)
    .replace(/__(.+?)__/g, '<u>$1</u>')
    // Italic: *text*
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Italic: _text_ (single underscore, not part of __ pair)
    .replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br>');
}

/**
 * Strip markdown formatting characters from text
 * Useful for displaying abbreviated text without formatting markers
 */
export function stripMarkdown(text: string): string {
  if (!text) return '';

  return text
    // Remove bold: **text** -> text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    // Remove underline: __text__ -> text
    .replace(/__(.+?)__/g, '$1')
    // Remove italic: *text* -> text
    .replace(/\*(.+?)\*/g, '$1')
    // Remove italic: _text_ -> text (single underscore)
    .replace(/(?<!_)_([^_]+?)_(?!_)/g, '$1')
    // Keep line breaks as spaces for abbreviated text
    .replace(/\n/g, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}
