# Architecture Decision Records (ADRs): Gati Framework

**Document**: `docs/TECHNICAL_DECISIONS.md`  
**Status**: Formal Architectural Standard  
**Framework**: Gati  

---

## Index of Architectural Decisions

* [ADR-001: Fine-Grained Push-Pull Signals vs. Virtual DOM Reconciliation](#adr-001-fine-grained-push-pull-signals-vs-virtual-dom-reconciliation)
* [ADR-002: Static Template Cloning via `<template>` Elements](#adr-002-static-template-cloning-via-template-elements)
* [ADR-003: Zero-`eval` Runtime & Mandatory Trusted Types Enforcement](#adr-003-zero-eval-runtime--mandatory-trusted-types-enforcement)
* [ADR-004: Standard Schema Specification for Built-In Form Validation](#adr-004-standard-schema-specification-for-built-in-form-validation)
* [ADR-005: Out-of-Order HTML Streaming with Resumable Micro-Hydration](#adr-005-out-of-order-html-streaming-with-resumable-micro-hydration)
* [ADR-006: Monorepo Package Topology with Strict Acyclic Dependency Boundaries](#adr-006-monorepo-package-topology-with-strict-acyclic-dependency-boundaries)
* [ADR-007: Explicit Asynchronous Resource Signals over Side-Effect Hooks](#adr-007-explicit-asynchronous-resource-signals-over-side-effect-hooks)
* [ADR-008: Compile-Time A11y and Context-Aware Security Verification](#adr-008-compile-time-a11y-and-context-aware-security-verification)

---

## ADR-001: Fine-Grained Push-Pull Signals vs. Virtual DOM Reconciliation

### Status
**Accepted**

### Context
Frontend frameworks historically rely on either:
1. **Virtual DOM Reconciliation (React, Vue)**: Re-evaluating component functions to generate a new virtual tree, which is diffed against the previous tree.
2. **Fine-Grained Reactive Graphs (Solid, Svelte 5, Angular Signals)**: Establishing direct observer-subscriber links between individual state atoms and DOM nodes.

The VDOM approach incurs continuous memory allocation for virtual nodes, garbage collection pressure, and structural re-render cascades that necessitate complex manual memoization (`useMemo`, `useCallback`, `React.memo`).

### Decision
Gati will utilize a **Fine-Grained Push-Pull Topological Signal Engine**. Component functions will execute **exactly once** during mounting. Signals will directly notify and update targeted DOM text nodes and element properties without diffing any intermediate trees.

### Consequences & Tradeoffs
* **Positive**:
  * Eliminates entire classes of React bugs: no stale closures, no hook rules, no dependency arrays.
  * O(1) direct DOM updates proportional to the number of changed values, not the size of the component tree.
  * Runtime bundle size is reduced by >40 kB because no VDOM diffing engine or fiber tree is bundled.
* **Negative**:
  * Destructuring reactive state (e.g. `const { count } = state`) detaches reactivity unless accessed through getters. The compiler will issue diagnostics to guide developers.

---

## ADR-002: Static Template Cloning via `<template>` Elements

### Status
**Accepted**

### Context
Direct DOM manipulation can be performed by either:
1. Imperative step-by-step element creation (`document.createElement`, `element.appendChild`).
2. Template string cloning (`templateElement.content.cloneNode(true)`).

Browser benchmarks demonstrate that cloning pre-parsed HTML templates via native browser C++ engines is 3x to 5x faster than sequential JS DOM creation calls and uses significantly less JS heap memory.

### Decision
The `@gati/compiler` will extract all static HTML subtrees into module-scoped `<template>` elements and emit `cloneNode(true)` invocations with direct sibling traversal paths (`firstChild`, `nextSibling`) for dynamic slot insertion.

### Consequences & Tradeoffs
* **Positive**: Maximum initial rendering throughput; highly compact compiled output.
* **Negative**: Requires a dedicated compiler step; raw runtime execution without a bundler is not supported.

---

## ADR-003: Zero-`eval` Runtime & Mandatory Trusted Types Enforcement

### Status
**Accepted**

### Context
Legacy template systems frequently use `new Function()` or `eval()` to compile dynamic expressions at runtime in the browser. This violates strict Content Security Policies (`script-src 'self'`) and introduces Cross-Site Scripting (XSS) attack vectors.

### Decision
Gati core packages will **strictly forbid any usage of `eval()`, `new Function()`, or dynamic script tag execution**. All expressions must be compiled Ahead-of-Time. Dynamic HTML rendering will be restricted to an explicit `<SafeHtml>` component backed by a cryptographically sealed W3C Trusted Types policy (`aether#html`).

### Consequences & Tradeoffs
* **Positive**: Full compliance with the highest enterprise security standards; zero risk of template expression injection.
* **Negative**: In-browser dynamic template evaluation without a build step is unsupported by design.

---

## ADR-004: Standard Schema Specification for Built-In Form Validation

### Status
**Accepted**

### Context
Form validation in modern TypeScript ecosystems is fragmented across libraries like Zod, Valibot, ArkType, and Yup. Building a proprietary validation syntax forces developers to learn redundant APIs and write custom validation bridges.

### Decision
Gati's `@gati/forms` package will natively implement the **Standard Schema Specification** (`~standard`). Any schema from Zod v3.24+, Valibot v1+, or ArkType will work out-of-the-box with full TypeScript inference, automatic `aria-invalid` bindings, and asynchronous server-side action validation.

### Consequences & Tradeoffs
* **Positive**: Zero vendor lock-in; interoperable with existing enterprise schema libraries; zero runtime validation bundle penalty if using lightweight libraries like Valibot.

---

## ADR-005: Out-of-Order HTML Streaming with Resumable Micro-Hydration

### Status
**Accepted**

### Context
Traditional SSR hydration requires the browser to download the entire JavaScript bundle, re-execute the entire component hierarchy, and build an in-memory representation before attaching event listeners. This results in the "Uncanny Valley"—the page looks loaded but is unresponsive to user clicks.

### Decision
Gati will implement **Out-of-Order Streaming SSR** combined with **Resumable Micro-Hydration**. Event listeners will be delegated to a lightweight root listener (200 bytes) immediately upon HTML parsing. Components will resume state from serialized Unicode JSON payloads without re-executing component initialization logic.

### Consequences & Tradeoffs
* **Positive**: Near-zero Time-to-Interactive (TTI); user interactions during loading are buffered and replayed with zero dropped clicks.
* **Negative**: Server environment must support streaming responses (Node.js Streams, Web Streams, or Edge runtimes).

---

## ADR-006: Monorepo Package Topology with Strict Acyclic Dependency Boundaries

### Status
**Accepted**

### Context
Monolithic frontend frameworks lead to bloated client bundles when developers only need specific sub-features. Poorly defined package boundaries cause circular dependencies and hinder tree-shaking.

### Decision
Gati will be structured as a monorepo with 12 distinct packages adhering to a strict Direct Acyclic Graph (DAG). Foundational packages (`@gati/reactivity`, `@gati/security`) will have zero internal dependencies.

---

## ADR-007: Explicit Asynchronous Resource Signals over Side-Effect Hooks

### Status
**Accepted**

### Context
React's `useEffect` pattern for data fetching is notorious for race conditions, waterfall requests, missing cleanup handlers, and unhandled promise rejections.

### Decision
Gati will provide first-class `createResource(fetcher)` and route-level `loader()` primitives. These create managed, reactive state containers with built-in status flags (`idle`, `pending`, `success`, `error`), automatic request deduplication, and built-in `AbortController` lifecycle cleanup.

---

## ADR-008: Compile-Time A11y and Context-Aware Security Verification

### Status
**Accepted**

### Context
Accessibility and security vulnerabilities are often caught late in QA or production audits rather than during development.

### Decision
The `@gati/compiler` will enforce WAI-ARIA and security linting directly during compilation. Missing `alt` tags, invalid ARIA role combinations, unsafe URL protocols in `href`, and unescaped HTML injections will trigger compile-time warnings and errors.
