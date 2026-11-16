---
name: samrey-security
description: Contextual sanitization (HTML, URL, CSS), Trusted Types, anti-CSRF token protection, and secret scrubbing in @samrey/security.
---

# Samrey Security Primitives (`samrey-security`)

## 1. Skill Description & Activation Criteria
- **Purpose**: Teaches how to secure Samrey applications against Cross-Site Scripting (XSS), CSRF, prototype pollution, and credential leaks.
- **Activation Criteria**: Trigger when sanitizing user input, working with rich text HTML, generating or validating CSRF tokens, or handling authentication state.

## 2. Framework Concepts
- **`sanitizeHtml(untrusted)`**: Contextual HTML sanitizer that strips script tags, iframes, and dangerous attributes.
- **`sanitizeUrl(untrusted)`**: Validates URL protocols, preventing `javascript:` and unsafe data schemes.
- **`sanitizeCssStyle(untrusted)`**: Neutralizes CSS injection and style-based data exfiltration.
- **Anti-CSRF Tokens (`generateCsrfToken`, `verifyCsrfToken`)**: Timing-safe cryptographic tokens.
- **`stripSecrets(obj)`**: Redacts passwords, tokens, API keys, and authorization headers from serialized state.

## 3. Correct API Usage
```ts
import { sanitizeHtml, sanitizeUrl, generateCsrfToken, verifyCsrfToken, stripSecrets } from '@samrey/security';

// Sanitization
const safeHtml = sanitizeHtml(userMarkup);
const safeUrl = sanitizeUrl(userLink);

// CSRF
const token = generateCsrfToken();
const valid = verifyCsrfToken(submittedToken, token);

// State scrubbing
const publicState = stripSecrets(serverSessionData);
```

## 4. Verified Code Example
```ts
import { sanitizeHtml, sanitizeUrl } from '@samrey/security';
import { template, bindAttr } from '@samrey/runtime';

const _profileTmpl = template(`
  <div class="user-profile">
    <a ref="websiteLink" target="_blank" rel="noopener">Website</a>
    <div ref="bioBox" class="bio"></div>
  </div>
`);

export function UserProfile(props: { website: string; bio: string }) {
  const root = _profileTmpl.clone();
  const { websiteLink, bioBox } = root.refs;

  // Sanitize external link
  const safeHref = sanitizeUrl(props.website);
  bindAttr(websiteLink, 'href', () => safeHref);

  // Sanitize and set formatted bio
  bioBox.innerHTML = sanitizeHtml(props.bio);

  return root;
}
```

## 5. Common Mistakes
- **Mistake**: Setting `element.innerHTML` directly with unsanitized user content.
  - *Correction*: Always wrap untrusted HTML in `sanitizeHtml(content)`.
- **Mistake**: Using non-timing-safe equality (`===`) to verify CSRF tokens.
  - *Correction*: Always use `verifyCsrfToken()` which uses `crypto.timingSafeEqual`.

## 6. Forbidden Patterns
- ❌ Do NOT disable Trusted Types policies in production environments.
- ❌ Do NOT store plaintext credentials in client localStorage or sessionStorage.

## 7. Validation Procedures
1. Run `npx @samrey/cli audit --security` to scan for security vulnerabilities.
2. Run `tests/phase2-sanitizers-secrets.test.ts`.

## 8. Authoritative Documentation
- [ai/SECURITY_RULES.md](../../SECURITY_RULES.md)
- [ai/API_CONTRACTS.md](../../API_CONTRACTS.md#8-samreysecurity)
