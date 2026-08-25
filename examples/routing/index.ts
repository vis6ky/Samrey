/**
 * @license Apache-2.0
 * Samrey Framework — Routing Example
 */

import { signal } from '../../packages/reactivity/src/index.js';
import { createRouter, matchPath } from '../../packages/router/src/index.js';

export interface RouteMatchResult {
  path: string;
  params: Record<string, string>;
  activeRoute: string;
}

export function runRoutingExample(): {
  navigate: (path: string) => void;
  currentPath: () => string;
  currentParams: () => Record<string, string>;
  history: string[];
} {
  const history: string[] = [];

  const router = createRouter(
    [
      {
        path: '/',
        component: () => '<div id="home"><h1>Welcome Home</h1></div>'
      },
      {
        path: '/users/:id',
        component: () => '<div id="user-profile"><h1>User Profile</h1></div>'
      },
      {
        path: '/settings',
        component: () => '<div id="settings"><h1>Account Settings</h1></div>'
      }
    ],
    '/users/42'
  );

  history.push(router.currentPath.value);

  // Safe navigation
  router.navigate('/settings');
  history.push(router.currentPath.value);

  router.navigate('/users/108');
  history.push(router.currentPath.value);

  return {
    navigate: (path: string) => router.navigate(path),
    currentPath: () => router.currentPath.value,
    currentParams: () => router.currentParams.value,
    history
  };
}
