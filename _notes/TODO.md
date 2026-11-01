# TODO

Open items noticed during other work that were deliberately not fixed at the time. One heading per item; remove the item when it ships.

## Service worker: navigation fallback fails to install on sub-path deployments

**Noticed:** 2026-09-18, on the dev deployment (`BASE_PATH=/my-pt-pwa-dev`), while verifying persistent storage. Not caused by that change.

**Symptom:** On every load the service worker logs, at startup:

```
Uncaught (in promise) non-precached-url: non-precached-url :: [{"url":"index.html"}]
    at Y.createHandlerBoundToURL (workbox-....js)
    at sw.js
```

**What is happening:** `vite-plugin-pwa`'s generated service worker calls `createHandlerBoundToURL('index.html')` for its default `navigateFallback`. Under a sub-path deployment that bare URL does not match the precache manifest entry (which is resolved against the base path), so Workbox throws and the navigation fallback route is never registered. Online use is unaffected. Offline navigation to any route other than one already in the runtime `navigation` cache likely fails on the dev instance.

**Relevant config:** `vite.config.js` (`VitePWA` options: `workbox.globPatterns`, `includeAssets: ["favicon.ico", "index.html"]`, no explicit `navigateFallback`) and `svelte.config.js` (`adapter-static` with `fallback: 'index.html'`, `base` from `BASE_PATH`).

**To check first:** Whether prod (served at root) shows the same error in its console. If it does not, this is dev-only and lower priority.

**Likely fix:** Set `workbox.navigateFallback` explicitly to the base-qualified path (e.g. `${base_path}index.html`) in `vite.config.js`, or set it to `null` and rely on the existing `NetworkFirst` runtime route for navigations, then confirm offline navigation on both the root and sub-path deployments.

## Stale type import path `$lib/types/pt`

**Noticed:** 2026-09-19, during the durability work.

Sixteen files import types from `$lib/types/pt`, which does not exist (`src/lib/types/` has `exercise.ts`, `index.ts`, `session.ts`, `settings.ts`). The build passes only because every one is an `import type`, which is erased before Vite resolves the path, so this is a type-check failure rather than a runtime one. `npm run check` should be reporting "Cannot find module '$lib/types/pt'" for each. Fix is mechanical: replace `'$lib/types/pt'` with `'$lib/types'` (the barrel export) across `src/`, then confirm the barrel exports everything those files use, and check the error count drops accordingly.

## Demo data reload is keyed on the backup format version

**Noticed:** 2026-09-19, while fixing four `type: "rep"` exercises in `static/demo-backup.json` (should be `"reps"`; the restore validator now rejects the old value).

`DemoService` decides whether to (re)load demo data by comparing `backup.version` from the file against `localStorage[DEMO_VERSION_KEY]`. That field is the backup *format* version (currently `1`), not a demo *content* version, so editing the demo data does not trigger a reload for visitors who already have the demo database. Options: add a separate `demoVersion` field to the file and key on that, or clear the flag on deploy. Until then, existing demo visitors keep the previous demo content.
