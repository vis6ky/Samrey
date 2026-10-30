/**
 * @license Apache-2.0
 * Tests for Issue 5: Assistant rate limit IP resolution, trust-proxy flag, pruning, and Map cap
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { RateLimiter } from '../src/server/rate-limiter.js';
import type { IncomingMessage } from 'node:http';

describe('Issue 5: Assistant Rate Limiter Security & Bounded Resource Control', () => {
  it('1. Does not trust x-forwarded-for unless trustProxy is true, keys on socket address', () => {
    const limiter = new RateLimiter({ trustProxy: false });

    const mockReqUntrusted = {
      headers: {
        'x-forwarded-for': '203.0.113.195'
      },
      socket: {
        remoteAddress: '198.51.100.1'
      }
    } as unknown as IncomingMessage;

    // Must return socket address, ignoring x-forwarded-for spoofing
    const ip = limiter.getClientIp(mockReqUntrusted);
    assert.strictEqual(ip, '198.51.100.1', 'Untrusted proxy must key on socket address');

    // When trustProxy is enabled, honors x-forwarded-for
    limiter.trustProxy = true;
    const ipTrusted = limiter.getClientIp(mockReqUntrusted);
    assert.strictEqual(ipTrusted, '203.0.113.195', 'Trusted proxy must honor x-forwarded-for');
  });

  it('2. Prunes expired entries and does not leak memory', () => {
    const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 5 });
    const startTime = 100000;

    // Add entry at startTime
    limiter.check('10.0.0.1', startTime);
    assert.strictEqual(limiter.size(), 1);

    // Prune within window -> remains
    limiter.prune(startTime + 500);
    assert.strictEqual(limiter.size(), 1);

    // Prune past window -> purged
    limiter.prune(startTime + 1500);
    assert.strictEqual(limiter.size(), 0);
  });

  it('3. Caps the Map size and evicts oldest entries when capacity is exceeded', () => {
    const maxEntries = 5;
    const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 10, maxEntries });

    for (let i = 0; i < 10; i++) {
      limiter.check(`192.168.1.${i}`);
    }

    // Size must never exceed maxEntries
    assert.ok(limiter.size() <= maxEntries, `Size ${limiter.size()} must be capped at ${maxEntries}`);
  });
});
