# Samrey Framework — Security Audit & Similar-Bug Investigation Report

**Document**: `SIMILAR_FINDINGS_REPORT.md`  
**Framework Version**: Samrey 2.1.0  
**Test Suite Status**: 756 / 756 tests passing (177 test suites)  
**Verification Date**: 2026-11-12  

---

## Executive Summary

This report documents the exhaustive pattern-wide investigation and remediation of the four original security audit findings (`EXT-001` through `EXT-004`), the four follow-up security patterns (`NEW-001` through `NEW-004`), and the subsequent four-batch architectural, runtime, compiler, CLI, SSR/hydration, and documentation hardening pass across all 13 monorepo packages (`packages/*`) and companion documentation/web assets. Every confirmed defect has been remediated, backed by automated regression tests, and verified without Virtual DOM or external runtime dependencies.

---

## 1. Remediation Status of Original Findings

| Finding ID | Title | Package & Location | Status | Summary of Fix |
| :--- | :--- | :--- | :--- | :--- |
| **EXT-001** | SSR Hydration Script ID Unescaped | `packages/ssr/src/serializer.ts` | **REMEDIATED** | Strictly validates `scriptId` against `/^[a-zA-Z0-9_\-:]+$/` (falling back to `__SAMREY_STATE__`) and wraps with `escapeHtmlAttribute()` to eliminate attribute breakouts. |
| **EXT-002** | Trusted Types Template Policy Pass-Through | `packages/security/src/trusted-types.ts` | **REMEDIATED** | Replaced pass-through with `sanitizeTemplateHtml(input)` and `WeakMap` realm isolation with fail-closed policy error handling, eliminating trust-boundary bypasses while preserving interactive UI tags. |
| **EXT-003** | HTML Sanitizer Single-Pass Regex Evasion | `packages/security/src/sanitizer.ts` | **REMEDIATED** | Converted to a multi-pass convergence loop that strips nested tags (`<scr<script>ipt>`), neutralizes SVG/MathML script vectors, strips `on*` event handlers, and sanitizes style attributes. |
| **EXT-004** | Security Model Documentation Inconsistencies | `docs/SECURITY_MODEL.md`, `docs/SECURITY.md` | **REMEDIATED** | Corrected legacy naming, synchronized exported symbol names across `docs/SECURITY.md` and `docs/SECURITY_MODEL.md`, documented CSS `url("")` normalization, delegated event escaping, and same-origin `HttpClient` protections. |

---

## 2. Follow-Up Patterns (`NEW-001` through `NEW-004`) & Batch 1–4 Hardening

### NEW-001: CSS Sanitization Hardening & Bypass Prevention
- **Package**: `@samrey/security` (`packages/security/src/sanitizer.ts`)
- **Severity**: Medium (Defense-in-Depth)
- **Root Cause**: Simple string replacement allowed attackers to evade detection via CSS comments (`exp/*comment*/ression(alert(1))`), CSS backslash escapes (`expr\65ssion(alert(1))`), and obfuscated `url()` schemes.
- **Remediation**: Normalized CSS escapes via `decodeCssEscapes()`, stripped comments prior to keyword checks, rewrote unsafe `url(...)` schemes to `url("")`, and ran multi-pass convergence.
- **Regression Tests**: `packages/security/tests/security.test.ts` (`NEW-001`).

### NEW-002: Comprehensive HTML URL-Bearing Attributes & Compound `srcset`
- **Package**: `@samrey/security` (`packages/security/src/sanitizer.ts`)
- **Severity**: High (Cross-Site Scripting Prevention)
- **Root Cause**: URL attribute checks needed to cover all 15 HTML5/SVG URL-bearing attributes and comma-separated `srcset` candidate lists.
- **Remediation**: Added `sanitizeHtmlUrlAttributes()` and compound `srcset` candidate sanitization preserving valid screen descriptors (`1x`, `2x`, `800w`).
- **Regression Tests**: `packages/security/tests/security.test.ts` (`NEW-002`).

