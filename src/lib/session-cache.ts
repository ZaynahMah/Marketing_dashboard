/**
 * SESSION-LEVEL AI CACHE
 * ---------------------------------------------------------------------------
 * Module-scoped Map that holds AI responses for the current browser session.
 * Because it lives outside React state, it survives component unmount/remount
 * (i.e. tab switching). Cleared when:
 *   - the user uploads a new dataset (call `clearSessionCache()`)
 *   - the browser tab is refreshed (module re-initialises)
 *
 * Every component that calls a Gemini endpoint should:
 *   1. Check `getSessionCache(key)` — if hit, use it immediately (no loading state).
 *   2. If miss, fetch, then `setSessionCache(key, result)`.
 *   3. Use a key that includes the snapshotId + mode so a new upload invalidates.
 */

const cache = new Map<string, unknown>();
const inFlight = new Map<string, Promise<unknown>>();

export function getSessionCache<T>(key: string): T | null {
  return (cache.get(key) as T) ?? null;
}

export function setSessionCache<T>(key: string, value: T): void {
  cache.set(key, value);
}

/**
 * Deduplicated fetch: if a request for this key is already in-flight,
 * return the same promise instead of firing a second request.
 */
export async function fetchWithDedup<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // Already cached — return immediately.
  const cached = cache.get(key);
  if (cached !== undefined) return cached as T;

  // Already in flight — join the existing request.
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;

  // New request.
  const promise = fetcher().then((result) => {
    cache.set(key, result);
    inFlight.delete(key);
    return result;
  }).catch((err) => {
    inFlight.delete(key);
    throw err;
  });
  inFlight.set(key, promise);
  return promise;
}

export function clearSessionCache(): void {
  cache.clear();
  inFlight.clear();
}

/** Clear only keys matching a prefix (e.g. "review:" when inputs change). */
export function clearSessionCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
  for (const key of inFlight.keys()) {
    if (key.startsWith(prefix)) inFlight.delete(key);
  }
}
