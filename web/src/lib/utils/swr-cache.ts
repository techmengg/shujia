/**
 * Stale-while-revalidate wrapper around an `unstable_cache`-wrapped fetcher.
 *
 * Goal: every read of a home rail returns instantly from cache. When the
 * cached value is older than `refreshIntervalMs`, we kick off a background
 * regeneration via `after()` — the response goes out the door immediately
 * and the cache gets repopulated for the *next* visitor. No request ever
 * blocks on upstream APIs except the very first cold-start.
 *
 * Pair with a long `unstable_cache` revalidate (e.g. 24h+) so the cache
 * entry survives long idle gaps. The freshness clock here is managed
 * separately from `unstable_cache`'s expiry — we bust+rewarm via
 * `revalidateTag` rather than letting the cache expire and forcing the
 * next reader to pay the regen cost.
 */
import { revalidateTag } from "next/cache";
import { after } from "next/server";

interface SwrConfig<T> {
  /**
   * The `unstable_cache`-wrapped fetcher. Pure read: serves the cached
   * value, or regenerates synchronously if absent.
   */
  cached: () => Promise<T>;
  /**
   * The tag passed in `unstable_cache(... { tags: [tag] })`. Used to
   * invalidate the cache so the in-place `cached()` re-call warms it.
   */
  tag: string;
  /**
   * How often (ms) a single function-instance should kick off a background
   * refresh. Per-instance — multiple Vercel containers may each fire one,
   * which is fine (they all converge on the same fresh value).
   */
  refreshIntervalMs: number;
}

export function withStaleWhileRevalidate<T>(config: SwrConfig<T>) {
  let lastKickedAt = 0;
  let inflight: Promise<unknown> | null = null;

  return async function read(): Promise<T> {
    const data = await config.cached();

    const now = Date.now();
    const dueForRefresh = now - lastKickedAt > config.refreshIntervalMs;
    if (dueForRefresh && !inflight) {
      lastKickedAt = now;
      inflight = (async () => {
        try {
          revalidateTag(config.tag);
          // Re-call the cached fetcher inside the after()-wrapped task —
          // because the tag was just invalidated, this call regenerates
          // and writes the fresh value back to the cache.
          await config.cached();
        } catch {
          // Swallow — failed refresh just means we keep serving the older
          // cached value until the next refresh window.
        }
      })().finally(() => {
        inflight = null;
      });
      // Keep the serverless function alive until the background refresh
      // completes. `after` is a no-op in environments that don't support
      // it; in that case the work runs against the request lifecycle.
      after(inflight);
    }

    return data;
  };
}
