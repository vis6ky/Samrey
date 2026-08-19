/**
 * @license Apache-2.0
 * @aether/security - URI & HTML Sanitizers
 */

const SAFE_URI_SCHEMES = /^(https?:|mailto:|tel:|\/|\.\/|\.\.\/|#)/i;
const DANGEROUS_URI_PATTERNS = /^(javascript|vbscript|data):/i;

/**
 * Validates and sanitizes a URL or URI string.
 * Blocks dangerous schemes (javascript:, vbscript:, data:text/html).
 * Only allows safe protocols (http:, https:, mailto:, tel:) and relative paths.
 */
export function sanitizeUri(rawUri: string | null | undefined): string {
  if (!rawUri) return '';
  const trimmed = String(rawUri).trim();

  // Strip control characters and whitespace within scheme
  const cleanSchemeCheck = trimmed.replace(/[\u0000-\u001F\u007F-\u009F\s]/g, '');

  if (DANGEROUS_URI_PATTERNS.test(cleanSchemeCheck)) {
    return 'about:blank';
  }

  if (SAFE_URI_SCHEMES.test(trimmed)) {
    return trimmed;
  }

  // Treat unrecognized absolute schemes as unsafe
  if (/^[a-z0-9+.-]+:/i.test(trimmed)) {
    return 'about:blank';
  }

  return trimmed;
}

/**
 * Escapes characters for safe inclusion inside HTML attributes.
 */
export function escapeHtmlAttribute(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escapes characters for safe inclusion inside HTML text nodes.
 */
export function escapeHtmlText(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escapes strings intended for embedded script blocks or JSON SSR state.
 * Prevents HTML parser breakout attacks like </script> or <!--.
 */
export function escapeForScriptPayload(jsonString: string): string {
  return jsonString
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Strips dangerous HTML tags and attributes for rich text boundaries.
 */
export function sanitizeHtmlString(html: string): string {
  if (!html) return '';

  // Minimal standard AST-safe sanitizer: strips script, iframe, object, embed, onerror, onclick, etc.
  return html
    .replace(/<(script|iframe|object|embed|style|form|input|textarea|button|base|link|meta)\b[^>]*>.*?<\/\1>/gis, '')
    .replace(/<(script|iframe|object|embed|style|form|input|textarea|button|base|link|meta)\b[^>]*\/?>/gis, '')
    .replace(/\s(on\w+|formaction|xlink:href)\s*=\s*(["'][^"']*["']|[^\s>]+)/gis, '')
    .replace(/href\s*=\s*["'](javascript:[^"']*)["']/gis, 'href="about:blank"');
}
