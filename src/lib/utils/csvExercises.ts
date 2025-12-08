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

import type { Exercise } from '$lib/types';

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
      
      // We push the row even if it looks empty here; 
      // filtering of empty/comment lines happens in the main import function
      rows.push(currentRow);
      
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
    // 1. Remove BOM if present (prevents ï»¿ issues)
    // \uFEFF is the Byte Order Mark character
    const cleanContent = content.startsWith('\uFEFF') ? content.slice(1) : content;

    // 2. Parse content using robust parser
    const allRows = parseCSV(cleanContent);

    // 3. Filter out Comment lines (#) and Empty lines
    const dataRows = allRows.filter(row => {
        // Skip empty rows
        if (row.length === 0 || (row.length === 1 && !row[0].trim())) return false;
        
        // Skip comment rows (starts with #)
        const firstCell = row[0].trim();
        if (firstCell.startsWith('#')) return false;

        return true;
    });

    if (dataRows.length === 0) {
      return { exercises: [], errors: ['File appears to contain no data'] };
    }

    // 4. Map Headers (First non-comment row is header)
    const headers = dataRows[0].map(h => h.trim().toLowerCase());
    
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

    // 5. Process Data Rows (Skip header row)
    for (let i = 1; i < dataRows.length; i++) {
      const row = dataRows[i];

      const nameVal = row[colIndexes['name']]?.trim();
      if (!nameVal) {
        // We calculate row number based on dataRows, actual file line might differ due to comments
        // but this is usually sufficient for user feedback
        errors.push(`Row (Data) ${i + 1}: Skipped (Missing Name)`);
        continue;
      }

      const exercise: any = {
        name: nameVal,
        type: 'reps',
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

      if (exercise.type !== 'reps' && exercise.type !== 'duration') {
        exercise.type = 'reps';
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
  // 1. Define Metadata
  const metadata = [
      '# My PT Exercise Library Export',
      `# Exported: ${new Date().toISOString()}`,
      '# Version: 1.0'
  ].join('\n');

  // 2. Define Headers
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

  // 3. Generate Data Rows
  const rows = exercises.map(ex => {
    return headers.map(header => {
      // @ts-ignore - Dynamic access to exercise properties
      const value = ex[header];
      return escapeCsvField(value);
    }).join(',');
  });

  // 4. Combine parts
  return metadata + '\n' + headerRow + '\n' + rows.join('\n');
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