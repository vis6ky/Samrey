import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createResource, RequestCache, createHttpClient } from '../src/index.js';
import { signal } from '@samrey/reactivity';

describe('@samrey/http', () => {
  it('handles createResource state transitions and data loading', async () => {
    const userId = signal(1);

    const userResource = createResource(
      () => userId.value,
      async (id) => {
        return { id, name: `User #${id}` };
      }
    );

    const initialData = await userResource.refetch();
    assert.deepEqual(initialData, { id: 1, name: 'User #1' });
    assert.equal(userResource.status.value, 'success');
    assert.equal(userResource.loading.value, false);
    assert.deepEqual(userResource.data.value, { id: 1, name: 'User #1' });
  });

  it('supports iterable tuple destructuring as documented in AGENTS.md (const [users] = createResource(...))', async () => {
    const [users, actions] = createResource(async () => ({ count: 42 }));
    assert.ok(users, 'Resource must be destructurable into [users]');
    assert.equal(typeof users.loading.value, 'boolean');
    assert.equal(typeof users.refetch, 'function');
    assert.equal(typeof actions.refetch, 'function');

    const result = await users.refetch();
    assert.deepEqual(result, { count: 42 });
    assert.deepEqual(users.data.value, { count: 42 });
  });

  it('supports optimistic mutate() updates and prevents stale in-flight fetches from overwriting optimistic state', async () => {
    let resolveSlowFetch!: (val: { count: number }) => void;
    const slowPromise = new Promise<{ count: number }>((resolve) => {
      resolveSlowFetch = resolve;
    });

    const [stats, { mutate, refetch }] = createResource(async () => slowPromise, {
      initialValue: { count: 10 }
    });

    assert.equal(typeof mutate, 'function');
    assert.equal(typeof refetch, 'function');
    assert.equal(stats.status.value, 'pending');

    // Optimistically update with a direct value while initial fetch is still pending
    mutate({ count: 99 });
    assert.deepEqual(stats.data.value, { count: 99 });
    assert.equal(stats.status.value, 'success');
    assert.equal(stats.error.value, null);

    // Functional updater works on optimistic value
    mutate((prev) => ({ count: (prev?.count ?? 0) + 1 }));
    assert.deepEqual(stats.data.value, { count: 100 });

    // Resolving the older in-flight fetch must NOT overwrite the optimistic mutation
    resolveSlowFetch({ count: 10 });
    await slowPromise;
    await Promise.resolve();
    assert.deepEqual(stats.data.value, { count: 100 });
  });

  it('deduplicates simultaneous identical in-flight requests', async () => {
    const cache = new RequestCache();
    let networkCalls = 0;

    const fetcher = async () => {
      networkCalls++;
      await new Promise((r) => setTimeout(r, 10));
      return 'data';
    };

    const [res1, res2] = await Promise.all([
      cache.dedupe('key-1', fetcher),
      cache.dedupe('key-1', fetcher)
    ]);

    assert.equal(res1, 'data');
    assert.equal(res2, 'data');
    assert.equal(networkCalls, 1); // Only 1 physical network fetch occurred
  });

  it('normalizes URL slashes correctly without duplicate or missing slashes', () => {
    const clientNoTrailing = createHttpClient('https://api.example.com');
    assert.equal((clientNoTrailing as any).resolveUrl('users'), 'https://api.example.com/users');
    assert.equal((clientNoTrailing as any).resolveUrl('/users'), 'https://api.example.com/users');

    const clientTrailing = createHttpClient('https://api.example.com/');
    assert.equal((clientTrailing as any).resolveUrl('/users'), 'https://api.example.com/users');
    assert.equal((clientTrailing as any).resolveUrl('users'), 'https://api.example.com/users');

    const clientNoBase = createHttpClient();
    assert.equal((clientNoBase as any).resolveUrl('/local/api'), '/local/api');
    assert.equal((clientNoBase as any).resolveUrl('https://other.com/api'), 'https://other.com/api');
  });
});
