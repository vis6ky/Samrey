/**
 * @license Apache-2.0
 * @samrey/security - URI & HTML Sanitizers
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

export interface SanitizeUriOptions {
  /**
   * Whether to allow protocol-relative URLs (e.g. `//cdn.example.com/asset.png`).
   * Protocol-relative URLs are safe for resource/asset loading in HTML elements
   * (`<img>`, `<video>`, `<audio>`, `<link>`), inheriting the host page protocol.
   *
   * For navigational redirects and user-facing links, use `sanitizeRedirectUri()`,
   * which strictly rejects protocol-relative URLs to prevent Open Redirect attacks.
   * @default true
   */
  allowProtocolRelative?: boolean;
}

/**
 * Validates and sanitizes a URL or URI string for resource-loading and asset contexts.
 * Blocks dangerous schemes (javascript:, vbscript:, data:text/html, blob:).
 * Decodes URL encodings in scheme to prevent obfuscated javascript: executions.
 * Only allows safe protocols (http:, https:, mailto:, tel:) and relative paths.
 *
 * NOTE: For client-side routing or server redirects, use `sanitizeRedirectUri()` instead,
 * which rejects protocol-relative URLs (`//evil.com`) to prevent open redirect vulnerabilities.
 */
export function sanitizeUri(rawUri: string | null | undefined, options?: SanitizeUriOptions): string {
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

  // Explicit protocol-relative URL policy enforcement (NEW-003)
  if (options?.allowProtocolRelative === false) {
    if (
      cleanSchemeCheck.startsWith('//') ||
      cleanSchemeCheck.startsWith('/\\') ||
      cleanSchemeCheck.startsWith('\\\\') ||
      cleanSchemeCheck.startsWith('\\/')
    ) {
      return 'about:blank';
    }
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

  // Strip control characters, tabs, and non-printable characters
  const stripped = trimmed.replace(/[\u0000-\u0020\u007F-\u009F]/g, '');

  // Reject javascript: / data: / vbscript:
  const safe = sanitizeUri(stripped);
  if (safe === 'about:blank') return fallback;

  // Reject protocol-relative URLs (e.g. //attacker.com or /\attacker.com or /\t/evil.com)
  if (
    stripped.startsWith('//') ||
    stripped.startsWith('/\\') ||
    stripped.startsWith('\\\\') ||
    stripped.startsWith('\\/') ||
    /^\/[\\/]/i.test(stripped)
  ) {
    return fallback;
  }

  // Allow safe relative paths
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('#')) {
    return trimmed;
  }

  return fallback;
}

/**
 * Decodes CSS backslash escape sequences (hex escapes like `\65` and literal character escapes).
 */
export function decodeCssEscapes(css: string): string {
  return css.replace(/\\([0-9a-fA-F]{1,6}\s?|[\s\S])/g, (match, p1) => {
    if (/^[0-9a-fA-F]{1,6}/.test(p1)) {
      const hex = p1.trim();
      const code = parseInt(hex, 16);
      if (code === 0 || (code >= 0xd800 && code <= 0xdfff) || code > 0x10ffff) {
        return '\uFFFD';
      }
      try {
        return String.fromCodePoint(code);
      } catch {
        return '';
      }
    }
    return p1;
  });
}

/**
 * Sanitizes inline CSS or style strings against script execution vectors
 * (such as expression(), url(javascript:), behavior:, and @import).
 * Employs multi-pass normalization, CSS comment stripping, backslash escape decoding,
 * and comprehensive URL validation (NEW-001).
 */
