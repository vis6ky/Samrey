# Samrey Framework — Phase 11 Security Threat Model, Penetration Testing & Hardening Audit

## Executive Summary

Phase 11 establishes a comprehensive threat model, adversarial penetration testing framework, fuzzing suite, and security hardening layer across the entire Samrey monorepo (`@samrey/security`, `@samrey/compiler`, `@samrey/runtime`, `@samrey/reactivity`, `@samrey/router`, `@samrey/ssr`, `@samrey/forms`, `@samrey/http`, `@samrey/devtools`, and `@samrey/cli`).

> **Security Posture & Non-Claim Notice**:  
> In accordance with security engineering best practices, **Samrey does not claim to be "100% secure" or invulnerable**. No software system can guarantee total immunity against all present and future exploits. The goal of Phase 11 is discovering vulnerabilities, implementing rigorous defense-in-depth mitigations, fuzzing critical subsystems, and hardening attack surfaces against common and advanced web exploit primitives.

---

## 1. Threat Model & Architecture

Samrey processes untrusted data across multiple distinct lifecycle stages:
1. **Compilation Time**: Parsing untrusted developer templates or dynamic JSX-like templates into Abstract Interface Representation (AIR) and JavaScript code.
2. **SSR / Server Serialization**: Rendering component trees into static HTML and serializing reactive state dictionaries into hydration script tags.
3. **Client-Side Hydration**: Reconnecting client reactivity graphs to server-rendered DOM nodes and replaying queued user interaction events.
4. **Runtime DOM Mutation & Signal Binding**: Dynamically binding reactive signals and stores to HTML element properties, attributes, text nodes, and event handlers.
5. **Client-Side Routing**: Parsing arbitrary URL paths, query strings, and dynamic parameter segments into router state.
6. **HTTP Networking & Form Lifecycle**: Handling user input, standard schema validation, and asynchronous remote requests.
7. **Developer Tooling & CLI**: Processing postMessage payloads from browser extension devtools and file system scaffolding inputs.

---

## 2. Attack Surface Analysis & Hardened Mitigations

