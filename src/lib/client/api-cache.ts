/**
 * In-memory cache for GET requests the dashboard repeats.
 * Concurrent callers share one network call. A later caller can paint the
 * cached body, then this module refreshes it. Saves drop the matching keys.
 * Sign-out clears the whole cache.
 */

const DEDUPE_MS = 2_000;

type Cached = { at: number; status: number; body: unknown };

export type JsonResult<T> = { ok: boolean; status: number; body: T | null };

const cache = new Map<string, Cached>();
const inflight = new Map<string, Promise<JsonResult<unknown>>>();

export function peekJson<T>(url: string): T | null {
  const hit = cache.get(url);
  if (!hit) return null;
  return hit.body as T;
}

export function invalidateApi(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key === prefix || key.startsWith(`${prefix}?`) || key.startsWith(`${prefix}/`)) {
      cache.delete(key);
    }
  }
}

export function clearApiCache(): void {
  cache.clear();
  inflight.clear();
}

export function getJson<T = unknown>(url: string): Promise<JsonResult<T>> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < DEDUPE_MS) {
    return Promise.resolve({ ok: true, status: hit.status, body: hit.body as T });
  }
  const pending = inflight.get(url);
  if (pending) return pending as Promise<JsonResult<T>>;

  const promise = fetch(url, { credentials: "include" })
    .then(async (res) => {
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      if (res.ok && body != null) {
        cache.set(url, { at: Date.now(), status: res.status, body });
      }
      return { ok: res.ok, status: res.status, body: body as T | null };
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, promise as Promise<JsonResult<unknown>>);
  return promise as Promise<JsonResult<T>>;
}

/** Paint a cached body when one exists, then apply the refreshed body. */
export function watchJson<T>(url: string, apply: (body: T) => void): Promise<void> {
  const cached = peekJson<T>(url);
  if (cached) queueMicrotask(() => apply(cached));
  return getJson<T>(url)
    .then((result) => {
      if (result.ok && result.body != null) apply(result.body);
    })
    .catch(() => undefined);
}
