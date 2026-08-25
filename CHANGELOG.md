# Changelog

All notable changes to the Samrey Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-24

### General Availability Release
- Official v1.0.0 GA release across all 11 monorepo packages.
- Zero external frontend UI runtime dependencies ("Samrey Must Use Samrey").
- 100% frozen and verified Public API contract across all packages (`@samrey/reactivity`, `@samrey/runtime`, `@samrey/security`, `@samrey/compiler`, `@samrey/router`, `@samrey/http`, `@samrey/forms`, `@samrey/ssr`, `@samrey/testing`, `@samrey/devtools`, `@samrey/cli`).
- Hardened package manifests with `publishConfig.access = "public"` and Apache-2.0 license uniformity.
- Clean-room consumer validation passing with isolated tarball installation.
- 4 official starter templates (`minimal`, `spa`, `ssr`, `ssg`) verified and integrated into CLI.
- All 236 monorepo tests passing with 0 failures and zero TypeScript compilation errors.

## [1.0.0-rc.1] - 2026-08-20

### Added
- **Fine-Grained Reactivity Engine (`@samrey/reactivity`)**: Push-pull topological reactive signals (`signal()`, `computed()`, `effect()`, `batch()`, `createOwner()`, `runWithOwner()`, `onCleanup()`, `createStore()`). Zero virtual DOM overhead.
- **Surgical Runtime & Control Flow (`@samrey/runtime`)**: Static `<template>` cloning, fine-grained hole path bindings (`bindText`, `bindAttribute`, `bindProperty`, `bindEvent`), and reactive control flow primitives (`<Show>`, `<For>` keyed diffing with Longest Increasing Subsequence reconciliation).
- **Ahead-of-Time Compiler (`@samrey/compiler`)**: Complete JSX/TSX AST parser, Samrey Intermediate Representation (AIR) lowering, template string extraction, static hoisting, A11y accessibility linter, and static XSS taint analysis.
- **Client & Server Router (`@samrey/router`)**: Parameterized route matching (`createRouter()`, `matchRoute()`, `<Link>`), async loader pipeline, error boundaries, and SSR request integration.
- **Reactive Data Fetching (`@samrey/http`)**: Fine-grained `createResource()` integration, automatic request deduplication, cache tag invalidation (`invalidateCacheTags()`), and isomorphic fetch client.
- **Standard Schema Form Management (`@samrey/forms`)**: Type-safe form validation integrating with Zod, Valibot, and ArkType via Standard Schema specification (`createForm()`, `createField()`), automated ARIA validation attributes, and reactive dirty/touched state tracking.
- **Contextual Security Core (`@samrey/security`)**: Built-in sanitization (`sanitizeUri()`, `sanitizeHtmlString()`, `escapeHtmlAttribute()`, `escapeHtmlText()`, `escapeForScriptPayload()`), W3C Trusted Types policy management, anti-CSRF token verification, and prototype pollution protection (`scrubPrototypePollution()`).
- **Isomorphic Server-Side Rendering (`@samrey/ssr`)**: Streaming HTML renderer via WHATWG `ReadableStream` (`renderToStream()`, `renderToString()`), Unicode-safe JSON hydration serializer, automated Secret Guard to strip credentials from client payloads, and Static Site Generation (`generateStaticSite()`).
- **Resumable Hydration & Event Replay (`@samrey/ssr`)**: Lightweight (<350 byte) inline event capture script, seamless event replay buffer, and surgical DOM hole re-attachment without hydration blowouts.
- **Deterministic Testing Harness (`@samrey/testing`)**: DOM test container harness (`renderTest()`), event dispatchers (`fireEvent()`), and reactive graph flush helpers (`flushReactivity()`).
- **Developer Tools Bridge (`@samrey/devtools`)**: Zero-overhead in production devtools inspection bridge, reactive graph visualizer hooks, performance profiler, and sanitization audit feeds.
- **CLI & Tooling (`@samrey/cli`)**: Production-ready command line interface (`samrey create`, `samrey dev`, `samrey build`, `samrey test`, `samrey audit`, `samrey analyze`, `samrey generate`) with standalone single-file binary execution.

### Security
- Zero use of `eval()` or `new Function()` anywhere across the monorepo.
- Built-in CSP compatibility and W3C Trusted Types default policy.
- Automated secret stripping prevents database connection strings, JWT tokens, and private API keys from leaking to client HTML state scripts.
