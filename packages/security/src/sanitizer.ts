/**
 * @license Apache-2.0
 * @samrey/security - URI & HTML Sanitizers
 */

const SAFE_URI_SCHEMES = /^(https?:|mailto:|tel:|\/|\.\/|\.\.\/|#)/i;
const DANGEROUS_URI_PATTERNS = /^(javascript|vbscript|data|blob):/i;
export const SAFE_IMAGE_DATA_URI = /^data:image\/(png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=]+$/i;

const NAMED_HTML_ENTITIES: Record<string, string> = {
  tab: '\t',
  newline: '\n',
  colon: ':',
  semi: ';',
  lpar: '(',
  rpar: ')',
  sol: '/',
  bsol: '\\',
  apos: "'",
  quot: '"',
  amp: '&',
  lt: '<',
  gt: '>',
  nbsp: '\u00a0',
  lcub: '{',
  rcub: '}',
  equals: '=',
  plus: '+',
  comma: ',',
  period: '.',
  excl: '!',
  num: '#',
  quest: '?',
  percnt: '%',
  commat: '@',
  dollar: '$',
  ast: '*',
  hyphen: '-',
  dash: '-',
  lowbar: '_'
};

function safeCodePoint(code: number): string {
  if (code === 0) return '\0';
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
    return '\uFFFD';
  }
  try {
    return String.fromCodePoint(code);
  } catch {
    return '\uFFFD';
  }
}

/**
 * Decodes numeric HTML character references and critical HTML5 named entities
 * (such as `&Tab;`, `&NewLine;`, `&colon;`, `&lpar;`, `&sol;`) case-insensitively.
 */
export function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);?/gi, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (full, name: string) => {
      const mapped = NAMED_HTML_ENTITIES[name.toLowerCase()];
      return mapped !== undefined ? mapped : full;
    })
    .replace(/&(amp|lt|gt|quot)(?![a-zA-Z0-9=])/gi, (full, name: string) => {
      const mapped = NAMED_HTML_ENTITIES[name.toLowerCase()];
      return mapped !== undefined ? mapped : full;
    });
}

function decodeHtmlEntitiesDeep(str: string): string {
  let prev = str;
  for (let i = 0; i < 3; i++) {
    const next = decodeHtmlEntities(prev);
    if (next === prev) return next;
    prev = next;
  }
  return prev;
}

function safeDecodePercentBytes(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    // Decode individual ASCII %XX sequences when trailing malformed bytes trigger URIError
    return str.replace(/%([0-9a-fA-F]{2})/g, (full, hex: string) => {
      const code = parseInt(hex, 16);
      return code <= 0x7f ? String.fromCharCode(code) : full;
    });
  }
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
  /**
   * Whether to allow base64-encoded bitmap image `data:` URIs (`png`, `jpeg`, `jpg`, `gif`, `webp`).
   * Strictly rejects `data:text/html`, `data:image/svg+xml`, and non-base64 `data:` payloads.
   * @default false
   */
  allowImageDataUri?: boolean;
}

/**
 * Validates and sanitizes a URL or URI string for resource-loading and asset contexts.
 * Blocks dangerous schemes (`javascript:`, `vbscript:`, `data:text/html`, `blob:`),
 * including obfuscation via `&Tab;`, `&NewLine;`, numeric entities, and `%XX` encoding.
 *
 * NOTE: For client-side routing or server redirects, use `sanitizeRedirectUri()` instead,
 * which rejects protocol-relative URLs (`//evil.com`) to prevent open redirect vulnerabilities.
 */
