# CLAUDE.md

Guidance for AI coding agents working in this repository. It covers the project only. Rules about a particular machine or person (what an agent may run, who commits, where builds deploy) belong in that user's own `~/.claude/CLAUDE.md`.

## What this is

My PT is a local-first Progressive Web App for tracking home physical therapy: an exercise library, a session builder, a guided session player with audio and haptic cues, and a journal of completed sessions. SvelteKit 2, Svelte 4, TypeScript in strict mode, `@sveltejs/adapter-static` in SPA mode, and `vite-plugin-pwa` (Workbox) for the service worker. Licensed GPL-3.0-or-later.

## Non-negotiables

- **All data stays on the device**, in IndexedDB. No server, no accounts, no analytics or telemetry, no external API calls. A feature that would need a network request is a product decision for the maintainer, not an implementation detail.
- **The app works offline** once installed.
- **Old backups keep restoring.** Do not change the backup file format, the IndexedDB schema, or `DB_VERSION` without explicit approval. Any backup file the app has ever written must still pass `validateBackupData()` in `src/lib/utils/restore.ts`; normalize legacy values rather than rejecting them.

## Where things are

- `src/lib/services/PTService.ts` is the only code that touches IndexedDB. It is a singleton: import `ptService` and `ptState` from `$lib/stores/pt`, never construct it.
- `src/routes/`: Today (`+page.svelte`), `play/`, `journal/`, `settings/`, and `demo/`, which mirrors them against a separate database.
- `src/lib/types/`, with `index.ts` as the barrel export.
- `_notes/` holds the specs. `my-pt-complete-spec.md` is the canonical data model, `DATA_DURABILITY.md` covers persistence, backup and restore, and `TODO.md` lists known open items. `DOCUMENTATION_INDEX.md` lists the rest. Read the spec for a feature before changing it.

## Conventions

- Every `.ts` and `.svelte` file starts with the GPL header used throughout `src/`.
- Import types from `$lib/types`. Some files still import from `$lib/types/pt`, which does not exist (see `TODO.md`); do not add more.
- Use `$lib/...` aliases inside `src/`, not relative paths.
- New setting: add it to `AppSettings` in `src/lib/types/settings.ts` and to `DEFAULT_SETTINGS` in `PTService.ts`. `getSettings()` merges defaults over stored values, so existing users pick it up without a migration.
- Demo mode: the `demo/` routes duplicate the main pages and use the `MyPT-demo` database (`src/lib/utils/demoMode.ts`). A change to Today, the player, the journal or settings usually needs the same change in its `demo/` counterpart.
- Match the surrounding code's style, naming and comment density.

## Data safety

- Write user data only through `PTService` methods. They count changes for the backup reminder and notify the automatic backup; writing to a store directly bypasses both.
- Restore must stay a single atomic transaction (`PTService.restoreAllData`). Do not reintroduce a clear-then-re-add sequence.
- Browser storage is scoped to the origin. A different host, port or `BASE_PATH` is a different, empty database.

## Verification

- The maintainer verifies with `./deploy.sh dev`, which builds with the dev base path and publishes to the dev site for testing on a device (`test` serves a LAN preview instead; `prod` publishes to production). It needs the deployment paths in `.env`, so in a fresh clone use `npm run build` instead. There is no test suite.
- Neither `deploy.sh` nor `npm run build` type-checks. When a change touches types, `npm run check` (svelte-check) is the extra step. It currently reports errors that predate most work, chiefly the `$lib/types/pt` imports; compare against that baseline rather than expecting zero, and call out any error in a file you changed.
- When handing work back, name `./deploy.sh dev` as the build-and-test step, followed by what to try on the dev site.
- Report what was actually run. If a check was not run, say so.

## Working agreement

- Stay inside the task. Describe adjacent problems instead of fixing them; if the maintainer wants one kept, it goes in `_notes/TODO.md`.
- Never add, remove or upgrade a dependency without approval.
- Agents do not run `deploy.sh`: it deletes and replaces the contents of a live web root. Do not commit the `.env*` files.
- User-visible changes update the in-app guide (`src/lib/components/GuideDialog.svelte`) and, where relevant, the `_notes/` spec, in the same change.
