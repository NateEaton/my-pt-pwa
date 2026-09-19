# Data Durability

**Status:** Implemented 2026-09-19
**Scope:** How user data is kept on the device, what the browser guarantees, what the app does to keep it safe, and how to get it back.

## 1. Where the data lives

All user data is in one IndexedDB database named `MyPT` (demo mode uses `MyPT-demo`), schema version 1, with five object stores: `exercises`, `sessionDefinitions`, `sessionInstances`, `settings`, `metadata`. `src/lib/services/PTService.ts` is the only code that touches it. There is no server copy; the browser on the device is the only place the data exists until a backup is taken.

Browser storage is scoped to the origin (scheme, host, port). The app must always be opened from the same address; a different hostname or port is a different, empty database. The production origin is `https://my-pt.eatonfamily.net`. The Vercel deployment exists for the demo only and must not be used for real data.

## 2. What the browser guarantees, and what it does not

Without asking, browser storage is "best effort": the browser may discard it under storage pressure, by OS cleanup, or (Safari, in a browser tab) after seven days without interaction. The app asks for persistent storage at startup (`navigator.storage.persist()`), which moves the origin out of that evictable bucket. Chromium grants this silently for an installed PWA and may decline it for a plain tab; Firefox prompts.

Persistence only protects against eviction. It does nothing against:

- The user clearing site or browsing data.
- Deleting the home-screen icon on iOS, which removes the app's storage.
- Uninstalling or resetting the browser.
- Losing or replacing the device.

Only a copy outside browser storage covers those. That is what the backup layers below are for.

## 3. The layers

### 3.1 Persistent storage request

`src/lib/stores/storage.ts`. At startup, after PTService is initialized, the app checks `navigator.storage.persisted()` and requests `persist()` if not already granted. Feature-detected, wrapped, never blocks startup. In demo mode the state is read but never requested. The result, plus `navigator.storage.estimate()` usage and quota, is kept in the `storageHealth` store.

### 3.2 Storage health in Settings

Settings > Data > Storage shows whether storage is protected, space used, the last backup date and the number of changes since it, and whether the app is running installed or in a browser tab. When storage is not protected it explains what helps, with iOS-specific advice (open from the home-screen icon; deleting the icon deletes the data).

### 3.3 Backup reminders

`src/lib/utils/backupReminder.ts` decides; `BackupReminderBanner.svelte` shows a banner at the top of Today. Every user-data write (exercise, session, journal add/update/delete) increments `metadata.changesSinceBackup`. The banner appears when there is data, reminders are not off, no snooze is active, and either the reminder interval (Settings > Data > Backup reminders: weekly, every 2 weeks (default), monthly, off) has elapsed since the last backup (or since install, if none) with at least one change since, or 25 changes have accumulated regardless of time. "Later" hides it for one day. Off is the only permanent silence and lives in Settings.

### 3.4 Manual backup: download or share

Settings > Data > Backup builds a JSON file (`src/lib/utils/backup.ts`, format version 1) and downloads it, or, where the browser can share files (iOS Safari, Android Chrome), hands it to the OS share sheet so it can land in Files, iCloud Drive, Google Drive and so on. A backup counts only when the download is triggered or the share resolves; cancelling the sheet records nothing. A successful backup stamps `metadata.lastBackupDate` and resets the change counter.

### 3.5 Automatic backup folder (desktop Chromium and Chrome OS)

`src/lib/services/AutoBackupService.ts`. Where `showDirectoryPicker` exists, Settings > Data > Automatic Backup lets the user pick a folder once. The `FileSystemDirectoryHandle` is stored in the `metadata` store under its own key (`autoBackupDir`), which is never included in a backup file and is preserved across a restore. Writes are coalesced: at most one every 15 minutes while the app is in use (30 seconds after changes settle), plus one when the page is hidden or closed. Each write rewrites `my-pt-backup-latest.json` and that day's `my-pt-backup-YYYY-MM-DD.json`, so the dated file ends as the day's final state; the five most recent dated files are kept and older ones removed. Only names matching the dated pattern are ever pruned, so manual backups saved to the same folder are left alone. On startup the app re-checks permission; if the browser has forgotten the grant (typical for a browser tab, not for an installed app) the card asks the user to re-enable access. If the folder is synced by the OS (Google Drive on Chrome OS, OneDrive, iCloud Drive on a Mac) the copy leaves the device without the app making any network call.

The card is hidden on phones. Android Chrome exposes the picker but does not keep the folder permission between launches, so each start would need re-authorizing; iOS has no picker at all. Phones rely on 3.3 and 3.4.

## 4. Backup file format

```
{
  "version": 1,
  "exportDate": "<ISO timestamp>",
  "data": {
    "exercises": [...],
    "sessionDefinitions": [...],
    "sessionInstances": [...],
    "settings": {...},
    "metadata": {...}
  }
}
```

Records are stored as they are in IndexedDB, IDs included. The format is unchanged from the original export; the new metadata fields (`lastBackupDate`, `changesSinceBackup`, `backupReminderSnoozedUntil`) travel inside `metadata` and older files without them restore fine.

## 5. Restore

Settings > Data > Restore, or drop any backup file (including one written by the automatic folder). `validateBackupData()` in `src/lib/utils/restore.ts` checks the whole file first: numeric unique IDs on every record, required fields (`name` and `type` on exercises; `name` and `exercises` with `exerciseId`s on sessions; `date`, `sessionDefinitionId`, `sessionName`, `status`, `completedExercises` on journal entries), and rejects with a message naming the offending entry. Only then does `PTService.restoreAllData()` replace the stores, in a single IndexedDB transaction: clear, then `add()` every record with its original ID. If anything fails the transaction aborts and the previous data is untouched. Missing `settings` or `metadata` are replaced with defaults. After a successful restore the file's `exportDate` is recorded as the last backup, since the device now holds exactly that file.

To move data to a new device or browser: take a backup on the old one (share or download), open the app on the new one from the production origin, install it to the home screen, then Restore.

## 6. Failure modes still open

- A phone with reminders turned off and no backup taken has no protection beyond persistence.
- Restore replaces everything; there is no merge.
- The automatic folder's permission can lapse silently between sessions in a browser tab; the Settings card surfaces it but nothing nags.
- Nothing here protects against a device being lost between backups. Native-style background backup would need a network target, which the app deliberately does not have.
