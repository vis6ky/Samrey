# Samrey Framework — Security Policy & Disclosure

**Version:** 2.1.0  
**License:** Apache-2.0  

---

## 1. Supported Versions

| Version | Supported |
| :--- | :--- |
| `2.x` | ✅ Yes |
| `1.x` | ❌ No |
| `< 1.0.0` | ❌ No |

---

## 2. Built-in Security Architecture

Samrey features a defense-in-depth security model implemented natively in `@samrey/security` and `@samrey/ssr`:

- **HTML, SVG & Template Sanitization:** `sanitizeHtmlString()` (alias `sanitizeHtml()`) and `sanitizeTemplateHtml()` parse and strip malicious `<script>`, `<iframe>`, `onerror`, `onload`, and inline event handlers.
- **URI & Redirect Sanitization:** `sanitizeUri()` (alias `sanitizeUrl()`) blocks `javascript:`, `vbscript:`, and unsafe `data:` schemes (returning `'about:blank'` for unsafe targets); `sanitizeRedirectUri()` strictly enforces relative-path redirects to block Open Redirects (`//evil.com`).
- **Trusted Types Policies:** `getSamreyTrustedPolicy()` (`samrey#html`) and `getSamreyTemplateTrustedPolicy()` (`samrey#template`) enforce realm-isolated, fail-closed Trusted Types policies with programmatic sanitizer fallbacks.
- **Unicode-Safe SSR State Escaping:** `escapeForScriptPayload()` (`@samrey/security`) and `serializeStateForHydration()` (`@samrey/ssr`, alias `escapeJsonState()`) escape `<`, `>`, `&`, `\u2028`, and `\u2029` when embedding JSON payloads into `<script>` hydration tags.
- **Prototype Pollution Defense:** `safeJsonParse()` and `scrubPrototypePollution()` strip `__proto__`, `constructor`, and `prototype` keys.
- **CSRF Token Handling:** `generateCsrfToken()` and timing-safe `verifyCsrfToken()` (aliases `createCsrfToken()` / `validateCsrfToken()`).

---

## 3. Reporting a Vulnerability

To report a vulnerability or security flaw:
1. Open a private security advisory via GitHub Security Advisories at `https://github.com/vis6ky/Samrey/security/advisories`.
2. Do not open public issues for zero-day vulnerabilities.
3. Vulnerabilities will be triaged within 48 hours and patched in the next release candidate or patch release.
