# Architectural Specification: Gati Frontend Framework

**Document**: `docs/ARCHITECTURE.md`  
**Version**: 1.0.0-Draft  
**Author**: Lead Framework Architect  
**Classification**: Core Engineering Blueprint  

---

## 1. Executive Summary & Design Philosophy

**Gati** is a high-performance, TypeScript-native frontend framework designed to provide **fine-grained reactivity**, **zero Virtual DOM overhead**, **compiler-first optimization**, and **security-by-default**.

### Core Tenets
1. **Components Execute Once**: Component functions run exactly once to build the reactive graph. They never re-execute on state changes.
2. **Static Template Cloning**: UI templates compile into native `<template>` DOM fragments. Cloned nodes are updated directly via fine-grained signal subscriptions with zero tree diffing.
3. **Glitch-Free Reactive Graph**: Signals propagate via a topological push-pull algorithm ensuring zero redundant computations and zero observable intermediate glitch states.
4. **Resumable SSR Hydration**: Server-rendered HTML carries serialized state and lightweight event delegation metadata, allowing the client to resume reactivity without re-executing component initialization logic.
5. **Integrated Standard Primitives**: Built-in, fully typed solutions for Routing, Data Fetching, Schema-Driven Forms, Security, and DevTools.

---

## 2. Monorepo Topology & Package Architecture

Gati is organized as an acyclic, modular monorepo containing 12 cohesive packages:

```
packages/
├── compiler/     # AOT Parser, IR Generator, Optimizer & Code Generator
├── runtime/      # Component Lifecycle, Template Cloning, DOM Hydrator & Mount Engine
├── reactivity/   # Signal Graph: Signal, Computed, Effect, Batch, Scope, Owner
├── router/       # Type-Safe File & Code Router, Layouts, Streaming Loaders & Guards
├── http/         # Type-Safe HTTP Client, Resource Caching, Retry & Abort Controller
├── forms/        # Standard-Schema Form Engine (Zod/Valibot/ArkType) + Auto-ARIA
├── ssr/          # Streaming HTML Generator, Out-of-Order HTML Swaps & Serializer
├── security/     # Trusted Types, Contextual Sanitizer, CSRF Tokens & CSP Nonces
├── testing/      # Headless Reactive Test Harness, Mock Renderer & DOM Assertions
├── cli/          # Zero-config bundler plugins (Vite/Rollup/esbuild), Scaffolder & Typegen
└── devtools/     # Reactive Graph Visualizer, State Inspector & Time-Travel Bridge
```

### Strict Package Dependency Graph (DAG)

```
                            ┌────────────────┐
                            │    @gati/cli │
                            └───────┬────────┘
                                    │ (build time)
                                    ▼
                          ┌──────────────────┐
                          │ @gati/compiler │
                          └─────────┬────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    │                                                               │
    ▼                                                               ▼
┌──────────────────┐                                      ┌──────────────────┐
│  @gati/router  │                                      │   @gati/ssr    │
└────────┬─────────┘                                      └────────┬─────────┘
         │                                                         │
         ▼                                                         ▼
┌──────────────────┐      ┌──────────────────┐            ┌──────────────────┐
│  @gati/forms   │─────>│   @gati/http   │            │ @gati/security │
└────────┬─────────┘      └────────┬─────────┘            └────────┬─────────┘
         │                         │                               │
         └─────────────┬───────────┴───────────────────────────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │   @gati/runtime   │
            └──────────┬──────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │ @gati/reactivity  │
            └─────────────────────┘
```

*Note: `@gati/reactivity` and `@gati/security` are zero-dependency foundational packages at the base of the runtime hierarchy.*

---

## 3. Detailed Subsystem Specifications

### 3.1 Compiler Architecture & Pipeline

The Gati compiler (`@gati/compiler`) transforms TypeScript JSX / template source code into direct imperative DOM instructions and reactive signal subscriptions.

```
[TypeScript / TSX Source]
          │
          ▼
   1. TypeScript Lexer & Parser (SWC / OXC Rust Core or TypeScript AST)
          │
          ▼
   2. Semantic & Context Analyzer
      - Identify static vs. dynamic nodes
      - Extract signal dependencies
      - Classify security contexts (HTML, Attr, URI, CSS)
      - Lint A11y attributes at compile-time
          │
          ▼
   3. Gati Intermediate Representation (AIR)
      - Structure representation with indexed dynamic slots
          │
          ▼
   4. Optimizer & Hoister
      - Hoist static HTML strings to module-level `<template>` elements
      - Coalesce contiguous text updates
          │
          ▼
   5. Code Generator
      - Emit `_template("<div><span>...</span></div>")`
      - Emit surgical path traversal (`root.firstChild.nextSibling`)
      - Emit `_bindText()`, `_bindAttr()`, `_on()` subscriptions
```

