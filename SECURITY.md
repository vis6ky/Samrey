# Security Policy — Samrey Framework

The Samrey project takes the security and integrity of applications built on top of our framework extremely seriously.

---

## 🔒 Supported Versions

| Version | Supported | Security Fix Status |
| :--- | :--- | :--- |
| `1.0.0-rc.1` | Yes | Active Support (Current RC) |
| `< 1.0.0` | No | Experimental Pre-releases |

---

## 🛡️ Core Security Architecture

Samrey is architecturally hardened against common web attack vectors by design:

1. **Zero Dynamic Code Execution**:
   - The framework source code contains zero instances of `eval()`, `new Function()`, or dynamic code generators.
   - Fully compatible with strict `script-src 'self'` Content Security Policies without requiring `'unsafe-eval'`.

2. **Built-in Sanitization & W3C Trusted Types**:
   - The `@samrey/security` package enforces URI protocol validation (blocking `javascript:`, `vbscript:`, and malicious data URIs).
   - HTML attributes and text nodes are contextually escaped at compile-time and runtime.
   - Seamless integration with the browser's Trusted Types policy API.

3. **SSR Secret Stripping (Secret Guard)**:
   - The `@samrey/ssr` state serialization engine automatically scans state objects before embedding them in HTML payloads.
   - Sensitive property names (e.g. `password`, `apiKey`, `jwtToken`, `databaseUrl`, `secret`) are automatically redacted from client hydration scripts.

4. **Prototype Pollution Protection**:
   - Object hydration utilities recursively strip `__proto__`, `constructor`, and `prototype` keys from unverified server/client payloads.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability within Samrey:

1. **Do NOT disclose the issue publicly** in GitHub issues, forums, or social media.
2. Please submit a confidential security advisory through GitHub Security Advisories or email the core security team at `security@samrey.dev`.
3. Include the following details:
   - Type of vulnerability (e.g., XSS, SSR state leak, CSRF bypass, prototype pollution)
   - Step-by-step reproduction steps or minimal proof of concept
   - Impact assessment and affected packages/versions
4. The security response team will acknowledge receipt within 24 hours and provide a timeline for patch release.
