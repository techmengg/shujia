# ShujiaDB Web

ShujiaDB is a Next.js application scaffold that integrates with the [MangaDex API](https://api.mangadex.org/docs/) to help you track manga, manhwa, and manhua releases. This starter includes a hero dashboard, live trending feed, server-side API helpers, and a client-side search experience that you can extend into a full tracker (reading lists, status management, release alerts, etc.).

## Project Structure

- `src/app/page.tsx` - Landing page with hero section, trending grid, and search panel.
- `src/app/api/manga/search/route.ts` - Serverless route that proxies title searches against MangaDex.
- `src/lib/mangadex` - API client, types, and helper methods to transform MangaDex responses into UI-ready shapes.
- `src/components` - UI primitives for manga cards, grids, and search UX.

## Getting Started

```bash
cd web
npm install
npm run dev
```

The app runs on [http://localhost:3000](http://localhost:3000). Trending titles are fetched on the server with a 30-minute cache window, while search results are requested on demand from `/api/manga/search`.

## Configuration

1. Duplicate `.env.example` to `.env.local` if you want to override the MangaDex base URL.
2. When you introduce authenticated requests, add secrets (tokens, client IDs) to `.env.local` and avoid checking them into version control.
3. Update `src/lib/mangadex/service.ts` with additional helpers (user libraries, follows, chapter feeds) as you expand functionality.

## Available Scripts

- `npm run dev` - Start the development server with Turbopack.
- `npm run build` - Create a production build.
- `npm run start` - Run the built app.
- `npm run lint` - Lint code with ESLint.

## Next Steps

- Add authentication and user profiles to persist reading lists.
- Create Prisma models or connect to your database layer for storing follow status, progress, and notes.
- Expand API routes to proxy more MangaDex endpoints (followed updates, chapter feeds, tag filters).
- Layer in background jobs or webhooks to sync new chapters automatically.
- Implement UI for list management (backlog, reading, completed) and analytics.
