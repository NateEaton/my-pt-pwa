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
 * CSV column headers in order
 */
const CSV_HEADERS = [
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
] as const;

/**
 * Export exercises to CSV format
 */
export function exportExercisesToCSV(exercises: Exercise[]): string {
  const lines: string[] = [];

  // Add metadata comments
  const now = new Date().toISOString();
  lines.push('# My PT Exercise Library Export');
  lines.push(`# Exported: ${now}`);
  lines.push('# Version: 1.0');
  lines.push('');

  // Add header row
  lines.push(CSV_HEADERS.join(','));

  // Add data rows
  for (const exercise of exercises) {
    const row = CSV_HEADERS.map((header) => {
      const value = exercise[header as keyof Exercise];
      return escapeCsvField(value);
    });
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * Escape a CSV field according to RFC 4180
 * - Wrap in quotes if contains comma, quote, or newline
 * - Escape internal quotes by doubling them
 */
function escapeCsvField(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  const str = String(value);

  // Check if field needs quoting
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Escape quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return str;
}

/**
 * Parse CSV content into exercises
 * Returns parsed exercises and any errors encountered
 */
export function importExercisesFromCSV(csvContent: string): {
  exercises: Omit<Exercise, 'id' | 'dateAdded'>[];
  errors: string[];
} {
  const exercises: Omit<Exercise, 'id' | 'dateAdded'>[] = [];
  const errors: string[] = [];

  try {
    // Split into lines, removing comments and empty lines
    const lines = csvContent
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.startsWith('#'));

    if (lines.length === 0) {
      errors.push('CSV file is empty');
      return { exercises, errors };
    }

    // Parse header
    const headerLine = lines[0];
    const headers = parseCsvLine(headerLine);

    // Validate headers
    const requiredHeaders = ['name', 'type'];
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        errors.push(`Missing required column: ${required}`);
      }
    }

    if (errors.length > 0) {
      return { exercises, errors };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];

      try {
        const values = parseCsvLine(line);

        if (values.length !== headers.length) {
          errors.push(`Line ${lineNum}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
          continue;
        }

        // Build exercise object
        const exercise: any = {};

        for (let j = 0; j < headers.length; j++) {
          const header = headers[j];
          const value = values[j];

          if (value === '') {
            continue; // Skip empty values
          }

          // Type conversions
          switch (header) {
            case 'name':
              exercise.name = value;
              break;

            case 'type':
              if (value !== 'duration' && value !== 'reps') {
                errors.push(`Line ${lineNum}: Invalid type "${value}" (must be "duration" or "reps")`);
                continue;
              }
              exercise.type = value;
              break;

            case 'defaultDuration':
            case 'defaultReps':
            case 'defaultSets':
            case 'defaultRepDuration':
            case 'pauseBetweenReps':
            case 'restBetweenSets':
              const num = parseFloat(value);
              if (isNaN(num)) {
                errors.push(`Line ${lineNum}: Invalid number for ${header}: "${value}"`);
              } else {
                exercise[header] = num;
              }
              break;

            case 'sideMode':
              if (value !== 'bilateral' && value !== 'unilateral' && value !== 'alternating') {
                errors.push(
                  `Line ${lineNum}: Invalid sideMode "${value}" (must be "bilateral", "unilateral", or "alternating")`
                );
              } else {
                exercise.sideMode = value;
              }
              break;

            case 'instructions':
              exercise.instructions = value;
              break;
          }
        }

        // Validate required fields
        if (!exercise.name || !exercise.type) {
          errors.push(`Line ${lineNum}: Missing required fields (name and type)`);
          continue;
        }

        exercises.push(exercise);
      } catch (error) {
        errors.push(`Line ${lineNum}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    }
  } catch (error) {
    errors.push(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { exercises, errors };
}

/**
 * Parse a single CSV line according to RFC 4180
 * Handles quoted fields with commas, quotes, and newlines
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote - add single quote to field
          currentField += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
        i++;
      } else if (char === ',') {
        // Field separator
        fields.push(currentField);
        currentField = '';
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  // Add final field
  fields.push(currentField);

  return fields;
}

/**
 * Detect duplicate exercises by name (case-insensitive)
 */
export function detectDuplicates(
  importedExercises: Omit<Exercise, 'id' | 'dateAdded'>[],
  existingExercises: Exercise[]
): {
  newExercises: Omit<Exercise, 'id' | 'dateAdded'>[];
  duplicates: Array<{
    imported: Omit<Exercise, 'id' | 'dateAdded'>;
    existing: Exercise;
  }>;
} {
  const newExercises: Omit<Exercise, 'id' | 'dateAdded'>[] = [];
  const duplicates: Array<{
    imported: Omit<Exercise, 'id' | 'dateAdded'>;
    existing: Exercise;
  }> = [];

  // Create case-insensitive name map of existing exercises
  const existingMap = new Map<string, Exercise>();
  for (const exercise of existingExercises) {
    existingMap.set(exercise.name.toLowerCase(), exercise);
  }

  // Check each imported exercise
  for (const imported of importedExercises) {
    const existingMatch = existingMap.get(imported.name.toLowerCase());

    if (existingMatch) {
      duplicates.push({ imported, existing: existingMatch });
    } else {
      newExercises.push(imported);
    }
  }

  return { newExercises, duplicates };
}
