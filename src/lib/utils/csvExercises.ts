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

/**
 * robust CSV Parser
 * Handles quoted fields containing commas or newlines.
 * Escaped quotes ("") are converted to single quotes (").
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  // Normalize line endings to avoid issues with Windows (\r\n) vs Unix (\n)
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    const nextChar = normalizedText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Handle escaped quotes ("") inside a field -> treat as single literal quote
        currentField += '"';
        i++; // Skip the next quote
      } else {
        // Toggle "inside quotes" state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Found a comma outside of quotes -> End of Field
      currentRow.push(currentField);
      currentField = '';
    } else if (char === '\n' && !inQuotes) {
      // Found a newline outside of quotes -> End of Row
      currentRow.push(currentField);
      
      // Only push if row has data (ignore empty lines at end of file)
      if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== '')) {
         rows.push(currentRow);
      }
      
      currentRow = [];
      currentField = '';
    } else {
      // Normal character, just add to field
      currentField += char;
    }
  }

  // Push the very last field and row if content didn't end with \n
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

export function importExercisesFromCSV(content: string): { 
  exercises: Omit<Exercise, 'id' | 'dateAdded'>[]; 
  errors: string[]; 
} {
  const exercises: Omit<Exercise, 'id' | 'dateAdded'>[] = [];
  const errors: string[] = [];

  try {
    // 1. Parse content using the robust parser
    const rows = parseCSV(content);

    if (rows.length === 0) {
      return { exercises: [], errors: ['File appears to be empty'] };
    }

    // 2. Map Headers
    // Get the first row as headers, normalize to lowercase/trimmed
    const headers = rows[0].map(h => h.trim().toLowerCase());
    
    // Define mapping from CSV header names (lowercase) to Exercise object keys
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
      'description': 'instructions' // Allow 'description' as alias for instructions
    };

    const colIndexes: Record<string, number> = {};
    
    // Identify which column index belongs to which field
    headers.forEach((header, index) => {
      // Remove spaces/special chars from header for fuzzy matching (e.g., "Default Reps" -> "defaultreps")
      const cleanHeader = header.replace(/[^a-z0-9]/g, '');
      
      if (fieldMapping[cleanHeader]) {
        colIndexes[fieldMapping[cleanHeader]] = index;
      }
    });

    // Validate mandatory 'name' column exists
    if (colIndexes['name'] === undefined) {
      return { 
        exercises: [], 
        errors: ['CSV is missing the required "name" column.'] 
      };
    }

    // 3. Process Data Rows (start at index 1 to skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip completely empty rows
      if (row.length === 0 || (row.length === 1 && !row[0])) continue;

      // Extract Name
      const nameVal = row[colIndexes['name']]?.trim();
      
      if (!nameVal) {
        errors.push(`Row ${i + 1}: Skipped (Missing Name)`);
        continue;
      }

      // Initialize object with required Type defaults
      // We cast to 'any' temporarily to build the object dynamically
      const exercise: any = {
        name: nameVal,
        type: 'rep', // Default type if not specified
        instructions: ''
      };

      // Populate other fields if they exist in the CSV
      for (const [key, colIndex] of Object.entries(colIndexes)) {
        if (key === 'name') continue; // Already handled

        const rawValue = row[colIndex];
        if (rawValue === undefined || rawValue === '') continue;

        // Type conversion
        if ([
          'defaultDuration', 
          'defaultReps', 
          'defaultSets', 
          'defaultRepDuration', 
          'pauseBetweenReps', 
          'restBetweenSets'
        ].includes(key)) {
          const num = parseInt(rawValue);
          if (!isNaN(num)) {
            exercise[key] = num;
          }
        } else if (key === 'sideMode') {
          // Convert 'true', 'TRUE', '1', 'yes' to boolean true
          const lower = rawValue.toLowerCase().trim();
          exercise[key] = ['true', '1', 'yes', 'on'].includes(lower);
        } else {
          // Strings (type, instructions)
          exercise[key] = rawValue.trim();
        }
      }

      // Validate 'type' is valid
      if (exercise.type !== 'rep' && exercise.type !== 'duration') {
        exercise.type = 'rep'; // Fallback
      }

      exercises.push(exercise);
    }

  } catch (err) {
    console.error('CSV Import Error:', err);
    errors.push('Fatal error parsing CSV structure.');
  }

  return { exercises, errors };
}

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
    // Case-insensitive name match
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