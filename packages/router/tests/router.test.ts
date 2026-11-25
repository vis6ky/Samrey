import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { onCleanup, createRoot } from '@samrey/reactivity';
import { matchPath, createRouter, matchRoutes, Router, Route, RouterOutlet, useNavigate, useLocation, useSearchParams, useRouter, Link, createLink, setRouterInstance } from '../src/index.js';

describe('@samrey/router', () => {
  it('matches static and parameterized routes correctly', () => {
    assert.deepEqual(matchPath('/users/:id', '/users/42'), { id: '42' });
    assert.deepEqual(matchPath('/posts/:category/:slug', '/posts/tech/samrey-alpha'), {
      category: 'tech',
      slug: 'samrey-alpha'
    });
    assert.equal(matchPath('/about', '/contact'), null);
  });

  it('navigates and updates active parameters reactively', () => {
    const routes = [
      { path: '/', component: () => 'Home' },
      { path: '/users/:id', component: () => 'UserProfile' }
    ];

    const router = createRouter(routes, '/');
    assert.equal(router.currentPath.value, '/');
    assert.deepEqual(router.currentParams.value, {});

    router.navigate('/users/100');
    assert.equal(router.currentPath.value, '/users/100');
    assert.deepEqual(router.currentParams.value, { id: '100' });
  });

  it('renders active route via Router and Route children', () => {
    const outlet = Router({
      initialPath: '/',
      children: [
        Route({ path: '/', component: () => 'Home Page' }),
        Route({ path: '/about', component: () => 'About Page' })
      ]
    });
    assert.ok(outlet != null);

    const navigate = useNavigate();
    assert.equal(typeof navigate, 'function');
    navigate('/about');
  });

  it('matches wildcard catch-all routes correctly across root and multi-segment paths', () => {
    assert.deepEqual(matchPath('/*', '/about/team'), { '*': 'about/team' });
    assert.deepEqual(matchPath('/*', '/'), { '*': '' });
    assert.deepEqual(matchPath('/docs/*', '/docs/guide/start'), { '*': 'guide/start' });
    assert.deepEqual(matchPath('/docs/*', '/docs'), { '*': '' });
    assert.equal(matchPath('/docs/*', '/api/start'), null);
    assert.deepEqual(matchPath('/files/*filepath', '/files/nested/dir/file.txt'), { filepath: 'nested/dir/file.txt' });
  });

  it('correctly matches middle wildcards and does not ignore tail patterns', () => {
    assert.deepEqual(matchPath('/a/*/b', '/a/x/b'), { '*': 'x' });
    assert.deepEqual(matchPath('/a/*/b', '/a/x/y/b'), { '*': 'x/y' });
    assert.equal(matchPath('/a/*/b', '/a/x/zzz'), null, 'Must reject when tail does not match');
    assert.deepEqual(matchPath('/api/*endpoint/status', '/api/v1/auth/status'), { endpoint: 'v1/auth' });
    assert.equal(matchPath('/api/*endpoint/status', '/api/v1/auth/metrics'), null);
  });

  it('prevents directory traversal by refusing to decode %2e%2e into .. in wildcard params', () => {
    const res = matchPath('/files/*path', '/files/%2e%2e/%2e%2e/etc/passwd');
    assert.ok(res);
    assert.equal(res['path'], '%2e%2e/%2e%2e/etc/passwd', 'Must preserve %2e%2e to prevent directory traversal');
  });

  it('refuses to match routes containing reserved param names like constructor and __proto__', () => {
    assert.equal(matchPath('/:constructor', '/evil'), null, 'Must not match route with constructor param');
    assert.equal(matchPath('/:__proto__', '/evil'), null, 'Must not match route with __proto__ param');
    assert.equal(matchPath('/items/:constructor/view', '/items/123/view'), null);
  });

  it('disposes component owners on navigation and handles arrays of nodes in RouterOutlet', () => {
    let homeDisposals = 0;
    let aboutMounted = 0;

    const outlet = Router({
      initialPath: '/',
      routes: [
        {
          path: '/',
          component: () => {
            onCleanup(() => {
              homeDisposals++;
            });
            return ['Home Part 1', 'Home Part 2'];
          }
        },
        {
          path: '/about',
          component: () => {
            aboutMounted++;
            return 'About Us';
          }
        }
      ]
    });

    assert.ok(outlet != null);
    const nav = useNavigate();
    nav('/about');
    assert.equal(aboutMounted, 1);
    assert.equal(homeDisposals, 1);
  });

  it('enforces route guards, falling through to subsequent routes or null when blocked', () => {
    let isAuthenticated = false;

    const routes = [
      {
        path: '/admin',
        guard: () => isAuthenticated,
        component: () => 'AdminDashboard'
      },
      {
        path: '/admin',
        component: () => 'LoginPrompt'
      },
      {
        path: '/public',
        component: () => 'PublicPage'
      }
    ];

    const matchUnauthenticated = matchRoutes(routes, '/admin');
    assert.ok(matchUnauthenticated != null);
    assert.equal(matchUnauthenticated.route.component(), 'LoginPrompt');

    isAuthenticated = true;
    const matchAuthenticated = matchRoutes(routes, '/admin');
    assert.ok(matchAuthenticated != null);
    assert.equal(matchAuthenticated.route.component(), 'AdminDashboard');
  });

  it('cleans up popstate event listener on router destroy or owner disposal', () => {
    let removedListener: string | null = null;
    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = {
      location: { pathname: '/', search: '', hash: '' },
      addEventListener: () => {},
      removeEventListener: (evt: string) => {
        removedListener = evt;
      }
    };

    try {
      const router = createRouter([{ path: '/', component: () => 'Home' }], '/');
      assert.equal(typeof router.destroy, 'function');
      router.destroy?.();
      assert.equal(removedListener, 'popstate');
    } finally {
      if (originalWindow) {
        (globalThis as any).window = originalWindow;
      } else {
        delete (globalThis as any).window;
      }
    }
  });

  it('does not prevent default on Link click when target="_blank" and passes target attribute through', () => {
    const linkEl = Link({
      href: '/docs',
      target: '_blank',
      rel: 'noopener noreferrer',
      children: 'Docs'
    }) as any;

    const targetVal = linkEl.getAttribute ? linkEl.getAttribute('target') : (linkEl.attributes?.target || linkEl.target);
    const relVal = linkEl.getAttribute ? linkEl.getAttribute('rel') : (linkEl.attributes?.rel || linkEl.rel);

    assert.equal(targetVal, '_blank', 'Must pass target attribute through');
    assert.equal(relVal, 'noopener noreferrer', 'Must pass rel attribute through');

    let prevented = false;
    const mockEvent = {
      type: 'click',
      defaultPrevented: false,
      button: 0,
      preventDefault: () => { prevented = true; }
    } as any;

    linkEl.dispatchEvent(mockEvent);
    assert.equal(prevented, false, 'Link with target="_blank" must not preventDefault()');
  });

  it('prevents open redirects in navigate(), popstate, Link, and createLink (Bug 6)', () => {
    const originalWindow = (globalThis as any).window;
    let locationHrefWrites = 0;
    let popstateHandler: (() => void) | null = null;
    const mockLocation = {
      pathname: '/dashboard',
      search: '',
      hash: '',
      get href() {
        return 'https://app.samrey.test/dashboard';
      },
      set href(_v: string) {
        locationHrefWrites++;
      }
    };

    (globalThis as any).window = {
      location: mockLocation,
      history: { pushState: () => {}, replaceState: () => {} },
      addEventListener: (evt: string, fn: () => void) => {
        if (evt === 'popstate') popstateHandler = fn;
      },
      removeEventListener: () => {}
    };

    try {
      const router = createRouter([{ path: '/dashboard', component: () => 'Dashboard' }]);
      assert.equal(router.currentPath.value, '/dashboard');

      for (const malicious of [
        '//evil.com/phishing',
        '  //evil.com/phishing',
        '/\\evil.com',
        '/%2fevil.com',
        'https://attacker.com/login',
        'javascript:alert(1)'
      ]) {
        router.navigate(malicious);
        assert.equal(router.currentPath.value, '/dashboard');
        assert.equal(locationHrefWrites, 0, `navigate("${malicious}") must not write window.location.href`);
      }

      // Spoofed popstate pathname must also be sanitized
      mockLocation.pathname = '//evil.com';
      assert.ok(popstateHandler !== null);
      (popstateHandler as () => void)();
      assert.equal(router.currentPath.value, '/');

      // createLink / Link reject protocol-relative and javascript: URIs while keeping explicit https:
      assert.equal(createLink(router, '//evil.com/phish').href, '/');
      assert.equal(createLink(router, 'javascript:alert(1)').href, '/');
      assert.equal(createLink(router, 'https://samrey.dev/docs').href, 'https://samrey.dev/docs');
      assert.equal(Link({ href: '//evil.com/phish', children: 'Bad' }).getAttribute?.('href') ?? (Link({ href: '//evil.com/phish', children: 'Bad' }) as any).href, '/');
    } finally {
      if (originalWindow) {
        (globalThis as any).window = originalWindow;
      } else {
        delete (globalThis as any).window;
      }
    }
  });

  it('wires top-level createRouter() to Link/RouterOutlet and isolates RouterContext per owner', async () => {
    setRouterInstance(null);
    const router = createRouter([
      { path: '/', component: () => 'Home View' },
      { path: '/dash', component: () => 'Dash View' }
    ], '/');

    const link = Link({ href: '/dash', children: 'Dash' }) as any;
    const outlet = RouterOutlet() as any;
    assert.ok(outlet.outerHTML.includes('Home View'));

    link.dispatchEvent({ type: 'click', button: 0, preventDefault: () => {} });
    assert.equal(router.currentPath.value, '/dash');
    assert.ok(outlet.outerHTML.includes('Dash View'));
    router.destroy?.();

    // Scoped owners keep independent RouterContext instances across concurrent async boundaries
    const observed: string[] = [];
    await Promise.all([
      new Promise<void>((resolve) => {
        createRoot(async (dispose) => {
          createRouter([{ path: '/a', component: () => 'RouteA' }], '/a');
          const loc = useLocation();
          await new Promise((r) => setTimeout(r, 15));
          observed.push(`A:${loc.value}`);
          dispose();
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        createRoot(async (dispose) => {
          createRouter([{ path: '/b', component: () => 'RouteB' }], '/b');
          const loc = useLocation();
          await new Promise((r) => setTimeout(r, 5));
          observed.push(`B:${loc.value}`);
          dispose();
          resolve();
        });
      })
    ]);

    assert.ok(observed.includes('A:/a'));
    assert.ok(observed.includes('B:/b'));
  });

  it('removes all child nodes when RouterOutlet renders a DocumentFragment and throws in useRouter outside context', () => {
    setRouterInstance(null as any);
    assert.throws(() => useRouter(), /Router/i);

    // Build minimal fragment + element tree simulating DOM DocumentFragment move semantics
    const makeEl = (tag: string, text = '') => {
      const node: any = {
        nodeType: 1,
        tagName: tag,
        textContent: text,
        attributes: {} as Record<string, string>,
        childNodes: [] as any[],
        parentNode: null as any,
        setAttribute(k: string, v: string) {
          node.attributes[k] = v;
        },
        getAttribute(k: string) {
          return node.attributes[k] ?? null;
        },
        addEventListener() {},
        removeEventListener() {},
        appendChild(child: any) {
          if (child.nodeType === 11) {
            const moved = [...child.childNodes];
            child.childNodes.length = 0;
            for (const m of moved) {
              m.parentNode = node;
              node.childNodes.push(m);
            }
            return child;
          }
          child.parentNode = node;
          node.childNodes.push(child);
          return child;
        },
        remove() {
          if (!node.parentNode) return;
          const idx = node.parentNode.childNodes.indexOf(node);
          if (idx !== -1) node.parentNode.childNodes.splice(idx, 1);
          node.parentNode = null;
        },
        removeChild(child: any) {
          const idx = node.childNodes.indexOf(child);
          if (idx !== -1) node.childNodes.splice(idx, 1);
          child.parentNode = null;
        }
      };
      return node;
    };

    const prevDocument = (globalThis as any).document;
    (globalThis as any).document = {
      createElement: (tag: string) => makeEl(tag),
      createTextNode: (txt: string) => {
        const t: any = {
          nodeType: 3,
          nodeName: '#text',
          textContent: txt,
          parentNode: null,
          remove() {
            if (!t.parentNode) return;
            const i = t.parentNode.childNodes.indexOf(t);
            if (i !== -1) t.parentNode.childNodes.splice(i, 1);
            t.parentNode = null;
          }
        };
        return t;
      }
    };

    try {
      const disposeRoot = createRoot((dispose) => {
        const router = createRouter(
          [
            {
              path: '/frag',
              component: () => {
                const frag: any = {
                  nodeType: 11,
                  childNodes: [] as any[],
                  appendChild(c: any) { c.parentNode = frag; frag.childNodes.push(c); return c; }
                };
                frag.appendChild(makeEl('span', 'One'));
                frag.appendChild(makeEl('span', 'Two'));
                return frag;
              }
            },
            {
              path: '/next',
              component: () => makeEl('p', 'NextRoute')
            }
          ],
          '/frag'
        );

        const outlet = RouterOutlet() as any;
        assert.equal(outlet.childNodes.length, 2);

        router.navigate('/next');
        assert.equal(outlet.childNodes.length, 1);
        assert.equal(outlet.childNodes[0].textContent, 'NextRoute');
        return dispose;
      });
      disposeRoot();
    } finally {
      setRouterInstance(null as any);
      (globalThis as any).document = prevDocument;
    }
  });

  it('Batch 3 regression: useSearchParams ignores query tokens inside hash, Link skips download links, and relative links resolve safely', async () => {
    const { resolveLinkTarget } = await import('../src/link-helpers.js');

    // 1. Hash before '?' must NOT leak into search params
    await createRoot(async (dispose) => {
      const router = createRouter([{ path: '/page', component: () => ({ nodeType: 1 }) as any }], '/page#section?a=1');
      const [params, setParams] = useSearchParams();
      assert.equal(params.value.get('a'), null, 'useSearchParams must ignore ?a=1 after #hash');
      assert.equal(params.value.toString(), '');

      router.navigate('/page?b=2#section?a=1');
      assert.equal(params.value.get('b'), '2');
      assert.equal(params.value.get('a'), null);
      void setParams;
      dispose();
    });

    // 2. resolveLinkTarget resolves relative paths cleanly while blocking unsafe schemes & protocol-relative URLs
    assert.deepEqual(resolveLinkTarget('settings'), { isExternal: false, safeHref: '/settings' });
    assert.deepEqual(resolveLinkTarget('settings', '/app/users/'), { isExternal: false, safeHref: '/app/users/settings' });
    assert.deepEqual(resolveLinkTarget('../about', '/app/users/profile'), { isExternal: false, safeHref: '/app/about' });
    assert.deepEqual(resolveLinkTarget('?tab=security', '/app/users'), { isExternal: false, safeHref: '/app/users?tab=security' });
    assert.deepEqual(resolveLinkTarget('//evil.com/phish'), { isExternal: false, safeHref: '/' });
    assert.deepEqual(resolveLinkTarget('javascript:alert(1)'), { isExternal: false, safeHref: '/' });
    assert.deepEqual(resolveLinkTarget('java\tscript:alert(1)'), { isExternal: false, safeHref: '/' });

    await createRoot(async (dispose) => {
      const router = createRouter([{ path: '/', component: () => ({ nodeType: 1 }) as any }], '/');
      router.navigate('https\t://evil.com/admin');
      assert.equal(router.currentPath.value, '/', 'Obfuscated scheme navigate("https\\t://evil.com/admin") must not change path');
      dispose();
    });

    // 3. Link with download attribute must not hijack navigation
    const prevDoc = (globalThis as any).document;
    const clickHandlers: Array<(e: any) => void> = [];
    (globalThis as any).document = {
      createElement: () => {
        const node: any = {
          nodeType: 1,
          attributes: {},
          childNodes: [],
          setAttribute(k: string, v: string) { node.attributes[k] = v; },
          getAttribute(k: string) { return node.attributes[k] ?? null; },
          addEventListener(type: string, fn: (e: any) => void) { if (type === 'click') clickHandlers.push(fn); },
          removeEventListener() {},
          appendChild() {}
        };
        return node;
      },
      createTextNode: (t: string) => ({ nodeType: 3, textContent: t })
    };
    try {
      await createRoot(async (dispose) => {
        const router = createRouter([
          { path: '/', component: () => ({ nodeType: 1 }) as any },
          { path: '/report.pdf', component: () => ({ nodeType: 1 }) as any }
        ], '/');
        Link({ href: '/report.pdf', download: true, children: 'Download' });
        assert.equal(clickHandlers.length, 1);
        let prevented = false;
        clickHandlers[0]!({
          button: 0,
          metaKey: false,
          ctrlKey: false,
          shiftKey: false,
          altKey: false,
          defaultPrevented: false,
          preventDefault() { prevented = true; }
        });
        assert.equal(prevented, false, 'Download link must not preventDefault() or hijack SPA navigation');
        assert.equal(router.currentPath.value, '/');
        dispose();
      });
    } finally {
      setRouterInstance(null as any);
      (globalThis as any).document = prevDoc;
    }
  });
});
