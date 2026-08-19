# Security Model: Aether Frontend Framework

**Document**: `docs/SECURITY_MODEL.md`  
**Classification**: Core Architecture Specification  
**Security Tier**: Level 1 (Defense-in-Depth, Security-by-Default)  

---

## 1. Executive Summary & Security Principles

Aether is engineered from the ground up on the principle of **Zero-Trust Input and Security-by-Default**. Unlike legacy frameworks where security is treated as a runtime add-on or delegated to developer discipline, Aether integrates contextual security boundaries directly into the **Compiler Pipeline**, **Reactivity Engine**, **Hydration Serializer**, and **HTTP Client**.

### Core Security Tenets
1. **Zero-`eval` Runtime Guarantee**: No `eval()`, `new Function()`, or dynamic string-to-code execution in any core package. Full compatibility with the strictest Content Security Policy (`script-src 'self'`).
2. **Context-Aware Compile-Time Sanitization**: Dynamic values are automatically classified by insertion context (HTML body, attribute value, URI, CSS property, or script payload) and encoded using context-specific sanitizers.
3. **Mandatory Trusted Types Enforcement**: Direct integration with the W3C Trusted Types API (`window.trustedTypes`). Dynamic DOM assignments use cryptographically sealed policies.
4. **Resumable SSR Injection Immunity**: State serialized during SSR is encoded using Unicode escape sequences to prevent script-tag breakouts (`</script>`), CDATA boundary attacks, and JSON prototype hijacking.
5. **Hermetic Memory & Prototype Pollution Defense**: Internal reactive subscriber registries and metadata dictionaries use `Object.create(null)` with frozen prototype descriptors.

---

## 2. Context-Aware Sanitization Pipeline

A primary root cause of Cross-Site Scripting (XSS) in frontend frameworks is the mismatch between the sanitization strategy and the execution context. Aether's compiler classifies every dynamic binding into one of five distinct contexts:

```
                  ┌─────────────────────────────────────┐
                  │ Aether Template / JSX Parser (AOT)   │
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
| **3. URI / URL Attributes** | `<a href={targetUrl}>`, `<iframe src={url}>` | Compiled with `sanitizeUri(value)` wrapper | Whitelist validation: blocks `javascript:`, `vbscript:`, `data:text/html`, and `data:application/javascript`. Only allows `http:`, `https:`, `mailto:`, `tel:`, and relative paths (`/`, `./`, `../`, `#`). |
| **4. Inline Styles** | `<div style={customStyles}>` | Structured CSS object compiler | Prohibits dynamic raw strings in `style`. Validates CSS properties against known CSSOM identifiers; blocks `expression()`, `url()`, and CSS injection breakouts. |
| **5. Rich HTML Injection** | `<SafeHtml content={rawHtml} />` | Disallows arbitrary `innerHTML`. Requires explicit `<SafeHtml>` component backed by Trusted Types policy. | Passes string through Sanitizer API (or audited DOMPurify hook) and returns a `TrustedHTML` token. |

---

## 3. Trusted Types Architecture

Aether provides native first-class integration with the W3C Trusted Types specification. When running in a browser that supports Trusted Types (or when using the polyfill), Aether creates and manages an internal, private Trusted Type Policy:

```typescript
// packages/security/src/trusted-types.ts

let aetherPolicy: TrustedTypePolicy | null = null;

export function getAetherTrustedPolicy(): TrustedTypePolicy {
  if (aetherPolicy) return aetherPolicy;

  if (typeof window !== 'undefined' && window.trustedTypes) {
    aetherPolicy = window.trustedTypes.createPolicy('aether#html', {
      createHTML: (input: string) => {
        // Enforce strict AST-based sanitation
        return sanitizeHtmlString(input);
      },
      createScript: () => {
        // Zero-eval policy: completely blocks dynamic script creation
        throw new SecurityError('[Aether Security] Dynamic script creation is prohibited.');
      },
      createScriptURL: (url: string) => {
        return sanitizeScriptUrl(url);
      }
    });
  }
  
  return aetherPolicy ?? fallbackPassthroughPolicy;
}
```

---

## 4. SSR Hydration Security & Serialization Boundary

A critical vulnerability in SSR applications is **Hydration Script Injection**. When state is serialized to a `<script>` tag for client hydration, user input containing `</script><script>maliciousCode()</script>` can prematurely close the script tag and execute arbitrary JavaScript.

### Aether Serialization Protocol
Aether uses a dedicated **Safe JSON Serializer** for all SSR state transfers (`window.__AETHER_STATE__`):

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
* **Prototype Shielding**: Deserialization explicitly rejects `__proto__`, `constructor`, and `prototype` keys during client state restoration.

---

## 5. Form & CSRF Defense Architecture

Aether's built-in `@aether/forms` and `@aether/http` packages enforce CSRF protection without requiring third-party middleware:

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

The `@aether/http` client enforces enterprise security policies by default:

* **Automatic Header Injections**: Configurable default headers for `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Frame-Options: DENY`.
* **Subresource Integrity (SRI) Support**: Automatic generation and verification of SRI hashes for code-split lazy chunks.
* **Credential Isolation**: Cross-origin requests strip sensitive authorization headers by default unless explicitly configured via an audited `credentials: 'include'` policy.

---

## 7. Comparative Threat Matrix

| Threat Vector | Common Framework Vulnerability | Aether Architectural Countermeasure | Classification |
| :--- | :--- | :--- | :--- |
| **DOM-based XSS via `innerHTML`** | Accidental use of `v-html` or `dangerouslySetInnerHTML` | No direct `innerHTML` access in compiler output; requires `<SafeHtml>` + Trusted Types | **[Category A Defense]** |
| **Script Tag Breakout during SSR** | Raw `JSON.stringify(state)` embedded in HTML template | Mandatory Unicode escaping of `<, >, &, \u2028, \u2029` | **[Category A Defense]** |
| **`javascript:` URL Injection** | `<a href={userUrl}>` executes code if URL is unsanitized | Compiler emits `sanitizeUri()` guard verifying whitelist protocols | **[Category A Defense]** |
| **Prototype Pollution** | Deep merge in state stores polluting `Object.prototype` | Internal storage uses `Object.create(null)` + frozen object descriptors | **[Category A Defense]** |
| **CSP Bypass via `unsafe-eval`** | Runtime template compilation or expression evaluation | 100% AOT compilation; zero `eval()` or `new Function()` in runtime | **[Category A Defense]** |
| **CSRF in Form Actions** | Unprotected POST actions accepting arbitrary cross-origin form submits | Automatic `Sec-Fetch-Site` validation + action HMAC tokens | **[Category A Defense]** |
| **Accessibility Degradation** | Missing ARIA attributes causing screen reader failure | Compile-time A11y linter + auto-derived ARIA bindings in form controls | **[Category E/B Defense]** |
