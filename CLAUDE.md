# CLAUDE.md

## project

**shujia** — full-stack tracker for manga / manhwa / manhua (MAL/IMDB-style, but for comics). Solo-built by techmeng. Plans to expand to anime, TV, dramas later.

**⚠️ live users in production** — be cautious with backend changes. Migrations, auth flows, session handling, and rate-limit logic can break real accounts. Verify destructive/schema changes twice and prefer additive migrations.

## stack

- **frontend**: Next.js 15 (app router, turbopack), React 19 RSC, Tailwind v4, custom shadcn-inspired UI
- **backend**: Next.js route handlers + server actions, Prisma 6
- **db**: PostgreSQL via Prisma
- **auth**: cookie sessions (bcrypt), Google OAuth, email verification, TOTP 2FA, recovery codes
- **storage**: Vercel Blob (avatars) + local `public/uploads/avatars` fallback
- **email**: Resend (default) or SMTP fallback
- **data source**: MangaDex REST (primary); Comick/Jikan/AniList/Consumet staged

## layout

Root is the repo; the app lives under `web/`.

- `web/src/app/**` — app router pages + API routes (`(auth)`, `api`, `explore`, `manga`, `profile`, `reading-list`, `roadmap`, `settings`, `users`, `[username]`)
- `web/src/components/**` — UI
- `web/src/lib/{auth,email,mangadex,security,theme,prisma.ts}` — helpers/clients
- `web/prisma/{schema.prisma,migrations/}` — schema + timestamped SQL migrations
- `web/src/middleware.ts` — edge middleware

## dev commands (run from `web/`)

Package manager: **pnpm** (pinned to `pnpm@10.24.0` via `packageManager` field — run `corepack enable` once, Corepack enforces the version).

```bash
pnpm dev                                # turbopack dev server
pnpm build                              # production build
pnpm lint                               # eslint
pnpm typecheck                          # tsc --noEmit
pnpm dlx prisma studio                  # browse/edit db
pnpm dlx prisma migrate dev --name <n>  # new migration
```

## conventions

- TypeScript + Zod everywhere; server actions and route handlers must stay type-safe
- Rate limiting is enforced on auth endpoints via Prisma-backed attempt logs — don't bypass it
- Avatar uploads: prefer Vercel Blob, fall back to local when `BLOB_READ_WRITE_TOKEN` missing
- Emails sent through Resend when `RESEND_API_KEY` is set, else SMTP
- Build command on Vercel: `pnpm exec prisma generate && pnpm exec prisma migrate deploy && pnpm exec next build`
- Install command on Vercel: `pnpm install --frozen-lockfile` — commit `pnpm-lock.yaml`, never `package-lock.json`

## commits & CI/CD

When the user asks for a commit:

1. **Check CI/CD first** — run `pnpm lint` and `pnpm typecheck` from `web/`. If either fails, stop and fix before committing. Also scan `vercel.json` / build command if config changed.
2. **Commit** — stage only the relevant files (not `-A`). Write a concise message focused on *why*. **Do NOT add `Co-Authored-By: Claude` or any Claude attribution.** No emoji unless asked.
3. **Push** — only push when the user explicitly says so ("push it", "ship it", etc.). Never push on your own. Never force-push to `main`.

## safety rules

- Never run destructive git ops (`reset --hard`, `push --force`, branch delete) without explicit ask
- Never edit or drop production data; test migrations locally first (`setup-local-db.sh` / `.ps1`)
- Don't commit `.env` or secrets
- Prisma migrations are append-only once merged — don't rewrite shipped migrations
- Treat auth/session/rate-limit code as high-risk; flag side effects before changing
