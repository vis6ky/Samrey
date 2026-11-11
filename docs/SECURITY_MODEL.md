# Security Model: Samrey Frontend Framework

**Document**: `docs/SECURITY_MODEL.md`  
**Classification**: Core Architecture Specification  
**Security Tier**: Level 1 (Defense-in-Depth, Security-by-Default)  

---

## 1. Executive Summary & Security Principles

Samrey is engineered from the ground up on the principle of **Zero-Trust Input and Security-by-Default**. Unlike legacy frameworks where security is treated as a runtime add-on or delegated to developer discipline, Samrey integrates contextual security boundaries directly into the **Compiler Pipeline**, **Reactivity Engine**, **Hydration Serializer**, and **HTTP Client**.

### Core Security Tenets
1. **Zero-`eval` Core Runtime Guarantee**: No `eval()`, `new Function()`, or dynamic string-to-code execution in any `@samrey/*` framework package. Full compatibility with strict Content Security Policy (`script-src 'self'`). *(Note: the interactive browser playground in the repository documentation app (`src/lib/runtimeSandbox.ts`) evaluates user-edited snippets inside a token/AST-validated `'use strict'` sandbox with shadowed globals, isolated from core `@samrey/*` packages.)*
2. **Context-Aware Compile-Time & Runtime Sanitization**: Dynamic values are classified by insertion context (HTML body, attribute value, URI, CSS style, or script JSON payload) and normalized/escaped using context-specific utilities.
3. **Trusted Types Integration with Programmatic Sanitizer Fallback**: Registers the W3C Trusted Types policies `samrey#html` and `samrey#template` when `window.trustedTypes` is available in supporting browsers, and enforces an equivalent programmatic `SamreyTrustedPolicy` wrapper running the same sanitizers in non-supporting browsers and SSR/headless runtimes. Template cloning (`template()`), `rawHtml()`, dangerous attribute sinks (`innerHTML`, `outerHTML`, `srcdoc` in `el()`/`bindAttr()`), and script URLs (`validateScriptUrl`) route through these policies, while standard SSR string output uses context-appropriate HTML/attribute/JSON escaping.
4. **Resumable SSR Injection Immunity**: State serialized during SSR is scrubbed for secret keys and encoded using Unicode escape sequences to prevent script-tag breakouts (`</script>`), line-separator syntax breaks, and `script` `id`/`nonce` attribute injection.
5. **Prototype Pollution Defense**: JSON deserializers (`safeJsonParse`), deep object scrubbers (`scrubPrototypePollution`), owner contexts (`Object.create(null)`), and form field maps (`Object.create(null)`) explicitly strip or skip `__proto__`, `constructor`, and `prototype` keys.

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
4. **URL Destination Scrubbing**: Parses all `url(...)` declarations, decodes internal escapes, and rewrites dangerous schemes (`javascript:`, `vbscript:`, non-whitelisted `data:`) to `url("")` (while HTML URL attributes rewrite unsafe targets to `about:blank`).

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

const realmPolicyCache = new WeakMap<object, RealmPolicyCache>();

