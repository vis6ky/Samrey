/**
 * @license Apache-2.0
 * @samrey/http - In-Memory Deduplication Cache
 */

export interface HttpCacheOptions {
  defaultTtl?: number;
  maxEntries?: number;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  tags: Set<string>;
}

interface InFlightEntry<T> {
  promise: Promise<T>;
  id: number;
  generation: number;
  globalGen: number;
}

export class RequestCache {
  private inFlight = new Map<string, InFlightEntry<unknown>>();
  private cache = new Map<string, CacheEntry<unknown>>();
  private tagIndex = new Map<string, Set<string>>();
  private keyGenerations = new Map<string, number>();
  private globalGeneration = 0;
  private defaultTtl: number;
  private maxEntries: number;
  private inFlightSeq = 0;

  constructor(options?: HttpCacheOptions) {
    this.defaultTtl = options?.defaultTtl ?? 60_000;
    this.maxEntries = options?.maxEntries ?? 1000;
  }

  private getKeyGen(key: string): number {
    return this.keyGenerations.get(key) ?? 0;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return undefined;
    }
    // LRU touch: re-insert so it becomes the most recently used entry
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number, tags?: string[]): void {
    if (this.cache.has(key)) {
      this.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      // LRU Eviction: least recently used is the first entry in iteration order
      const iter = this.cache.keys().next();
      if (!iter.done) {
        this.delete(iter.value);
      }
    }

    const ttl = ttlMs ?? this.defaultTtl;
    const tagSet = new Set(tags || []);
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttl,
      tags: tagSet
    };

    this.cache.set(key, entry);

    for (const tag of tagSet) {
      let keys = this.tagIndex.get(tag);
      if (!keys) {
        keys = new Set();
        this.tagIndex.set(tag, keys);
      }
      keys.add(key);
    }
  }

  async dedupe<T>(key: string, fetcher: () => Promise<T>, ttlMs?: number, tags?: string[]): Promise<T> {
    if (this.has(key)) {
      return this.get<T>(key) as T;
    }

    const existing = this.inFlight.get(key);
    if (existing) {
      return existing.promise as Promise<T>;
    }

    const inFlightId = ++this.inFlightSeq;
    const startKeyGen = this.getKeyGen(key);
    const startGlobalGen = this.globalGeneration;

    const promise = (async () => {
      try {
        const data = await fetcher();
        // Invalidation check: verify neither delete(key) nor clear() occurred while in flight
        if (
          this.globalGeneration === startGlobalGen &&
          this.getKeyGen(key) === startKeyGen
        ) {
          this.set(key, data, ttlMs, tags);
        }
        return data;
      } finally {
        // Safe in-flight cleanup: only delete if this exact promise is still the active in-flight entry
        const current = this.inFlight.get(key);
        if (current && current.id === inFlightId) {
          this.inFlight.delete(key);
        }
      }
    })();

    this.inFlight.set(key, {
      promise,
      id: inFlightId,
      generation: startKeyGen,
      globalGen: startGlobalGen
    });

    return promise;
  }

  delete(key: string): boolean {
    this.keyGenerations.set(key, this.getKeyGen(key) + 1);
    this.inFlight.delete(key);

    const entry = this.cache.get(key);
    if (entry) {
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(key);
      }
      return this.cache.delete(key);
    }
    return false;
  }

  invalidateTags(tags: string | string[]): number {
    const tagList = Array.isArray(tags) ? tags : [tags];
    const keysToDelete = new Set<string>();

    for (const tag of tagList) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        for (const k of keys) {
          keysToDelete.add(k);
        }
      }
    }

    let count = 0;
    for (const k of keysToDelete) {
      if (this.delete(k)) {
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.globalGeneration++;
    this.keyGenerations.clear();
    this.inFlight.clear();
    this.cache.clear();
    this.tagIndex.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  get inFlightCount(): number {
    return this.inFlight.size;
  }
}

export const defaultRequestCache = new RequestCache();

export function createHttpCache(options?: HttpCacheOptions): RequestCache {
  return new RequestCache(options);
}

export function invalidateTags(tags: string | string[]): number {
  return defaultRequestCache.invalidateTags(tags);
}
