# shujia

a community-driven directory and tracker for manga, manhwa, and manhua. think mal/imdb/letterboxd, but focused on comics. live at **[shujia.dev](https://shujia.dev)**.

> built solo by [@s4lvaholic](https://x.com/s4lvaholic). open-source under AGPL-3.0 — see [LICENSE](./LICENSE).

---

## overview

shujia is a full-stack web app for tracking serialized comics across regions and languages. accounts, reading lists with progress + rating + notes, reviews with reactions, follow system, public profiles, discovery rails (trending, new releases, news, most-tracked). catalog data is sourced from the **mangaupdates** rest api; everything user-facing is shujia's own.

eventually i want to expand beyond comics into anime, tv, and dramas, while keeping the editorial-minimalist aesthetic consistent.

a full feature tour lives on the site itself — the README here exists to get a contributor from `git clone` to a running dev server.

---

## architecture

| layer       | stack                                                                                          |
| :---------- | :--------------------------------------------------------------------------------------------- |
| frontend    | next.js 15 (app router, turbopack), react 19 server components, tailwind v4, shadcn-inspired ui |
| backend     | next.js route handlers + server actions, prisma 6                                              |
| database    | postgresql (neon in production; pooled `DATABASE_URL` for runtime, direct `DIRECT_DATABASE_URL` for migrations) |
| auth        | cookie sessions (bcrypt), google oauth, email verification, totp 2fa                           |
| storage     | vercel blob (avatars/banners) + local dev fallback                                             |
| email       | resend (default) or smtp fallback                                                              |
| data source | mangaupdates rest api                                                                          |
| extras      | mangabaka (new releases), reddit json via cf worker proxy (news + trending), ann rss            |
| tooling     | typescript, zod, eslint, prisma                                                                |

---

## project structure

* `web/src/app/**` — app router pages + api routes (`(auth)`, `api`, `explore`, `manga`, `profile`, `reading-list`, `roadmap`, `settings`, `users`, `[username]`)
* `web/src/components/**` — reusable ui (auth forms, manga cards, sidebar, profile, reading-list client, etc.)
* `web/src/lib/{auth,email,mangaupdates,manga,reddit,mangabaka,news,security,theme,utils}` — helpers + clients
* `web/prisma/{schema.prisma,migrations/}` — schema + timestamped sql migrations
* `web/src/middleware.ts` — edge middleware
* `tools/reddit-proxy/` — cloudflare worker that proxies reddit.com listings (used in production because reddit blocks vercel cloud-ip egress)
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

then fill out `.env`. for the fastest local-dev path, run the bundled docker postgres helper (skips manual postgres setup):

```bash
# from web/
./setup-local-db.sh        # macOS / linux
./setup-local-db.ps1       # windows powershell
```

it spins up a postgres 16 container at `localhost:5433` and applies all prisma migrations. the default `DATABASE_URL` in `.env.example` already matches.

---

## environment variables

see [`web/.env.example`](./web/.env.example) for the canonical list with inline comments. summary:

| variable                          | description                                                  | required for         |
| :-------------------------------- | :----------------------------------------------------------- | :------------------- |
| `DATABASE_URL`                    | postgres connection string (pooled url in prod — neon `-pooler` subdomain) | always |
| `DIRECT_DATABASE_URL`             | non-pooled postgres url for prisma migrations + introspection (in local dev set to the same value as `DATABASE_URL`) | always |
| `APP_BASE_URL`                    | canonical site url (emails, oauth, share links)              | always               |
| `NEXT_PUBLIC_APP_URL`             | public-facing site url (sitemap, og tags)                    | always               |
| `MANGAUPDATES_API_BASE`           | mangaupdates api base                                        | always               |
| `NEXT_PUBLIC_MANGAUPDATES_API_BASE` | client-side mu api base                                    | always               |
| `GOOGLE_CLIENT_ID` / `..._SECRET` | google oauth credentials                                     | google sign-in       |
| `RESEND_API_KEY` + `EMAIL_FROM`   | transactional email via resend (preferred)                   | email flows          |
| `SMTP_*` (HOST/PORT/USER/PASS/SECURE) | smtp fallback if not using resend                        | email fallback       |
| `BLOB_READ_WRITE_TOKEN`           | vercel blob token; falls back to local fs if missing         | cloud uploads        |
| `NEXT_PUBLIC_BLOB_BASE_URL`       | public blob url prefix for avatars/banners                   | cloud uploads        |
| `REDDIT_PROXY_URL` / `_SECRET`    | cloudflare worker proxy for reddit listings                  | production only      |

for google sign-in, create an oauth client in google cloud console and add `${APP_BASE_URL}/api/auth/google/callback` as an authorized redirect.

email delivery prefers [resend](https://resend.com) — set `RESEND_API_KEY` + `EMAIL_FROM`, then add an spf record like `v=spf1 include:amazonses.com ~all` for sender verification. without resend, supply the smtp vars and the system falls back automatically.

the reddit proxy is only needed in production — locally `www.reddit.com` is reachable directly. setup steps live in [`tools/reddit-proxy/README.md`](./tools/reddit-proxy/README.md).

---

## database + migrations

```bash
pnpm exec prisma migrate dev --name <migration_name>   # create + apply locally
pnpm exec prisma generate                              # regen client after schema changes
pnpm exec prisma studio                                # browse/edit data locally
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

## deployment (vercel)

1. connect the repo to vercel
2. set env vars (database, blob, auth, email, mangaupdates, reddit proxy)
3. build command:

   ```bash
   pnpm exec prisma generate && pnpm exec prisma migrate deploy && pnpm exec next build
   ```
4. install command:

   ```bash
   pnpm install --frozen-lockfile
   ```
5. add `${APP_BASE_URL}/api/auth/google/callback` to your google oauth client's authorized redirects
6. deploy the `tools/reddit-proxy/` worker per its readme, paste the URL + secret into vercel env vars

---

## contributing

bug reports, feature ideas, and PRs welcome.

* **bug or feature**: [open an issue](https://github.com/techmengg/shujia/issues)
* **security**: see [SECURITY.md](./SECURITY.md) — please don't open public issues for vulnerabilities
* **code**: small fixes and tightenings can go straight to a PR. for larger changes, open an issue first so we can scope it.
* **roadmap**: lives at [`/roadmap`](https://shujia.dev/roadmap) on the site — that's the canonical source for what's shipped, in-progress, and planned.

before opening a PR: run `pnpm lint` and `pnpm typecheck` from `web/` and make sure both pass. there's no automated test suite (yet), so manual smoke-test the flows your change touches.

shujia is licensed under **AGPL-3.0**. that means you're free to fork, modify, and self-host, but any modifications you run as a public service must also be made available under the same license. see [LICENSE](./LICENSE) for the full text.

---

— techmeng
