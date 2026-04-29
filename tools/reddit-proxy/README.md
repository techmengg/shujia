# shujia reddit proxy

Tiny Cloudflare Worker that proxies `www.reddit.com/r/.../*.json` listings
on behalf of shujia. Exists because Reddit blocks Vercel's cloud-IP egress
hard enough that the home "News" and "Trending" rails stop populating in
production. Cloudflare's edge IPs aren't gated the same way.

## Deploy (one-time)

```bash
npm install -g wrangler
cd tools/reddit-proxy
wrangler login                                 # opens browser
wrangler secret put SHUJIA_PROXY_SECRET        # paste any random 32+ char string
wrangler deploy
```

The deploy output prints the public Worker URL — looks like
`https://shujia-reddit-proxy.<your-subdomain>.workers.dev`.

## Wire shujia to it

Set two env vars in Vercel (Production scope):

| name                  | value                                                     |
| --------------------- | --------------------------------------------------------- |
| `REDDIT_PROXY_URL`    | the Worker URL from the deploy output                     |
| `REDDIT_PROXY_SECRET` | the same string you passed to `wrangler secret put`       |

Redeploy shujia. Done.

## Local dev

You don't need any of this for local dev — when `REDDIT_PROXY_URL` is
unset, the code in `web/src/lib/reddit/client.ts` calls
`www.reddit.com` directly, which works fine from a developer laptop.

## Cost

Cloudflare Workers free plan: 100k requests/day, 10ms CPU per request.
shujia's usage profile is ~3 listings per cache-miss and we cache 1h,
so steady-state is well under 100 requests/day. Free tier covers it
roughly 1000× over.
