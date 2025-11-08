# shujia

a full-stack tracker for manga, manhwa, and manhua built and maintained by me. powered by public apis for now, with more integrations and media expansion on the way.

---

## overview

shujia is a full-stack web app for tracking serialized comics across different regions and languages. you can sign in, follow titles, see new chapters, and keep a reading list that syncs with live updates.

i’m building this solo — everything from ui design to api integration and backend logic. right now it mainly runs off **mangadex**, but i’ll be adding more sources like **mangahook**, **jikan**, and **consumet** soon. if those apis end up being under-documented or incomplete, i’ll just scrape **google results** or **filtered html** to fill in the gaps.

eventually, i want to expand shujia beyond manga into **anime, tv shows, and dramas**, while keeping the experience minimal and consistent.

---

## features

### reader experience

* home dashboard with latest updates, trending series, and regional highlights
* personal reading list for logged-in users
* detailed manga pages with creators, tags, and metadata
* quick search across mangadex’s catalogue
* roadmap page showing current and planned development

### account & personalization

* email-based authentication using encrypted cookies
* google oauth sign-in option for faster onboarding
* optional two-factor authentication with authenticator apps + recovery codes
* verified sign-ups with email confirmation before account creation
* editable profile (username, avatar, bio, timezone)
* vanity urls at `/profile/:username`
* session management and account security controls
* notification preferences (updates, digests, marketing)

### content pipeline

* mangadex rest integration for trending and metadata
* partial comick integration for future testing
* prisma orm for user data, reading lists, and sessions

---

## architecture

| layer    | stack                                                                              |
| :------- | :--------------------------------------------------------------------------------- |
| frontend | next.js 15 (app router), react server components, tailwind css, shadcn-inspired ui |
| backend  | next.js route handlers, prisma client, custom auth/session logic                   |
| database | postgresql                                                                         |
| auth     | cookie-based sessions with bcrypt                                                  |
| storage  | vercel blob                                                                        |
| tooling  | typescript, turbopack, eslint, npm                                                 |

directory overview:

* `src/app/**`: app router routes, layouts, and api handlers
* `src/components/**`: reusable ui components
* `src/lib/**`: prisma client, auth helpers, and api adapters
* `prisma/**`: schema and migrations

---

## getting started

### prerequisites

* **node.js** ≥ 18
* **npm** ≥ 9
* **postgresql** (local or hosted)
* mangadex and comick apis are public

### setup

```bash
git clone https://github.com/<your-username>/shujia.git
cd shujia/web
npm install
cp .env.example .env
```

update your `.env` file with database, blob, and base url values.

---

## environment variables

| variable                        | description                           | required |
| :------------------------------ | :------------------------------------ | :------- |
| `NEXT_PUBLIC_MANGADEX_API_BASE` | base url for mangadex api             | yes      |
| `NEXT_PUBLIC_COMICK_API_BASE`   | base url for comick api               | yes      |
| `NEXT_PUBLIC_BLOB_BASE_URL`     | public vercel blob url                | yes      |
| `DATABASE_URL`                  | postgresql connection string          | yes      |
| `BLOB_READ_WRITE_TOKEN`         | server token for blob storage         | yes      |
| `APP_BASE_URL`                  | app’s public url                      | yes      |
| `EMAIL_FROM`                    | from header (e.g. `Shujia <noreply@shujia.dev>`) | email only |
| `RESEND_API_KEY`                | resend api key for transactional mail | email only |
| `GOOGLE_CLIENT_ID`              | oauth client id from google cloud     | social auth |
| `GOOGLE_CLIENT_SECRET`          | oauth client secret from google cloud | social auth |

Email delivery defaults to [Resend](https://resend.com). Provide `EMAIL_FROM` plus `RESEND_API_KEY`, then add the SPF record `v=spf1 include:amazonses.com ~all` under your domain so `noreply@shujia.dev` stays verified. If you prefer your own SMTP relay, leave `RESEND_API_KEY` empty and continue supplying the existing `SMTP_*` variables. CSRF scope/origin settings remain optional.

For Google sign-in, create an OAuth client in Google Cloud Console with the authorized redirect set to `${APP_BASE_URL}/api/auth/google/callback`, then drop the client id + secret into the env values above.

---

## database & migrations

prisma handles the schema and migration flow.

```bash
npx prisma migrate dev --name <migration_name>
npx prisma generate
```

make sure to apply the `username` column migration before deploying.

---

## development workflow

```bash
npm run dev        # start dev server  
npm run build      # build for production  
npm run start      # run production build  
npm run lint       # eslint check  
npm run typecheck  # typescript validation  
```

use `npx prisma studio` to view or edit data locally.

---

## testing & quality

no automated tests yet — i manually test login, registration, reading lists, and profile flows.
type checking + linting keep things stable for now.

---

## deployment

### vercel (recommended)

1. connect repo to vercel
2. set env vars
3. set build command

   ```bash
   npx prisma migrate deploy && npx prisma generate && next build
   ```
4. configure blob + db
5. deploy

### custom hosting

docker or custom node setups work too — just apply migrations before starting the server.

---

## roadmap

* full integrations with mangahook, jikan, and consumet
* fallback scraping for missing or incomplete data
* expansion into anime, tv, and dramas
* improved chapter reader and offline mode
* password resets and richer notification options
* native mobile app prototype later on

---

— techmeng :)
