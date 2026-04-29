# shujia

a community-driven directory and tracker for manga, manhwa, and manhua. think mal/imdb/letterboxd, but focused on comics. live at **[shujia.dev](https://shujia.dev)**.

> built solo by [@s4lvaholic](https://x.com/s4lvaholic). open-source under AGPL-3.0 — see [LICENSE](./LICENSE).

---

## overview

shujia is a full-stack web app for tracking serialized comics across regions and languages. you can sign in, build a reading list with progress + ratings + notes, write reviews, follow other readers, and discover new series via curated rails and filters.

the catalog data comes from the **mangaupdates** rest api. the user-facing layer (accounts, reading lists, reviews, follows, profiles) is shujia's own.

eventually i want to expand beyond comics into **anime, tv, and dramas**, while keeping the editorial-minimalist aesthetic consistent.

---

## features

### reader experience

* home with discovery rails — trending by language (manga/manhwa/manhua), popular new titles, recent releases
* `/explore` page with filters (sort, type, genre, year), filterable browse, infinite scroll
* manga detail pages with synopsis, contributors, tags, content rating, scanlation groups, community rating, reviews
* random comics — `/manga/random` redirects to a randomly-picked popular series
* universal right sidebar (lg+ viewports): news headlines (anime news network rss), discover links, recent reviews from the community, "who to follow" suggestions, your library shortcuts, your continue-reading card, your top genres
* search bar in the nav with debounced results and quick "add to list" actions

### accounts, auth, and security

* email-based authentication with bcrypt-hashed passwords and signed session cookies
* google oauth sign-in/sign-up with stateful redirect support
* email verification before account creation (resend or smtp)
* optional totp two-factor auth with recovery codes
* password reset flow with signed, expiring tokens
* per-route rate limiting backed by prisma attempt logs (ip + identifier scope)
* session management, device sign-out, marketing/notification preferences
* 2fa enable/disable flows with re-auth requirements

### profile + social

* customizable profile page at `/<username>`: avatar, banner, accent color, bio with light markdown, favorite-series picker (8 slots), member-since, status distribution, rating distribution + stats, recent activity, top genres, recent reviews
* follow / follower system with dedicated `/<username>/followers` and `/<username>/following` list pages
* community ratings + reviews with reactions (thumbs up/down, heart, funny, confusing, angry); review upserts sync to your reading-list entry
* `/<username>/reading-list` is the canonical reading-list URL — public, sortable, status-filterable, searchable
* csv / json export for your reading list, csv / json import, mal xml import (legacy)

### content + data pipeline

* mangaupdates rest integration with edge-cached `unstable_cache` calls (5min for trending/recent, 1h for series details, 1h for popular)
* prisma orm: users, sessions, reading lists, reviews, reactions, follows, verification queues, rate-limit logs
* avatar / banner uploads via vercel blob with a local `public/uploads/` fallback in dev
* type-safe server actions and route handlers (typescript + zod everywhere)
* dynamic sitemap.xml + robots.txt + json-ld structured data on every manga page (comicseries schema with title, alt titles, synopsis, image, language, year, genres, authors, illustrators, aggregate rating)

---

## architecture

| layer       | stack                                                                                          |
| :---------- | :--------------------------------------------------------------------------------------------- |
| frontend    | next.js 15 (app router, turbopack), react 19 server components, tailwind v4, shadcn-inspired ui |
| backend     | next.js route handlers + server actions, prisma 6                                              |
| database    | postgresql                                                                                     |
| auth        | cookie sessions (bcrypt), google oauth, email verification, totp 2fa                           |
| storage     | vercel blob (avatars/banners) + local dev fallback                                             |
| email       | resend (default) or smtp fallback                                                              |
| data source | mangaupdates rest api                                                                          |
| news widget | anime news network rss (1h cached)                                                             |
| tooling     | typescript, zod, eslint, prisma                                                                |

---

## project structure

* `web/src/app/**` — app router pages + api routes (`(auth)`, `api`, `explore`, `manga`, `profile`, `reading-list`, `roadmap`, `settings`, `users`, `[username]`)
* `web/src/components/**` — reusable ui (auth forms, manga cards, sidebar, profile, reading-list client, etc.)
* `web/src/lib/{auth,email,mangaupdates,manga,security,theme,news}` — helpers + clients
* `web/prisma/{schema.prisma,migrations/}` — schema + timestamped sql migrations
* `web/src/middleware.ts` — edge middleware (currently lightweight perf logging)
* `public/**` — static assets (logos, default avatars, hero images)

---

## getting started

### prerequisites

* **node.js** ≥ 18
* **pnpm** ≥ 10 (pinned via `packageManager` field — enable with `corepack enable`)
* **postgresql** (local or hosted)

### setup

```bash
git clone https://github.com/techmengg/shujia.git
cd shujia/web
corepack enable
pnpm install
cp .env.example .env
```

then fill out `.env`. for the fastest local-dev path, run the bundled
docker postgres helper (skips manual postgres setup):

```bash
# from web/
./setup-local-db.sh        # macOS / linux
./setup-local-db.ps1       # windows powershell
```

it spins up a postgres 16 container at `localhost:5433` and applies all
prisma migrations. the default `DATABASE_URL` in `.env.example` already
matches.

---

## environment variables

see [`web/.env.example`](./web/.env.example) for the canonical list with
inline comments. summary:

| variable                          | description                                                  | required for         |
| :-------------------------------- | :----------------------------------------------------------- | :------------------- |
| `DATABASE_URL`                    | postgres connection string                                   | always               |
| `APP_BASE_URL`                    | canonical site url (emails, oauth, share links)              | always               |
| `NEXT_PUBLIC_APP_URL`             | public-facing site url (sitemap, og tags)                    | always               |
| `MANGAUPDATES_API_BASE`           | mangaupdates api base                                        | always               |
| `NEXT_PUBLIC_MANGAUPDATES_API_BASE` | client-side mu api base                                    | always               |
| `GOOGLE_CLIENT_ID` / `..._SECRET` | google oauth credentials                                     | google sign-in       |
| `RESEND_API_KEY` + `EMAIL_FROM`   | transactional email via resend (preferred)                   | email flows          |
| `SMTP_HOST` / `_PORT` / `_USER` / `_PASS` / `_SECURE` | smtp fallback if not using resend         | email fallback       |
| `BLOB_READ_WRITE_TOKEN`           | vercel blob token; falls back to local fs if missing         | cloud uploads        |
| `NEXT_PUBLIC_BLOB_BASE_URL`       | public blob url prefix for avatars/banners                   | cloud uploads        |

for google sign-in, create an oauth client in google cloud console and add `${APP_BASE_URL}/api/auth/google/callback` as an authorized redirect.

email delivery prefers [resend](https://resend.com) — set `RESEND_API_KEY` + `EMAIL_FROM`, then add an spf record like `v=spf1 include:amazonses.com ~all` for sender verification. without resend, supply the smtp vars and the system falls back automatically.

---

## database + migrations

```bash
pnpm dlx prisma migrate dev --name <migration_name>   # create + apply locally
pnpm dlx prisma generate                              # regen client after schema changes
pnpm dlx prisma studio                                # browse/edit data locally
```

migrations are append-only once shipped — never rewrite a merged migration. on vercel, `prisma migrate deploy` runs automatically as part of the build command.

---

## development workflow

```bash
pnpm dev        # start dev server (turbopack)
pnpm build      # production build
pnpm start      # run production build
pnpm lint       # eslint
pnpm typecheck  # tsc --noEmit
```

avatar / banner uploads fall back to `public/uploads/{avatars,banners}` when no blob token is set, so the profile flows work fully offline.

---

## testing + quality

no automated test suite yet — manual pass through registration, login (password + totp), reading list, reviews, profile customization, and follows before shipping. typecheck + lint catch the rest.

---

## deployment

### vercel (recommended)

1. connect the repo to vercel
2. set env vars (database, blob, auth, email, mangaupdates)
3. build command:

   ```bash
   pnpm exec prisma generate && pnpm exec prisma migrate deploy && pnpm exec next build
   ```
4. install command:

   ```bash
   pnpm install --frozen-lockfile
   ```
5. add `${APP_BASE_URL}/api/auth/google/callback` to your google oauth client's authorized redirects
6. deploy

### custom hosting

docker, fly.io, or any node host works too. run `pnpm dlx prisma migrate deploy` before `pnpm start`, keep `APP_BASE_URL` accurate, and make sure either `BLOB_READ_WRITE_TOKEN` is set or `public/uploads/` is writable.

---

## seo

shujia ships with a dynamic `/sitemap.xml`, an explicit `/robots.txt`, and json-ld structured data (`comicseries` + `aggregaterating` + `website` + `searchaction`) on every relevant page. once deployed, submit the sitemap via [google search console](https://search.google.com/search-console) and [bing webmaster tools](https://www.bing.com/webmasters) — that's the single highest-leverage step for indexing.

---

## roadmap

the `/roadmap` page in-app stays canonical. high-level themes:

**shipped**
- accounts + sessions + 2fa, reading list with progress/rating/notes, public profiles with stats, follow system, reviews + reactions, mangaupdates pipeline + caching, explore page filters, sidebar widgets, sitemap + structured data

**building / next**
- recommendations ("readers of x also liked")
- algorithmic series ranking + leaderboards
- recommendation lists (curated user-written collections)
- per-series discussion threads
- general-purpose forum
- richer review UX (per-category ratings, helpful sorting)
- import improvements (anilist, mal, etc.)

**later**
- character / creator / scanlation-group pages
- anime expansion (jikan / anilist / consumet)
- public api + dev docs
- mobile / pwa with offline reading-list access

---

## contributing

bug reports, feature ideas, and PRs welcome.

* **bug or feature**: [open an issue](https://github.com/techmengg/shujia/issues)
* **security**: see [SECURITY.md](./SECURITY.md) — please don't open public issues for vulnerabilities
* **code**: small fixes and tightenings can go straight to a PR. for larger changes, open an issue first so we can scope it.

shujia is licensed under **AGPL-3.0**. that means you're free to fork, modify, and self-host, but any modifications you run as a public service must also be made available under the same license. see [LICENSE](./LICENSE) for the full text.

---

— techmeng
