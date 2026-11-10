# Security Model: Samrey Frontend Framework

**Document**: `docs/SECURITY_MODEL.md`  
**Classification**: Core Architecture Specification  
**Security Tier**: Level 1 (Defense-in-Depth, Security-by-Default)  

---

## 1. Executive Summary & Security Principles

Samrey is engineered from the ground up on the principle of **Zero-Trust Input and Security-by-Default**. Unlike legacy frameworks where security is treated as a runtime add-on or delegated to developer discipline, Samrey integrates contextual security boundaries directly into the **Compiler Pipeline**, **Reactivity Engine**, **Hydration Serializer**, and **HTTP Client**.

### Core Security Tenets
1. **Zero-`eval` Runtime Guarantee**: No `eval()`, `new Function()`, or dynamic string-to-code execution in any core package. Full compatibility with the strictest Content Security Policy (`script-src 'self'`).
2. **Context-Aware Compile-Time Sanitization**: Dynamic values are automatically classified by insertion context (HTML body, attribute value, URI, CSS property, or script payload) and encoded using context-specific sanitizers.
3. **Mandatory Trusted Types Enforcement**: Direct integration with the W3C Trusted Types API (`window.trustedTypes`). Dynamic DOM assignments use cryptographically sealed policies.
4. **Resumable SSR Injection Immunity**: State serialized during SSR is encoded using Unicode escape sequences to prevent script-tag breakouts (`</script>`), CDATA boundary attacks, and JSON prototype hijacking.
5. **Hermetic Memory & Prototype Pollution Defense**: Internal reactive subscriber registries and metadata dictionaries use `Object.create(null)` with frozen prototype descriptors.

---

## 2. Context-Aware Sanitization Pipeline

A primary root cause of Cross-Site Scripting (XSS) in frontend frameworks is the mismatch between the sanitization strategy and the execution context. Samrey's compiler classifies every dynamic binding into one of five distinct contexts:

```
                  ┌─────────────────────────────────────┐
                  │ Samrey Template / JSX Parser (AOT)   │
                  └──────────────────┬──────────────────┘
                                     │ Analyzes Insertion Context
         ┌──────────────┬────────────┼─────────────┬──────────────┐
         ▼              ▼            ▼             ▼              ▼
   [HTML Body]    [Safe Attr]    [URI / URL]    [CSS Prop]    [Script / JSON]
         │              │            │             │              │
    Auto-Encode    Attribute     Strict Scheme     Safe Style    Unicode JSON
    Text Node      Setter Only   Filter (HTTP/S)   Map Lookup    Serializer
```

### 2.1 Context Specifications

| Context | Example | Compilation Strategy | Runtime Defense |
| :--- | :--- | :--- | :--- |
| **1. HTML Text Content** | `<div>{userInput}</div>` | Compiled to `node.textContent = value` | Native browser text node assignment. Never invokes HTML parsers or `innerHTML`. |
| **2. Safe Attributes** | `<input value={name} />` | Compiled to `node.setAttribute(key, value)` | Direct DOM property/attribute mapping. Zero template string interpolation. |
| **3. URI / URL Attributes** | `<a href={targetUrl}>`, `<img src={url}>` | Compiled with `sanitizeUri(value)` wrapper | Whitelist validation: blocks `javascript:`, `vbscript:`, `data:text/html`, and `data:application/javascript`. Only allows `http:`, `https:`, `mailto:`, `tel:`, protocol-relative `//` (for assets), and relative paths (`/`, `./`, `../`, `#`). |
| **4. Inline Styles** | `<div style={customStyles}>` | Multi-pass CSS sanitizer | Normalizes CSS comments, decodes backslash escape sequences, strips `expression()`, `behavior:`, `-moz-binding:`, `@import`, and validates `url()` targets. |
| **5. Rich HTML Injection** | `rawHtml(content)` | Requires Trusted Types policy (`samrey#html`) | Passes string through multi-pass `sanitizeHtmlString()`, stripping scripts, dangerous tags, inline event handlers, and malicious URLs. |
| **6. Component Templates** | `template("...")` | Requires Trusted Types policy (`samrey#template`) | Passes string through `sanitizeTemplateHtml()`, preserving interactive UI elements (`<button ref="...">`, `<input>`, `<form>`, `<textarea>`, `<svg>`) while eliminating executable tags, `on*` attributes, and dangerous schemes. |

### 2.2 URI Sanitization Policies: Resource Loading vs. Navigational Redirects

Samrey enforces two intentionally distinct URI policies depending on operational context:

1. **Resource Loading Context (`sanitizeUri`)**:
   - Used for HTML asset-loading attributes (`src`, `poster`, `background`, `srcset`, stylesheet `<link>` hrefs).
   - Allows protocol-relative URLs (e.g. `//cdn.example.com/bundle.js` or `//images.unsplash.com/photo.jpg`) so media assets inherit the host page's active scheme (`http:` or `https:`) without breaking.
   - Strictly blocks `javascript:`, `vbscript:`, `blob:`, and non-image `data:` URIs.