export function getSamreyTrustedPolicy(options?: TrustedTypesOptions): SamreyTrustedPolicy {
  if (options?.allowedScriptOrigins) {
    configuredAllowedOrigins = [...options.allowedScriptOrigins];
  }
  if (cachedPolicy) return cachedPolicy;

  const tt = typeof window !== 'undefined' && window.trustedTypes;
  if (tt) {
    const cache = getRealmPolicyCache(tt);
    if (cache.html) {
      cachedPolicy = cache.html;
      return cachedPolicy;
    }
    try {
      cachedPolicy = tt.createPolicy('samrey#html', {
        createHTML: (input: string) => sanitizeHtmlString(input),
        createScript: () => {
          throw new Error('[Samrey Security] Dynamic script creation is prohibited under zero-eval policy.');
        },
        createScriptURL: (url: string) => validateScriptUrl(url, configuredAllowedOrigins)
      });
      cache.html = cachedPolicy;
      return cachedPolicy;
    } catch (err) {
      // Fail closed when host CSP/Trusted Types blocks creation; recover only if already cached on duplicate error.
      if (isDuplicatePolicyError(err) && cache.html) {
        return cache.html;
      }
      throw err;
    }
  }

  // Programmatic fallback for browsers/environments without native Trusted Types
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
    const cache = getRealmPolicyCache(tt);
    if (cache.template) {
      cachedTemplatePolicy = cache.template;
      return cachedTemplatePolicy;
    }
    try {
      cachedTemplatePolicy = tt.createPolicy('samrey#template', {
        createHTML: (input: string) => sanitizeTemplateHtml(input),
        createScript: () => {
          throw new Error('[Samrey Security] Dynamic script creation is prohibited.');
        },
        createScriptURL: (url: string) => validateScriptUrl(url, configuredAllowedOrigins)
      });
      cache.template = cachedTemplatePolicy;
      return cachedTemplatePolicy;
    } catch (err) {
      if (isDuplicatePolicyError(err) && cache.template) {
        return cache.template;
      }
      throw err;
    }
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
Samrey uses **`serializeStateForHydration`** (`@samrey/ssr`) composed with **`escapeForScriptPayload`** (`@samrey/security`) for all SSR state transfers (`<script id="__SAMREY_STATE__" type="application/json">`):

```typescript
// packages/security/src/sanitizer.ts
export function escapeForScriptPayload(jsonString: string): string {
  return jsonString
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// packages/ssr/src/serializer.ts
export function serializeStateForHydration(state: unknown, options: SerializeOptions = {}): string {
  const rawId = options.id || '__SAMREY_STATE__';
  const scriptId = /^[a-zA-Z0-9_\-:]+$/.test(rawId) ? rawId : '__SAMREY_STATE__';
  const cleanState = stripSecrets(state, options);
  const safePayload = escapeForScriptPayload(JSON.stringify(cleanState));
  const nonceAttr = options.nonce ? ` nonce="${escapeHtmlAttribute(options.nonce)}"` : '';
  return `<script id="${escapeHtmlAttribute(scriptId)}" type="application/json"${nonceAttr}>${safePayload}</script>`;
}
```

* **Prevents `<script>` Tag Breakouts**: `<`, `>`, and `&` are encoded as `\u003c`, `\u003e`, and `\u0026`, making HTML parser breakout impossible.
* **Prevents Line-Terminator Exploits**: `\u2028` (Line Separator) and `\u2029` (Paragraph Separator) are encoded to prevent JS parsing syntax errors.
* **Script ID Attribute Hardening (EXT-001)**: The script tag's `id` attribute is strictly validated against `/^[a-zA-Z0-9_\-:]+$/` and HTML-attribute escaped (`escapeHtmlAttribute`), and `deserializeHydrationState()` escapes selectors with `escapeCssIdentifier()` and verifies `SCRIPT` element identity.
* **SSR Head & Asset Hardening**: Custom `options.headTags` markup passed to `renderToString` / `renderToStream` is sanitized by `sanitizeHeadTags()` (allowing only `<meta>`, `<link>`, `<base>` without unsafe handlers/URLs), `getDelegatedEventScript()` escapes event metadata payloads via `escapeForScriptPayload()` and exposes `__SAMREY_EVENTS_CLEANUP__` listener teardown, and `options.clientScript`, `options.clientStyles`, and `nonce` attributes are URI-sanitized and HTML-attribute escaped.
* **Prototype Shielding**: `safeJsonParse()` explicitly rejects `__proto__`, `constructor`, and `prototype` keys during client state restoration.

---

## 5. Form Safety & Anti-CSRF Primitives

Samrey cleanly separates client form state management (`@samrey/forms`) from server/session anti-CSRF verification primitives (`@samrey/security`):

1. **Form Field Isolation (`@samrey/forms`)**: `createForm()` stores fields in an `Object.create(null)` map, explicitly skips `__proto__`, `constructor`, and `prototype` keys during initialization and `reset()`, and runs Standard Schema (`~standard`) plus field-level validators before invoking `onSubmit`.
2. **CSPRNG CSRF Tokens (`@samrey/security`)**: `generateCsrfToken()` (alias `createCsrfToken()`) generates URL-safe random tokens from `crypto.getRandomValues` (falling back to `node:crypto` on Node.js runtimes lacking Web Crypto).
3. **Constant-Time Verification (`@samrey/security`)**: `verifyCsrfToken(submittedToken, expectedToken)` (alias `validateCsrfToken`) compares the request token against the session's expected token via `timingSafeEqual()` to prevent timing side channels.
4. **Application / Server Responsibilities**: Double-submit cookie transport, hidden input/header binding, `Origin`/`Sec-Fetch-Site` validation, and token expiration/signing are implemented at the application HTTP handler or server middleware layer using `@samrey/security` primitives; `@samrey/forms` does not inject hidden CSRF fields or inspect HTTP request headers automatically.

---

## 6. HTTP Client Security (`@samrey/http`)

The `@samrey/http` `HttpClient` enforces client-side request/response safety around the platform `fetch()` API:

* **Request URI & Origin Validation**: All URLs are validated with `sanitizeUri()` before `fetch()` is invoked, throwing an error for blocked protocols (`javascript:`, `vbscript:`, unsafe `data:`), and enforcing same-origin request boundaries by default unless `allowCrossOrigin` (or a configured `baseUrl`) is explicitly opted in.
* **Prototype-Pollution-Safe Payload Decoding**: JSON responses are decoded with `safeJsonParse()` (for text payloads) or scrubbed via `scrubPrototypePollution()` (for `res.json()`), stripping `__proto__`, `constructor`, and `prototype` keys.
* **Abort & Timeout Enforcement**: Supports configurable `timeoutMs` via `AbortController` chained cleanly with caller-provided `AbortSignal` instances.
* **Server & Shell Responsibilities**: HTTP response security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy`), `<script>`/`<link>` Subresource Integrity (`integrity`) attributes, and CORS/cookie `credentials` policies must be configured on the HTTP server or SSR document shell rather than inside `HttpClient`.

---

## 7. Comparative Threat Matrix

| Threat Vector | Common Framework Vulnerability | Samrey Architectural Countermeasure | Classification |
| :--- | :--- | :--- | :--- |
| **DOM-based XSS via `innerHTML`** | Accidental use of `v-html` or `dangerouslySetInnerHTML` | No raw `innerHTML` pass-through in compiler output; `rawHtml()` runs `TrustedTypesPolicy.createHTML()` / `sanitizeHtmlString()` | **[Category A Defense]** |
| **Script Tag Breakout during SSR** | Raw `JSON.stringify(state)` embedded in HTML template | Mandatory Unicode escaping of `<, >, &, \u2028, \u2029` via `serializeStateForHydration()` + `escapeForScriptPayload()` | **[Category A Defense]** |
| **`javascript:` URL Injection** | `<a href={userUrl}>` executes code if URL is unsanitized | `sanitizeUri()` for assets/links, `sanitizeSrcset()` for `srcset`, and `sanitizeRedirectUri()` for navigation/redirects | **[Category A Defense]** |
| **Prototype Pollution** | Deep merge or JSON parse polluting `Object.prototype` | `safeJsonParse()`, `scrubPrototypePollution()`, `Object.create(null)` maps, and key filtering across SSR & forms | **[Category A Defense]** |
| **CSP Bypass via `unsafe-eval`** | Runtime template compilation or expression evaluation | AOT compilation; zero `eval()` or `new Function()` in all `@samrey/*` framework packages | **[Category A Defense]** |
| **Cross-Site Request Forgery (CSRF)** | Non-constant-time token checks or weak `Math.random()` tokens | CSPRNG tokens (`generateCsrfToken()`) and `timingSafeEqual()` verification (`verifyCsrfToken()`) in `@samrey/security` (wired by server handlers) | **[Category A Defense]** |
| **Accessibility Degradation** | Missing ARIA attributes causing screen reader failure | Compile-time A11y linter + `cli audit` scanner + ARIA state helpers (`getAriaProps`) in `@samrey/forms` | **[Category E/B Defense]** |
