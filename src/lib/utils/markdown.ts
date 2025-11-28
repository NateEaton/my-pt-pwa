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
 * Supports: headings (# ## ###), bold (**text**), italic (*text* or _text_),
 * underline (__text__), bullet lists (* item), numbered lists (1. item), line breaks
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

  // Process line by line to handle lists and headings
  const lines = escaped.split('\n');
  const processed: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const isLastLine = i === lines.length - 1;

    // Blank line - preserve as paragraph break
    if (!trimmed) {
      processed.push('<br>');
      continue;
    }

    // Headings: # Title, ## Heading, ### Subheading
    if (/^#{1,3}\s+(.+)$/.test(trimmed)) {
      const match = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const [, hashes, content] = match;
        const level = hashes.length;
        processed.push(`<h${level} style="margin: 0.5rem 0; font-weight: 600;">${content}</h${level}>`);
        continue;
      }
    }

    // Bullet list: * item or - item (but not after #)
    if (/^[\*\-]\s+(.+)$/.test(trimmed)) {
      const content = trimmed.replace(/^[\*\-]\s+/, '');
      processed.push(`<div style="padding-left: 0.5rem;">• ${content}</div>`);
      continue;
    }

    // Numbered list: 1. item, 2. item, etc.
    if (/^\d+\.\s+(.+)$/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (match) {
        const [, num, content] = match;
        processed.push(`<div style="padding-left: 0.5rem;">${num}. ${content}</div>`);
        continue;
      }
    }

    // Regular line - add <br> after it unless it's the last line
    processed.push(trimmed + (isLastLine ? '' : '<br>'));
  }

  const html = processed.join('');

  // Apply inline emphasis transformations (order matters!)
  return html
    // Bold: **text** (must come before italic to avoid conflicts)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Underline: __text__ (must come before italic)
    .replace(/__(.+?)__/g, '<u>$1</u>')
    // Italic: *text* (but not list bullets)
    .replace(/(?<![\*\-]\s)\*(.+?)\*/g, '<em>$1</em>')
    // Italic: _text_ (single underscore, not part of __ pair)
    .replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>');
}

/**
 * Strip markdown formatting characters from text
 * Useful for displaying abbreviated text without formatting markers
 */
export function stripMarkdown(text: string): string {
  if (!text) return '';

  return text
    // Remove headings: # Title -> Title
    .replace(/^#{1,3}\s+/gm, '')
    // Remove bold: **text** -> text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    // Remove underline: __text__ -> text
    .replace(/__(.+?)__/g, '$1')
    // Remove italic: *text* -> text
    .replace(/\*(.+?)\*/g, '$1')
    // Remove italic: _text_ -> text (single underscore)
    .replace(/(?<!_)_([^_]+?)_(?!_)/g, '$1')
    // Remove list markers: * item or - item -> item
    .replace(/^[\*\-]\s+/gm, '')
    // Remove numbered list markers: 1. item -> item
    .replace(/^\d+\.\s+/gm, '')
    // Keep line breaks as spaces for abbreviated text
    .replace(/\n/g, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}
