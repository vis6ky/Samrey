import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { onCleanup } from '@samrey/reactivity';
import { matchPath, createRouter, matchRoutes, Router, Route, useNavigate, Link, createLink } from '../src/index.js';

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
});
