# shujia

a full-stack tracker for manga, manhwa, and manhua built and maintained by me. powered by public apis for now, with more integrations and media expansion on the way.

---

## overview

shujia is a full-stack web app for tracking serialized comics across different regions and languages. you can sign in, follow titles, see new chapters, and keep a reading list that syncs with live updates.

i’m building this solo — everything from ui design to api integration and backend logic. right now it mainly runs off **mangadex**, with a staged approach to adding **comick**, **jikan**, **anilist**, and **consumet**. if those apis end up under-documented or incomplete, i’ll fall back to lightly scraping google or filtered html to fill in the gaps.

eventually, i want to expand shujia beyond manga into **anime, tv shows, and dramas**, while keeping the experience minimal and consistent.

---

## features

### reader experience

* home dashboard with latest updates, trending series, staff picks, and regional highlights
* personal reading list for logged-in users (progress, notes, ratings, quick actions)
* detailed manga pages with creators, tags, statistics, and shareable deep links
* quick manga search backed by mangadex
* dedicated roadmap page that mirrors the public roadmap in-app

### account, auth, and security

* email-based authentication with encrypted session cookies
* google oauth sign-in/sign-up (stateful redirect support for both login and register flows)
* verified sign-ups with email confirmation before account creation
* optional two-factor authentication (totp) with recovery codes
* password reset flow with signed, expiring tokens
* per-route rate limiting for login, register, reset, and verification endpoints
* session management, device sign-out, and marketing/notification preferences
* profile editing (username, avatar via vercel blob, bio, timezone) and vanity urls at `/profile/:username`

### content and data pipeline

* mangadex rest integration for trending sections, search results, and manga metadata
* prisma orm powering users, sessions, reading lists, verification queues, and rate-limit logs
* avatar storage through vercel blob with a local filesystem fallback in development
* type-safe server actions and route handlers (all in typescript/zod)

---

## architecture

| layer    | stack                                                                                         |
| :------- | :-------------------------------------------------------------------------------------------- |
| frontend | next.js 15 (app router), react server components, tailwind css, custom shadcn-inspired ui kit |
| backend  | next.js route handlers, server actions, prisma client, custom auth and rate limiting          |
| database | postgresql                                                                                    |
| auth     | cookie sessions (bcrypt), google oauth, email verification, totp two-factor                   |
| storage  | vercel blob (avatars) + local dev fallback                                                    |
| tooling  | typescript, turbopack, eslint, zod, otp auth, prisma                                          |

---

## project structure

* `web/src/app/**` – next.js app router pages, layouts, and api routes (auth, settings, reading list, uploads)
* `web/src/components/**` – reusable ui pieces (auth forms, manga cards, layout components, settings)
* `web/src/lib/**` – auth helpers, email transport, external api clients, prisma wrapper, security utilities
* `web/prisma/**` – prisma schema and timestamped migrations
* `public/**` – static assets (logos, default avatars, fallback images)

---

## auth flow

1. registration runs validation + profanity filters, enqueues a verification token, and emails the user.
2. verification token consumption creates the account, provisions a session, and sets the auth cookie.
3. login supports password + optional totp (or recovery codes) and issues new sessions after revoking the old one.
4. google oauth handles both login and register contexts, validating state/redirect params before creating/updating users.
5. rate limiting is enforced on every auth touchpoint (ip + identifier scope) using prisma-backed attempt logs.

---

## getting started

### prerequisites

* **node.js** ≥ 18
* **npm** ≥ 9
* **postgresql** (local or hosted)
* mangadex api access (public) – optional comick base urls for experiments

### setup

```bash
git clone https://github.com/<your-username>/shujia.git
cd shujia/web
npm install
cp .env.example .env
```

fill out the `.env` file with database credentials, base urls, and auth/email settings.

---

## environment variables