---

### 3.2 Gati Intermediate Representation (AIR) Specification

The AIR represents the structured layout of a component, separating immutable DOM subtrees from dynamic reactive attachment points.

```typescript
export interface AIRComponent {
  kind: 'Component';
  name: string;
  propsInterface: string;
  templateStrings: string[]; // Static HTML fragments
  dynamicSlots: AIRDynamicSlot[];
  effects: AIREffectBinding[];
  eventListeners: AIREventListener[];
}

export type AIRDynamicSlot = 
  | { type: 'text'; path: number[]; expression: string; context: 'textContent' }
  | { type: 'attribute'; path: number[]; name: string; expression: string; context: SecurityContext }
  | { type: 'property'; path: number[]; name: string; expression: string }
  | { type: 'component'; path: number[]; componentRef: string; props: Record<string, string> }
  | { type: 'conditional'; path: number[]; condition: string; consequent: AIRComponent; alternate?: AIRComponent }
  | { type: 'list'; path: number[]; collection: string; key: string; itemTemplate: AIRComponent };

export type SecurityContext = 'safe-attr' | 'uri-attr' | 'css-prop' | 'trusted-html' | 'event-handler';
```

---

### 3.3 Template Syntax & Component Model

Gati components are written in standard TypeScript JSX (TSX). Unlike React, the function executes **only once** when mounted.

```tsx
import { signal, computed, onCleanup } from '@gati/reactivity';

interface CounterProps {
  initialCount?: number;
  step?: number;
}

export function Counter(props: CounterProps) {
  // 1. Reactive state definitions (executed ONCE)
  const count = signal(props.initialCount ?? 0);
  const step = props.step ?? 1;
  const doubleCount = computed(() => count.value * 2);

  // 2. Lifecycle hooks
  const timer = setInterval(() => {
    // fine-grained mutation
    count.value += step;
  }, 1000);
  
  onCleanup(() => clearInterval(timer));

  // 3. Template return (returns live DOM Node, NOT a virtual node)
  return (
    <div class="counter-card" id="counter-widget">
      <h3>Counter: {count.value}</h3>
      <p>Double: {doubleCount.value}</p>
      <button 
        type="button" 
        onClick={() => count.value++}
        aria-label="Increment Counter"
      >
        Increment (+{step})
      </button>
    </div>
  );
}
```

#### Compiled Output (Generated Code)
```javascript
import { template as _template, bindText as _bindText, on as _on } from '@gati/runtime';

const _tmpl$ = _template(`<div class="counter-card" id="counter-widget"><h3>Counter: </h3><p>Double: </p><button type="button" aria-label="Increment Counter">Increment</button></div>`);

export function Counter(props) {
  const count = signal(props.initialCount ?? 0);
  const doubleCount = computed(() => count.value * 2);

  const _el$ = _tmpl$(); // Clones template once via cloneNode(true)
  const _h3 = _el$.firstChild;
  const _p = _h3.nextSibling;
  const _btn = _p.nextSibling;

  _bindText(_h3, () => count.value);
  _bindText(_p, () => doubleCount.value);
  _on(_btn, 'click', () => count.value++);

  return _el$;
}
```

---

### 3.4 Reactive Engine (`@gati/reactivity`)

Gati's reactivity engine implements a **Push-Pull Graph** with **Topological Ordering** and **Automatic Batching**:

```
        ┌─────────────┐
        │   Signal    │ (State Producer)
        └──────┬──────┘
               │ Dynamic Dependency Subscription (Get)
               ▼
        ┌─────────────┐
        │  Computed   │ (Derived Value)
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │   Effect    │ (DOM Mutation / Side Effect)
        └─────────────┘
```

1. **Topological Clock Versioning**: Each state mutation increments a global transaction clock. Dependent computations verify their dependency version numbers before re-evaluating, preventing redundant computations (Diamond Problem).
2. **Glitch-Free Guarantee**: Computations are queued and evaluated in strictly topological depth order. No computation ever reads an inconsistent or partially updated state.
3. **Owner Disposal Tree**: Every signal, computed, and effect belongs to a hierarchical `Owner` scope. When a component or conditional branch unmounts, the entire reactive sub-graph is pruned in $O(1)$ time without memory leaks.

---

### 3.5 DOM Renderer (`@gati/runtime`)

* **Template Pooling**: Static HTML is stored in `<template>` tags parsed natively by browser C++ engines once, then instantiated via `template.content.cloneNode(true)`.
* **Zero-Reconciliation Static Anchors**: Conditional branches (`<Show>`) and dynamic lists (`<For>`) use lightweight DOM `Comment` nodes as surgical anchors.
* **Direct Property Access**: Text and attributes are updated directly on DOM elements without synthetic event wrappers or intermediate vnode allocations.

