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

  it('enforces manual cross-origin redirect protection in browser environments and avoids double-prefixing relative baseUrl redirects', async () => {
    const originalFetch = globalThis.fetch;
    const hadDoc = 'document' in globalThis;
    const origDoc = (globalThis as any).document;
    const hadWin = 'window' in globalThis;
    const origWin = (globalThis as any).window;

    const calls: Array<{ url: string; redirect?: string; headers: Headers }> = [];
    globalThis.fetch = (async (u: unknown, init?: RequestInit) => {
      const target = String(u);
      const headers = new Headers(init?.headers);
      calls.push({ url: target, redirect: init?.redirect, headers });

      if (target === '/api/opaque') {
        return { type: 'opaqueredirect', ok: false, status: 0, statusText: '', url: '' } as any;
      }
      if (target === '/api/redir-evil') {
        return { ok: false, status: 302, statusText: 'Found', headers: new Headers({ location: 'https://evil.com/steal' }) } as any;
      }
      if (target === '/api/users') {
        return { ok: false, status: 302, statusText: 'Found', headers: new Headers({ location: '/v2/users' }) } as any;
      }
      if (target === 'https://api.example.com/cross-redir') {
        return { ok: false, status: 302, statusText: 'Found', headers: new Headers({ location: 'https://cdn.example.com/data' }) } as any;
      }
      return new Response('{"ok":true}', { status: 200 });
    }) as any;

    try {
      (globalThis as any).document = {};
      (globalThis as any).window = { location: { origin: 'https://app.example' } };

      const relClient = createHttpClient('/api');
      await assert.rejects(() => relClient.get('/opaque'), /opaque|redirect|Blocked/i);
      await assert.rejects(() => relClient.get('/redir-evil'), /cross-origin|redirect|Blocked/i);
      assert.ok(calls.every((c) => c.redirect === 'follow'), 'Must pass redirect: follow by default in browsers to allow same-origin redirects');
      assert.ok(!calls.some((c) => c.url.includes('evil.com')), 'Must never send redirect request to evil.com');

      const redirRes = await relClient.get<{ ok: boolean }>('/users');
      assert.equal(redirRes.ok, true);
      assert.ok(calls.some((c) => c.url === '/v2/users'), `Relative Location /v2/users must not double-prefix /api: ${calls.map((c) => c.url)}`);
      assert.ok(!calls.some((c) => c.url === '/api/v2/users'), 'Must not prepend baseUrl /api a second time');

      const api = createHttpClient('https://api.example.com');
      await api.get('/cross-redir', {
        allowCrossOrigin: true,
        headers: { Authorization: 'Bearer secret-token', 'X-Custom': 'keep' }
      });
      const secondHop = calls.find((c) => c.url === 'https://cdn.example.com/data');
      assert.ok(secondHop, 'Expected cross-origin redirect hop when allowCrossOrigin: true');
      assert.equal(secondHop!.headers.get('authorization'), null, 'Must strip Authorization header on cross-origin redirect');
      assert.equal(secondHop!.headers.get('x-custom'), 'keep');
    } finally {
      globalThis.fetch = originalFetch;
      if (hadDoc) (globalThis as any).document = origDoc;
      else delete (globalThis as any).document;
      if (hadWin) (globalThis as any).window = origWin;
      else delete (globalThis as any).window;
    }
  });

  it('Batch 1 red-team: enforces manual redirect control when allowCrossOrigin is true and preserves cross-origin //host redirects from empty baseUrl', async () => {
    const origFetch = globalThis.fetch;
    const wireRequests: Array<{ url: string; authorization: string | null; cookie: string | null }> = [];
    const routes = new Map<string, { status: number; location?: string; body?: string }>();
    for (let i = 0; i < 7; i++) {
      routes.set(`https://a.example/loop?step=${i}`, { status: 302, location: `https://a.example/loop?step=${i + 1}` });
    }
    routes.set('https://a.example/loop?step=7', { status: 200, body: '{"ok":true}' });
    routes.set('https://a.example/to-b', { status: 302, location: 'https://b.example/target' });
    routes.set('https://b.example/target', { status: 200, body: '{"ok":true,"server":"b"}' });
    routes.set('/start', { status: 302, location: '//cdn.example.com/data' });
    routes.set('https://cdn.example.com/data', { status: 200, body: '{"ok":true,"cdn":true}' });

    // Faithful fetch simulation: when init.redirect === 'follow', native fetch follows redirects internally
    globalThis.fetch = (async (u: unknown, init?: RequestInit) => {
      let current = String(u);
      const headers = new Headers(init?.headers);
      wireRequests.push({ url: current, authorization: headers.get('authorization'), cookie: headers.get('cookie') });
      const route = routes.get(current);
      if (init?.redirect === 'follow') {
        let hops = 0;
        let curRoute = route;
        while (curRoute && curRoute.status >= 300 && curRoute.status < 400 && curRoute.location && hops < 20) {
          hops++;
          current = new URL(curRoute.location, current).href;
          wireRequests.push({ url: current, authorization: headers.get('authorization'), cookie: headers.get('cookie') });
          curRoute = routes.get(current);
        }
        return new Response(curRoute?.body ?? '{}', { status: curRoute?.status ?? 200 });
      }
      if (route && route.status >= 300 && route.status < 400) {
        return { ok: false, status: route.status, statusText: 'Found', headers: new Headers({ location: route.location! }) } as any;
      }
      return new Response(route?.body ?? '{}', { status: route?.status ?? 200 });
    }) as any;

    try {
      const api = createHttpClient('https://a.example');
      await assert.rejects(
        () => api.get('/loop?step=0', { allowCrossOrigin: true }),
        /maximum redirect limit \(5\)/i
      );

      wireRequests.length = 0;
      await api.get('/to-b', {
        allowCrossOrigin: true,
        headers: { Authorization: 'Bearer top-secret', Cookie: 'sid=xyz' }
      });
      const bHit = wireRequests.find((r) => r.url === 'https://b.example/target');
      assert.ok(bHit, 'Expected redirect to b.example');
      assert.equal(bHit!.authorization, null);
      assert.equal(bHit!.cookie, null);

      wireRequests.length = 0;
      const emptyBaseClient = createHttpClient('');
      await emptyBaseClient.get('/start', { allowCrossOrigin: true });
      assert.ok(
        wireRequests.some((r) => r.url === 'https://cdn.example.com/data'),
        `Expected cross-origin //cdn.example.com/data redirect to keep external origin, got: ${wireRequests.map((r) => r.url).join(', ')}`
      );
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('deduplicates concurrent identical GET requests in HttpClient', async () => {
    const origFetch = globalThis.fetch;
    let fetchCount = 0;
    globalThis.fetch = (async () => {
      fetchCount++;
      await new Promise((r) => setTimeout(r, 20));
      return new Response(JSON.stringify({ message: 'ok', count: fetchCount }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }) as any;

    try {
      const client = createHttpClient('https://api.example.com');
      const [res1, res2] = await Promise.all([
        client.get<{ message: string; count: number }>('/shared-resource'),
        client.get<{ message: string; count: number }>('/shared-resource')
      ]);

      assert.equal(fetchCount, 1, 'Two concurrent GET requests must be deduplicated into 1 network call');
      assert.equal(res1.message, 'ok');
      assert.equal(res1.count, 1);
      assert.equal(res2.message, 'ok');
      assert.equal(res2.count, 1);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('supports cache tags invalidation in HttpClient and automatic mutation invalidation', async () => {
    const origFetch = globalThis.fetch;
    let fetchCount = 0;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      fetchCount++;
      if (init?.method === 'POST') {
        return new Response(JSON.stringify({ created: true }), { status: 201 });
      }
      return new Response(JSON.stringify({ items: ['item1'], fetchIndex: fetchCount }), { status: 200 });
    }) as any;

    try {
      const client = createHttpClient('https://api.example.com');

      // 1. Initial cached GET with tag 'products'
      const first = await client.get<{ items: string[]; fetchIndex: number }>('/products', {
        tags: ['products'],
        ttlMs: 60_000
      });
      assert.equal(first.fetchIndex, 1);

      // 2. Second GET hits cache (no new network fetch)
      const cached = await client.get<{ items: string[]; fetchIndex: number }>('/products', {
        tags: ['products']
      });
      assert.equal(cached.fetchIndex, 1);
      assert.equal(fetchCount, 1);

      // 3. POST with tags: ['products'] automatically invalidates the tag
      await client.post('/products', { name: 'item2' }, { tags: ['products'] });

      // 4. Third GET fetches fresh data from network
      const fresh = await client.get<{ items: string[]; fetchIndex: number }>('/products', {
        tags: ['products']
      });
      assert.equal(fresh.fetchIndex, 3); // 1 = initial GET, 2 = POST, 3 = refetched GET
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('RequestCache: clear() and delete() invalidate in-flight requests and prevent stale cache writes', async () => {
    const cache = new RequestCache();
    let resolveFirst!: (val: string) => void;
    const slowFetch = () => new Promise<string>((r) => { resolveFirst = r; });

    // Start in-flight request
    const p1 = cache.dedupe('test-key', slowFetch);

    // Delete key while request is still in flight
    cache.delete('test-key');

    // Resolve the in-flight request
    resolveFirst('stale-value');
    await p1;

    // Cache must NOT contain 'test-key' because it was invalidated during flight
    assert.equal(cache.has('test-key'), false, 'Stale resolved data must not be written to cache after delete()');

    // Next request should run fresh fetcher
    let secondFetched = false;
    const res = await cache.dedupe('test-key', async () => {
      secondFetched = true;
      return 'fresh-value';
    });
    assert.equal(secondFetched, true);
    assert.equal(res, 'fresh-value');
  });

  it('RequestCache: correctly caches undefined response and supports LRU eviction with empty string keys', async () => {
    const cache = new RequestCache({ maxEntries: 2 });
    let calls = 0;

    // Caching undefined response
    const fetchUndefined = async () => {
      calls++;
      return undefined;
    };

    const val1 = await cache.dedupe('key-undef', fetchUndefined);
    assert.equal(val1, undefined);
    assert.equal(calls, 1);

    // Calling again should read cached undefined without repeating network call
    const val2 = await cache.dedupe('key-undef', fetchUndefined);
    assert.equal(val2, undefined);
    assert.equal(calls, 1);

    // Test LRU eviction with empty string key ""
    cache.clear();
    cache.set('', 'empty-key-val');
    cache.set('k2', 'val2');
    assert.equal(cache.size, 2);

    // Adding third key must evict oldest ('')
    cache.set('k3', 'val3');
    assert.equal(cache.size, 2);
    assert.equal(cache.has(''), false, 'Oldest empty-string key must be evicted by LRU');
    assert.equal(cache.has('k2'), true);
    assert.equal(cache.has('k3'), true);
  });

  it('createResource: supports options.key, options.tags, and createResource.invalidateTags()', async () => {
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return { count: fetchCount };
    };

    const [r1] = createResource(fetcher, {
      key: 'resource-tag-test',
      tags: ['test-tag']
    });

    const data1 = await r1.refetch();
    assert.equal(data1.count, 1);

    // Refetching while cached returns cached data without calling fetcher
    const data2 = await r1.refetch();
    assert.equal(data2.count, 1);
    assert.equal(fetchCount, 1);

    // Invalidate tag via createResource.invalidateTags
    createResource.invalidateTags(['test-tag']);

    // Refetching now triggers a fresh network call
    const data3 = await r1.refetch();
    assert.equal(data3.count, 2);
    assert.equal(fetchCount, 2);
  });

  it('bypasses cache when Authorization or Cookie headers are present (prevents cross-user response leakage)', async () => {
    const originalFetch = globalThis.fetch;
    let fetchCount = 0;
    const client = createHttpClient('https://api.example.com', { cache: true });

    globalThis.fetch = (async (u: unknown, init?: RequestInit) => {
      fetchCount++;
      const auth = new Headers(init?.headers).get('authorization');
      return new Response(JSON.stringify({ user: auth, fetchCount }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }) as any;

    try {
      // Alice requests /profile with her auth token
      const resAlice = await client.get<{ user: string; fetchCount: number }>('/profile', {
        headers: { Authorization: 'Bearer token-alice' }
      });
      assert.equal(resAlice.user, 'Bearer token-alice');
      assert.equal(resAlice.fetchCount, 1);

      // Bob requests same URL with his auth token - MUST NOT receive Alice's cached data!
      const resBob = await client.get<{ user: string; fetchCount: number }>('/profile', {
        headers: { Authorization: 'Bearer token-bob' }
      });
      assert.equal(resBob.user, 'Bearer token-bob');
      assert.equal(resBob.fetchCount, 2);

      // Concurrent requests with different auth must make separate calls
      const [concAlice, concBob] = await Promise.all([
        client.get<{ user: string }>('/profile', { headers: { Authorization: 'Bearer token-alice' } }),
        client.get<{ user: string }>('/profile', { headers: { Authorization: 'Bearer token-bob' } })
      ]);
      assert.equal(concAlice.user, 'Bearer token-alice');
      assert.equal(concBob.user, 'Bearer token-bob');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('default shared httpClient has cache disabled to prevent SSR multi-tenant cache leaks', () => {
    assert.equal(httpClient.cache, null, 'Default httpClient must have cache: null');
  });

  it('rejects 200 responses with non-JSON or HTML content with HttpError', async () => {
    const originalFetch = globalThis.fetch;
    const client = createHttpClient('https://api.example.com');

    globalThis.fetch = (async () => {
      // 200 OK HTML login/portal page
      return new Response('<!DOCTYPE html><html><body>Login Page</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }) as any;

    try {
      await assert.rejects(
        () => client.get('/api/account'),
        (err: any) => {
          assert.equal(err.status, 200);
          assert.ok(err.message.includes('Expected JSON response'));
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
