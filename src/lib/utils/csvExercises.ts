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
 * @fileoverview CSV import/export utilities for exercises
 * Follows RFC 4180 CSV standard with UTF-8 BOM support
 */

import type { Exercise } from '$lib/types/pt';

// --- HELPER: Parse CSV correctly, ignoring newlines inside quotes ---
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  // Normalize line endings
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    const nextChar = normalizedText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Handle escaped quotes ("") inside a field
        currentField += '"';
        i++; // Skip the next quote
      } else {
        // Toggle "inside quotes" state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Found a comma outside of quotes -> New Field
      currentRow.push(currentField);
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
      // Found a newline outside of quotes -> New Row
      currentRow.push(currentField);
      if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== '')) {
         rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      // Normal character
      currentField += char;
    }
  }

  // Handle the very last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

// --- HELPER: Escape fields for CSV Export ---
function escapeCsvField(field: any): string {
  if (field === null || field === undefined) {
    return '';
  }
  
  const stringValue = String(field);
  
  // If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

// --- MAIN: Import Function ---
export function importExercisesFromCSV(content: string): { 
  exercises: Omit<Exercise, 'id' | 'dateAdded'>[]; 
  errors: string[]; 
} {
  const exercises: Omit<Exercise, 'id' | 'dateAdded'>[] = [];
  const errors: string[] = [];

  try {
    const rows = parseCSV(content);

    if (rows.length === 0) {
      return { exercises: [], errors: ['File appears to be empty'] };
    }

    // Map Headers
    const headers = rows[0].map(h => h.trim().toLowerCase());
    
    const fieldMapping: Record<string, keyof Omit<Exercise, 'id' | 'dateAdded'>> = {
      'name': 'name',
      'type': 'type',
      'defaultduration': 'defaultDuration',
      'defaultreps': 'defaultReps',
      'defaultsets': 'defaultSets',
      'defaultrepduration': 'defaultRepDuration',
      'pausebetweenreps': 'pauseBetweenReps',
      'restbetweensets': 'restBetweenSets',
      'sidemode': 'sideMode',
      'instructions': 'instructions',
      'description': 'instructions' 
    };

    const colIndexes: Record<string, number> = {};
    
    headers.forEach((header, index) => {
      const cleanHeader = header.replace(/[^a-z0-9]/g, '');
      if (fieldMapping[cleanHeader]) {
        colIndexes[fieldMapping[cleanHeader]] = index;
      }
    });

    if (colIndexes['name'] === undefined) {
      return { exercises: [], errors: ['CSV is missing the required "name" column.'] };
    }

    // Process Data Rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0 || (row.length === 1 && !row[0])) continue;

      const nameVal = row[colIndexes['name']]?.trim();
      if (!nameVal) {
        errors.push(`Row ${i + 1}: Skipped (Missing Name)`);
        continue;
      }

      const exercise: any = {
        name: nameVal,
        type: 'rep',
        instructions: ''
      };

      for (const [key, colIndex] of Object.entries(colIndexes)) {
        if (key === 'name') continue;
        const rawValue = row[colIndex];
        if (rawValue === undefined || rawValue === '') continue;

        if (['defaultDuration', 'defaultReps', 'defaultSets', 'defaultRepDuration', 'pauseBetweenReps', 'restBetweenSets'].includes(key)) {
          const num = parseInt(rawValue);
          if (!isNaN(num)) exercise[key] = num;
        } else if (key === 'sideMode') {
          const lower = rawValue.toLowerCase().trim();
          exercise[key] = ['true', '1', 'yes', 'on'].includes(lower);
        } else {
          exercise[key] = rawValue.trim();
        }
      }

      if (exercise.type !== 'rep' && exercise.type !== 'duration') {
        exercise.type = 'rep';
      }

      exercises.push(exercise);
    }
  } catch (err) {
    console.error('CSV Import Error:', err);
    errors.push('Fatal error parsing CSV structure.');
  }

  return { exercises, errors };
}

// --- MAIN: Export Function ---
export function exportExercisesToCSV(exercises: Exercise[]): string {
  const headers = [
    'name',
    'type',
    'defaultDuration',
    'defaultReps',
    'defaultSets',
    'defaultRepDuration',
    'pauseBetweenReps',
    'restBetweenSets',
    'sideMode',
    'instructions'
  ];

  const headerRow = headers.join(',');

  const rows = exercises.map(ex => {
    return headers.map(header => {
      // @ts-ignore - Dynamic access to exercise properties
      const value = ex[header];
      return escapeCsvField(value);
    }).join(',');
  });

  return [headerRow, ...rows].join('\n');
}

// --- MAIN: Duplicate Detection ---
export function detectDuplicates(
  imported: Omit<Exercise, 'id' | 'dateAdded'>[], 
  existing: Exercise[]
) {
  const newExercises: Omit<Exercise, 'id' | 'dateAdded'>[] = [];
  const duplicates: Array<{
    imported: Omit<Exercise, 'id' | 'dateAdded'>;
    existing: Exercise;
  }> = [];

  for (const importItem of imported) {
    const match = existing.find(
      (ex) => ex.name.trim().toLowerCase() === importItem.name.trim().toLowerCase()
    );

    if (match) {
      duplicates.push({ imported: importItem, existing: match });
    } else {
      newExercises.push(importItem);
    }
  }

  return { newExercises, duplicates };
}