---

### 3.6 Router Architecture (`@gati/router`)

Gati includes a first-class, type-safe router:

* **File-Based & Code-Based Routes**: Seamless support for both directory-driven route trees and declarative JSX route definitions.
* **Parallel & Nested Layouts**: Layouts persist state and do not re-render when child sub-routes change.
* **Streaming Data Loaders**: Each route defines an async `loader()` function executed in parallel with code bundle downloading.
* **Automatic Prefetching**: Route chunks and loader data are prefetched when links enter the viewport or on mouse hover.
* **Built-in View Transitions**: Native integration with the browser's Document View Transitions API.

---

### 3.7 HTTP & Data Architecture (`@gati/http`)

* **Resource Signals**: `createResource(fetcher)` creates a reactive signal that tracks `{ data, loading, error, mutate, refetch }`.
* **Deduplication & Cache Invalidation**: Concurrent identical requests are merged into a single network flight. Tag-based cache invalidation integrates with router actions.
* **Automatic AbortController Wiring**: When a component unmounts or a dependency changes, in-flight HTTP requests are automatically cancelled.

---

### 3.8 Form Architecture (`@gati/forms`)

* **Standard Schema Compliance**: Natively supports any validation schema implementing the Standard Schema specification (Zod, Valibot, ArkType) with zero adapters.
* **Compile-Time A11y Auto-Wiring**: Automatically sets `aria-invalid`, `aria-describedby` (pointing to error message IDs), and `aria-required`.
* **Progressive Enhancement**: Form actions compile to standard HTTP `POST` targets that work with JavaScript disabled, upgrading to seamless SPA micro-submissions when JavaScript loads.

---

### 3.9 SSR & Resumable Hydration Architecture (`@gati/ssr`)

```
[Server Request] ──> [Run Loaders in Parallel] ──> [Stream Out Shell HTML]
                                                          │
                                                          ▼
                                            [Stream Async Suspense Chunks]
                                                          │
                                                          ▼
                                      [Client Receives Markup + Escaped State]
                                                          │
                                                          ▼
                                     [Resume Reactive Listeners (Zero Re-render)]
```

* **Out-of-Order Streaming**: Uses hidden `<template id="async-chunk">` swaps to stream fast content immediately, inserting heavy async chunks as they resolve.
* **Resumability**: Event delegation is captured at the root document listener (`window.__aether_dispatch`). Initial event clicks during page load are replayed seamlessly once code chunks download.

---

### 3.10 CLI & DevTools Architecture

* **`@gati/cli`**: Provides instant Vite plugins (`vite-plugin-aether`), TypeScript type generation for file routes, and compile-time A11y/security audits (`aether audit`).
* **`@gati/devtools`**: Communicates over a structured window postMessage protocol to inspect the live Signal dependency graph, profile computation timings, and trigger time-travel state rollbacks.

---

## 4. Comprehensive Testing Strategy

The Gati framework enforces testing across 5 rigorous tiers:

1. **Unit Testing (`@gati/testing`)**: Fine-grained reactive graph unit tests verifying topological ordering, cycle rejection, batching, and memory disposal.
2. **Compiler Snapshot & AST Validation**: 1,000+ tests asserting exact IR and JS output for all syntax and security permutations.
3. **Security Fuzzing Suite**: Automated fuzzing testing against XSS payload databases (OWASP Top 10, Polyglots, SVG vectors, and Prototype Pollution attacks).
4. **W3C DOM & A11y Conformance Tests**: Verifies complete compliance with HTML5 specs and WAI-ARIA 1.2 authoring practices.
5. **Real-World E2E Performance Benchmarks**: Automated benchmarks against js-framework-benchmark (Krausest) tracking memory allocation, startup time, and DOM mutation throughput.

---

## 5. Technical Tradeoffs & Architectural Compromises

1. **Component Initialization vs. Re-render Simplicity**:
   * *Tradeoff*: Because component functions execute only once, developers cannot place non-reactive local variables directly inside the component body and expect them to update on state change.
   * *Mitigation*: The Gati compiler provides immediate diagnostic warnings if an un-wrapped local variable is used in reactive contexts.
2. **Ahead-of-Time Compilation Requirement**:
   * *Tradeoff*: Gati requires a build step (Vite / Rollup / esbuild) and does not support on-the-fly in-browser template compilation with `eval`.
   * *Justification*: Eliminating runtime compilation enforces strict CSP, minimizes bundle size, and prevents template injection XSS vulnerabilities completely.
3. **Reactive Graph Memory Allocation**:
   * *Tradeoff*: Creating granular signal subscriber links requires more individual object allocations than a single large Virtual DOM tree.
   * *Optimization*: Gati uses packed 32-bit bitmasks and reusable node pools to minimize memory fragmentation and GC overhead.
