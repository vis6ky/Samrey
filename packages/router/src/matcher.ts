/**
 * @license Apache-2.0
 * @samrey/router - Route Pattern Matcher
 */

import { RouteRecord, RouteMatch } from './types.js';

function safeDecodeParam(str: string): string {
  try {
    const decoded = decodeURIComponent(str);
    // Prevent directory traversal: do not decode %2e%2e or %2e to .. or .
    if (decoded === '..' || decoded === '.' || /(?:^|[/\\])\.\.(?:[/\\]|$)/.test(decoded)) {
      return str;
    }
    return decoded;
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
    const tailPattern = patternSegments.slice(wildcardIdx + 1);
    if (pathSegments.length < wildcardIdx + tailPattern.length) {
      return null;
    }

    const params: Record<string, string> = {};

    // 1. Match segments before the wildcard
    for (let i = 0; i < wildcardIdx; i++) {
      const p = patternSegments[i]!;
      const seg = pathSegments[i]!;
      if (p.startsWith(':')) {
        const key = p.slice(1);
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return null;
        }
        params[key] = safeDecodeParam(seg);
      } else if (p !== seg) {
        return null;
      }
    }

    // 2. Match tail segments after the wildcard
    const tailStart = pathSegments.length - tailPattern.length;
    for (let j = 0; j < tailPattern.length; j++) {
      const p = tailPattern[j]!;
      const seg = pathSegments[tailStart + j]!;
      if (p.startsWith(':')) {
        const key = p.slice(1);
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return null;
        }
        params[key] = safeDecodeParam(seg);
      } else if (p !== seg) {
        return null;
      }
    }

    // 3. Assign wildcard parameters from middle segments
    const wildcardToken = patternSegments[wildcardIdx]!;
    const key = wildcardToken.slice(1) || '*';
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return null;
    }
    const middleSegments = pathSegments.slice(wildcardIdx, tailStart);
    params[key] = middleSegments.map(safeDecodeParam).join('/');
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
        return null;
      }
      params[key] = safeDecodeParam(seg);
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