2. **Navigational & Redirect Context (`sanitizeRedirectUri`)**:
   - Used for router transitions, OAuth post-login callbacks, and HTTP server redirects.
   - Strictly rejects protocol-relative URLs (`//evil.com`, `/\evil.com`, `\\\\evil.com`), backslash path bypasses, and cross-origin domains.
   - Eliminates Open Redirect vulnerabilities by restricting destinations strictly to verified relative paths (`/dashboard`, `./profile`, `#section`).

### 2.3 CSS Multi-Pass Sanitization Pipeline

The `@samrey/security` CSS sanitizer (`sanitizeCssStyle`) protects style bindings through a 4-stage convergence loop:

1. **Comment Normalization**: Strips `/* ... */` comments that attackers use to split sensitive keywords (e.g. `exp/*comment*/ression`).
2. **Backslash Escape Decoding**: Normalizes CSS hexadecimal escapes (e.g. `\65` -> `e`, `expr\65ssion` -> `expression`) prior to pattern detection.
3. **Dangerous Property & At-Rule Neutralization**: Strips IE `expression()`, legacy `behavior:`, Firefox `-moz-binding:`, `@import`, `@charset`, and `@namespace`.
4. **URL Destination Scrubbing**: Parses all `url(...)` declarations, decodes internal escapes, and rewrites dangerous schemes (`javascript:`, `vbscript:`, non-whitelisted `data:`) to `url("about:blank")`.

### 2.4 HTML URL-Bearing Attributes & Compound `srcset` Coverage

URL sanitization extends comprehensively across all HTML5, SVG, and MathML URL-bearing attributes:
- **Standard Attributes**: `href`, `src`, `action`, `formaction`, `data`, `poster`, `codebase`, `background`, `cite`, `longdesc`, `profile`, `usemap`, `xlink:href`, `xml:base`, `ping`.
- **Compound Responsive Images (`srcset`)**: Every candidate URL in comma-separated `srcset` lists is individually parsed, validated against malicious schemes, and rewritten to `about:blank` if non-conforming, preserving screen descriptors (e.g. `2x`, `800w`).

---

## 3. Trusted Types Architecture

Samrey provides native first-class integration with the W3C Trusted Types specification (`window.trustedTypes`). When running in supporting browsers, Samrey registers two sealed policies:

1. **`samrey#html` (Rich Content Policy)**:
   - Applied when arbitrary HTML is inserted dynamically via `rawHtml()`.
   - Runs `sanitizeHtmlString()`, stripping scripts, forms, inputs, buttons, dangerous tags, and all event attributes.

2. **`samrey#template` (Component Template Policy)**:
   - Applied when component templates are instantiated via `template()`.
   - Runs `sanitizeTemplateHtml()`, ensuring zero pass-through trust-boundary leaks while preserving interactive UI elements (`<button ref="...">`, `<input>`, `<form>`, `<textarea>`, `<svg>`, `ref` attributes).
   - Eliminates `<script>`, `<object>`, `<embed>`, `<applet>`, `<base>`, `<meta>`, inline `on*` event handlers, and dangerous URL schemes.

```typescript
// packages/security/src/trusted-types.ts

let cachedPolicy: SamreyTrustedPolicy | null = null;
let cachedTemplatePolicy: SamreyTrustedPolicy | null = null;

export function getSamreyTrustedPolicy(): SamreyTrustedPolicy {
  if (cachedPolicy) return cachedPolicy;

  const tt = typeof window !== 'undefined' && window.trustedTypes;
  if (tt) {
    try {
      cachedPolicy = tt.createPolicy('samrey#html', {
        createHTML: (input: string) => sanitizeHtmlString(input),
        createScript: () => {
          throw new Error('[Samrey Security] Dynamic script creation is prohibited under zero-eval policy.');
        },
        createScriptURL: (url: string) => validateScriptUrl(url, configuredAllowedOrigins)
      });
      return cachedPolicy;
    } catch {}
  }

  // Programmatic sealed fallback for browsers without native Trusted Types
  cachedPolicy = {
    createHTML: (input: string) => sanitizeHtmlString(input),
    createScript: () => {
      throw new Error('[Samrey Security] Dynamic script creation is prohibited.');
    },
    createScriptURL: (url: string) => validateScriptUrl(url, configuredAllowedOrigins)
  };
  return cachedPolicy;
}

export function getSamreyTemplateTrustedPolicy(): SamreyTrustedPolicy {
  if (cachedTemplatePolicy) return cachedTemplatePolicy;

  const tt = typeof window !== 'undefined' && window.trustedTypes;
  if (tt) {
    try {
      cachedTemplatePolicy = tt.createPolicy('samrey#template', {
        createHTML: (input: string) => sanitizeTemplateHtml(input),
        createScript: () => {
          throw new Error('[Samrey Security] Dynamic script creation is prohibited.');
        },
        createScriptURL: (url: string) => validateScriptUrl(url, configuredAllowedOrigins)
      });
      return cachedTemplatePolicy;
    } catch {}
  }

  cachedTemplatePolicy = {
    createHTML: (input: string) => sanitizeTemplateHtml(input),
    createScript: () => {
      throw new Error('[Samrey Security] Dynamic script creation is prohibited.');
    },
    createScriptURL: (url: string) => validateScriptUrl(url, configuredAllowedOrigins)
  };
  return cachedTemplatePolicy;
}
```

