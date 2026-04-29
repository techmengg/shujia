# MangaUpdates migration — deploy runbook

One-shot procedure for merging `mangaupdates-migration` into `main` and
shipping the MangaDex → MangaUpdates cutover with **zero user-data loss** and
the smallest possible navigation regression.

This doc exists because the migration is unusual: live users, primary data
source swap, MD UUIDs and MU integer IDs coexisting in `ReadingListEntry`,
and the MangaDex client has been removed from the codebase. Read it before
merging and again before deploy.

> **2026-04-28 decision:** stay on Prisma Postgres for this deploy and
> switch to Neon as a separate follow-up task ("Path B"). Reason: don't
> stack two infra changes in one day. The pg_dump-based snapshot here is
> the bridge until Neon's managed PITR + branching takes over.

## What ships

- 3 additive Prisma migrations:
  - `20260425021540_add_reviews` — new `Review` table; backfills existing
    `ReadingListEntry.rating` into `Review` (rounded/clamped, `ON CONFLICT
    DO NOTHING`).
  - `20260425060000_add_review_reactions` — new `ReviewReaction` table.
  - `20260426010000_add_profile_customization` — adds nullable `bannerUrl`,
    `profileColor`, defaulted `favoriteMangaIds` columns on `User`.
- MangaDex service/client deleted; `/api/manga/{explore,recent,resolve}`
  and `/api/images/cover` removed.
- Lazy MD→MU migrator (`web/src/lib/manga/migrate.ts`) runs fire-and-forget
  on home page and reading-list reads. Conservative match policy: exactly
  one MU candidate by normalized title, with year agreement when both sides
  have one. Preserves `progress`, `rating`, `notes`, `createdAt`. Swap is a
  single transaction.
- Reading list, reviews, and home rails are provider-aware and continue to
  render `provider="mangadex"` rows from cached row fields.

## Why this is safe for user data

- All 3 migrations are **additive** — no `DROP`, no `NOT NULL` add on
  existing column, no rename. `ReadingListEntry` is byte-identical.
- Reviews migration **backfills**, never overwrites. Pre-existing
  `ReadingListEntry.rating` becomes a `Review` row only when no review
  already exists for that `(authorId, provider, mangaId)`.
- The auto-migrator never touches a row unless it has high confidence
  (single normalized-title match + year agreement). User-owned fields are
  carried over inside a transaction; the old MD row is deleted in the same
  transaction.

## The one known regression

Until the migrator promotes a given MD entry, clicking through to its
`/manga/<MD-UUID>` detail page **404s** (the MangaDex service is gone, and
`getMangaDetails(id, "mangadex")` returns `null`). The reading-list card
itself still renders fine because `ReadingListEntry` caches `title`,
`coverImage`, `description`, `latestChapter`, etc. on the row.

**Mitigation**: run `web/scripts/warmup-md-migration.ts` immediately after
deploy to convert as many MD entries as possible up front.

## Pre-merge checklist

Run from `web/` unless noted.

- [ ] **Audit branch state** — `git log --oneline main..mangaupdates-migration`
      should match the 12 commits captured at audit time (latest:
      `f0c09fb feat(profile): revamp user profile with banner, accent color,
      favorites, and rating distribution`).
- [ ] **Local typecheck + lint** — `pnpm typecheck` and `pnpm lint`. If
      typecheck complains about `reviewReaction` / `bannerUrl` missing from
      Prisma types, you need `pnpm exec prisma generate` first (note: the
      project pins Prisma 6 — use `pnpm exec`, not `pnpm dlx`, since the
      latter pulls Prisma 7 which rejects `url = env(...)` in schema). If
      generate fails with `EPERM rename ... query_engine-windows.dll.node`,
      stop the dev server first — Node holds the engine DLL open on Windows.
