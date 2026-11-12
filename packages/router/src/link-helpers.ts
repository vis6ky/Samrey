/**
 * @license Apache-2.0
 * @samrey/router - Internal Link Resolution Helpers
 */

import { sanitizeRedirectUri, sanitizeUri } from '@samrey/security';

const EXPLICIT_EXTERNAL_SCHEME_RE = /^\s*(https?:|mailto:|tel:)/i;

/**
 * Resolves a link target into a safe href and classifies explicit external destinations.
 * Protocol-relative URLs (`//...`) and obfuscated bypasses are treated as non-external
 * and sanitized strictly to same-origin paths.
 */
export function resolveLinkTarget(rawHref: string, currentPath = '/'): { isExternal: boolean; safeHref: string } {
  const trimmed = rawHref.trim();
  if (EXPLICIT_EXTERNAL_SCHEME_RE.test(trimmed)) {
    const safeHref = sanitizeUri(trimmed, { allowProtocolRelative: false });
    if (safeHref === 'about:blank') {
      return { isExternal: false, safeHref: 'about:blank' };
    }
    return { isExternal: true, safeHref };
  }

  if (!trimmed || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/[\\/]|\\)/i.test(trimmed)) {
    return {
      isExternal: false,
      safeHref: sanitizeRedirectUri(rawHref, '/')
    };
  }

  try {
    const safeBase = sanitizeRedirectUri(currentPath, '/');
    const resolved = new URL(trimmed, 'http://localhost' + (safeBase.startsWith('/') ? safeBase : '/' + safeBase));
    if (resolved.origin !== 'http://localhost' || resolved.host !== 'localhost') {
      return { isExternal: false, safeHref: sanitizeRedirectUri(rawHref, '/') };
    }
    const normalized = resolved.pathname + resolved.search + resolved.hash;
    return {
      isExternal: false,
      safeHref: sanitizeRedirectUri(normalized, '/')
    };
  } catch {
    return {
      isExternal: false,
      safeHref: sanitizeRedirectUri(rawHref, '/')
    };
  }
}

/**
 * Determines whether a mouse click should bypass SPA interception.
 */
export function isPlainLeftClick(e: MouseEvent): boolean {
  return !(
    e.defaultPrevented ||
    (e.button !== undefined && e.button !== 0) ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey
  );
}