| Attack Vector | Threat Surface | Identified Risk | Implemented Defense & Mitigation | Status |
| :--- | :--- | :--- | :--- | :--- |
| **XSS & HTML Injection** | Compiler, Static Hoisting, Runtime Bindings | Malicious HTML or script injection via dynamic interpolations or folded constants | Context-aware HTML escaping (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`) and static AST sanitization | **Hardened & Tested** |
| **DOM XSS & URI Injection** | `href`, `src`, `action`, `formaction`, `xlink:href` | Obfuscated `javascript:`, `vbscript:`, or `data:` URLs executed on navigation/click | Multi-stage URI sanitizer decoding hex/decimal/named HTML entities and percent-encodings | **Hardened & Tested** |
| **Attribute Injection / Breakout** | Compile-time constant folding, dynamic `bindAttr` | Breaking out of attribute quotes (`" onfocus="alert(1)`) or binding dangerous properties (`innerHTML`, `srcdoc`, `onclick`) | Unescaped string parsing in analyzer + Runtime attribute blocker refusing dangerous property names | **Hardened & Tested** |
| **CSS Style Injection** | Dynamic `style` attribute binding | CSS expressions, `javascript:` in `url()`, or `@import` payloads executing scripts | CSS sanitizer regex stripping `expression()`, `url(javascript:)`, `@import`, and `-moz-binding` | **Hardened & Tested** |
| **SSR Script Breakout** | `<script id="__SAMREY_STATE__">` | Payloads containing `</script>` or Unicode line separators (`\u2028`, `\u2029`) breaking script tags | Strict JSON string escaping turning `</script>` into `\u003C/script\u003E` | **Hardened & Tested** |
| **Secret / Credential Leakage** | SSR Hydration State serialization | Accidental transmission of database URLs, private API keys, password hashes, or JWTs to client | Automatic deep scrubbing of sensitive keys (`*token*`, `*key*`, `*password*`, `*secret*`, `*database_url*`) with strict validation mode | **Hardened & Tested** |
| **DOM Clobbering** | Hydration state deserialization | Shadowing state script element via `<form name="__SAMREY_STATE__">` or `<input name="__SAMREY_STATE__">` | Deserializer verifies `nodeName === 'SCRIPT'` before reading `textContent` | **Hardened & Tested** |
| **Open Redirects** | Router `navigate()` | Redirecting users to external malicious domains via `//evil.com` or `https://attacker.com` | `sanitizeRedirectUri` enforcing relative-only same-origin navigation paths | **Hardened & Tested** |
| **Malformed Route DoS** | Router path parser | Crashing the client application via malformed percent-encoded sequences (e.g., `/%E0%A4%A`) | `safeDecodeURIComponent` catching URIError and falling back cleanly to raw string | **Hardened & Tested** |
| **Prototype Pollution** | Form initial values, Router params, SSR JSON, Reactive stores | Mutating `Object.prototype` via `__proto__`, `constructor`, or `prototype` keys | Key filtering and `scrubPrototypePollution` across all deserializers and object setters | **Hardened & Tested** |
| **CSRF Attacks** | Form submissions and API mutations | Forged cross-origin requests executing unauthorized actions | Cryptographic high-entropy token generation (`crypto.randomBytes`) and constant-time equality verification | **Hardened & Tested** |
| **CLI Path Traversal** | `samrey create <name>`, `samrey generate` | Path traversal attacks (`../../etc/passwd`) escaping project root | Path sanitization rejecting `..`, `\`, `/`, and null bytes in project and artifact names | **Hardened & Tested** |
| **DevTools Message Hijacking** | `window.postMessage` bridge | Malicious origins eavesdropping on reactive state or sending forged debug messages | Origin whitelisting (`ALLOWED_ORIGINS`) and secret redaction before emitting telemetry | **Hardened & Tested** |
| **Insecure HTTP Schemes** | `HttpClient` | Exploiting non-HTTP protocols (e.g., `file:`, `gopher:`, `ftp:`) | Protocol gating restricting requests strictly to `http:`, `https:`, or relative paths | **Hardened & Tested** |

---

## 3. Penetration Testing & Fuzzing Verification

Two dedicated adversarial test suites have been added to `@samrey/security`:

### 1. Adversarial Penetration Suite (`adversarial-penetration.test.ts`)
Executes targeted exploit payloads for all 9 primary vulnerability categories:
- Constant-folding quote breakouts and text HTML injection
- Dynamic attribute and URI injection
- Router open redirects and malformed URI crashes
- SSR state script tag breakouts and automatic credential redaction
- Hydration DOM clobbering defense
- DevTools origin gating and token scrubbing
- CLI directory traversal protection
- CSRF timing-safe token verification
- Form prototype pollution resistance

### 2. Comprehensive Security Fuzzing Suite (`fuzzing.test.ts`)
Stress-tests core framework subsystems against randomized, malformed, and combinatorial inputs:
- **Compiler / Parser Fuzzing**: 1,000+ randomized malformed templates, deeply nested elements (depth > 200), and truncated control flow tags.
- **URI Sanitizer Fuzzing**: Complex obfuscation vectors, mixed entity encodings, whitespace insertions, and null bytes.
- **SSR Serializer & JSON Fuzzing**: Deeply nested trees, circular references, and prototype pollution dictionaries.
- **Router Parameter Fuzzing**: Combinatorial malformed percent-encodings and reserved parameter keys.

---

## 4. Test Suite Execution Summary

```text
TAP version 13
# tests 122
# suites 37
# pass 122
# fail 0
# cancelled 0
# skipped 0
# duration_ms 5145ms
```

All 122 unit, integration, adversarial, fuzzing, and end-to-end tests pass cleanly across all workspace packages.

---

## 5. Residual Risk & Ongoing Recommendations

1. **Third-Party Dependencies**: Continuous auditing via `npm audit` and lockfile pinning to prevent supply chain injection.
2. **CSP (Content Security Policy)**: Production applications are advised to enforce strict Content Security Policy headers (including `require-trusted-types-for 'script'` and `object-src 'none'`).
3. **User-Supplied Raw HTML**: Applications that genuinely require unescaped rich HTML should use DOMPurify in conjunction with Samrey's Trusted Types policy.