export function sanitizeUri(rawUri: string | null | undefined, options?: SanitizeUriOptions): string {
  if (!rawUri) return '';
  const trimmed = String(rawUri).trim();
  if (!trimmed) return '';

  const hasRawControls = /[\u0000-\u001F\u007F-\u009F]/.test(trimmed);
  const stripInvisibles = (val: string) =>
    val.replace(/[\u0000-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u202A-\u202E\uFEFF\s]/g, '');

  let cleanSchemeCheck = stripInvisibles(decodeHtmlEntitiesDeep(trimmed));

  // Decode up to 2 passes of percent encoding + HTML entities to neutralize mixed bypasses (e.g. java%09script:, %26Tab%3B)
  for (let i = 0; i < 2; i++) {
    const decoded = safeDecodePercentBytes(cleanSchemeCheck);
    const next = stripInvisibles(decodeHtmlEntitiesDeep(decoded));
    if (next === cleanSchemeCheck) break;
    cleanSchemeCheck = next;
  }

  if (DANGEROUS_URI_PATTERNS.test(cleanSchemeCheck)) {
    if (
      options?.allowImageDataUri &&
      !hasRawControls &&
      /^data:/i.test(cleanSchemeCheck) &&
      SAFE_IMAGE_DATA_URI.test(cleanSchemeCheck)
    ) {
      return trimmed;
    }
    return 'about:blank';
  }

  if (hasRawControls) {
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

  // Treat unrecognized absolute schemes or obfuscated schemes as unsafe
  if (/^[a-z0-9+.-]+:/i.test(trimmed) || /^[a-z0-9+.-]+:/i.test(cleanSchemeCheck)) {
    return 'about:blank';
  }

  return trimmed;
}

/**
 * Validates that a redirect URI is strictly internal / same-origin safe.
 * Rejects protocol-relative URLs (e.g. `//evil.com`, `/\\evil.com`, `/%2fevil.com`, `/%5cevil.com`) and external absolute URLs.
 */
export function sanitizeRedirectUri(rawUri: string | null | undefined, fallback = '/'): string {
  if (!rawUri) return fallback;
  const trimmed = String(rawUri).trim();
  if (!trimmed) return fallback;

  // Reject any ASCII/C1 control characters (including CR, LF, TAB, NUL) to prevent HTTP header/response splitting
  if (/[\u0000-\u001F\u007F-\u009F]/.test(trimmed)) {
    return fallback;
  }

  // Reject javascript: / data: / vbscript: / entity-obfuscated schemes
  const safe = sanitizeUri(trimmed, { allowProtocolRelative: false });
  if (safe === 'about:blank') return fallback;

  // Normalize HTML entities and %XX sequences before checking leading slashes/backslashes or obfuscated control chars
  const decodedLeading = safeDecodePercentBytes(decodeHtmlEntitiesDeep(trimmed));
  if (/[\u0000-\u001F\u007F-\u009F]/.test(decodedLeading)) {
    return fallback;
  }

  const isProtoRelative = (val: string) => {
    const compacted = val.replace(/\s+/g, '');
    return (
      compacted.startsWith('//') ||
      compacted.startsWith('/\\') ||
      compacted.startsWith('\\\\') ||
      compacted.startsWith('\\/') ||
      /^\/[\\/]/i.test(compacted)
    );
  };

  if (isProtoRelative(trimmed) || isProtoRelative(decodedLeading)) {
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
  return css.replace(/\\([0-9a-fA-F]{1,6}(?:\r\n|[ \t\r\n\f])?|[\s\S])/g, (_match, p1: string) => {
    if (/^[0-9a-fA-F]{1,6}(?:\r\n|[ \t\r\n\f])?$/.test(p1)) {
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
 * Advances past one character or escape sequence inside a CSS quoted string token.
 * Per CSS Syntax Level 3, backslash escapes (including \r\n line continuation) stay
 * within the string, while unescaped newlines (\n, \r, \f) produce a <bad-string-token>
 * and terminate quote state.
 */
function stepCssQuotedChar(
  str: string,
  index: number,
  quote: string
): { consumed: string; nextIndex: number; quoteClosed: boolean } {
  const ch = str[index];
  if (ch === '\\' && index + 1 < str.length) {
    const len = str[index + 1] === '\r' && str[index + 2] === '\n' ? 3 : 2;
    return { consumed: str.slice(index, index + len), nextIndex: index + len, quoteClosed: false };
  }
  if (ch === quote || ch === '\n' || ch === '\r' || ch === '\f') {
    return { consumed: ch, nextIndex: index + 1, quoteClosed: true };
  }
  return { consumed: ch, nextIndex: index + 1, quoteClosed: false };
}

function stripCssCommentsOutsideStrings(css: string): string {
  let out = '';
  let quote: string | null = null;
  let i = 0;

  while (i < css.length) {
    const ch = css[i];
    if (quote) {
      const step = stepCssQuotedChar(css, i, quote);
      out += step.consumed;
      if (step.quoteClosed) quote = null;
      i = step.nextIndex;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      i++;
      continue;
    }

    if (ch === '/' && css[i + 1] === '*') {
      const closeIdx = css.indexOf('*/', i + 2);
      if (closeIdx === -1) break;
      i = closeIdx + 2;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

function decodeCssEscapesOutsideStrings(css: string): string {
  let out = '';
  let quote: string | null = null;
  let i = 0;

  while (i < css.length) {
    const ch = css[i];
    if (quote) {
      const step = stepCssQuotedChar(css, i, quote);
      out += step.consumed;
      if (step.quoteClosed) quote = null;
      i = step.nextIndex;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      i++;
      continue;
    }

    if (ch === '\\' && i + 1 < css.length) {
      const rest = css.slice(i);
      const m = /^\\([0-9a-fA-F]{1,6}(?:\r\n|[ \t\r\n\f])?|[\s\S])/.exec(rest);
      if (m) {
        out += decodeCssEscapes(m[0]);
        i += m[0].length;
        continue;
      }
    }

    out += ch;
    i++;
  }

  return out;
}

function findMatchingParenEnd(str: string, openParenIdx: number): { endIdx: number; foundClose: boolean } {
  let depth = 0;
  let quote: string | null = null;

  for (let i = openParenIdx; i < str.length; i++) {
    const ch = str[i];
    if (quote) {
      const step = stepCssQuotedChar(str, i, quote);
      if (step.quoteClosed) quote = null;
      i = step.nextIndex - 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) return { endIdx: i, foundClose: true };
    }
  }

  return { endIdx: str.length, foundClose: false };
}

function findMatchingParen(str: string, openParenIdx: number): number {
  const { endIdx, foundClose } = findMatchingParenEnd(str, openParenIdx);
  return foundClose ? endIdx : str.length - 1;
}

function findDeclarationEnd(str: string, startIdx: number): number {
  let depthParen = 0;
  let depthBrace = 0;
  let quote: string | null = null;

  for (let i = startIdx; i < str.length; i++) {
    const ch = str[i];
    if (quote) {
      const step = stepCssQuotedChar(str, i, quote);
      if (step.quoteClosed) quote = null;
      i = step.nextIndex - 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '(') {
      depthParen++;
    } else if (ch === ')') {
      if (depthParen > 0) depthParen--;
    } else if (ch === '{') {
      depthBrace++;
    } else if (ch === '}') {
      if (depthBrace > 0) depthBrace--;
      else return i - 1;
    } else if (ch === ';' && depthParen === 0 && depthBrace === 0) {
      return i;
    }
  }

  return str.length - 1;
}

function readCssQuotedStringToken(
  str: string,
  openQuoteIdx: number
): { rawToken: string; inner: string; nextIndex: number; closedValidly: boolean; hitBadNewline: boolean } {
  const quote = str[openQuoteIdx];
  let inner = '';
  let i = openQuoteIdx + 1;
  let closedValidly = false;
  let hitBadNewline = false;

  while (i < str.length) {
    const step = stepCssQuotedChar(str, i, quote);
    i = step.nextIndex;
    if (step.quoteClosed) {
      if (step.consumed === quote) {
        closedValidly = true;
      } else {
        // Unescaped newline (\n, \r, \f) produces a CSS <bad-string-token>
        hitBadNewline = true;
      }
      break;
    }
    inner += step.consumed;
  }

  return {
    rawToken: str.slice(openQuoteIdx, i),
    inner,
    nextIndex: i,
    closedValidly,
    hitBadNewline
  };
}

function sanitizeCssUrlArgument(rawArg: string): boolean {
  const trimmed = rawArg.trim();
  if (!trimmed) return false;

  let candidate = trimmed;
  if (trimmed[0] === '"' || trimmed[0] === "'") {
    const parsed = readCssQuotedStringToken(trimmed, 0);
    if (parsed.hitBadNewline) return false;
    const trailing = trimmed.slice(parsed.nextIndex).trim();
    // Reject unexpected extra quoted/paren/colon fragments after a CSS string URL token
    if (trailing && !/^[a-zA-Z0-9_-]+(?:\s+[a-zA-Z0-9_-]+)*$/.test(trailing)) {
      return false;
    }
    candidate = parsed.inner.trim();
  }

  if (!candidate) return false;
  const decoded = decodeCssEscapes(decodeHtmlEntitiesDeep(candidate));
  const safe = sanitizeUri(decoded, { allowImageDataUri: true });
  return safe !== 'about:blank' && safe !== '';
}

function isIdentBoundaryBefore(str: string, idx: number): boolean {
  return idx === 0 || !/[a-zA-Z0-9_-]/.test(str[idx - 1]);
}

function isDeclBoundaryBefore(str: string, idx: number): boolean {
  let i = idx - 1;
  while (i >= 0 && /\s/.test(str[i])) i--;
  return i < 0 || str[i] === ';' || str[i] === '{' || str[i] === '}';
}

const CSS_AT_RULE_STICKY_RE = /@(?:import|charset|namespace)(?![a-zA-Z0-9_-])/iy;
const CSS_BAD_PROP_STICKY_RE = /(?:behavior|-moz-binding|-webkit-binding|binding|-o-link|-o-link-source)\s*:/iy;
const CSS_EXPR_STICKY_RE = /expression\s*\(/iy;
const CSS_PROGID_STICKY_RE = /progid\s*:/iy;
const CSS_URL_FN_STICKY_RE = /(url|src)\s*\(/iy;
const CSS_IMAGE_LIST_FN_STICKY_RE = /(?:image|(?:-webkit-)?image-set)\s*\(/iy;

function matchStickyAt(re: RegExp, str: string, index: number): RegExpExecArray | null {
  re.lastIndex = index;
  return re.exec(str);
}

function escapeStyleCloseInCss(css: string): string {
  return css
    .replace(/<\s*\/\s*style\b/gi, '\\3c /style')
    .replace(/<!--/g, '\\3c !--');
}

function sanitizeNormalizedCss(str: string, validateQuotedStringsAsUrls = false, depth = 0): string {
  if (depth > 16) return '';
  let out = '';
  let i = 0;

  while (i < str.length) {
    const ch = str[i];

    if (ch === '"' || ch === "'") {
      const token = readCssQuotedStringToken(str, i);
      if (validateQuotedStringsAsUrls) {
        if (token.hitBadNewline) {
          // Neutralize <bad-string-token>, preserve trailing newline outside quotes so subsequent args keep tokenizing cleanly
          const newlineChar = token.rawToken.slice(-1);
          out += '""' + (newlineChar === '\n' || newlineChar === '\r' || newlineChar === '\f' ? newlineChar : '');
        } else {
          out += sanitizeCssUrlArgument(token.rawToken) ? token.rawToken : '""';
        }
      } else {
        out += token.rawToken;
      }
      i = token.nextIndex;
      continue;
    }

    if (ch === '@' && isIdentBoundaryBefore(str, i)) {
      if (matchStickyAt(CSS_AT_RULE_STICKY_RE, str, i)) {
        i = findDeclarationEnd(str, i) + 1;
        continue;
      }
    }

    if (isDeclBoundaryBefore(str, i)) {
      if (matchStickyAt(CSS_BAD_PROP_STICKY_RE, str, i)) {
        i = findDeclarationEnd(str, i) + 1;
        continue;
      }
    }

    if (isIdentBoundaryBefore(str, i)) {
      const exprMatch = matchStickyAt(CSS_EXPR_STICKY_RE, str, i);
      if (exprMatch) {
        const openIdx = i + exprMatch[0].length - 1;
        i = findMatchingParen(str, openIdx) + 1;
        continue;
      }

      if (matchStickyAt(CSS_PROGID_STICKY_RE, str, i)) {
        const end = findDeclarationEnd(str, i);
        i = str[end] === ';' ? end : end + 1;
        continue;
      }

      const urlMatch = matchStickyAt(CSS_URL_FN_STICKY_RE, str, i);
      if (urlMatch) {
        const fnName = urlMatch[1].toLowerCase();
        const openIdx = i + urlMatch[0].length - 1;
        const { endIdx, foundClose } = findMatchingParenEnd(str, openIdx);
        const inner = str.slice(openIdx + 1, endIdx);
        out += sanitizeCssUrlArgument(inner)
          ? str.slice(i, foundClose ? endIdx + 1 : endIdx)
          : `${fnName}("")`;
        i = foundClose ? endIdx + 1 : endIdx;
        continue;
      }

      const imgListMatch = matchStickyAt(CSS_IMAGE_LIST_FN_STICKY_RE, str, i);
      if (imgListMatch) {
        const openIdx = i + imgListMatch[0].length - 1;
        const { endIdx, foundClose } = findMatchingParenEnd(str, openIdx);
        const inner = str.slice(openIdx + 1, endIdx);
        const sanitizedInner = sanitizeNormalizedCss(inner, true, depth + 1);
        out += str.slice(i, openIdx + 1) + sanitizedInner + ')';
        i = foundClose ? endIdx + 1 : endIdx;
        continue;
      }
    }

    out += ch;
    i++;
  }

  return depth === 0 ? escapeStyleCloseInCss(out) : out;
}

/**
 * Sanitizes inline CSS or style strings against script execution vectors
 * (`expression()`, `url(javascript:)`, `behavior:`, `@import`, backslash CSS escapes, and nested parens).
 * Uses balanced CSS tokenization instead of unsafe lazy regexes (NEW-001).
 */
export function sanitizeCssStyle(css: unknown): string {
  if (css === null || css === undefined) return '';
  let str = decodeHtmlEntitiesDeep(String(css));

  for (let pass = 0; pass < 3; pass++) {
    const next = decodeCssEscapesOutsideStrings(stripCssCommentsOutsideStrings(str));
    if (next === str) break;
    str = next;
  }

  return sanitizeNormalizedCss(str).trim();
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

/** Shared canonical URL-bearing HTML attributes (NEW-002). */
export const URL_ATTRIBUTES: ReadonlySet<string> = new Set([
  'href',
  'src',
  'action',
  'formaction',
  'data',
  'poster',
  'codebase',
  'background',
  'cite',
  'longdesc',
  'profile',
  'usemap',
  'xlink:href',
  'xml:base',
  'ping',
  'dynsrc',
  'lowsrc'
]);

/** Compound srcset attributes. */
export const SRCSET_ATTRIBUTES: ReadonlySet<string> = new Set(['srcset', 'imagesrcset']);

/** Shared dangerous tags stripped in untrusted rich-HTML mode. */
export const DANGEROUS_HTML_TAGS: ReadonlySet<string> = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'textarea',
  'button',
  'select',
  'option',
  'optgroup',
  'fieldset',
  'label',
  'datalist',
  'output',
  'base',
  'link',
  'meta',
  'applet',
  'noscript',
  'noembed',
  'noframes',
  'xmp',
  'plaintext',
  'title',
  'portal',
  'frame',
  'frameset',
  'basefont',
  'bgsound',
  'slot',
  'template',
  'foreignobject',
  'animate',
  'animatemotion',
  'animatetransform',
  'set',
  'discard',
  'handler',
  'listener',
  'mpath',
  'feimage',
  'annotation-xml'
]);

/** Shared dangerous executable tags stripped even in developer-authored templates. */
export const DANGEROUS_TEMPLATE_TAGS: ReadonlySet<string> = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'base',
  'link',
  'meta',
  'applet',
  'noscript',
  'noembed',
  'noframes',
  'xmp',
  'plaintext',
  'title',
  'portal',
  'frame',
  'frameset',
  'basefont',
  'bgsound',
  'foreignobject',
  'animate',
  'animatemotion',
  'animatetransform',
  'set',
  'discard',
  'handler',
  'listener',
  'mpath',
  'feimage',
  'annotation-xml'
]);

const RAWTEXT_STRIP_TAGS: ReadonlySet<string> = new Set([
  'script',
  'style',
  'title',
  'textarea',
  'xmp',
  'noembed',
  'noframes',
  'noscript',
  'iframe',
  'plaintext'
]);

const HTML_FOREIGN_BREAKOUT_TAGS: ReadonlySet<string> = new Set([
  'b', 'big', 'blockquote', 'body', 'br', 'center', 'code', 'dd', 'div', 'dl', 'dt',
  'em', 'embed', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'hr', 'i', 'img', 'li',
  'listing', 'menu', 'meta', 'nobr', 'ol', 'p', 'pre', 'ruby', 's', 'small', 'span',
  'strong', 'strike', 'sub', 'sup', 'table', 'tt', 'u', 'ul', 'var'
]);

const SVG_HTML_INTEGRATION_TAGS: ReadonlySet<string> = new Set(['desc']);
const MATH_TEXT_INTEGRATION_TAGS: ReadonlySet<string> = new Set(['mi', 'mo', 'mn', 'ms', 'mtext']);

const VOID_HTML_TAGS: ReadonlySet<string> = new Set([
  'area',
  'base',
  'basefont',
  'bgsound',
  'br',
  'col',
  'embed',
  'frame',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);

const COMPILER_SLOT_COMMENT_RE = /^<!-- (?:dynamic|component|show|for)-slot -->$/;

/**
 * Sanitizes compound `srcset` / `imagesrcset` attribute strings without corrupting `data:image/...;base64,...` commas.
 */
export function sanitizeSrcset(rawVal: string): string {
  const candidates: string[] = [];
  let i = 0;
  const len = rawVal.length;

  while (i < len) {
    while (i < len && (rawVal[i] === ',' || /\s/.test(rawVal[i]))) i++;
    if (i >= len) break;

    const urlStart = i;
    while (i < len && !/\s/.test(rawVal[i])) i++;
    let urlToken = rawVal.slice(urlStart, i);

    let trailingCommas = false;
    // Strip trailing commas unless inside a data URI payload without whitespace
    while (urlToken.endsWith(',') && !urlToken.toLowerCase().startsWith('data:')) {
      urlToken = urlToken.slice(0, -1);
      trailingCommas = true;
    }
    if (urlToken.toLowerCase().startsWith('data:') && urlToken.endsWith(',')) {
      urlToken = urlToken.slice(0, -1);
      trailingCommas = true;
    }

    let descriptor = '';
    if (!trailingCommas) {
      const descStart = i;
      while (i < len && rawVal[i] !== ',') i++;
      descriptor = rawVal.slice(descStart, i).trim();
      if (i < len && rawVal[i] === ',') i++;
    }

    const decodedUrl = decodeHtmlEntitiesDeep(urlToken);
    const safeUrl = sanitizeUri(decodedUrl, { allowImageDataUri: true });
    const emittedUrl = safeUrl === 'about:blank' ? 'about:blank' : urlToken;
    candidates.push(descriptor ? `${emittedUrl} ${descriptor}` : emittedUrl);
  }

  return candidates.join(', ');
}

interface ParsedAttr {
  name: string;
  hasValue: boolean;
  value: string;
}

interface ParsedTagResult {
  tagName: string;
  attrs: ParsedAttr[];
  selfClosing: boolean;
  nextIndex: number;
  abortedAtLt: boolean;
}

function parseOpenTag(html: string, startLt: number): ParsedTagResult | null {
  const len = html.length;
  let i = startLt + 1;
  const tagStart = i;
  if (i >= len || !/[a-zA-Z]/.test(html[i])) return null;

  while (i < len && !/[\s/>]/.test(html[i]) && html[i] !== '<') i++;
  if (i < len && html[i] === '<') {
    return { tagName: html.slice(tagStart, i), attrs: [], selfClosing: false, nextIndex: i, abortedAtLt: true };
  }
  const tagName = html.slice(tagStart, i);
  const attrs: ParsedAttr[] = [];
  let selfClosing = false;

  while (i < len) {
    while (i < len && (/\s/.test(html[i]) || html[i] === '/')) {
      if (html[i] === '/' && html[i + 1] === '>') {
        selfClosing = true;
        return { tagName, attrs, selfClosing, nextIndex: i + 2, abortedAtLt: false };
      }
      i++;
    }
    if (i >= len) break;
    if (html[i] === '>') {
      return { tagName, attrs, selfClosing, nextIndex: i + 1, abortedAtLt: false };
    }
    if (html[i] === '<') {
      return { tagName, attrs, selfClosing: false, nextIndex: i, abortedAtLt: true };
    }

    const attrStart = i;
    while (i < len && !/[\s=/>]/.test(html[i]) && html[i] !== '<') i++;
    if (i < len && html[i] === '<') {
      return { tagName, attrs, selfClosing: false, nextIndex: i, abortedAtLt: true };
    }
    const attrName = html.slice(attrStart, i);

    while (i < len && /\s/.test(html[i])) i++;
    if (i < len && html[i] === '=') {
      i++;
      while (i < len && /\s/.test(html[i])) i++;
      if (i >= len) {
        if (attrName) attrs.push({ name: attrName, hasValue: true, value: '' });
        break;
      }

      let attrValue = '';
      if (html[i] === '"' || html[i] === "'") {
        const quote = html[i++];
        const valStart = i;
        while (i < len && html[i] !== quote) i++;
        attrValue = html.slice(valStart, i);
        if (i < len && html[i] === quote) i++;
      } else {
        const valStart = i;
        while (i < len && !/[\s>]/.test(html[i])) {
          i++;
        }
        attrValue = html.slice(valStart, i);
      }
      if (attrName) attrs.push({ name: attrName, hasValue: true, value: attrValue });
    } else {
      if (attrName) attrs.push({ name: attrName, hasValue: false, value: '' });
    }
  }

  return { tagName, attrs, selfClosing: false, nextIndex: len, abortedAtLt: false };
}

function escapeSerializedAttrValue(val: string): string {
  return val.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function sanitizeAttributeList(
  attrs: ParsedAttr[],
  options: { preserveAllFormAttrs: boolean; onlySanitizeUrls?: boolean }
): string {
  const seen = new Set<string>();
  const parts: string[] = [];

  for (const attr of attrs) {
    if (!/^[a-zA-Z_:][a-zA-Z0-9_.:-]*$/.test(attr.name)) continue;
    const lower = attr.name.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);

    if (!options.onlySanitizeUrls) {
      if (lower.startsWith('on') || lower === 'srcdoc') continue;
      if (!options.preserveAllFormAttrs && lower === 'formaction') continue;
    }

    if (!attr.hasValue) {
      parts.push(attr.name);
      continue;
    }

    if (SRCSET_ATTRIBUTES.has(lower)) {
      parts.push(`${attr.name}="${escapeSerializedAttrValue(sanitizeSrcset(attr.value))}"`);
      continue;
    }

    if (URL_ATTRIBUTES.has(lower)) {
      if (lower === 'ping') {
        const safePing = attr.value
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((tok) => {
            const safe = sanitizeUri(decodeHtmlEntitiesDeep(tok), { allowImageDataUri: true });
            return safe === 'about:blank' ? 'about:blank' : tok;
          })
          .join(' ');
        parts.push(`${attr.name}="${escapeSerializedAttrValue(safePing)}"`);
      } else {
        const safe = sanitizeUri(decodeHtmlEntitiesDeep(attr.value), { allowImageDataUri: true });
        const finalVal = safe === 'about:blank' ? 'about:blank' : attr.value;
        parts.push(`${attr.name}="${escapeSerializedAttrValue(finalVal)}"`);
      }
      continue;
    }

    if (lower === 'style' && !options.onlySanitizeUrls) {
      parts.push(`${attr.name}="${escapeSerializedAttrValue(sanitizeCssStyle(attr.value))}"`);
      continue;
    }

    parts.push(`${attr.name}="${escapeSerializedAttrValue(attr.value)}"`);
  }

  return parts.length > 0 ? ' ' + parts.join(' ') : '';
}

function findEndTagCloseGt(html: string, startAfterName: number): number {
  const len = html.length;
  let quote: string | null = null;
  for (let k = startAfterName; k < len; k++) {
    const ch = html[k];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return k;
    }
  }
  return -1;
}

function findRawtextClose(html: string, start: number, tagLower: string): number {
  const len = html.length;
  let i = start;
  while (i < len) {
    const closeStart = html.indexOf('</', i);
    if (closeStart === -1) return len;
    const afterNameIdx = closeStart + 2 + tagLower.length;
    if (
      afterNameIdx <= len &&
      html.slice(closeStart + 2, afterNameIdx).toLowerCase() === tagLower &&
      (afterNameIdx === len || /[\s/>]/.test(html[afterNameIdx]))
    ) {
      const gt = findEndTagCloseGt(html, afterNameIdx);
      return gt === -1 ? len : gt + 1;
    }
    i = closeStart + 2;
  }
  return len;
}

function findStrippedElementEnd(html: string, start: number, tagLower: string): number {
  let depth = 1;
  let i = start;
  const len = html.length;

  while (i < len && depth > 0) {
    const lt = html.indexOf('<', i);
    if (lt === -1) return len;

    if (html.startsWith('</', lt)) {
      let j = lt + 2;
      while (j < len && !/[\s/>]/.test(html[j]) && html[j] !== '<') j++;
      if (j < len && html[j] === '<') {
        i = j;
        continue;
      }
      const closeName = html.slice(lt + 2, j).toLowerCase();
      const gt = findEndTagCloseGt(html, j);
      i = gt === -1 ? len : gt + 1;
      if (closeName === tagLower) {
        depth--;
        if (depth === 0) return i;
      }
      continue;
    }

    const parsed = parseOpenTag(html, lt);
    if (parsed && !parsed.abortedAtLt) {
      if (parsed.tagName.toLowerCase() === tagLower && !parsed.selfClosing) {
        depth++;
      }
      i = parsed.nextIndex;
      continue;
    }

    i = lt + 1;
  }

  return len;
}

function findCommentEnd(html: string, startAfterBangDash: number): number {
  const len = html.length;
  if (html[startAfterBangDash] === '>') return startAfterBangDash + 1;
  if (html.startsWith('->', startAfterBangDash)) return startAfterBangDash + 2;
  for (let i = startAfterBangDash; i < len; i++) {
    if (html.startsWith('-->', i)) return i + 3;
    if (html.startsWith('--!>', i)) return i + 4;
  }
  return len;
}

interface ForeignFrame {
  tag: string;
  namespace: 'svg' | 'math';
  htmlIntegration: boolean;
}

function sanitizeHtmlWithTokenizer(
  html: string,
  options: { dangerousTags: ReadonlySet<string>; preserveCompilerSlots: boolean; preserveAllFormAttrs: boolean }
): string {
  const len = html.length;
  let out = '';
  let i = 0;
  const foreignStack: ForeignFrame[] = [];

  const isForeignContext = () =>
    foreignStack.length > 0 && !foreignStack[foreignStack.length - 1].htmlIntegration;

  const isHtmlForeignBreakout = (tagLower: string, attrs: ParsedAttr[]): boolean => {
    if (HTML_FOREIGN_BREAKOUT_TAGS.has(tagLower)) return true;
    if (tagLower === 'font') {
      return attrs.some((a) => {
        const name = a.name.toLowerCase();
        return name === 'color' || name === 'face' || name === 'size';
      });
    }
    return false;
  };

  while (i < len) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      out += html.slice(i);
      break;
    }

    if (lt > i) {
      out += html.slice(i, lt);
      i = lt;
    }

    // Comments, CDATA, DOCTYPE, conditional comments
    if (html.startsWith('<!--', i)) {
      const commentEnd = findCommentEnd(html, i + 4);
      const fullComment = html.slice(i, commentEnd);
      if (options.preserveCompilerSlots && COMPILER_SLOT_COMMENT_RE.test(fullComment)) {
        out += fullComment;
      }
      i = commentEnd;
      continue;
    }

    if (html.slice(i, i + 9).toUpperCase() === '<![CDATA[') {
      const cdataEnd = html.indexOf(']]>', i + 9);
      i = cdataEnd === -1 ? len : cdataEnd + 3;
      continue;
    }

    if (html.startsWith('<!', i) || html.startsWith('<?', i)) {
      const gt = html.indexOf('>', i + 2);
      i = gt === -1 ? len : gt + 1;
      continue;
    }

    // Closing tags
    if (html.startsWith('</', i)) {
      let j = i + 2;
      while (j < len && !/[\s/>]/.test(html[j]) && html[j] !== '<') j++;
      if (j < len && html[j] === '<') {
        out += '&lt;' + html.slice(i + 1, j);
        i = j;
        continue;
      }
      const closeName = html.slice(i + 2, j).toLowerCase();
      const gt = findEndTagCloseGt(html, j);
      i = gt === -1 ? len : gt + 1;

      if (!closeName || !/^[a-zA-Z][a-zA-Z0-9:-]*$/.test(closeName)) continue;
      if (options.dangerousTags.has(closeName)) continue;

      for (let k = foreignStack.length - 1; k >= 0; k--) {
        if (foreignStack[k].tag === closeName) {
          foreignStack.splice(k);
          break;
        }
      }
      out += `</${closeName}>`;
      continue;
    }

    // Opening tag
    const parsed = parseOpenTag(html, i);
    if (!parsed) {
      // Stray `<` not opening a tag (e.g. `<<script>` or `< 5`)
      out += html[i + 1] === '<' ? '&lt;' : '<';
      i++;
      continue;
    }

    if (parsed.abortedAtLt) {
      // Neutralize unclosed `<` before another `<` so stripping never coalesces tags (mXSS defense)
      out += '&lt;' + html.slice(i + 1, parsed.nextIndex);
      i = parsed.nextIndex;
      continue;
    }

    const lowerTag = parsed.tagName.toLowerCase();
    i = parsed.nextIndex;

    // HTML5 §13.2.6.5: HTML breakout tags inside non-integration foreign content pop foreign scope
    if (isForeignContext() && isHtmlForeignBreakout(lowerTag, parsed.attrs)) {
      while (foreignStack.length > 0 && !foreignStack[foreignStack.length - 1].htmlIntegration) {
        foreignStack.pop();
      }
    }

    const inForeign = isForeignContext();

    if (options.dangerousTags.has(lowerTag)) {
      if (lowerTag === 'plaintext') {
        i = len;
        break;
      }
      if (VOID_HTML_TAGS.has(lowerTag) || (inForeign && parsed.selfClosing)) {
        continue;
      }
      if (RAWTEXT_STRIP_TAGS.has(lowerTag) && !(lowerTag === 'textarea' && inForeign)) {
        i = findRawtextClose(html, i, lowerTag);
      } else {
        i = findStrippedElementEnd(html, i, lowerTag);
      }
      continue;
    }

    const isForeignRoot = lowerTag === 'svg' || lowerTag === 'math';
    if (!parsed.selfClosing) {
      if (isForeignRoot) {
        foreignStack.push({ tag: lowerTag, namespace: lowerTag as 'svg' | 'math', htmlIntegration: false });
      } else if (inForeign) {
        const currentNs = foreignStack[foreignStack.length - 1].namespace;
        const isIntegration =
          (currentNs === 'svg' && SVG_HTML_INTEGRATION_TAGS.has(lowerTag)) ||
          (currentNs === 'math' && MATH_TEXT_INTEGRATION_TAGS.has(lowerTag));
        if (isIntegration) {
          foreignStack.push({ tag: lowerTag, namespace: currentNs, htmlIntegration: true });
        }
      }
    }

    // RCDATA textarea when preserved in template mode: escape body text up to </textarea>
    const serializedAttrs = sanitizeAttributeList(parsed.attrs, {
      preserveAllFormAttrs: options.preserveAllFormAttrs
    });

    if (lowerTag === 'textarea' && (!parsed.selfClosing || !inForeign)) {
      const closeEnd = findRawtextClose(html, i, 'textarea');
      const sliceToClose = html.slice(i, closeEnd);
      const closeTagMatch = /<\/textarea(?:\s[^>]*)?>?$/i.exec(sliceToClose);
      const innerRaw = closeTagMatch ? sliceToClose.slice(0, closeTagMatch.index) : sliceToClose;
      const safeTextareaText = innerRaw.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      out += `<${parsed.tagName}${serializedAttrs}>${safeTextareaText}</textarea>`;
      i = closeEnd;
      continue;
    }

    out += `<${parsed.tagName}${serializedAttrs}${parsed.selfClosing && (inForeign || isForeignRoot) ? ' />' : '>'}`;
  }

  return out;
}

/**
 * Sanitizes all URL-bearing attributes in HTML strings, including standard attributes
 * and compound `srcset` attributes (NEW-002), using stateful tag/attribute tokenization.
 */
export function sanitizeHtmlUrlAttributes(html: string): string {
  if (!html) return '';
  const len = html.length;
  let out = '';
  let i = 0;

  while (i < len) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      out += html.slice(i);
      break;
    }
    if (lt > i) {
      out += html.slice(i, lt);
      i = lt;
    }
    if (html.startsWith('<!--', i)) {
      const end = findCommentEnd(html, i + 4);
      out += html.slice(i, end);
      i = end;
      continue;
    }
    if (html.startsWith('</', i) || html.startsWith('<!', i) || html.startsWith('<?', i)) {
      const gt = html.indexOf('>', i + 2);
      const end = gt === -1 ? len : gt + 1;
      out += html.slice(i, end);
      i = end;
      continue;
    }
    const parsed = parseOpenTag(html, i);
    if (!parsed || parsed.abortedAtLt) {
      out += parsed ? html.slice(i, parsed.nextIndex) : '<';
      i = parsed ? parsed.nextIndex : i + 1;
      continue;
    }
    const serializedAttrs = sanitizeAttributeList(parsed.attrs, {
      preserveAllFormAttrs: true,
      onlySanitizeUrls: true
    });
    out += `<${parsed.tagName}${serializedAttrs}${parsed.selfClosing ? ' />' : '>'}`;
    i = parsed.nextIndex;
  }

  return out;
}

/**
 * Strips dangerous HTML tags and attributes for rich text boundaries using
 * multi-pass stateful HTML tokenization (no space-delimiter or quoted-`>` regex bypasses).
 */
export function sanitizeHtmlString(html: string): string {
  if (!html) return '';

  let str = String(html);
  for (let pass = 0; pass < 4; pass++) {
    const next = sanitizeHtmlWithTokenizer(str, {
      dangerousTags: DANGEROUS_HTML_TAGS,
      preserveCompilerSlots: false,
      preserveAllFormAttrs: false
    });
    if (next === str) return next;
    str = next;
  }

  return str;
}

/**
 * Sanitizes template HTML skeletons used by compile-time and runtime `template()` cloning (EXT-002).
 * Preserves interactive UI tags (`<button ref="...">`, `<input>`, `<form>`, `<textarea>`, `<svg>`, `<path>`)
 * and exact compiler slot markers (`<!-- show-slot -->`, etc.),
 * while strictly stripping executable tags (`<script>`, `<style>`, `<object>`, `<embed>`, `<applet>`, `<base>`, `<meta>`, `<iframe>`, SVG `<animate>`/`<foreignObject>`),
 * CDATA/malformed comment mXSS vectors, all inline `on*` event handlers, dangerous URI schemes, and CSS injection.
 */
export function sanitizeTemplateHtml(html: string): string {
  if (!html) return '';

  let str = String(html);
  for (let pass = 0; pass < 4; pass++) {
    const next = sanitizeHtmlWithTokenizer(str, {
      dangerousTags: DANGEROUS_TEMPLATE_TAGS,
      preserveCompilerSlots: true,
      preserveAllFormAttrs: true
    });
    if (next === str) return next;
    str = next;
  }

  return str;
}

const ALLOWED_SSR_HEAD_TAGS: ReadonlySet<string> = new Set(['meta', 'link', 'base']);

/**
 * Sanitizes SSR `<head>` custom markup (`options.headTags`), permitting only safe
 * metadata elements (`<meta>`, `<link>`, `<base>`) while stripping `<script>`,
 * inline handlers, `<meta http-equiv="refresh">`, `<link rel="import">`, and
 * free-form text that could break out of `<head>` in HTML5 parsers (Bug 8c).
 */
export function sanitizeHeadTags(headHtml: string): string {
  if (!headHtml) return '';
  const html = String(headHtml);
  const len = html.length;
  const tags: string[] = [];
  let i = 0;

  while (i < len) {
    const lt = html.indexOf('<', i);
    if (lt === -1) break;
    i = lt;

    if (html.startsWith('<!--', i)) {
      i = findCommentEnd(html, i + 4);
      continue;
    }
    if (html.slice(i, i + 9).toUpperCase() === '<![CDATA[') {
      const end = html.indexOf(']]>', i + 9);
      i = end === -1 ? len : end + 3;
      continue;
    }
    if (html.startsWith('</', i) || html.startsWith('<!', i) || html.startsWith('<?', i)) {
      const gt = html.indexOf('>', i + 2);
      i = gt === -1 ? len : gt + 1;
      continue;
    }

    const parsed = parseOpenTag(html, i);
    if (!parsed || parsed.abortedAtLt) {
      i = parsed ? parsed.nextIndex : i + 1;
      continue;
    }

    const lowerTag = parsed.tagName.toLowerCase();
    i = parsed.nextIndex;

    if (!ALLOWED_SSR_HEAD_TAGS.has(lowerTag)) {
      if (lowerTag === 'plaintext') break;
      if (!VOID_HTML_TAGS.has(lowerTag)) {
        if (RAWTEXT_STRIP_TAGS.has(lowerTag) || lowerTag === 'textarea') {
          i = findRawtextClose(html, i, lowerTag);
        } else {
          i = findStrippedElementEnd(html, i, lowerTag);
        }
      }
      continue;
    }

    if (lowerTag === 'base') {
      const hrefAttr = parsed.attrs.find((a) => a.name.toLowerCase() === 'href');
      if (hrefAttr && sanitizeRedirectUri(hrefAttr.value, '__SAMREY_BLOCKED__') === '__SAMREY_BLOCKED__') {
        continue;
      }
    }

    if (lowerTag === 'meta') {
      const httpEquivAttr = parsed.attrs.find((a) => a.name.toLowerCase() === 'http-equiv');
      if (httpEquivAttr) {
        const val = decodeHtmlEntitiesDeep(httpEquivAttr.value).trim().toLowerCase();
        if (val === 'refresh' || val === 'set-cookie' || val === 'link') {
          continue;
        }
      }
    }

    if (lowerTag === 'link') {
      const relAttr = parsed.attrs.find((a) => a.name.toLowerCase() === 'rel');
      if (relAttr) {
        const relTokens = decodeHtmlEntitiesDeep(relAttr.value).toLowerCase().split(/\s+/);
        if (relTokens.includes('import')) {
          continue;
        }
      }
    }

    const serializedAttrs = sanitizeAttributeList(parsed.attrs, { preserveAllFormAttrs: false });
    tags.push(`<${lowerTag}${serializedAttrs}>`);
  }

  return tags.join('\n  ');
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
