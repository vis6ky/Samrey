# Development Roadmap & Phased Implementation Plan

**Document**: `docs/ROADMAP.md`  
**Status**: Approved Phasing Baseline  
**Framework**: Gati  

---

## 1. Executive Phasing Strategy

To ensure architectural integrity, stability, and maintainability, Gati follows a strict **Gate-Checked Multi-Phase Implementation Plan**. No subsequent phase begins until the preceding phase passes all automated verification gates, security audits, and performance thresholds.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 0: Specification, Threat Modeling & Architecture (COMPLETED)    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Core Reactivity Engine & Standalone DOM Renderer              │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Compiler Pipeline, AIR Intermediate Representation & Codegen │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 3: Component Model, Runtime Lifecycle & Scoped Cleanup           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4: SSR Streaming Engine, Serialization & Resumable Hydration    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 5: Type-Safe Router, Data Fetching & Standard-Schema Forms      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 6: DevTools Bridge, Profiling & Comprehensive Testing Harness    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 7: Benchmarks, Security Fuzzing & Public Alpha Release           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Explicitly Deferred Features (Non-Goals for Initial Milestones)

To prevent premature optimization, scope creep, and architectural bloat, the following features are **STRICTLY EXCLUDED** from initial implementation:

| Deferred Feature | Reason for Deferral | Recommended Initial Alternative |
| :--- | :--- | :--- |
| **1. Custom Bytecode Virtual Machine** | Excessive complexity and memory overhead; modern JavaScript JIT engines optimize native closures and direct DOM calls significantly better. | Native JS closures with direct `<template>` cloning. |
| **2. Proprietary In-Browser Template Compiler (`eval`)** | Violates Core Tenet #1 (Zero-`eval` Runtime Guarantee) and breaks strict enterprise Content Security Policies (`script-src 'self'`). | 100% Ahead-of-Time (AOT) compilation via `@gati/compiler`. |
| **3. Proprietary CSS-in-JS Runtime** | Runtime style injection degrades CSSOM performance, causes style recalculation thrashing, and increases bundle size. | Standard CSS Modules, Tailwind CSS, and compiled native CSS variables. |
| **4. Core Micro-Frontend Federation Engine** | Introducing Module Federation abstractions inside the core runtime pollutes dependency trees and complicates reactivity scopes. | Standard ECMAScript dynamic imports (`import()`) and standard Web Components wrapper. |
| **5. Proprietary Client-Side Database / ORM** | Bloats client bundle size; framework should remain database-agnostic. | Standard REST / GraphQL / RPC integration via `@gati/http` and route `loader()`. |
| **6. Two-Way Bidirectional Magic Binding** | Creates unpredictable state mutations and debugging loops. | Unidirectional data flow with explicit event-driven mutations and standard schema form bindings. |

---

## 3. Detailed Phase Breakdown

### Phase 1: Core Reactivity Engine & DOM Renderer (`@gati/reactivity`, `@gati/runtime`)
* **Goals**:
  * Implement push-pull Signal graph with versioned clocks and cycle detection.
  * Implement `signal()`, `computed()`, `effect()`, `batch()`, `untrack()`, and `root()`.
  * Build Owner-based automatic memory disposal hierarchy (`onCleanup`).
  * Implement static `<template>` cloning helper (`template()`) and fine-grained DOM hole binders (`bindText`, `bindAttr`, `bindClass`, `on`).
* **Verification Gate**:
  * 100% unit test coverage for reactivity primitives.
  * Zero memory leaks verified via automated heap allocation tests.
  * Pass Diamond Dependency resolution without duplicate evaluations.

---

### Phase 2: Compiler Pipeline & AIR (`@gati/compiler`, `@gati/cli`)
* **Goals**:
  * Implement TSX/JSX parser and AST traversal engine using TypeScript/Babel/OXC.
  * Define and validate the Gati Intermediate Representation (AIR) schema.
  * Implement static HTML hoisting and `<template>` extraction.
  * Implement context-aware security classifier for attributes and text nodes.
  * Create `vite-plugin-aether` for Vite dev server and production builds.
