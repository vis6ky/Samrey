import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createResource, RequestCache, createHttpClient, httpClient } from '../src/index.js';
import { createRoot, signal, SuspenseTrackerContext } from '@samrey/reactivity';

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
    mutate((prev: { count: number } | undefined) => ({ count: (prev?.count ?? 0) + 1 }));
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
    assert.throws(() => (clientNoBase as any).resolveUrl('https://other.com/api'), /cross-origin|Blocked/i);
    assert.equal((clientNoBase as any).resolveUrl('https://other.com/api', true), 'https://other.com/api');
  });

  it('aborts in-flight fetches on mutate() and registers pending loads with SuspenseTrackerContext (Bug 8a)', async () => {
    let observedAbort = false;
    let trackedPromises: Promise<unknown>[] = [];

    let resolveFetch!: (v: string) => void;
    await new Promise<void>((done) => {
      createRoot((dispose) => {
        SuspenseTrackerContext.Provider({
          value: {
            track(p) {
              trackedPromises.push(p);
            }
          },
          children: () => {
            const [res, { mutate }] = createResource(({ abortSignal }) => {
              abortSignal.addEventListener('abort', () => {
                observedAbort = true;
              });
              return new Promise<string>((r) => {
                resolveFetch = r;
              });
            });

            assert.equal(trackedPromises.length, 1);
            mutate('optimistic');
            assert.equal(observedAbort, true, 'mutate() must abort obsolete in-flight fetch');
            assert.equal(res.data.value, 'optimistic');

            resolveFetch('stale');
            dispose();
            done();
          }
        });
      });
    });

    await Promise.all(trackedPromises);
  });

  it('scrubs prototype pollution in HttpClient JSON payloads and cleans up AbortSignal listeners (Bug 8a)', async () => {
    const originalFetch = globalThis.fetch;
    const addedListeners: Array<() => void> = [];
    const removedListeners: Array<() => void> = [];
    const mockCallerSignal = {
      aborted: false,
      reason: undefined,
      addEventListener: (_type: string, fn: any) => {
        addedListeners.push(fn);
      },
      removeEventListener: (_type: string, fn: any) => {
        removedListeners.push(fn);
      }
    } as unknown as AbortSignal;

    globalThis.fetch = (async () =>
      ({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '{"safe":"yes","__proto__":{"polluted":true},"nested":{"constructor":{"prototype":{"evil":1}}}}'
      }) as any) as any;

    try {
      const client = createHttpClient('https://api.example.com');
      const data = await client.get<any>('/items', {
        timeoutMs: 5000,
        signal: mockCallerSignal
      });
      assert.equal(data.safe, 'yes');
      assert.equal(Object.prototype.hasOwnProperty.call(data, '__proto__'), false);
      assert.equal((data as any).polluted, undefined);
      assert.equal(({} as any).polluted, undefined);
      assert.equal(addedListeners.length, 1);
      assert.equal(removedListeners.length, 1);
      assert.equal(removedListeners[0], addedListeners[0], 'Must remove abort listener in finally block');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('blocks protocol-relative and cross-origin URLs when baseUrl is configured unless allowCrossOrigin is set', async () => {
    const originalFetch = globalThis.fetch;
    const fetchedUrls: string[] = [];
    globalThis.fetch = (async (u: unknown) => {
      fetchedUrls.push(String(u));
      return new Response('{}', { status: 200 });
    }) as any;

    try {
      const api = createHttpClient('https://api.example.com');
      await assert.rejects(() => api.get('//evil.com/leak'), /Blocked protocol-relative URL/);
      await assert.rejects(() => api.get('https://evil.com/leak'), /Blocked cross-origin URL/);
      await assert.rejects(() => api.get('https:evil.com'), /Blocked malformed HTTP URL/);

      await api.get('https://trusted.example.com/ok', { allowCrossOrigin: true });
      assert.deepEqual(fetchedUrls, ['https://trusted.example.com/ok']);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('ignores late resolutions/rejections and blocks subsequent refetch after owner disposal', async () => {
    let resolvePending!: (v: string) => void;
    let resRef!: ReturnType<typeof createResource<string>>;

    const dispose = createRoot((d) => {
      resRef = createResource(
        async () =>
          new Promise<string>((resolve) => {
            resolvePending = resolve;
          }),
        { initialValue: 'init' }
      );
      return d;
    });

    assert.equal(resRef.status.value, 'pending');
    dispose();

    // Even if fetcher ignores abortSignal and resolves late, state must remain untouched
    resolvePending('late-value');
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(resRef.data.value, 'init');
    assert.notEqual(resRef.status.value, 'success');

    await assert.rejects(() => resRef.refetch(), { name: 'AbortError' });
  });

  it('Batch 1 regression: blocks default httpClient cross-origin, backslash protocol-relative URLs, and cross-origin HTTP redirects unless allowCrossOrigin is true', async () => {
    const originalFetch = globalThis.fetch;
    const fetchedUrls: string[] = [];
    globalThis.fetch = (async (u: unknown) => {
      const target = String(u);
      fetchedUrls.push(target);
      if (target.endsWith('/redirect-evil')) {
        return {
          ok: false,
          status: 302,
          statusText: 'Found',
          headers: new Headers({ location: 'https://evil.com/steal' })
        } as any;
      }
      if (target.endsWith('/redirect-proto')) {
        return {
          ok: false,
          status: 302,
          statusText: 'Found',
          headers: new Headers({ location: '//evil.com/steal' })
        } as any;
      }
      if (target.endsWith('/redirect-same')) {
        return {
          ok: false,
          status: 302,
          statusText: 'Found',
          headers: new Headers({ location: '/v2/ok' })
        } as any;
      }
      if (target.endsWith('/followed-evil')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          url: 'https://evil.com/leaked',
          redirected: true,
          text: async () => '{"ok":false}'
        } as any;
      }
      return new Response('{"ok":true}', { status: 200 });
    }) as any;

    try {
      // 1. Default httpClient and root '/' client must block cross-origin & backslash protocol-relative bypasses
      await assert.rejects(() => httpClient.get('https://evil.com/leak'), /Blocked cross-origin URL/i);
      await assert.rejects(() => httpClient.get('//evil.com/proto'), /Blocked protocol-relative URL/i);
      await assert.rejects(() => httpClient.get('/\\\\evil.com/bs'), /Blocked protocol-relative URL/i);
      await assert.rejects(() => createHttpClient('/').get('/\\\\evil.com/fsbs'), /Blocked protocol-relative URL/i);
      await assert.rejects(() => createHttpClient('/').get('\\\\evil.com/bs'), /Blocked protocol-relative URL/i);
      await assert.rejects(() => createHttpClient('https://api.example.com').get('/%5cevil.com'), /Blocked protocol-relative URL/i);
      assert.equal(fetchedUrls.length, 0, 'Blocked URLs must never invoke fetch()');

      // 2. Cross-origin redirects must be blocked before fetching the redirect target
      const api = createHttpClient('https://api.example.com');
      await assert.rejects(() => api.get('/redirect-evil'), /cross-origin|redirect|Blocked/i);
      await assert.rejects(() => api.get('/redirect-proto'), /protocol-relative|redirect|Blocked/i);
      await assert.rejects(() => api.get('/followed-evil'), /cross-origin|redirect|Blocked/i);
      assert.ok(!fetchedUrls.some((u: string) => u.includes('evil.com')), `Must never fetch cross-origin redirect target: ${fetchedUrls}`);

      // 3. Same-origin redirects and explicit allowCrossOrigin work properly
      const sameOriginRes = await api.get<{ ok: boolean }>('/redirect-same');
      assert.equal(sameOriginRes.ok, true);
      assert.equal(Object.getPrototypeOf(sameOriginRes), null);
      await httpClient.get('https://trusted.example.com/ok', { allowCrossOrigin: true });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('transitions createResource status to error on timeoutMs even for AbortError or non-aborting hanging fetchers', async () => {
    const abortingRes = createResource(
      async ({ abortSignal }) => {
        return new Promise<string>((_resolve, reject) => {
          abortSignal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      },
      { timeoutMs: 15 }
    );

    await new Promise((r) => setTimeout(r, 40));
    assert.equal(abortingRes.status.value, 'error');
    assert.ok(abortingRes.error.value instanceof Error);
    await assert.rejects(() => abortingRes.refetch(), /timeout|abort/i);

    const ignoringRes = createResource(
      async () => {
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve('too-late'), 200);
        });
      },
      { timeoutMs: 15 }
    );

    await new Promise((r) => setTimeout(r, 40));
    assert.equal(ignoringRes.status.value, 'error');
    assert.ok(ignoringRes.error.value instanceof Error);
  });
});
