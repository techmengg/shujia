# Shujia

Shujia is an experimental toolkit for building a manga, manhwa, and manhua tracking experience powered by the MangaDex API.

The `web` directory contains a Next.js 15 + Tailwind CSS application scaffolded for:

- Discovering trending titles from MangaDex (server-rendered with caching)
- Searching the MangaDex catalog via a Next.js API route
- Displaying manga summaries with responsive cards and grid layouts

## Quickstart

```bash
cd web
npm install
npm run dev
```

This launches a development server at [http://localhost:3000](http://localhost:3000). Trending data is refetched every 30 minutes and search queries are proxied through `/api/manga/search`.

See `web/README.md` for an in-depth breakdown and next steps for expansion.
