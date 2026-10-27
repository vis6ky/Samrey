/**
 * @license Apache-2.0
 * @samrey/http - In-Memory Deduplication Cache
 */

export interface HttpCacheOptions {
  defaultTtl?: number;
  maxEntries?: number;
}

export class RequestCache {
  private inFlight = new Map<string, Promise<unknown>>();
  private cache = new Map<string, { data: unknown; expiresAt: number }>();
  private defaultTtl: number;
  private maxEntries: number;

  constructor(options?: HttpCacheOptions) {
    this.defaultTtl = options?.defaultTtl ?? 60_000;
    this.maxEntries = options?.maxEntries ?? 1000;
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    const ttl = ttlMs ?? this.defaultTtl;
    this.cache.set(key, { data, expiresAt: Date.now() + ttl });
  }

  async dedupe<T>(key: string, fetcher: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const existing = this.inFlight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = fetcher()
      .then((data) => {
        this.set(key, data, ttlMs);
        return data;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.inFlight.clear();
    this.cache.clear();
  }
}

export const defaultRequestCache = new RequestCache();

export function createHttpCache(options?: HttpCacheOptions): RequestCache {
  return new RequestCache(options);
}
