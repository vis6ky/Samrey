# @aether/security

Zero-trust contextual sanitization, W3C Trusted Types policy management, prototype pollution defense, SSR serialization escaping, and anti-CSRF token verification.

## Purpose

`@aether/security` provides defense-in-depth security utilities designed specifically for modern web applications and reactive frameworks. It guarantees protection against Cross-Site Scripting (XSS), prototype pollution, URI scheme injection, and CSRF attacks.

## Installation

```bash
npm install @aether/security
```

## Quick Example

```ts
import {
  sanitizeHtml,
  sanitizeUrl,
  isSafeUrl,
  safeJsonParse,
  safeJsonStringify,
  createCsrfToken,
  validateCsrfToken
} from '@aether/security';

// 1. Sanitize HTML
const clean = sanitizeHtml('<script>alert(1)</script><p>Safe content</p>');
// Output: '&lt;script&gt;alert(1)&lt;/script&gt;<p>Safe content</p>'

// 2. URI Scheme Validation
const url = sanitizeUrl('javascript:alert(document.cookie)');
// Output: 'about:blank'

const isOk = isSafeUrl('https://example.com'); // true

// 3. Prototype Pollution Defense
const obj = safeJsonParse('{"__proto__": {"polluted": true}, "name": "Aether"}');
console.log(obj.name); // "Aether"
console.log(({} as any).polluted); // undefined

// 4. Safe JSON Serialization for SSR
const stateJson = safeJsonStringify({ data: '</script><script>alert("xss")</script>' });
// Output: '{"data":"\\u003c/script\\u003e\\u003cscript\\u003ealert(\\"xss\\")\\u003c/script\\u003e"}'

// 5. CSRF Defense
const token = createCsrfToken('super-secret-key');
const isValid = validateCsrfToken(token, 'super-secret-key'); // true
```

## API

- `sanitizeHtml(input: string): string` — Escapes raw HTML tags and dangerous tokens.
- `sanitizeUrl(url: string): string` — Strips dangerous schemes (`javascript:`, `data:text/html`, `vbscript:`).
- `sanitizeAttribute(attr: string, value: unknown): string` — Context-aware attribute sanitizer.
- `isSafeUrl(url: string): boolean` — Validates whether a URL uses an approved protocol.
- `safeJsonParse<T>(json: string): T` — Deserializes JSON while neutralizing prototype pollution keys.
- `safeJsonStringify(obj: unknown): string` — Serializes JSON safely with Unicode HTML entity escaping.
- `createCsrfToken(secret: string): string` — Generates a cryptographically secure CSRF session token.
- `validateCsrfToken(token: string, secret: string, maxAgeMs?: number): boolean` — Validates CSRF token authenticity and expiration.
- `TrustedTypesPolicy` — Class managing browser W3C Trusted Types security policy integration.

## Environment

Universal: Node.js (>= 18.0.0), Bun, Deno, and all modern browsers.

## Security

Zero-eval execution model. All inputs are contextually parsed and escaped without invoking runtime JavaScript evaluation engines.

## Related Packages

- `@aether/runtime` — Uses `@aether/security` for safe attribute binding.
- `@aether/ssr` — Uses `@aether/security` for SSR state hydration serialization.
- `@aether/forms` — Form validation with CSRF integration.

