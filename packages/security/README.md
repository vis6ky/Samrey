# @samrey/security

Zero-trust contextual sanitization, W3C Trusted Types policy management, prototype pollution defense, SSR serialization escaping, and anti-CSRF token verification.

## Purpose

`@samrey/security` provides defense-in-depth security utilities designed specifically for modern web applications and reactive frameworks. It guarantees protection against Cross-Site Scripting (XSS), prototype pollution, URI scheme injection, and CSRF attacks.

## Installation

```bash
npm install @samrey/security
```

## Quick Example

```ts
import {
  sanitizeHtmlString,
  escapeHtmlText,
  sanitizeUri,
  sanitizeRedirectUri,
  isSafeUrl,
  safeJsonParse,
  safeJsonStringify,
  generateCsrfToken,
  verifyCsrfToken
} from '@samrey/security';

// 1. Strip dangerous HTML vs. escape raw text
const clean = sanitizeHtmlString('<script>alert(1)</script><p>Safe content</p>');
// Output: '<p>Safe content</p>'

const escaped = escapeHtmlText('<script>alert(1)</script>');
// Output: '&lt;script&gt;alert(1)&lt;/script&gt;'

// 2. URI Scheme Validation (Resource vs. Navigational Redirect)
const assetUrl = sanitizeUri('javascript:alert(document.cookie)');
// Output: 'about:blank'

const nextRoute = sanitizeRedirectUri('//evil.example.com/phish', '/');
// Output: '/' (protocol-relative and cross-origin URLs rejected for navigation)

const isOk = isSafeUrl('https://example.com'); // true

// 3. Prototype Pollution Defense
const obj = safeJsonParse('{"__proto__": {"polluted": true}, "name": "Samrey"}');
console.log(obj.name); // "Samrey"
console.log(({} as any).polluted); // undefined

// 4. Safe JSON Serialization for SSR
const stateJson = safeJsonStringify({ data: '</script><script>alert("xss")</script>' });
// Output: '{"data":"\\u003c/script\\u003e\\u003cscript\\u003ealert(\\"xss\\")\\u003c/script\\u003e"}'

// 5. Synchronizer / Double-Submit CSRF Token Defense
const expectedSessionToken = generateCsrfToken();
const submittedToken = expectedSessionToken;
const isValid = verifyCsrfToken(submittedToken, expectedSessionToken); // true
```

## API

- `sanitizeHtmlString(input: string): string` *(alias: `sanitizeHtml`)* — Strips executable tags (`<script>`, `<iframe>`, `<object>`, `<embed>`, etc.), inline `on*` handlers, unsafe URI attributes, and unsafe CSS from HTML strings.
- `sanitizeTemplateHtml(input: string): string` — Template-preserving sanitizer used by `samrey#template` Trusted Types policy (keeps interactive UI tags like `<button>`, `<input>`, `<form>`, and `ref` while removing executable vectors).
- `sanitizeCssStyle(css: unknown): string` — Multi-pass CSS inline-style sanitizer (strips comments, decodes hex escapes, removes `expression()`, `behavior:`, `-moz-binding:`, `@import`, and validates `url()` targets).
- `sanitizeUri(url: string | null | undefined, options?: SanitizeUriOptions): string` *(alias: `sanitizeUrl`)* — Validates resource and link URIs, blocking dangerous schemes (`javascript:`, `vbscript:`, unsafe `data:`) while allowing `http:`, `https:`, `mailto:`, `tel:`, protocol-relative `//`, and relative paths.
- `sanitizeRedirectUri(url: string | null | undefined, fallback?: string): string` — Strict redirect sanitizer accepting only verified relative paths (`/`, `./`, `../`, `#`, `?`) and rejecting protocol-relative (`//`), backslash, and cross-origin URLs.
- `isSafeUrl(url: string | null | undefined): boolean` — Validates whether `sanitizeUri(url)` permits the URL (`!== 'about:blank'`).
- `escapeHtmlAttribute(value: unknown): string` *(alias: `sanitizeAttribute`)* & `escapeHtmlText(value: unknown): string` — Context-appropriate HTML entity escaping for attribute values and plain text nodes.
- `safeJsonParse<T>(json: string): T` & `scrubPrototypePollution<T>(obj: T): T` — Neutralizes `__proto__`, `constructor`, and `prototype` prototype-pollution keys during/after JSON parsing.
- `safeJsonStringify(obj: unknown): string` & `escapeForScriptPayload(json: string): string` — Scrubs secrets and Unicode-escapes `<`, `>`, `&`, `\u2028`, `\u2029` for safe inline JSON embedding.
- `stripSecrets<T>(data: T, options?: SecretGuardOptions): T` — Recursively redacts sensitive credential keys and tokens before SSR serialization.
- `generateCsrfToken(entropy?: number | string): string` *(alias: `createCsrfToken`)* — Generates a CSPRNG URL-safe random token (default length `32`; accepts a positive integer length).
- `verifyCsrfToken(submittedToken: string | null | undefined, expectedToken: string): boolean` *(alias: `validateCsrfToken`)* — Constant-time equality verification (`timingSafeEqual`) comparing a submitted request token against the expected session token.
- `TrustedTypesPolicy`, `getSamreyTrustedPolicy()`, `getSamreyTemplateTrustedPolicy()` — Manages `samrey#html` and `samrey#template` W3C Trusted Types policies with a programmatic sanitizer fallback in non-supporting environments.

## Environment

Universal: Node.js (>= 18.0.0), Bun, Deno, and all modern browsers.

## Security

Zero-eval execution model. All inputs are contextually parsed and escaped without invoking runtime JavaScript evaluation engines.

## Related Packages

- `@samrey/runtime` — Uses `@samrey/security` for safe attribute binding.
- `@samrey/ssr` — Uses `@samrey/security` for SSR state hydration serialization.
- `@samrey/forms` — Form validation with CSRF integration.