export function sanitizeCssStyle(css: unknown): string {
  if (css === null || css === undefined) return '';
  let str = String(css);
  let prev = '';
  let iterations = 0;

  while (str !== prev && iterations < 5) {
    prev = str;
    iterations++;

    // 1. Strip CSS comments (/* ... */) to prevent token splitting bypasses (e.g. exp/* */ression)
    let normalized = str.replace(/\/\*[\s\S]*?\*\//g, '');

    // 2. Decode CSS escapes and HTML entities for keyword detection
    const decoded = decodeCssEscapes(decodeHtmlEntities(normalized));

    // 3. Remove dangerous properties, functions, and at-rules
    if (/expression\s*\(|behavior\s*:|-moz-binding\s*:|-webkit-binding\s*:|binding\s*:|@import\b|@charset\b|@namespace\b/i.test(decoded)) {
      normalized = normalized
        .replace(/expression\s*\(.*?\)/gis, '')
        .replace(/behavior\s*:[^;}]*/gis, '')
        .replace(/-moz-binding\s*:[^;}]*/gis, '')
        .replace(/-webkit-binding\s*:[^;}]*/gis, '')
        .replace(/binding\s*:[^;}]*/gis, '')
        .replace(/@import\b[^;}]*;?/gis, '')
        .replace(/@charset\b[^;}]*;?/gis, '')
        .replace(/@namespace\b[^;}]*;?/gis, '');
    }

    // 4. Sanitize url(...) declarations against javascript:, vbscript:, and unsafe data: schemes
    normalized = normalized.replace(/url\s*\(\s*(["']?)([\s\S]*?)\1\s*\)/gi, (fullMatch, _quote, rawUrl) => {
      const cleanUrl = decodeCssEscapes(decodeHtmlEntities(rawUrl)).replace(/[\u0000-\u0020\u007F-\u009F\s]/g, '');
      if (/^(javascript|vbscript):/i.test(cleanUrl)) {
        return 'url("")';
      }
      if (/^data:/i.test(cleanUrl) && !SAFE_IMAGE_DATA_URI.test(cleanUrl)) {
        return 'url("")';
      }
      return fullMatch;
    });

    str = normalized;
  }

  return str;
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
  /(^|[._-])(password|passwd|pwd)([._-]|$)/,
  /(^|[._-])secret([._-]|$)/,
  /(^|[._-])api[._-]?key([._-]|$)/,
  /(^|[._-])access[._-]?key([._-]|$)/,
  /(^|[._-])private[._-]?key([._-]|$)/,
  /(^|[._-])auth([._-]|$|token|secret|key|header)/,
  /(^|[._-])(authorization|authentication)([._-]|$)/,
  /(^|[._-])bearer([._-]|$)/,
  /(^|[._-])token([._-]|$)/,
  /(^|[._-])jwt([._-]|$)/,
  /(^|[._-])credentials?([._-]|$)/,
  /(^|[._-])cookies?([._-]|$)/,
  /(^|[._-])session(id)?([._-]|$)/,
  /(^|[._-])ssn([._-]|$)/,
  /(^|[._-])database[._-]?url([._-]|$)/,
  /(^|[._-])connection[._-]?string([._-]|$)/,
  /(^|[._-])salt([._-]|$)/,
  /(^|[._-])(pass(word)?|secret|salt)hash([._-]|$)/,
  /(^|[._-])hash([._-]|$)/,
  /^env\./,
  /^process\.env/,
  /^_secret/,
  /(^|[._-])client[._-]?secret([._-]|$)/,
  /(^|[._-])service[._-]?role([._-]|$)/
];

const KEY_SENSITIVITY_CACHE = new Map<string, boolean>();

export function isSensitiveKey(key: string, additionalKeys?: (string | RegExp)[]): boolean {
  if (typeof key !== 'string') return false;

  if (!additionalKeys) {
    const cached = KEY_SENSITIVITY_CACHE.get(key);
    if (cached !== undefined) return cached;
  }

  const norm = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

  // Explicit non-sensitive exceptions: author, authorId, tokenCount, authority
  let sensitive = false;
  if (
    !/(^|[._-])author([._-]|$)/.test(norm) &&
    !/(^|[._-])authority([._-]|$)/.test(norm) &&
    !/(^|[._-])token[._-]count(s)?([._-]|$)/.test(norm)
  ) {
    sensitive = SENSITIVE_KEY_PATTERNS.some((p) => p.test(norm));
  }

  if (!sensitive && additionalKeys) {
    sensitive = additionalKeys.some((p) => (typeof p === 'string' ? p.toLowerCase() === key.toLowerCase() : p.test(key)));
  }

  if (!additionalKeys && KEY_SENSITIVITY_CACHE.size < 2000) {
    KEY_SENSITIVITY_CACHE.set(key, sensitive);
  }

  return sensitive;
}

export interface SecretGuardOptions {
  strict?: boolean;
  additionalKeys?: (string | RegExp)[];
  onSecretFound?: (path: string, key: string) => void;
}

