
<div align="center">
  <img src="public/shujia.png" alt="Shujia logo" width="96" height="96" />
  <h1>Shujia</h1>
  <p>
    A modern reader and tracker for manga, manhwa, and manhua powered by the MangaDex ecosystem.
  </p>
</div>

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Getting Started](#getting-started)
5. [Environment Variables](#environment-variables)
6. [Database & Migrations](#database--migrations)
7. [Development Workflow](#development-workflow)
8. [Testing & Quality](#testing--quality)
9. [Deployment](#deployment)
10. [Roadmap](#roadmap)
11. [Contributing](#contributing)
12. [License](#license)

---

## Overview

Shujia is a full-stack web application for keeping track of serialized comics across multiple regions and languages. Readers can authenticate, follow series, monitor release schedules, and manage a personal reading list with rich metadata. The project is optimized for deployment on **Vercel** with a managed **PostgreSQL** backend and uses modern React/Next.js patterns.

---

## Features

### Reader Experience

- **Home Dashboard**: Surfaced sections for latest updates, trending series by region, demographic highlights, and a rich carousel UI.
- **Reading List**: Authenticated users can curate a personal bookshelf, sort entries, view metadata, and monitor progress.
- **Manga Detail Pages**: Deep dive into a title with creators, tags, statistics, and quick actions (MangaDex links, sharing, add-to-list).
- **Search**: Top-level search bar for instant lookups across the MangaDex catalogue.
- **Roadmap Page**: Public page communicating upcoming product phases and strategic direction.

### Account & Personalization

- **Authentication**: Custom credential-based auth backed by Prisma and encrypted cookies.
- **Profile Management**:
  - Unique usernames (used for vanity URLs at `/profile/:username`).
  - Avatar uploads (PNG/JPG) with server-side validation and optimized delivery.
  - Bio, timezone, and email preferences.
  - Reading statistics and latest activity feed visible on profile pages.
- **Sessions Management**: View and invalidate active sessions to secure your account.
- **Notification Settings**: Fine-grained opt-ins for weekly digests, product updates, and marketing messages.

### Content Pipeline

- **MangaDex Integration**: REST clients for trending titles, demographic highlights, and recent updates.
- **Comick API**: Secondary source hinted in the environment template for future integrations.
- **Prisma ORM**: Persistent data for users, reading lists, sessions, and auth flows.

---

## Architecture

| Layer            | Technologies & Tools                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| Frontend         | Next.js 15 (App Router), React Server Components, Tailwind CSS utility classes, shadcn-inspired UI   |
| Backend          | Next.js Route Handlers, Prisma Client, custom auth/session handling                                   |
| Database         | PostgreSQL (tested with Amazon RDS)                                                                  |
| Auth             | Cookie-based sessions, bcrypt hashing, rate-limited endpoints                                        |
| Storage          | File uploads served from `/public/uploads/avatars` (place behind object storage in production)       |
| Styling          | Tailwind CSS with custom gradients, blur effects, and typography tokens                              |
| Tooling          | TypeScript, Turbopack (during `next dev`), ESLint (Next.js default), npm                             |

Directory highlights:

- `src/app/**`: App Router entry points, layouts, and API route handlers.
- `src/components/**`: Reusable UI components (layout, manga widgets, settings forms, etc.).
- `src/lib/**`: Auth helpers, Prisma client, MangaDex service adapters.
- `prisma/**`: Schema definition and migrations.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.17
- **npm** ≥ 9 (or your preferred Node package manager)
- **PostgreSQL** instance (local Docker container or managed service)
- MangaDex/Comick APIs are public; no API key required.

### Installation

```bash
git clone https://github.com/<your-username>/shujia.git
cd shujia/web
npm install
```

Copy the example environment file and update the values:

```bash
cp .env.example .env
```

Update `DATABASE_URL`, `APP_BASE_URL`, and SMTP details if you need email flows.

---

## Environment Variables

| Variable                         | Description                                                                 | Required | Default                            |
| -------------------------------- | --------------------------------------------------------------------------- | -------- | ---------------------------------- |
| `NEXT_PUBLIC_MANGADEX_API_BASE`  | Base URL for MangaDex API requests                                         | ✔        | `https://api.mangadex.org`         |
| `NEXT_PUBLIC_COMICK_API_BASE`    | Base URL for Comick API (future integrations)                              | ✔        | `https://api.comick.io/v1.0`       |
| `DATABASE_URL`                   | PostgreSQL connection string                                                | ✔        | —                                  |
| `APP_BASE_URL`                   | Public URL of the application (used in metadata, sharing, redirects)       | ✔        | `http://localhost:3000`           |
| `CSRF_ALLOWED_ORIGINS`           | Comma-separated whitelist for CSRF validation (optional)                   |          | empty                              |
| `EMAIL_FROM`                     | Default "from" email address                                                |          | empty                              |
| `SMTP_HOST`, `SMTP_PORT`         | SMTP server details                                                         |          | empty                              |
| `SMTP_USER`, `SMTP_PASS`         | SMTP credentials (if sending email)                                        |          | empty                              |
| `SMTP_SECURE`                    | `true` if TLS is required                                                   |          | `false`                            |

---

## Database & Migrations

Prisma manages the schema. Common commands:

```bash
# Apply and create a new migration (development)
npx prisma migrate dev --name <migration_name>

# Synchronize schema without generating new migration (production)
npx prisma migrate deploy

# Regenerate Prisma Client after schema changes
npx prisma generate
```

> **Note:** The app depends on the `User.username` column introduced in the `20251105020129_add_username_to_user` migration. Ensure your production database has this migration applied before deploying the latest code.

---

## Development Workflow

```bash
# Start Next.js in development mode (Turbopack)
npm run dev

# Type-check the project
npm run typecheck

# Lint (Next.js provides a default ESLint config)
npm run lint

# Build for production
npm run build

# Start production build locally
npm run start
```

Recommended workflow:

1. Start the dev server with `npm run dev`.
2. Make changes; Tailwind + Turbopack will hot-reload.
3. Run `npx prisma studio` to inspect database contents if needed.
4. Ensure migrations are committed alongside schema changes.

---

## Testing & Quality

- Linting: `npm run lint`
- Type Safety: `npm run typecheck` (leverages `tsc --noEmit`)
- Manual QA: verify login, registration, reading list updates, and profile changes.

Automated tests are not yet implemented; see the Roadmap for planned additions.

---

## Deployment

### Vercel Hosting (Recommended)

1. **Database**: Provision a managed PostgreSQL instance (e.g., Vercel Postgres, Supabase, RDS). Update `DATABASE_URL` in Vercel project settings.
2. **Environment Variables**: Mirror all keys from your local `.env` into the Vercel dashboard.
3. **Build Command**: Vercel auto-detects Next.js. Ensure the build command runs migrations:

   ```bash
   npx prisma migrate deploy && npx prisma generate && next build
   ```

4. **Static Files & Uploads**: Avatar uploads currently write to `public/uploads/avatars`. For production, configure an object storage provider (S3, R2, etc.) and swap the upload handler to persist externally. The Vercel file system is ephemeral across deployments.
5. **Deploy**: Connect the repository to Vercel, trigger a deployment, and verify all routes.

### Alternative Hosting

- **Docker**: Wrap the app in a Node 20 image, install dependencies, run `next build`, and serve with `next start`.
- **Custom Node Server**: Ensure migrations are applied before running `npm run start`.

---

## Roadmap

The `/roadmap` route is updated in-app, but on a high level upcoming work includes:

1. **Core Stabilization**: Password reset flows, richer notifications, and comprehensive rate limiting.
2. **Data Expansion**: Integrate Jikan/other APIs and explore a custom content aggregation pipeline.
3. **Media Growth**: Extend beyond comics into anime and live-action while preserving focused UX.
4. **Reader Polish**: Enhanced readers, offline queues, richer chapter tracking.
5. **Community Layer**: Collaborative lists, social sharing, and friend activity feeds.
6. **Multi-Platform**: Native mobile apps and a public API surface for third-party clients.

---

## Contributing

1. Fork the repository and create a feature branch.
2. Copy `.env.example` to `.env` and configure local secrets.
3. Run `npm install` and `npm run dev`.
4. Create or update migrations when touching the schema.
5. Submit a pull request with a clear summary, testing notes, and screenshots where relevant.

Please open issues for bugs or feature discussions before large changes.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

Happy reading! If you build something awesome on top of Shujia, let us know.
