import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchPath, createRouter, matchRoutes } from '../src/index.js';

describe('@gati/router', () => {
  it('matches static and parameterized routes correctly', () => {
    assert.deepEqual(matchPath('/users/:id', '/users/42'), { id: '42' });
    assert.deepEqual(matchPath('/posts/:category/:slug', '/posts/tech/aether-alpha'), {
      category: 'tech',
      slug: 'aether-alpha'
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
});
