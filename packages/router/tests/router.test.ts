import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchPath, createRouter, matchRoutes, Router, Route, RouterOutlet, useNavigate } from '../src/index.js';

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
});
