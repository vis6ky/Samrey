# Samrey Framework — Security Audit & Similar-Bug Investigation Report

**Document**: `SIMILAR_FINDINGS_REPORT.md`  
**Framework Version**: Samrey 2.1.0  
**Test Suite Status**: 696 / 696 tests passing (175 test suites)  
**Verification Date**: 2026-11-10  

---

## Executive Summary

This report documents the exhaustive pattern-wide investigation and remediation of the four original security audit findings (`EXT-001` through `EXT-004`) along with four newly discovered security-sensitive patterns (`NEW-001` through `NEW-004`). Every confirmed defect has been eliminated, hardened against bypasses, backed by automated regression tests, and verified across all 11 monorepo packages.

---

## 1. Remediation Status of Original Findings

| Finding ID | Title | Package & Location | Status | Summary of Fix |
| :--- | :--- | :--- | :--- | :--- |
| **EXT-001** | SSR Hydration Script ID Unescaped | `packages/ssr/src/serializer.ts:48-54` | **REMEDIATED** | Strictly validates `scriptId` against `/^[a-zA-Z0-9_\-:]+$/` (falling back to `__SAMREY_STATE__`) and wraps with `escapeHtmlAttribute()` to eliminate attribute breakouts. |
| **EXT-002** | Trusted Types Template Policy Pass-Through | `packages/security/src/trusted-types.ts:114-135` | **REMEDIATED** | Replaced pass-through `(input) => input` with `sanitizeTemplateHtml(input)`. Eliminates trust-boundary bypasses while preserving interactive UI tags (`<button ref="...">`, `<input>`, `<form>`, `<textarea>`, `<svg>`). |
| **EXT-003** | HTML Sanitizer Single-Pass Regex Evasion | `packages/security/src/sanitizer.ts:478-560` | **REMEDIATED** | Converted to a multi-pass convergence loop (up to 5 passes) that strips nested tags (`<scr<script>ipt>`), neutralizes SVG/MathML script vectors, strips all `on*` event handlers, and sanitizes style attributes. |
| **EXT-004** | Security Model Documentation Inconsistencies | `docs/SECURITY_MODEL.md` | **REMEDIATED** | Corrected legacy naming (`aetherPolicy` -> `samreyPolicy`), documented the dual-policy Trusted Types architecture, added URI policy rationale (`sanitizeUri` vs `sanitizeRedirectUri`), and documented multi-pass CSS/HTML sanitization. |

---

## 2. New Findings & Pattern-Wide Remediations

### NEW-001: CSS Sanitization Hardening & Bypass Prevention
- **Package**: `@samrey/security` (`packages/security/src/sanitizer.ts:153-207`)
- **Severity**: Medium (Defense-in-Depth)
- **Root Cause**: The previous CSS sanitizer relied on simple string replacement for known patterns. Attackers could evade detection using:
  1. CSS comments splitting keywords (e.g. `exp/*comment*/ression(alert(1))`).
  2. CSS backslash escape sequences (e.g. `expr\65ssion(alert(1))` where `\65` represents `e`).
  3. Obfuscated `url()` declarations (e.g. `url("jav\61script:alert(1)")`).
- **Remediation**:
  - Implemented `decodeCssEscapes()` to normalize CSS hex and character escape sequences prior to token analysis.
  - Added comment stripping (`/\/\*[\s\S]*?\*\//g`) before checking for prohibited keywords.
  - Normalized all `url(...)` declarations, rewriting `javascript:`, `vbscript:`, and non-whitelisted `data:` URIs to `url("")`.
  - Implemented multi-pass loop (up to 5 iterations) to ensure nested constructs stabilize.
- **Regression Tests**: `packages/security/tests/security.test.ts` ("NEW-001: sanitizes CSS styles with comments, backslash escapes, and url() schemes").

---

