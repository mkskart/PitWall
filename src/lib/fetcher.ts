/**
 * Hardened JSON fetcher shared by the OpenF1 and Ergast clients (server-side).
 *
 *  - 8s timeout per attempt via AbortController
 *  - up to 3 retries with exponential backoff (400ms → 800ms → 1600ms) + jitter
 *  - 429/5xx are retried; 4xx (other than 429) are not — the request is wrong,
 *    not the network
 *  - never throws: callers always receive `null` on failure and decide how to
 *    degrade (empty list, fallback source, simulation)
 */

export interface SafeFetchOptions {
  /** Per-attempt timeout in ms. */
  timeoutMs?: number;
  /** Max retries after the first attempt. */
  retries?: number;
  /** Next.js ISR revalidate window (seconds). Mutually exclusive with noStore. */
  revalidate?: number;
  /** Bypass the data cache entirely (live polling). */
  noStore?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchJsonSafe<T>(url: string, opts: SafeFetchOptions = {}): Promise<T | null> {
  const { timeoutMs = 8000, retries = 3 } = opts;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: opts.noStore ? 'no-store' : undefined,
        next: opts.noStore ? undefined : { revalidate: opts.revalidate ?? 60 },
      });

      if (res.ok) {
        return (await res.json()) as T;
      }
      // Client errors other than rate-limiting will not improve on retry.
      if (res.status !== 429 && res.status < 500) {
        return null;
      }
      // 429: honor Retry-After when the upstream provides it.
      if (res.status === 429 && attempt < retries) {
        const retryAfter = Number(res.headers.get('retry-after'));
        if (Number.isFinite(retryAfter) && retryAfter > 0 && retryAfter <= 10) {
          await sleep(retryAfter * 1000);
          continue;
        }
      }
    } catch {
      // network error / timeout — fall through to backoff
    } finally {
      clearTimeout(timer);
    }

    if (attempt < retries) {
      await sleep(400 * 2 ** attempt + Math.random() * 150);
    }
  }
  return null;
}

/** Run async tasks with bounded concurrency (avoids hammering rate limits). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
