<div align="center">

[简体中文](README.md) · [English](README.en.md)

</div>

# Photo Library

A private photo library for one person. Sort what you have shot by place, style, composition and your own tags, then flip through it slowly and find things again.

Writes land in the browser's IndexedDB first, so the interface updates immediately. After you sign in, a local outbox pushes the same records to your own Supabase project.

![Gallery](assets/screenshots/gallery.png)

## What it does

- **Gallery** — waterfall and grid layouts, lightbox viewing, built narrow-screen first.
- **Faceted filtering** — place, style, composition, year, orientation, favourites. They stack, and each facet shows how many works the current selection would match.
- **Shareable results** — the active selection is encoded in the URL, so copying the link reopens the same set of works.
- **Adding works** — one at a time, or batch import (one file, one work). During a batch import you can paste a JSON blob of tags matched by filename.
- **Tag management** — rename or delete places, styles, compositions and custom tags. Deleting a tag only removes the reference; the work itself stays.
- **Local-first** — data lives in IndexedDB, so the library is browsable offline.
- **Cloud sync** — after signing in with Google, works sync to your own Supabase project under the dedicated `photo_library` schema. Demo data never leaves the device.
- **PWA** — the build emits a service worker and a manifest, so it can be added to the home screen.

## Quick start

```bash
pnpm install
pnpm dev
```

Open http://localhost:5000 . On the very first visit the app writes a set of demo works (24 of them) so you can see what the interface looks like before adding anything. Clear them later under "我的 → 清除演示数据".

The port-clearing step inside `pnpm dev` relies on `ss`, which macOS does not ship, so that step is skipped silently there. If port 5000 is already taken, the equivalent command is:

```bash
PORT=5000 pnpm tsx watch server/server.ts
```

## Screens

| Filtering | Adding a work |
| --- | --- |
| ![Filtering](assets/screenshots/find.png) | ![Adding a work](assets/screenshots/add.png) |

On the left: the result of stacking "风光 + 收藏". The active-filter bar lists what is currently applied and clears it in one click, and the counts next to places and facets move along with the selection.

| Tag management | Me | Narrow screen |
| --- | --- | --- |
| ![Tag management](assets/screenshots/tags.png) | ![Me](assets/screenshots/me.png) | ![Narrow screen gallery](assets/screenshots/mobile.png) |

## How data moves

Every write is local first: the change is committed to IndexedDB and the interface updates right away, while a pending-push record is appended to the outbox. Once you are signed in, the outbox pushes in dependency order — parents before children, the reverse for deletes — and a failure surfaces with its concrete reason.

The app is fully usable signed out; records simply stay queued. The "我的" page shows the pending count and the current sync state.

The demo works written on first launch carry an `isDemo` flag and are filtered out before sync, so they never reach the cloud.

## Environment variables

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL. Left empty, cloud sync switches off entirely and everything else keeps working. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable key. Same as above. |

Both are public and end up in the browser bundle at build time. Only publishable / anon-level
keys belong here — never a service role key.

## Docker

```bash
docker compose up -d
```

The host port defaults to 8082, the container listens on 3000, and the health check hits `/healthz`. Override the port with `APP_PORT`:

```bash
APP_PORT=9000 docker compose up -d
```

The image is based on Node 22 and built in stages: the two `VITE_*` variables above are injected
during the build stage, and the runtime stage starts Express as a non-root user.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Development server on port 5000 |
| `pnpm build` | Build the frontend and bundle the server |
| `pnpm start` | Production preview on port 5000 |
| `pnpm ts-check` | TypeScript type check |
| `pnpm lint` | ESLint |

`pnpm test` does not currently run: the repository contains no test files (`.gitignore` also
ignores `*.test.ts` / `*.test.tsx`), so it exits with `No test files found`. It is therefore
not listed as a working command here.

## Stack

React 19 · TypeScript · Vite 7 · Tailwind CSS 3 · React Router v7 · IndexedDB (idb) ·
Supabase JS · vite-plugin-pwa · Lucide React · Express · pnpm 9

## Layout

```
src/
├── lib/          types, facet config, filter engine, IndexedDB, sync, Supabase, image processing
├── components/   gallery grid, cards, lightbox, facet sidebar and bar, search, sync status
├── pages/        Gallery / Find / WorkDetail / AddWork / TagsPage / Me
└── stores/       WorkStore (data and sync state as React context)
server/           Express server for development and production
scripts/          dev / build / start scripts
docs/             architecture, database, deployment, planning, QA, review, handoff
```

Facet dimensions live in `src/lib/facet-config.ts`; the UI reads that config rather than
hard-coding anything in components.

## Documentation

- [AGENTS.md](AGENTS.md) — collaboration entry point and project conventions
- [Architecture: data contract](docs/architecture/DATA_CONTRACT.md) · [facet engine](docs/architecture/FACET_ENGINE.md) · [local-first sync](docs/architecture/LOCAL_FIRST_SYNC.md)
- [Supabase integration proposal](docs/db/SUPABASE_INTEGRATION_PROPOSAL.md)
- [Deployment handoff (Mac mini + Docker)](docs/deployment/MAC_MINI_DOCKER_HANDOFF.md)
- [Plan](docs/pm/PLAN.md) · [QA checklist](docs/qa/QA_CHECKLIST.md) · [Known bugs](docs/qa/BUGS.md)
- [Handoff notes](docs/handoff/HANDOFF.md)

## Status and known limitations

- Shipped: gallery, filtering, adding and batch import, work detail, tag management, the local-first loop, Supabase sync, Docker deployment. Wrap-up (M5) is not finished.
- A fix for outbox dependency ordering is written in the code but has **not been verified end to end**, so treat it as unverified.
- `pnpm test` does not run (see above).
- Demo data points at Unsplash URLs and therefore **requires network access**; offline, those images will be blank.
- The "导出数据" button on the "我的" page is interface only — not implemented.
- The repository has **no LICENSE file** and **no public site URL** (only local dev and your own Docker host). Settle licensing and deployment yourself before putting this anywhere public.
- PWA installation and real-device behaviour on iOS/Android could not be verified from this repository.

A personal project. The README describes the code as it actually is, without embellishment.