- [ ] **Take a fresh prod DB snapshot via pg_dump.** Hosting is **Prisma
      Postgres** (Vercel project `shujiadb`, console at console.prisma.io).
      The free tier has **no managed backups** — upgrading to Starter is
      strongly recommended for ongoing protection, but for one-shot
      pre-deploy snapshots use the helper script:
      1. Install pg client tools if not already: `choco install postgresql`
         (need pg_dump major version >= server major version; Prisma
         Postgres is currently Postgres 17.x).
      2. Grab the **direct** `postgresql://...` connection URL (NOT the
         Accelerate `prisma://` one) from the Prisma console for this
         project. It's under the Connect / Setup section.
      3. From PowerShell at the repo root:
         ```
         $env:BACKUP_DATABASE_URL = "<the postgresql:// direct URL>"
         ./web/scripts/backup-prod.ps1
         ```
         Output lands in `<repo-root>/backups/shujia-prod-*.dump` (gitignored).
         Treat the file like a credential — it's plaintext prod data.
      4. Verify size is plausible (≥ a few MB for a real user base) before
         proceeding.

      **2026-04-28 17:02 ET execution log:**
      - Snapshot taken: `backups/shujia-prod-20260428-170239.dump` (1.74 MB).
      - pg_dump 18.3 against Prisma Postgres (server reported as Postgres 17.x).
      - Connection-string credential leaked in chat during the snapshot;
        rotated in Vercel Storage UI immediately after. New credential
        propagated to all three env vars and the live site smoke-tested
        green at ~17:15 ET.
      - Lessons learned next time:
        - Chocolatey's `postgresql` package installs the binaries to
          `C:\Program Files\PostgreSQL\18\bin\` but does NOT add them to
          PATH — invoke pg_dump by full path or use the script's fallback.
        - Don't paste the full URL into chat. Instead, copy to clipboard
          and pipe it directly into the env var inside a fresh shell. The
          URL pasted on 2026-04-28 was leaked in chat and required
          subsequent rotation.
        - Copying the connection string from the Prisma web UI introduced
          an invisible whitespace character mid-host (`db.prisma.i o`).
          Always sanitize: `$env:BACKUP_DATABASE_URL = ($env:BACKUP_DATABASE_URL -replace '\s', '')`.
        - PowerShell 5.1 chokes on literal "using" inside double-quoted
          strings — keep helper scripts simple or invoke pg_dump via a
          one-liner.
- [ ] **Dry-run on a restored copy.** Spin up a scratch DB from the
      snapshot, point `DATABASE_URL` at it, then:
      ```
      pnpm exec prisma migrate deploy
      pnpm dlx tsx scripts/migration-stats.ts
      ```
      Confirm: all 3 migrations apply cleanly, `Review` table is populated
      from existing ratings, no errors.

## Merge + deploy

- [ ] Merge `mangaupdates-migration` → `main`. **Never force-push to main.**
- [ ] Vercel build runs `pnpm exec prisma generate && pnpm exec prisma
      migrate deploy && pnpm exec next build` — the Prisma client and `.next/`
      are regenerated fresh, so any local-machine staleness does not affect
      prod.
- [ ] Watch the deploy log specifically for the `migrate deploy` step.
      Confirm it applies the 3 new migrations without warnings.

## Post-deploy actions

Run from `web/`, with `DATABASE_URL` pointing at **prod** (or wherever you
just deployed). Both scripts are read-mostly; the warmup is the only one
that mutates rows, and it only does the same conservative MD→MU swap the
lazy migrator would do.

- [x] **Warm up the MD→MU migration (three passes):**
      The straggler tail is real, so we shipped three progressively looser
      matchers in `src/lib/manga/migrate.ts`. Run them in order against
      prod after deploy; each one only operates on whatever's still on
      `provider="mangadex"`.
      ```
      pnpm dlx tsx scripts/warmup-md-migration.ts             # strict
      pnpm dlx tsx scripts/warmup-md-migration-loose.ts       # multi-candidate + lev<=3
      pnpm dlx tsx scripts/warmup-md-migration-alt-titles.ts  # search by alt-title
      ```
      Sequential, 350ms between MU API calls.

      **2026-04-28 execution (3389 starting MD entries):**
      | Pass | Promoted | Cumulative coverage |
      |---|---|---|
      | strict (exact normalized match + year agreement) | 2293 | 67.7% |
      | loose (multi-candidate + Levenshtein ≤ 3) | 530 | 83.3% |
      | alt-titles (per-alt-title search, dedup'd) | 57 | 85.0% |
      | **residual** (no safe match) | **509** | — |

      Going below ~15% residual without false positives is not feasible —
      the remainder are genuinely missing from MU's catalog (defunct
      doujin, hentai-filtered, romanization extremes with no alt-title
      overlap, multi-volume editions split per volume). Don't try
      Levenshtein ≥ 5 or suffix-stripping — false-positive rate spikes.
- [x] **Check stats:** `pnpm dlx tsx scripts/migration-stats.ts` for the
      per-user breakdown. Already confirmed the post-deploy split.
- [x] **Smoke test** as a real user:
  - Reading list renders with both MD and MU entries. ✓
  - Adding a manga via search writes `provider="mangaupdates"`. ✓
  - A review on an MU page persists and shows reactions. ✓
  - Profile banner / accent color / favorites round-trip via Settings. ✓
- [x] **Relink UX for the residual tail.** Owner sees an italic
      `(legacy entry) relink →` on each MD row in their list. The dialog
      (`web/src/components/reading-list/relink-dialog.tsx`) is seeded
      with the entry's title, hits `/api/manga/search`, and on pick calls
      `POST /api/reading-list/relink` which does the upsert+delete in
      one transaction (preserves progress / rating / notes / createdAt).
      Cover and title for legacy rows no longer link to `/manga/<id>`
      since those 404 — they open the relink dialog for owners and stay
      non-interactive for visitors.

## Rollback

If something goes wrong post-deploy:

- **Code-only revert** is safe — the schema additions are non-breaking, so
  `main` can ship a revert commit without rolling back the DB. Reviews and
  customization data simply become orphaned (but preserved).
- **Schema rollback** requires a manual restore from the pre-deploy
  snapshot. Do not write a "down" migration that drops `Review` /
  `ReviewReaction` tables on a live DB — you will lose newly-written user
  reviews/reactions. Restore from snapshot is the right tool.

## Why each script exists

- `web/scripts/migration-stats.ts` — read-only diagnostic. Run anytime
  to see provider breakdown; prints top-10 users still on MD so you can
  spot whether stragglers are concentrated or spread evenly.
- `web/scripts/warmup-md-migration.ts` — proactive version of what the
  lazy migrator does on demand. Sequential with a 350ms delay between
  calls to respect the MangaUpdates Acceptable Use Policy. Calls
  `tryMigrateEntryToMangaUpdates` directly, so logic stays in one place.

## What was verified at audit time

- Schema diff vs `main` confirmed additive only.
- `ReadingListEntry` has not changed shape.
- Auto-migrator preserves `progress`, `rating`, `notes`, `createdAt`.
- Reading-list page sources `title`/`coverImage`/etc. from cached row
  fields — does not require a live MD fetch to render.
- `inferProviderFromId` correctly routes UUID-shaped IDs to `"mangadex"`
  and integer-shaped IDs to `"mangaupdates"`.
- Reviews backfill SQL is idempotent (`ON CONFLICT DO NOTHING`).