### NEW-002: Comprehensive HTML URL-Bearing Attributes & Compound `srcset`
- **Package**: `@samrey/security` (`packages/security/src/sanitizer.ts:475-535`)
- **Severity**: High (Cross-Site Scripting Prevention)
- **Root Cause**: The HTML sanitizer previously only inspected `href`, `src`, and `action`. Attackers could inject executable `javascript:` URIs via other standard HTML5/SVG URL attributes (`poster`, `formaction`, `data`, `cite`, `ping`, `xlink:href`, `codebase`, `background`, `longdesc`, `profile`, `usemap`, `xml:base`) or within comma-separated `srcset` candidate lists.
- **Remediation**:
  - Introduced `sanitizeHtmlUrlAttributes()` covering all 15 HTML5/SVG URL-bearing attributes.
  - Implemented compound `srcset` list parser that splits comma-separated candidates, validates each URL independently against `javascript:`/`vbscript:`/unsafe `data:`, rewrites malicious entries to `about:blank`, and preserves screen descriptors (`1x`, `2x`, `800w`).
- **Regression Tests**: `packages/security/tests/security.test.ts` ("NEW-002: sanitizes comprehensive URL-bearing attributes and compound srcset lists").

---

### NEW-003: Intentional URI Policy Distinction (Resources vs. Navigation)
- **Package**: `@samrey/security` (`packages/security/src/sanitizer.ts:20-95`)
- **Severity**: Medium (Architectural Clarity & Open Redirect Defense)
- **Root Cause**: `sanitizeUri()` permitted protocol-relative URLs (`//cdn.example.com/asset.png`), whereas `sanitizeRedirectUri()` strictly rejected them (`/` fallback). Without explicit documentation and policy options, developers could confuse resource-loading sanitization with navigational redirect validation.
- **Remediation**:
  - Added `SanitizeUriOptions { allowProtocolRelative?: boolean }` to `sanitizeUri()`.
  - Documented the architectural separation in JSDoc and `docs/SECURITY_MODEL.md`:
    - `sanitizeUri`: Designed for HTML asset/resource elements (`<img>`, `<video>`, `<audio>`, `<link>`), allowing protocol inheritance from the host page.
    - `sanitizeRedirectUri`: Designed for routing and HTTP redirection, strictly disallowing protocol-relative URLs (`//evil.com`, `/\evil.com`, `\\\\evil.com`) to eliminate Open Redirect attacks.
- **Regression Tests**: `packages/security/tests/security.test.ts` ("NEW-003: enforces documented URI policy distinction between resources and redirects").

---

### NEW-004: Framework Version Consistency
- **Package**: Monorepo Root (`README.md:81-94`)
- **Severity**: Low (Metadata Consistency)
- **Root Cause**: While all package manifests (`packages/*/package.json`) and the root `package.json` had been updated to version `2.1.0` following the Template References release, the Framework Packages table in `README.md` still listed `2.0.0`.
- **Remediation**:
  - Updated `README.md` lines 81–94 to consistently specify version `2.1.0` across all 11 packages.
  - Verified synchronization against `tests/version-2.test.ts` and `npm run check:lockfile`.

---

## 3. Verification & Test Summary

| Package | Test Suites | Total Tests | Pass | Fail | Execution Time |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `@samrey/security` | 4 suites | 30 tests | 30 | 0 | ~5ms |
| `@samrey/ssr` | 3 suites | 22 tests | 22 | 0 | ~4ms |
| `@samrey/runtime` | 14 suites | 45 tests | 45 | 0 | ~9ms |
| `@samrey/compiler` | 12 suites | 38 tests | 38 | 0 | ~8ms |
| Monorepo Overall | 175 suites | 696 tests | **696** | **0** | ~44s |

---

## 4. Conclusion

All four original findings (`EXT-001`, `EXT-002`, `EXT-003`, `EXT-004`) and all four newly identified findings (`NEW-001`, `NEW-002`, `NEW-003`, `NEW-004`) have been fully remediated with zero architectural compromise, zero virtual DOM, zero external runtime dependencies, and 100% test suite passage.