### NEW-003: Intentional URI Policy Distinction (Resources vs. Navigation)
- **Package**: `@samrey/security` (`packages/security/src/sanitizer.ts`)
- **Severity**: Medium (Architectural Clarity & Open Redirect Defense)
- **Root Cause**: Resource URLs (`<img>`, `<video>`) can opt into protocol-relative URLs while navigational redirects must strictly reject protocol-relative vectors (`//evil.com`, `/\evil.com`).
- **Remediation**: Exposed explicit policy controls (`sanitizeUri()` vs. `sanitizeRedirectUri()`) and documented both contracts in `docs/SECURITY.md` and `docs/SECURITY_MODEL.md`.
- **Regression Tests**: `packages/security/tests/security.test.ts` (`NEW-003`).

### NEW-004: Framework Version & API Export Synchronization
- **Package**: Monorepo Root, `@samrey/ai`, Web App Catalog (`README.md`, `packages/ai/src/code-validator.ts`, `src/lib/codeValidator.ts`, `src/data/*`)
- **Severity**: Low (Metadata & Tooling Consistency)
- **Remediation**: Synchronized version `2.1.0` across all 13 packages, aligned `OFFICIAL_PACKAGE_EXPORTS` / `OFFICIAL_SAMREY_EXPORTS` and `src/data/searchIndex.ts` with real `@samrey/*` v2.1.0 APIs, and removed legacy/invalid template anti-patterns from docs and fixtures.
- **Regression Tests**: `tests/version-2.test.ts`.

### Batch 1–4 Architectural & Tooling Remediations
- **Batch 1 — Security & Sandbox Hardening**: Hardened Trusted Types realm isolation (`trusted-types.ts`), sanitizer convergence (`sanitizer.ts`), SSR hydration/event script escaping (`packages/ssr/src/hydration.ts`), CLI dev server path/header protections (`packages/cli/src/commands/dev.ts`), MCP tool/security guards (`packages/mcp-server/src/tools.ts`, `security.ts`), `HttpClient` protections (`packages/http/src/client.ts`), and interactive web playground interpreters (`src/lib/sandboxInterpreter.ts`, `runtimeSandbox.ts`).
- **Batch 2 — Reactivity, Router, HTTP, Forms, Runtime & SSR/Hydration**: Hardened `computed()`/`effect()` (`packages/reactivity`), router navigation (`packages/router`), resource cancellation/state (`packages/http/src/resource.ts`), form/field validation (`packages/forms`), surgical DOM bindings and W3C DOM-compliant `serializeHeadlessTextContent()` excluding comment/PI/doctype nodes (`packages/runtime/src/bindings.ts`, `dom.ts`, `control-flow.ts`, `headless-dom.ts`), and SSR/SSG streaming and hydration (`packages/ssr/src/stream.ts`, `ssg.ts`, `hydration.ts`).
- **Batch 3 — Compiler & CLI Accuracy**: Updated `packages/compiler/src/parser.ts` and `codegen.ts` to expand non-void self-closing HTML tags while preserving void/foreign SVG/MathML tags, avoid prototype pollution via `Object.create(null)`, and perform single-pass lexical `detectRuntimeHelpers()` scanning over `RUNTIME_HELPERS`; hardened `packages/cli/src/audit.ts`, `commands/build.ts`, `commands/audit.ts`, `runner.ts`, and `starter-template.ts` (known DOM handler table, comment/regex skipping, `--ssr`/`--minify`/`--sourcemap` flag forwarding, explicit failure on unsupported `audit --fix`, and valid SSR/SSG starter templates).
- **Batch 4 — Docs, Validators, Package Builds & Gate Verification**: Synchronized docs, AI validators, and web catalog data; rebuilt all 13 `@samrey/*` package `dist/` artifacts and the `@samrey/cli` bundle (`bin/samrey.bundle.js`).

---

## 3. Verification & Test Summary

| Scope | Test Suites | Total Tests | Pass | Fail | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Targeted Runtime & SSR/Hydration (`tests/phase3-ssr-devtools-tooling.test.ts`, `packages/runtime/tests/*.test.ts`, `packages/ssr/tests/*.test.ts`) | 22 suites | 109 tests | 109 | 0 | Verified |
| Monorepo Overall (`npm test`) | 177 suites | 756 tests | **756** | **0** | Verified (~42.3s) |

---

## 4. Conclusion

All original audit findings (`EXT-001` through `EXT-004`), follow-up patterns (`NEW-001` through `NEW-004`), and Batch 1–4 engineering findings have been remediated cleanly with zero Virtual DOM overhead, zero external runtime dependencies, and full monorepo test and benchmark gate validation.

