# Shujia Scraper API

A standalone Node.js + TypeScript + Express service for scraping manga data from various providers.

## Features

- 🔍 Multi-provider manga scraping (MangaUpdates, and more)
- 📦 Normalized data structure across all providers
- 💾 In-memory caching with TTL
- 🚦 Rate limiting and polite delays
- ♻️ Automatic retry with exponential backoff
- 🔗 Extracts "where to read" links
- 🎯 Simple REST API

## Quick Start

### Installation

```bash
cd services/scraper-api
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your settings
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## API Endpoints

### Health Check

```
GET /health
```

Returns service health status.

### Get Manga by Provider ID

```
GET /manga/:provider/:id
```

**Example:**
```bash
curl http://localhost:3001/manga/mangaupdates/55099564912
```

**Query Parameters:**
- `cache`: Set to `false` to bypass cache (default: `true`)

### Search Manga

```
GET /manga/search?q=one+piece&providers=mangaupdates&limit=10
```

**Query Parameters:**
- `q` (required): Search query
- `providers` (optional): Comma-separated list of providers (default: `mangaupdates`)
- `limit` (optional): Max results per provider (default: `10`)
- `cache`: Set to `false` to bypass cache (default: `true`)

### Get Enabled Providers

```
GET /manga/providers
```

Returns list of currently enabled providers.

## ⚖️ Legal & Compliance

**⚠️ IMPORTANT**: Before deploying to production, review:
- `SCRAPING_POLICY.md` - Comprehensive ethical scraping guidelines
- `ROBOTS_TXT_COMPLIANCE.md` - Detailed robots.txt compliance report

### Compliance Summary

✅ **robots.txt Compliant** - Only scrape allowed paths  
✅ **Polite Delays** - 1.5+ second delays between requests to same domain  
✅ **Proper Identification** - User-Agent with service name and contact URL  
✅ **Aggressive Caching** - 1 hour TTL to minimize redundant requests  
✅ **Rate Limiting** - Exponential backoff and respect for Retry-After headers  
✅ **No User Data** - Only public series information  

### What We Scrape

- ✅ Public series pages from MangaUpdates (`/series/{id}`)
- ❌ No search pages (disallowed by robots.txt)
- ❌ No user data or private content
- ❌ No forums or comment sections

### Before Production Deployment

- [ ] Review each site's Terms of Service
- [ ] Add your contact email to User-Agent (`src/utils/http.ts`)
- [ ] Set up monitoring for rate limit violations
- [ ] Implement kill switch for emergency stop
- [ ] Document data attribution requirements

## Supported Providers

- ✅ **MangaUpdates** - Full support with HTML scraping (robots.txt compliant)
- 🚧 **MangaDex** - Coming soon (will use official API)
- 🚧 **AniList** - Coming soon (will use official GraphQL API)

## Data Structure

All providers return normalized `NormalizedManga` objects:

```typescript
{
  provider: string;
  providerId: string;
  title: string;
  alternativeTitles: string[];
  description?: string;
  type?: string;
  status?: string;
  year?: number;
  authors: Author[];
  artists: Author[];
  genres: string[];
  tags: string[];
  rating?: { average?: number; bayesian?: number; votes?: number };
  latestChapter?: number | string;
  coverImage?: string;
  externalLinks: ExternalLink[];
  whereToRead: WhereToReadLink[];
  sourceUrl: string;
  scrapedAt: Date;
}
```

## Architecture

```
src/
├── types/          # TypeScript type definitions
├── utils/          # HTTP and HTML parsing utilities
├── cache/          # In-memory cache implementation
├── providers/      # Provider implementations
│   ├── mangaupdates.ts
│   └── index.ts    # Provider manager
├── routes/         # Express routes
└── index.ts        # Main server
```

## Rate Limiting

The service implements polite scraping:
- Automatic delays between requests to the same domain
- Configurable per-provider rate limits
- Exponential backoff on failures
- Respects `Retry-After` headers

## Caching

- **Manga data**: 1 hour TTL
- **Search results**: 30 minutes TTL
- Automatic cleanup of expired entries
- Can be bypassed with `?cache=false`

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run type-check
```

## Adding New Providers

1. Create a new file in `src/providers/` (e.g., `mangadex.ts`)
2. Implement the required functions:
   - `getMangaDexById(id: string): Promise<NormalizedManga>`
   - `searchMangaDex(query: string, limit: number): Promise<SearchResult[]>`
3. Add the provider to `PROVIDERS` in `src/providers/index.ts`
4. Update the provider manager's switch statements

## License

MIT

