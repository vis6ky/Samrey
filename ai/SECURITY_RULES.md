# Samrey Framework — Security Rules & Best Practices (SECURITY_RULES.md)

**Package:** `@samrey/security`  
**Version:** 2.1.0  
**Authority:** Mandatory Security Rules for AI Agents

---

## 1. Contextual Sanitization

Samrey provides built-in defenses against Cross-Site Scripting (XSS), URL injection, and style exploitation.

### APIs
- `sanitizeHtml(untrusted: string): string`: Strips dangerous tags (`<script>`, `<iframe>`, `<object>`, `<embed>`) and event handler attributes (`onload`, `onerror`).
- `sanitizeUrl(untrusted: string): string`: Prevents `javascript:`, `vbscript:`, and unsafe `data:` URLs.
- `sanitizeCssStyle(untrusted: string): string`: Prevents CSS-based keylogger or exfiltration expressions (`url(javascript:...)`).

```ts
import { sanitizeHtml, sanitizeUrl } from '@samrey/security';

const safeBio = sanitizeHtml(userInputBio);
const safeLink = sanitizeUrl(userSubmittedWebsite);
```

---

## 2. Anti-CSRF Token Generation & Verification

For form submissions and mutative API calls, Samrey includes cryptographic token utilities:
```ts
import { generateCsrfToken, verifyCsrfToken } from '@samrey/security';

// Server generates token for user session
const sessionToken = generateCsrfToken();

// On mutative POST/PUT/DELETE request:
const isAuthentic = verifyCsrfToken(submittedToken, sessionToken);
if (!isAuthentic) {
  throw new Error('CSRF validation failed');
}
```

---

## 3. Defense Against Prototype Pollution & Secrets Leakage
- **`scrubPrototypePollution(obj)`**: Recursively removes `__proto__`, `constructor`, and `prototype` keys from untrusted JSON payloads.
- **`stripSecrets(state)`**: Strips sensitive properties (`password`, `token`, `secret`, `authorization`, `cookie`, `apiKey`) before transmitting state over SSR payloads.
