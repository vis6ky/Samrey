/**
 * @license Apache-2.0
 * @samrey/router - Route Pattern Matcher
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
  const cleanPath = pathname.split(/[?#]/)[0] || '/';
  const cleanPattern = pattern.split(/[?#]/)[0] || '/';
  const patternSegments = cleanPattern.split('/').filter(Boolean);
  const pathSegments = cleanPath.split('/').filter(Boolean);

  // Check if the pattern contains a wildcard token ('*' or starts with '*')
  const wildcardIdx = patternSegments.findIndex(p => p === '*' || p.startsWith('*'));
  if (wildcardIdx !== -1) {
    if (pathSegments.length < wildcardIdx) {
      return null;
    }
    const params: Record<string, string> = {};
    for (let i = 0; i < wildcardIdx; i++) {
      const p = patternSegments[i]!;
      const seg = pathSegments[i]!;
      if (p.startsWith(':')) {
        const key = p.slice(1);
        if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
          params[key] = safeDecodeURIComponent(seg);
        }
      } else if (p !== seg) {
        return null;
      }
    }
    const wildcardToken = patternSegments[wildcardIdx]!;
    const key = wildcardToken.slice(1) || '*';
    const restSegments = pathSegments.slice(wildcardIdx);
    if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
      params[key] = restSegments.map(safeDecodeURIComponent).join('/');
    }
    return params;
  }

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
      if (typeof route.guard === 'function') {
        try {
          if (!route.guard({ params, pathname })) {
            continue;
          }
        } catch {
          continue;
        }
      }
      return {
        route,
        params,
        pathname
      };
    }
  }
  return null;
}

export const matchRoute = matchPath;
