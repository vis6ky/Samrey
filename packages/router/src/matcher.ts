/**
 * @license Apache-2.0
 * @aether/router - Route Pattern Matcher
 */

import { RouteRecord, RouteMatch } from './types.js';

function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

export function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = pathname.split('/').filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const p = patternSegments[i]!;
    const seg = pathSegments[i]!;

    if (p.startsWith(':')) {
      const key = p.slice(1);
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      params[key] = safeDecodeURIComponent(seg);
    } else if (p !== seg) {
      return null;
    }
  }

  return params;
}

export function matchRoutes(routes: RouteRecord[], pathname: string): RouteMatch | null {
  for (const route of routes) {
    const params = matchPath(route.path, pathname);
    if (params) {
      return {
        route,
        params,
        pathname
      };
    }
  }
  return null;
}