| variable                        | description                                                                 | required |
| :------------------------------ | :-------------------------------------------------------------------------- | :------- |
| `DATABASE_URL`                  | postgres connection string                                                  | yes      |
| `APP_BASE_URL`                  | canonical url (used in emails, oauth, share links)                          | yes      |
| `NEXT_PUBLIC_APP_URL`           | optional public url override for client-side sharing                        | optional |
| `NEXT_PUBLIC_MANGADEX_API_BASE` | base url for mangadex api                                                   | yes      |
| `NEXT_PUBLIC_COMICK_API_BASE`   | base url for comick api (future-ready)                                      | optional |
| `NEXT_PUBLIC_BLOB_BASE_URL`     | public vercel blob base url for avatars                                     | yes      |
| `BLOB_READ_WRITE_TOKEN`         | vercel blob token for write access (falls back to local storage if missing) | optional |
| `EMAIL_FROM`                    | from header, e.g. `Shujia <noreply@shujia.dev>`                             | email only |
| `RESEND_API_KEY`                | resend api key for transactional email                                      | optional |
| `SMTP_HOST`                     | smtp host (alternative to resend)                                           | optional |
| `SMTP_PORT`                     | smtp port                                                                   | optional |
| `SMTP_USER`                     | smtp username                                                               | optional |
| `SMTP_PASS`                     | smtp password                                                               | optional |
| `SMTP_SECURE`                   | `"true"` to force tls                                                       | optional |
| `GOOGLE_CLIENT_ID`              | google oauth client id                                                      | social auth |
| `GOOGLE_CLIENT_SECRET`          | google oauth client secret                                                  | social auth |

email delivery defaults to [resend](https://resend.com). set `EMAIL_FROM` + `RESEND_API_KEY`, then add the spf record `v=spf1 include:amazonses.com ~all` so your sender stays verified. if you prefer your own smtp relay, leave `RESEND_API_KEY` empty and supply the smtp variables above.

for google sign-in, create an oauth client in google cloud console. add `${APP_BASE_URL}/api/auth/google/callback` as an authorized redirect and drop the client id/secret into the env values.

---

## database & migrations

prisma handles schema evolution.

```bash
npx prisma migrate dev --name <migration_name>
npx prisma generate
```

commit the generated sql migrations, then run `npx prisma migrate deploy` in production.

---

## development workflow

```bash
npm run dev        # start dev server (turbopack)
npm run build      # build for production
npm run start      # run production build
npm run lint       # eslint (project-wide)
npm run typecheck  # typescript validation
```

use `npx prisma studio` to browse/update data locally. avatar uploads fall back to `public/uploads/avatars` when the blob token is missing, so you can test profile updates without cloud config.

---

## testing & quality

no automated tests yet — i manually run through registration, login (password + otp), reading lists, uploads, and settings flows before shipping changes. type checking + linting keep things sane in between.

---

## deployment

### vercel (recommended)

1. connect the repo to vercel
2. set env vars (database, blob, auth, email)
3. configure the build command:

   ```bash
   npx prisma migrate deploy && npx prisma generate && next build
   ```
4. make sure vercel blob + database connections are available
5. deploy, then add the oauth redirect in google cloud pointing at the deployed domain

### custom hosting

docker, fly.io, or your own node box work too. run `npx prisma migrate deploy` before `npm run start`, keep `APP_BASE_URL` accurate, and ensure the blob token or local uploads directory is writable.

---

## roadmap

the `/roadmap` page in-app stays up to date, but the current themes are:

* stabilize core systems (sessions, password resets, notifications) – in progress
* ship explore/browse tooling with rich filters across all stored titles
* expand metadata coverage via jikan, anilist, consumet, and custom caching/translation layers
* introduce lightweight social features: shared lists, reactions, minimal threads
* add smart utilities (summaries, pattern detection, ai tagging, multilingual support)
* harden the platform layer (cdn assets, indexing, background jobs, image optimization)

---

— techmeng :)