export function stripSecrets<T>(
  data: T,
  options: SecretGuardOptions = {}
): T {
  const ancestors = new WeakSet<object>();
  const memo = new WeakMap<object, any>();

  function sanitize(val: unknown, currentPath = ''): unknown {
    if (val === null || val === undefined) return val;

    const valType = typeof val;
    if (valType === 'function' || valType === 'symbol' || valType === 'bigint') {
      const errPath = currentPath || 'root';
      if (options.strict) {
        throw new TypeError(
          `[Samrey Serialization Error] Non-JSON-serializable type (${valType}) detected at "${errPath}". SSR state must be plain JSON-serializable.`
        );
      }
      if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
        console.warn(
          `[Samrey Serialization Warning] Non-JSON-serializable type (${valType}) detected at "${errPath}". In standard JSON serialization it will serialize as undefined/empty or fail. Convert to JSON-serializable value.`
        );
      }
      return undefined;
    }

    if (valType !== 'object') return val;

    // Detect circular reference in current ancestor stack
    if (ancestors.has(val as object)) {
      return undefined;
    }

    // Reuse previously sanitized object in DAG (shared references)
    if (memo.has(val as object)) {
      return memo.get(val as object);
    }

    // Preserve Date, RegExp
    if (val instanceof Date) {
      return new Date(val.getTime());
    }
    if (val instanceof RegExp) {
      return new RegExp(val.source, val.flags);
    }

    if (val instanceof Map) {
      const errPath = currentPath || 'root';
      if (options.strict) {
        throw new TypeError(
          `[Samrey Serialization Error] Non-JSON-serializable type (Map) detected at "${errPath}". SSR state must be plain JSON-serializable.`
        );
      }
      if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
        console.warn(
          `[Samrey Serialization Warning] Non-JSON-serializable type (Map) detected at "${errPath}". Convert to plain object or array (e.g. Array.from(map.entries())) before serializing.`
        );
      }
      ancestors.add(val as object);
      const cleanMap = new Map();
      memo.set(val as object, cleanMap);
      for (const [k, v] of val.entries()) {
        if (typeof k === 'string' && isSensitiveKey(k, options.additionalKeys)) {
          if (options.strict) {
            throw new Error(`[Samrey Security Violation] Attempted to serialize secret field "${currentPath}.${String(k)}".`);
          }
          if (options.onSecretFound) options.onSecretFound(`${currentPath}.${String(k)}`, k);
          continue;
        }
        cleanMap.set(k, sanitize(v, `${currentPath}.${String(k)}`));
      }
      ancestors.delete(val as object);
      return cleanMap;
    }

    if (val instanceof Set) {
      const errPath = currentPath || 'root';
      if (options.strict) {
        throw new TypeError(
          `[Samrey Serialization Error] Non-JSON-serializable type (Set) detected at "${errPath}". SSR state must be plain JSON-serializable.`
        );
      }
      if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
        console.warn(
          `[Samrey Serialization Warning] Non-JSON-serializable type (Set) detected at "${errPath}". Convert to array (e.g. Array.from(set)) before serializing.`
        );
      }
      ancestors.add(val as object);
      const cleanSet = new Set();
      memo.set(val as object, cleanSet);
      for (const item of val.values()) {
        cleanSet.add(sanitize(item, currentPath));
      }
      ancestors.delete(val as object);
      return cleanSet;
    }

    ancestors.add(val as object);

    if (Array.isArray(val)) {
      const cleanArr: unknown[] = [];
      memo.set(val as object, cleanArr);
      for (let idx = 0; idx < val.length; idx++) {
        cleanArr.push(sanitize(val[idx], `${currentPath}[${idx}]`));
      }
      ancestors.delete(val as object);
      return cleanArr;
    }

    const cleanObj: Record<string, unknown> = {};
    memo.set(val as object, cleanObj);
    const entries = Object.entries(val as Record<string, unknown>);

    for (const [key, value] of entries) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }

      const fullPath = currentPath ? `${currentPath}.${key}` : key;

      if (isSensitiveKey(key, options.additionalKeys)) {
        if (options.strict) {
          throw new Error(
            `[Samrey Security Violation] Attempted to serialize secret field "${fullPath}". Serialization aborted to prevent credential leakage.`
          );
        }
        if (options.onSecretFound) {
          options.onSecretFound(fullPath, key);
        }
        continue;
      }

      cleanObj[key] = sanitize(value, fullPath);
    }

    ancestors.delete(val as object);
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