* **Verification Gate**:
  * Compile 50+ diverse test fixtures with bit-for-bit verified code output.
  * Automatic blocking of unsafe `javascript:` URLs and unescaped HTML.

---

### Phase 3: Component Model & Runtime Lifecycle (`@gati/runtime`)
* **Goals**:
  * Implement single-execution component instantiator.
  * Implement `<Show>`, `<For>`, `<Switch>`, and `<Suspense>` core control flow components with DOM comment anchors.
  * Implement Context API (`createContext`, `useContext`) backed by Owner trees.
  * Implement Error Boundaries (`ErrorBoundary`) for reactive error recovery.
* **Verification Gate**:
  * Verify components execute their root function exactly once during state changes.
  * Full reconciliation test suite for dynamic list operations (insert, delete, swap, reverse).

---

### Phase 4: SSR Streaming & Resumable Hydration (`@gati/ssr`, `@gati/security`)
* **Goals**:
  * Implement asynchronous HTML streaming renderer supporting Node.js and Web Streams.
  * Implement Out-of-Order HTML stream chunks using hidden `<template>` swap blocks.
  * Implement safe Unicode JSON state serializer (`window.__AETHER_STATE__`).
  * Implement 200-byte root event delegation listener with event buffering.
* **Verification Gate**:
  * Zero XSS vulnerabilities on hostile string serialization payloads.
  * Verified sub-50ms Time-To-Interactive (TTI) on slow 3G simulation profiles.

---

### Phase 5: Router, Data Fetching & Forms (`@gati/router`, `@gati/http`, `@gati/forms`)
* **Goals**:
  * Implement file-based and code-based route matching with typed parameters.
  * Implement parallel nested route data loaders and automatic link prefetching.
  * Implement `@gati/http` client with resource signals and auto-cancellation.
  * Implement `@gati/forms` with Standard Schema (Zod/Valibot) validation and auto-derived ARIA attributes.
* **Verification Gate**:
  * Seamless client-side navigation with zero layout flickering.
  * Form validation correctly sets `aria-invalid` and handles async server actions.

---

### Phase 6: DevTools, Testing Harness & Ecosystem Tooling (`@gati/devtools`, `@gati/testing`)
* **Goals**:
  * Build browser DevTools extension for real-time signal graph inspection.
  * Implement time-travel state debugging and transaction recording.
  * Release `@gati/testing` headless DOM runner for fast unit and integration tests.
* **Verification Gate**:
  * DevTools connects with <1% runtime CPU overhead in development mode.

---

### Phase 7: Benchmark Suite, Security Fuzzing & Public Alpha
* **Goals**:
  * Submit official implementation to the `js-framework-benchmark` suite.
  * Execute automated continuous security fuzzing against OWASP XSS databases.
  * Release comprehensive documentation, interactive playground, and starter templates.
* **Verification Gate**:
  * Top-tier rankings in DOM manipulation speed and memory consumption.
  * Zero high or critical security audit findings.

---

## 4. Risk Assessment & Mitigation Matrix

| Risk Factor | Probability | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **1. Developer Confusion regarding Single-Execution Model** | High | Medium | Provide immediate compiler diagnostics when local variables are modified outside signals; publish clear visual mental-model guides. |
| **2. TypeScript Compiler Plugin Complexity** | Medium | High | Maintain standard TSX compatibility without requiring non-standard syntax extensions; use standard AST transformations. |
| **3. Memory Leaks in Complex Reactive Graphs** | Medium | High | Enforce strict Owner tree disposal; automated heap snapshot tests in CI for every commit. |
| **4. Edge Runtime Compatibility Differences** | Low | Medium | Standardize `@gati/ssr` and `@gati/http` on standard Web APIs (`Request`, `Response`, `ReadableStream`, `fetch`). |
