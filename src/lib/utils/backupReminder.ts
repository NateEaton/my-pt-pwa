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
 * @fileoverview Backup reminder policy
 *
 * Decides whether the "time to back up" banner should show. Pure function
 * of settings and metadata so it can be reasoned about (and tested) without
 * the database.
 */

import type { AppSettings, DBMetadata, BackupReminderInterval } from '$lib/types';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Changes that trigger a reminder regardless of how recent the last backup was.
 * A change is a journal entry added or deleted, or an exercise or session
 * edit (see PTService.noteDataChange), so this is roughly ten sessions.
 */
export const CHANGE_THRESHOLD = 10;

/** How long "Later" hides the reminder. Sessions are near-daily, so a day is enough. */
export const SNOOZE_DAYS = 1;

const INTERVAL_DAYS: Record<Exclude<BackupReminderInterval, 'off'>, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30
};

export interface BackupReminderInput {
  settings: Pick<AppSettings, 'backupReminderInterval'> | null;
  metadata: DBMetadata | null;
  /** Whether there is anything worth backing up (no data, no nag) */
  hasData: boolean;
  now?: Date;
}

/**
 * True when the reminder banner should be shown.
 *
 * Shows when there is data, reminders are not off, the snooze has lapsed, and
 * either:
 * - enough time has passed since the last backup (or since install, if there
 *   has never been one) and something has changed since, or
 * - CHANGE_THRESHOLD changes have piled up regardless of time.
 *
 * "Something has changed" is assumed when there has never been a backup, since
 * the counter only started with this feature and existing data predates it.
 */
export function shouldShowBackupReminder(input: BackupReminderInput): boolean {
  const { settings, metadata, hasData } = input;
  const now = input.now ?? new Date();

  if (!hasData) return false;

  const interval = settings?.backupReminderInterval ?? 'biweekly';
  if (interval === 'off') return false;

  const snoozedUntil = parseDate(metadata?.backupReminderSnoozedUntil);
  if (snoozedUntil && snoozedUntil.getTime() > now.getTime()) return false;

  const changes = metadata?.changesSinceBackup ?? 0;
  const lastBackup = parseDate(metadata?.lastBackupDate);
  const neverBackedUp = lastBackup === null;

  if (changes >= CHANGE_THRESHOLD) return true;

  const since = lastBackup ?? parseDate(metadata?.installDate);
  if (!since) {
    // No usable dates at all (metadata missing or unreadable). The change
    // threshold was already checked above; unknown state otherwise stays quiet.
    return false;
  }

  const elapsedDays = (now.getTime() - since.getTime()) / DAY_MS;
  const due = elapsedDays >= INTERVAL_DAYS[interval];

  return due && (changes > 0 || neverBackedUp);
}

/** ISO timestamp SNOOZE_DAYS from now, for PTService.snoozeBackupReminder */
export function snoozeUntil(now: Date = new Date()): string {
  return new Date(now.getTime() + SNOOZE_DAYS * DAY_MS).toISOString();
}

function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
