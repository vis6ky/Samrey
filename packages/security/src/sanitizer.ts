/**
 * @license Apache-2.0
 * @aether/security - URI & HTML Sanitizers
 */

const SAFE_URI_SCHEMES = /^(https?:|mailto:|tel:|\/|\.\/|\.\.\/|#)/i;
const DANGEROUS_URI_PATTERNS = /^(javascript|vbscript|data|blob):/i;

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => {
      try { return String.fromCharCode(parseInt(hex, 16)); } catch { return ''; }
    })
    .replace(/&#([0-9]+);?/gi, (_, dec) => {
      try { return String.fromCharCode(parseInt(dec, 10)); } catch { return ''; }
    })
    .replace(/&colon;?/gi, ':');
}

/**
 * Validates and sanitizes a URL or URI string.
 * Blocks dangerous schemes (javascript:, vbscript:, data:text/html, blob:).
 * Decodes URL encodings in scheme to prevent obfuscated javascript: executions.
 * Only allows safe protocols (http:, https:, mailto:, tel:) and relative paths.
 */
export function sanitizeUri(rawUri: string | null | undefined): string {
  if (!rawUri) return '';
  const trimmed = String(rawUri).trim();

  // Strip control characters, null bytes, and non-printable chars
  let cleanSchemeCheck = decodeHtmlEntities(trimmed).replace(/[\u0000-\u001F\u007F-\u009F\s]/g, '');

  // Try decoding potential percent-encoded scheme bypasses (e.g. %6a%61%76%61%73%63%72%69%70%74:)
  try {
    const decoded = decodeURIComponent(cleanSchemeCheck);
    if (decoded !== cleanSchemeCheck) {
      cleanSchemeCheck = decodeHtmlEntities(decoded).replace(/[\u0000-\u001F\u007F-\u009F\s]/g, '');
    }
  } catch {
    // Malformed encoding in scheme check
  }

  if (DANGEROUS_URI_PATTERNS.test(cleanSchemeCheck)) {
    return 'about:blank';
  }

  if (SAFE_URI_SCHEMES.test(trimmed)) {
    return trimmed;
  }

  // Treat unrecognized absolute schemes as unsafe
  if (/^[a-z0-9+.-]+:/i.test(trimmed) || /^[a-z0-9+.-]+:/i.test(cleanSchemeCheck)) {
    return 'about:blank';
  }

  return trimmed;
}

/**
 * Validates that a redirect URI is strictly internal / same-origin safe.
 * Rejects protocol-relative URLs (e.g. //evil.com, /\\evil.com) and external absolute URLs.
 */
export function sanitizeRedirectUri(rawUri: string | null | undefined, fallback = '/'): string {
  if (!rawUri) return fallback;
  const trimmed = String(rawUri).trim();

  // Reject javascript: / data: / vbscript:
  const safe = sanitizeUri(trimmed);
  if (safe === 'about:blank') return fallback;

  // Reject protocol-relative URLs (e.g. //attacker.com or /\attacker.com)
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.startsWith('\\\\')) {
    return fallback;
  }

  // Allow safe relative paths
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('#')) {
    return trimmed;
  }

  return fallback;
}

/**
 * Sanitizes inline CSS or style strings against script execution vectors
 * (such as expression(), url(javascript:), behavior:, and @import).
 */
export function sanitizeCssStyle(css: unknown): string {
  if (css === null || css === undefined) return '';
  const str = String(css);

  return str
    .replace(/expression\s*\(.*?\)/gis, '')
    .replace(/url\s*\(\s*["']?\s*javascript:[^"')]*["']?\s*\)/gis, 'url("")')
    .replace(/url\s*\(\s*["']?\s*vbscript:[^"')]*["']?\s*\)/gis, 'url("")')
    .replace(/url\s*\(\s*["']?\s*data:text\/html[^"')]*["']?\s*\)/gis, 'url("")')
    .replace(/behavior\s*:[^;}]*/gis, '')
    .replace(/-moz-binding\s*:[^;}]*/gis, '')
    .replace(/@import\b[^;}]*;?/gis, '');
}

/**
 * Recursively removes prototype pollution properties (__proto__, constructor, prototype) from an object.
 */
export function scrubPrototypePollution<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => scrubPrototypePollution(item)) as unknown as T;
  }

  const clean = Object.create(null) as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    clean[key] = scrubPrototypePollution(value);
  }

  return clean as T;
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
 * Safe JSON parser that automatically scrubs prototype pollution keys.
 */
export function safeJsonParse<T = any>(jsonString: string): T {
  const parsed = JSON.parse(jsonString);
  return scrubPrototypePollution(parsed);
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /api[_-]?key/i,
  /auth(entication|orization)?/i,
  /bearer/i,
  /token/i,
  /jwt/i,
  /private[_-]?key/i,
  /credential/i,
  /cookie/i,
  /session/i,
  /database[_-]?url/i,
  /connection[_-]?string/i,
  /salt/i,
  /hash/i,
  /^env\./i,
  /^process\.env/i,
  /^_secret/i,
  /client[_-]?secret/i,
  /service[_-]?role/i
];

export function isSensitiveKey(key: string, additionalKeys?: (string | RegExp)[]): boolean {
  if (SENSITIVE_KEY_PATTERNS.some((p) => p.test(key))) {
    return true;
  }
  if (additionalKeys) {
    return additionalKeys.some((p) => (typeof p === 'string' ? p.toLowerCase() === key.toLowerCase() : p.test(key)));
  }
  return false;
}

export function stripSecrets<T>(
  data: T,
  options: { strict?: boolean; additionalKeys?: (string | RegExp)[]; onSecretFound?: (path: string, key: string) => void } = {}
): T {
  const visited = new WeakSet<object>();

  function sanitize(val: unknown, currentPath = ''): unknown {
    if (val === null || val === undefined) return val;
    if (typeof val !== 'object') return val;

    if (visited.has(val as object)) {
      return undefined;
    }
    visited.add(val as object);

    if (Array.isArray(val)) {
      return val.map((item, idx) => sanitize(item, `${currentPath}[${idx}]`));
    }

    const cleanObj: Record<string, unknown> = {};
    const entries = Object.entries(val as Record<string, unknown>);

    for (const [key, value] of entries) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }

      const fullPath = currentPath ? `${currentPath}.${key}` : key;

      if (isSensitiveKey(key, options.additionalKeys)) {
        if (options.strict) {
          throw new Error(
            `[Aether Security Violation] Attempted to serialize secret field "${fullPath}". Serialization aborted to prevent credential leakage.`
          );
        }
        if (options.onSecretFound) {
          options.onSecretFound(fullPath, key);
        }
        continue;
      }

      cleanObj[key] = sanitize(value, fullPath);
    }

    return cleanObj;
  }

  return sanitize(data) as T;
}

export const stripSensitiveState = stripSecrets;

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

export const escapeJsonStringForScript = escapeForScriptPayload;

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

export const sanitizeHtml = sanitizeHtmlString;
export const sanitizeUrl = sanitizeUri;
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const sanitized = sanitizeUri(url);
  return sanitized !== 'about:blank';
}
export const sanitizeAttribute = escapeHtmlAttribute;
export function safeJsonStringify(data: unknown): string {
  return escapeForScriptPayload(JSON.stringify(stripSecrets(data)));
}
