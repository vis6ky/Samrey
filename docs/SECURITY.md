# Samrey Framework — Security Policy & Disclosure

**Version:** 1.0.0-rc.1  
**License:** Apache-2.0  

---

## 1. Supported Versions

| Version | Supported |
| :--- | :--- |
| `1.0.x-rc.*` | ✅ Yes |
| `< 1.0.0` | ❌ No |

---

## 2. Built-in Security Architecture

Samrey features a defense-in-depth security model implemented natively in `@samrey/security`:

- **HTML & SVG Sanitization:** `sanitizeHtml()` contextually parses and strips malicious `<script>`, `<iframe>`, `onerror`, `onload`, and custom inline handlers.
- **URI Sanitization:** `sanitizeUrl()` blocks `javascript:`, `data:text/html`, and `vbscript:` schemes, returning `about:blank` for unsafe targets.
- **Unicode-Safe SSR State Escaping:** `escapeJsonState()` sanitizes `</script>` breakouts and HTML entities when serializing state into `<script>` hydration tags.
- **Prototype Pollution Defense:** `safeJsonParse()` strips `__proto__`, `constructor`, and `prototype` overrides.
- **CSRF Token Handling:** Native cryptographic token generation and timing-safe validation.

---

## 3. Reporting a Vulnerability

To report a vulnerability or security flaw:
1. Open a private security advisory via GitHub Security Advisories at `https://github.com/samrey-framework/aether/security/advisories`.
2. Do not open public issues for zero-day vulnerabilities.
3. Vulnerabilities will be triaged within 48 hours and patched in the next release candidate or patch release.
