/**
 * @license Apache-2.0
 * Server-side Sliding-Window Rate Limiter for Assistant Endpoints
 */

import type { IncomingMessage } from 'node:http';

export interface RateLimitRecord {
  timestamps: number[];
  lastSeen: number;
}

export interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  maxEntries?: number;
  trustProxy?: boolean;
}

export class RateLimiter {
  private readonly records = new Map<string, RateLimitRecord>();
  public readonly windowMs: number;
  public readonly maxRequests: number;
  public readonly maxEntries: number;
  public trustProxy: boolean;

  constructor(options: RateLimiterOptions = {}) {
    this.windowMs = options.windowMs ?? 60 * 1000;
    this.maxRequests = options.maxRequests ?? 30;
    this.maxEntries = options.maxEntries ?? 5000;
    this.trustProxy = options.trustProxy ?? (process.env.TRUST_PROXY === 'true');
  }

  public getClientIp(req: IncomingMessage): string {
    if (this.trustProxy) {
      const forwarded = req.headers['x-forwarded-for'];
      if (typeof forwarded === 'string' && forwarded.length > 0) {
        const parts = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
        if (parts.length > 0) {
          // The trusted reverse proxy appends the client's actual remote IP to the end of the chain.
          // Using the leftmost value allows clients to spoof arbitrary IPs and rotate headers to bypass rate limits.
          return parts[parts.length - 1];
        }
      }
    }
    return req.socket.remoteAddress || '127.0.0.1';
  }

  public prune(now = Date.now()): void {
    for (const [key, record] of this.records.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < this.windowMs);
      if (record.timestamps.length === 0 && now - record.lastSeen >= this.windowMs) {
        this.records.delete(key);
      }
    }
  }

  public check(ip: string, now = Date.now()): { allowed: boolean; retryAfter?: number } {
    let record = this.records.get(ip);
    if (record) {
      // Move to back of Map iteration order to maintain genuine LRU ordering
      this.records.delete(ip);
      this.records.set(ip, record);
    } else {
      // If capacity is reached, prune expired entries
      if (this.records.size >= this.maxEntries) {
        this.prune(now);
      }

      // If still at or over capacity, evict the least recently used entry (first in Map iteration order)
      if (this.records.size >= this.maxEntries) {
        const lruKey = this.records.keys().next().value;
        if (lruKey !== undefined) {
          this.records.delete(lruKey);
        }
      }

      record = { timestamps: [], lastSeen: now };
      this.records.set(ip, record);
    }

    record.lastSeen = now;
    record.timestamps = record.timestamps.filter((t) => now - t < this.windowMs);

    if (record.timestamps.length >= this.maxRequests) {
      const oldest = record.timestamps[0];
      const retryAfter = Math.ceil((this.windowMs - (now - oldest)) / 1000);
      return { allowed: false, retryAfter };
    }

    record.timestamps.push(now);
    return { allowed: true };
  }

  public size(): number {
    return this.records.size;
  }

  public reset(): void {
    this.records.clear();
  }
}

export const assistantRateLimiter = new RateLimiter();
