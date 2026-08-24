/**
 * @license Apache-2.0
 * @gati/http - In-Memory Deduplication Cache
 */

export class RequestCache {
  private inFlight = new Map<string, Promise<unknown>>();
  private cache = new Map<string, { data: unknown; timestamp: number }>();

  async dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = fetcher().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }

  clear(): void {
    this.inFlight.clear();
    this.cache.clear();
  }
}

export const defaultRequestCache = new RequestCache();

export function createHttpCache(options?: { defaultTtl?: number }): RequestCache {
  return new RequestCache();
}
