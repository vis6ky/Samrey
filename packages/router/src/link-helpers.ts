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
export function resolveLinkTarget(rawHref: string): { isExternal: boolean; safeHref: string } {
  if (EXPLICIT_EXTERNAL_SCHEME_RE.test(rawHref)) {
    const safeHref = sanitizeUri(rawHref, { allowProtocolRelative: false });
    if (safeHref === 'about:blank') {
      return { isExternal: false, safeHref: 'about:blank' };
    }
    return { isExternal: true, safeHref };
  }

  return {
    isExternal: false,
    safeHref: sanitizeRedirectUri(rawHref, '/')
  };
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