---

## 4. SSR Hydration Security & Serialization Boundary

A critical vulnerability in SSR applications is **Hydration Script Injection**. When state is serialized to a `<script>` tag for client hydration, user input containing `</script><script>maliciousCode()</script>` can prematurely close the script tag and execute arbitrary JavaScript.

### Samrey Serialization Protocol
Samrey uses a dedicated **Safe JSON Serializer** for all SSR state transfers (`window.__SAMREY_STATE__`):

```typescript
// packages/ssr/src/serializer.ts

const ESCAPE_LOOKUP: Record<string, string> = {
  '&': '\\u0026',
  '>': '\\u003e',
  '<': '\\u003c',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

const ESCAPE_REGEX = /[&><\u2028\u2029]/g;

export function serializeForHydration(data: unknown): string {
  const json = JSON.stringify(data);
  return json.replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match]);
}
```

* **Prevents `<script>` Tag Breakouts**: `<` and `>` are encoded as `\u003c` and `\u003e`, making HTML parser breakout impossible.
* **Prevents Line-Terminator Exploits**: `\u2028` (Line Separator) and `\u2029` (Paragraph Separator) are encoded to prevent JS parsing syntax errors.
* **Script ID Attribute Hardening (EXT-001)**: The script tag's `id` attribute is strictly validated against an alphanumeric identifier pattern (`/^[a-zA-Z0-9_\-:]+$/`) and HTML-attribute escaped (`escapeHtmlAttribute`) to prevent attribute breakout or script termination via malicious custom script IDs.
* **Prototype Shielding**: Deserialization explicitly rejects `__proto__`, `constructor`, and `prototype` keys during client state restoration.

---

## 5. Form & CSRF Defense Architecture

Samrey's built-in `@samrey/forms` and `@samrey/http` packages enforce CSRF protection without requiring third-party middleware:

```
[Form Submission / Action] ──> [Cryptographic Origin / Referer Check]
                                      │
                                      ▼
                      [Extract Double-Submit Cookie / Header Token]
                                      │
                                      ▼
                      [Validate Action-Specific Hash Signature]
                                      │
                                      ▼
                      [Execute Server Action Function]
```

1. **Origin & SameSite Verification**: Form actions automatically verify the `Origin` and `Sec-Fetch-Site` request headers against the application host.
2. **Action-Specific Anti-Tamper Signatures**: Server action endpoints are cryptographically signed at build time with an HMAC token derived from the action signature, preventing blind endpoint execution.
3. **Double-Submit Token Integration**: Form submissions automatically bind CSRF tokens into hidden field state without manual developer intervention.

---

## 6. HTTP & Network Security Policies

The `@samrey/http` client enforces enterprise security policies by default:

* **Automatic Header Injections**: Configurable default headers for `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Frame-Options: DENY`.
* **Subresource Integrity (SRI) Support**: Automatic generation and verification of SRI hashes for code-split lazy chunks.
* **Credential Isolation**: Cross-origin requests strip sensitive authorization headers by default unless explicitly configured via an audited `credentials: 'include'` policy.

---

## 7. Comparative Threat Matrix

| Threat Vector | Common Framework Vulnerability | Samrey Architectural Countermeasure | Classification |
| :--- | :--- | :--- | :--- |
| **DOM-based XSS via `innerHTML`** | Accidental use of `v-html` or `dangerouslySetInnerHTML` | No direct `innerHTML` access in compiler output; requires `<SafeHtml>` + Trusted Types | **[Category A Defense]** |
| **Script Tag Breakout during SSR** | Raw `JSON.stringify(state)` embedded in HTML template | Mandatory Unicode escaping of `<, >, &, \u2028, \u2029` | **[Category A Defense]** |
| **`javascript:` URL Injection** | `<a href={userUrl}>` executes code if URL is unsanitized | Compiler emits `sanitizeUri()` guard verifying whitelist protocols | **[Category A Defense]** |
| **Prototype Pollution** | Deep merge in state stores polluting `Object.prototype` | Internal storage uses `Object.create(null)` + frozen object descriptors | **[Category A Defense]** |
| **CSP Bypass via `unsafe-eval`** | Runtime template compilation or expression evaluation | 100% AOT compilation; zero `eval()` or `new Function()` in runtime | **[Category A Defense]** |
| **CSRF in Form Actions** | Unprotected POST actions accepting arbitrary cross-origin form submits | Automatic `Sec-Fetch-Site` validation + action HMAC tokens | **[Category A Defense]** |
| **Accessibility Degradation** | Missing ARIA attributes causing screen reader failure | Compile-time A11y linter + auto-derived ARIA bindings in form controls | **[Category E/B Defense]** |