const SAFE_IMAGE_DATA_URI = /^data:image\/(png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=]+$/i;

const URL_ATTRS_PATTERN = /\b(href|src|action|formaction|data|poster|codebase|background|cite|longdesc|profile|usemap|xlink:href|xml:base|ping)\s*=\s*(?:("|\')([\s\S]*?)\2|([^\s>]+))/gis;
const SRCSET_PATTERN = /\b(srcset)\s*=\s*(?:("|\')([\s\S]*?)\2|([^\s>]+))/gis;

/**
 * Sanitizes all URL-bearing attributes in HTML strings, including standard attributes
 * and compound srcset attributes (NEW-002).
 */
export function sanitizeHtmlUrlAttributes(html: string): string {
  let res = html.replace(URL_ATTRS_PATTERN, (match, attr, quote, innerQuoted, unquoted) => {
    const rawVal = innerQuoted !== undefined ? innerQuoted : unquoted;
    const decoded = decodeHtmlEntities(rawVal).replace(/[\u0000-\u0020\u007F-\u009F\s]/g, '');
    if (/^(javascript|vbscript):/i.test(decoded)) {
      return `${attr}="about:blank"`;
    }
    if (/^data:/i.test(decoded)) {
      if (!SAFE_IMAGE_DATA_URI.test(decoded)) {
        return `${attr}="about:blank"`;
      }
    }
    return match;
  });

  // Comprehensive srcset handling (NEW-002)
  res = res.replace(SRCSET_PATTERN, (match, attr, quote, innerQuoted, unquoted) => {
    const rawVal = innerQuoted !== undefined ? innerQuoted : unquoted;
    const parts = rawVal.split(',');
    const sanitizedParts = parts.map((part: string) => {
      const trimmedPart = part.trim();
      const spaceIdx = trimmedPart.search(/\s/);
      const urlCandidate = spaceIdx === -1 ? trimmedPart : trimmedPart.slice(0, spaceIdx);
      const descriptor = spaceIdx === -1 ? '' : trimmedPart.slice(spaceIdx);

      const decodedUrl = decodeHtmlEntities(urlCandidate).replace(/[\u0000-\u0020\u007F-\u009F\s]/g, '');
      if (/^(javascript|vbscript):/i.test(decodedUrl) || (/^data:/i.test(decodedUrl) && !SAFE_IMAGE_DATA_URI.test(decodedUrl))) {
        return `about:blank${descriptor}`;
      }
      return `${urlCandidate}${descriptor}`;
    });
    return `${attr}="${sanitizedParts.join(', ')}"`;
  });

  return res;
}

/**
 * Neutralizes mXSS CDATA sections, downlevel conditional comments, and HTML comments.
 * Preserves only exact Samrey compiler slot anchor comments when `preserveCompilerSlots` is true.
 */
function stripMxssCommentsAndCdata(html: string, preserveCompilerSlots: boolean): string {
  return html
    .replace(/<!\[CDATA\[[\s\S]*?(?:\]\]>|$)/gi, '')
    .replace(/<!\[[^\]]*\]>/gi, '')
    .replace(/<!--(?:>|->|[\s\S]*?(?:--!?>|$))/g, (match) => {
      if (preserveCompilerSlots && /^<!-- (?:dynamic|component|show|for)-slot -->$/.test(match)) {
        return match;
      }
      return '';
    });
}

/**
 * Strips dangerous HTML tags and attributes for rich text boundaries.
 * Employs multi-pass convergence to prevent nested tag/attribute bypasses (EXT-003)
 * and strips CDATA/comment mXSS vectors.
 */
export function sanitizeHtmlString(html: string): string {
  if (!html) return '';

  let str = html;
  let prev = '';
  let iterations = 0;

  while (str !== prev && iterations < 5) {
    prev = str;
    iterations++;

    // 0. Strip CDATA blocks, downlevel conditional comments, and HTML5/malformed comments (mXSS hardening)
    str = stripMxssCommentsAndCdata(str, false);

    // 1. Strip dangerous tags and their content (including parser-switching rawtext tags)
    str = str
      .replace(/<(script|iframe|object|embed|style|form|input|textarea|button|base|link|meta|applet|noscript|noembed|noframes|xmp|plaintext)\b[^>]*>.*?<\/\1>/gis, '')
      .replace(/<(script|iframe|object|embed|style|form|input|textarea|button|base|link|meta|applet|noscript|noembed|noframes|xmp|plaintext)\b[^>]*\/?>/gis, '')
      // Neutralize SVG and MathML script/execution payloads
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gis, (match) => {
        return match
          .replace(/<script\b[^>]*>.*?<\/script>/gis, '')
          .replace(/[\s/]+(on[a-zA-Z0-9_\-]+|xlink:href)\s*=\s*(["'][^"']*["']|[^\s>]+)/gis, '');
      })
      .replace(/<math\b[^>]*>[\s\S]*?<\/math>/gis, (match) => {
        return match.replace(/<script\b[^>]*>.*?<\/script>/gis, '');
      });

    // 2. Strip all inline on* event handlers, formaction, and srcdoc
    str = str.replace(/[\s/]+(on[a-zA-Z0-9_\-]+|formaction|srcdoc)\s*=\s*(["'][^"']*["']|[^\s>]+)/gis, '');

    // 3. Sanitize all URL-bearing attributes and srcset (NEW-002)
    str = sanitizeHtmlUrlAttributes(str);

    // 4. Sanitize inline style attributes (NEW-001)
    str = str.replace(/\b(style)\s*=\s*(["'])([\s\S]*?)\2/gis, (_, attr, quote, css) => {
      return `${attr}=${quote}${sanitizeCssStyle(css)}${quote}`;
    });
  }

  return str;
}

/**
 * Sanitizes template HTML skeletons used by compile-time and runtime template() cloning (EXT-002).
 * Preserves interactive UI tags (<button ref="...">, <input>, <form>, <textarea>, <svg>, <path>, ref attributes)
 * and compiler slot markers (<!-- show-slot -->, etc.),
 * while strictly stripping executable tags (<script>, <object>, <embed>, <applet>, <base>, <meta>, <iframe>),
 * CDATA/malformed comment mXSS vectors, all inline on* event handlers, dangerous schemes, and CSS injection.
 */
export function sanitizeTemplateHtml(html: string): string {
  if (!html) return '';

  let str = html;
  let prev = '';
  let iterations = 0;

  while (str !== prev && iterations < 5) {
    prev = str;
    iterations++;

    // 0. Strip CDATA blocks, conditional comments, and arbitrary/malformed comments while preserving compiler slot markers
    str = stripMxssCommentsAndCdata(str, true);

    // 1. Strip strictly dangerous executable tags and their contents
    str = str
      .replace(/<(script|object|embed|applet|base|meta|iframe|noembed|noframes|xmp|plaintext)\b[^>]*>.*?<\/\1>/gis, '')
      .replace(/<(script|object|embed|applet|base|meta|iframe|noembed|noframes|xmp|plaintext)\b[^>]*\/?>/gis, '')
      // Neutralize any scripts inside SVG or MathML
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gis, (match) => {
        return match
          .replace(/<script\b[^>]*>.*?<\/script>/gis, '')
          .replace(/[\s/]+(on[a-zA-Z0-9_\-]+|srcdoc)\s*=\s*(["'][^"']*["']|[^\s>]+)/gis, '');
      })
      .replace(/<math\b[^>]*>[\s\S]*?<\/math>/gis, (match) => {
        return match.replace(/<script\b[^>]*>.*?<\/script>/gis, '');
      });

    // 2. Strip all inline on* event handlers and srcdoc
    str = str.replace(/[\s/]+(on[a-zA-Z0-9_\-]+|srcdoc)\s*=\s*(["'][^"']*["']|[^\s>]+)/gis, '');

    // 3. Sanitize URL-bearing attributes
    str = sanitizeHtmlUrlAttributes(str);

    // 4. Sanitize inline style attributes
    str = str.replace(/\b(style)\s*=\s*(["'])([\s\S]*?)\2/gis, (_, attr, quote, css) => {
      return `${attr}=${quote}${sanitizeCssStyle(css)}${quote}`;
    });
  }

  return str;
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
