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
