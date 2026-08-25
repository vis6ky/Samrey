export interface DocEntry {
  id: string;
  title: string;
  filename: string;
  summary: string;
  content: string;
}

export const DOCS_REGISTRY: DocEntry[] = [
  {
    id: 'competitive-analysis',
    title: 'Competitive Analysis',
    filename: 'docs/COMPETITIVE_ANALYSIS.md',
    summary: 'Exhaustive 22-dimension technical evaluation of React, Angular, Vue, Svelte, and Solid with rigorous Category A-F taxonomy.',
    content: `# Competitive Technical Analysis: Next-Gen Frontend Framework

**Author**: Lead Framework Architect  
**Status**: Approved Architectural Baseline  
**Target**: Production-Grade Frontend Framework ("Samrey")  
**Scope**: Deep Technical Comparative Evaluation of React, Angular, Vue, Svelte, and Solid across 22 architectural dimensions.

---

## 1. Classification Methodology

To ensure academic and engineering rigor, all limitations, tradeoffs, and issues across frameworks are strictly classified according to the following taxonomy:

* **[Category A] Actual Security Vulnerability**: Exploitable CVEs, architectural security flaws, unsafe dynamic execution, SSR injection vectors, or default-insecure primitives.
* **[Category B] Architectural Limitation**: Structural bottlenecks inherent to the core paradigm (e.g., VDOM reconciliation overhead, full-subtree re-execution, memory footprint of reactive graphs).
* **[Category C] Performance Tradeoff**: Deliberate engineering compromises (e.g., upfront compilation time vs. runtime bundle size, proxy interception vs. raw object speed).
* **[Category D] Ecosystem Problem**: Library fragmentation, breaking ecosystem migrations, unmaintained essential tooling, or lack of standardized primitives.
* **[Category E] Developer-Experience (DX) Problem**: Cognitive overhead, subtle footguns (e.g., stale closures, lost reactivity through destructuring, hook dependency arrays).
* **[Category F] Intentional Design Decision**: Explicit, conscious architectural choices aligned with framework philosophy (e.g., unidirectional data flow, immutability, synchronous execution).

---

## 2. In-Depth Multi-Framework Comparative Matrix

| Architectural Dimension | React (v19 + RSC) | Angular (v18/19 Ivy + Signals) | Vue (v3.5 Composition) | Svelte (v5 Runes) | Solid (v1.9 / SolidStart) | Proposed Samrey Architecture |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Rendering Architecture** | Virtual DOM diffing (Fiber tree reconciliation) | Incremental DOM / Ivy bytecode instructions | Hybrid Virtual DOM with Block Trees & Patch Flags | Compiler-generated direct DOM surgical mutations | Direct DOM mutations via compiled static <template> clones | Static <template> clone hoisting with fine-grained DOM slot bindings |
| **2. Reactivity Model** | Coarse-grained component re-execution triggered by setState/dispatch | Hybrid: Angular Signals (push-pull) + optional Zone.js dirty checking | Fine-grained Proxy-based reactive graph (ref, reactive) | Fine-grained Runes ($state, $derived, $effect) via AST transform | Fine-grained Signals (createSignal, createMemo, createEffect) | Glitch-free topological push-pull Signals graph with O(1) dirty flagging |
| **3. Compilation Strategy** | Light JSX transform (jsx-runtime) + React Compiler (memoization AST analysis) | Ahead-of-Time (AOT) template compilation to Ivy instructions | SFC compilation (@vue/compiler-sfc) with static node hoisting | Heavy compile-time AST transformation of Runes & templates | JSX-to-DOM compiler (babel-preset-solid) emitting template cloning & effects | Zero-runtime template compiler with Static IR, Trusted-Type hoisting & AOT security validation |
| **4. Runtime Overhead** | Heavy (~45-50 kB min+gzip core runtime + reconciler) | Heavy (~55-70 kB min+gzip core + platform-browser) | Moderate (~28-34 kB min+gzip core + reactivity) | Ultra-light (~3-6 kB min+gzip runtime helpers) | Minimal (~6-8 kB min+gzip core reactive engine + DOM helpers) | Minimal (<7 kB min+gzip core runtime, zero VDOM reconciler) |
| **5. State Management** | External libraries required (Zustand, Redux, Jotai); Context re-render hazards | Built-in Signal-based stores, injectable services, RxJS interoperability | Built-in Pinia (Signal-backed stores) & reactive modules | Built-in Svelte stores & universal Runes across .svelte.ts files | Built-in reactive primitives (createStore, signals) outside components | First-class Signal-backed Stores with atomic transitions, auto-undo & devtools tracking |
| **6. Routing Architecture** | Ecosystem-dependent (React Router, TanStack Router, Next.js App Router) | Built-in @angular/router with guards, resolvers, lazy loading | Built-in vue-router with navigation guards, scroll behavior | Built-in SvelteKit file-based router with load functions | Built-in Solid Router / SolidStart with nested routes & data loaders | Built-in Type-Safe Router supporting both file-system and code-based routes with nested layouts & streaming loaders |
| **7. Form Management** | Uncontrolled/controlled manual state or heavy libraries (React Hook Form, Formik) | Built-in Reactive Forms & Template-driven forms with synchronous/async validators | Community libraries (VeeValidate, FormKit) or manual two-way v-model | Manual binding bind:value or community packages (Superforms) | Community libraries (Modular Forms, Felte) or signal bindings | Built-in Schema-Driven Forms (Standard Schema: Zod/Valibot/ArkType) with automatic ARIA derivation & CSRF handling |
| **8. SSR & Streaming** | React Server Components (RSC) wire format + HTML Suspense streaming | Angular SSR with TransferState and progressive hydration | @vue/server-renderer with async SSR context and streaming | SvelteKit server load streaming with deferred promises | SolidStart async/stream SSR with fine-grained Suspense boundaries | Universal Async Streaming SSR with Out-of-Order HTML pipelining and Resumable Micro-Hydration |
| **9. Hydration Mechanism** | Full client-side Virtual DOM reconstruction & event attachment | Progressive / partial hydration with event replay (Blocks) | Full VDOM tree hydration matching server markup | Island-style or full component DOM traversal hydration | Fine-grained hydration with serialized event delegation and marker comments | Zero-overhead Resumable Hydration: no double execution of component logic; direct event binder resumption |
| **10. Security & XSS Model** | Escapes JSX children; dangerouslySetInnerHTML bypass; URI protocol gaps | Built-in DomSanitizer with SecurityContexts; bypass mechanisms | Default interpolation escaping; v-html bypass; SVG namespace risks | Default {} escaping; {@html} bypass; un-sanitized attribute bindings | Default JSX escaping; innerHTML property assignments bypass | Context-Aware Auto-Sanitizing Compiler + Trusted Types Enforcement + Zero-eval Runtime |
| **11. TypeScript Support** | Good (JSX types), but hook dependency analysis relies on ESLint, not TS | Exceptional (First-class TypeScript, strict template type checking) | Excellent (TSX, <script lang="ts">, Vue Language Tools) | Excellent in Svelte 5 (Runes fully typed, strict template TS) | Exceptional (JSX types match actual DOM attributes directly) | Native TypeScript AST Compiler with strict schema generation & template compile-time type checking |
| **12. Accessibility (a11y)** | Manual or lint-rule based (eslint-plugin-jsx-a11y) | Angular CDK a11y primitives (FocusTrap, LiveAnnouncer) | Manual or community primitives (Radix Vue) | Built-in a11y compiler warnings (missing alt, invalid ARIA roles) | Manual or community primitives (Kobalte) | Compile-time A11y Verification + Automatic ARIA state binding for forms and dynamic interactive elements |

---

## 3. Key Architectural Learnings for Samrey

1. **Abandon the Virtual DOM**: Solid and Svelte 5 prove that direct DOM mutations driven by fine-grained signals outperform VDOM diffing in memory, initial render, and update speed.
2. **Execute Components ONCE**: Running component functions once to set up the reactive graph eliminates the entire class of stale closures, hook rules, and memoization ceremonies.
3. **Template Cloning over Dynamic Assembly**: Compiling static HTML fragments into <template> elements and cloning them via cloneNode(true) is 3-5x faster than step-by-step DOM instruction creation.
4. **Context-Aware Security at the Compiler Level**: Sanitization must not rely on developer discipline or runtime string checks; the compiler must statically analyze attribute contexts and enforce Trusted Types.
5. **Standard Schemas for Forms**: Rather than bespoke validation engines, forms must natively interface with TypeScript-first schema standards (Zod, Valibot, ArkType).
6. **Resumable Hydration**: SSR must serialize event handlers and reactive state directly into the HTML so client hydration can resume without re-running the component initialization tree.
`
  },
  {
    id: 'security-model',
    title: 'Security Model',
    filename: 'docs/SECURITY_MODEL.md',
    summary: 'Zero-trust architecture with context-aware sanitization, W3C Trusted Types, zero-eval runtime, and safe SSR serialization.',
    content: `# Security Model: Samrey Frontend Framework

**Document**: docs/SECURITY_MODEL.md  
**Classification**: Core Architecture Specification  
**Security Tier**: Level 1 (Defense-in-Depth, Security-by-Default)  

---

## 1. Executive Summary & Security Principles

Samrey is engineered from the ground up on the principle of Zero-Trust Input and Security-by-Default. Unlike legacy frameworks where security is treated as a runtime add-on or delegated to developer discipline, Samrey integrates contextual security boundaries directly into the Compiler Pipeline, Reactivity Engine, Hydration Serializer, and HTTP Client.

### Core Security Tenets
1. **Zero-eval Runtime Guarantee**: No eval(), new Function(), or dynamic string-to-code execution in any core package. Full compatibility with the strictest Content Security Policy (script-src 'self').
2. **Context-Aware Compile-Time Sanitization**: Dynamic values are automatically classified by insertion context (HTML body, attribute value, URI, CSS property, or script payload) and encoded using context-specific sanitizers.
3. **Mandatory Trusted Types Enforcement**: Direct integration with the W3C Trusted Types API (window.trustedTypes). Dynamic DOM assignments use cryptographically sealed policies.
4. **Resumable SSR Injection Immunity**: State serialized during SSR is encoded using Unicode escape sequences to prevent script-tag breakouts (</script>), CDATA boundary attacks, and JSON prototype hijacking.
5. **Hermetic Memory & Prototype Pollution Defense**: Internal reactive subscriber registries and metadata dictionaries use Object.create(null) with frozen prototype descriptors.

---

## 2. Context-Aware Sanitization Pipeline

A primary root cause of Cross-Site Scripting (XSS) in frontend frameworks is the mismatch between the sanitization strategy and the execution context. Samrey's compiler classifies every dynamic binding into one of five distinct contexts:

* **HTML Text Content**: Compiled to node.textContent = value. Native browser text node assignment. Never invokes HTML parsers or innerHTML.
* **Safe Attributes**: Compiled to node.setAttribute(key, value). Direct DOM property/attribute mapping. Zero template string interpolation.
* **URI / URL Attributes**: Compiled with sanitizeUri(value) wrapper. Whitelist validation: blocks javascript:, vbscript:, data:text/html, and data:application/javascript. Only allows http:, https:, mailto:, tel:, and relative paths.
* **Inline Styles**: Structured CSS object compiler. Prohibits dynamic raw strings in style. Validates CSS properties against known CSSOM identifiers; blocks expression(), url(), and CSS injection breakouts.
* **Rich HTML Injection**: Disallows arbitrary innerHTML. Requires explicit <SafeHtml> component backed by Trusted Types policy.
`
  },
  {
    id: 'architecture',
    title: 'Architecture Specification',
    filename: 'docs/ARCHITECTURE.md',
    summary: 'Complete technical specification of all 12 monorepo packages, compiler pipeline, reactive graph, and runtime engine.',
    content: `# Architectural Specification: Samrey Frontend Framework

**Document**: docs/ARCHITECTURE.md  
**Version**: 1.0.0-Draft  
**Author**: Lead Framework Architect  
**Classification**: Core Engineering Blueprint  

---

## 1. Executive Summary & Design Philosophy

Samrey is a high-performance, TypeScript-native frontend framework designed to provide fine-grained reactivity, zero Virtual DOM overhead, compiler-first optimization, and security-by-default.

### Core Tenets
1. **Components Execute Once**: Component functions run exactly once to build the reactive graph. They never re-execute on state changes.
2. **Static Template Cloning**: UI templates compile into native <template> DOM fragments. Cloned nodes are updated directly via fine-grained signal subscriptions with zero tree diffing.
3. **Glitch-Free Reactive Graph**: Signals propagate via a topological push-pull algorithm ensuring zero redundant computations and zero observable intermediate glitch states.
4. **Resumable SSR Hydration**: Server-rendered HTML carries serialized state and lightweight event delegation metadata, allowing the client to resume reactivity without re-executing component initialization logic.
5. **Integrated Standard Primitives**: Built-in, fully typed solutions for Routing, Data Fetching, Schema-Driven Forms, Security, and DevTools.

---

## 2. Monorepo Topology & Package Architecture

Samrey is organized as an acyclic, modular monorepo containing 12 cohesive packages:

* packages/compiler (AOT Parser, IR Generator, Optimizer & Code Generator)
* packages/runtime (Component Lifecycle, Template Cloning, DOM Hydrator & Mount Engine)
* packages/reactivity (Signal Graph: Signal, Computed, Effect, Batch, Scope, Owner)
* packages/router (Type-Safe File & Code Router, Layouts, Streaming Loaders & Guards)
* packages/http (Type-Safe HTTP Client, Resource Caching, Retry & Abort Controller)
* packages/forms (Standard-Schema Form Engine + Auto-ARIA)
* packages/ssr (Streaming HTML Generator, Out-of-Order HTML Swaps & Serializer)
* packages/security (Trusted Types, Contextual Sanitizer, CSRF Tokens & CSP Nonces)
* packages/testing (Headless Reactive Test Harness, Mock Renderer & DOM Assertions)
* packages/cli (Zero-config bundler plugins, Scaffolder & Typegen)
* packages/devtools (Reactive Graph Visualizer, State Inspector & Time-Travel Bridge)
`
  },
  {
    id: 'technical-decisions',
    title: 'Architecture Decision Records (ADRs)',
    filename: 'docs/TECHNICAL_DECISIONS.md',
    summary: 'Formal ADR-001 through ADR-008 documenting architectural decisions, tradeoffs, and justifications.',
    content: `# Architecture Decision Records (ADRs): Samrey Framework

**Document**: docs/TECHNICAL_DECISIONS.md  
**Status**: Formal Architectural Standard  
**Framework**: Samrey  

---

## Index of Architectural Decisions

* **ADR-001**: Fine-Grained Push-Pull Signals vs. Virtual DOM Reconciliation
* **ADR-002**: Static Template Cloning via <template> Elements
* **ADR-003**: Zero-eval Runtime & Mandatory Trusted Types Enforcement
* **ADR-004**: Standard Schema Specification for Built-In Form Validation
* **ADR-005**: Out-of-Order HTML Streaming with Resumable Micro-Hydration
* **ADR-006**: Monorepo Package Topology with Strict Acyclic Dependency Boundaries
* **ADR-007**: Explicit Asynchronous Resource Signals over Side-Effect Hooks
* **ADR-008**: Compile-Time A11y and Context-Aware Security Verification
`
  },
  {
    id: 'roadmap',
    title: 'Development Roadmap',
    filename: 'docs/ROADMAP.md',
    summary: 'Gate-checked 7-phase implementation plan, explicit list of deferred non-goals, and risk mitigation register.',
    content: `# Development Roadmap & Phased Implementation Plan

**Document**: docs/ROADMAP.md  
**Status**: Approved Phasing Baseline  
**Framework**: Samrey  

---

## 1. Executive Phasing Strategy

To ensure architectural integrity, stability, and maintainability, Samrey follows a strict Gate-Checked Multi-Phase Implementation Plan. No subsequent phase begins until the preceding phase passes all automated verification gates, security audits, and performance thresholds.

* **Phase 0**: Specification, Threat Modeling & Architectural Baselines (COMPLETED)
* **Phase 1**: Core Reactivity Engine & Standalone DOM Renderer
* **Phase 2**: Compiler Pipeline, AIR Intermediate Representation & Codegen
* **Phase 3**: Component Model, Runtime Lifecycle & Scoped Cleanup
* **Phase 4**: SSR Streaming Engine, Serialization & Resumable Hydration
* **Phase 5**: Type-Safe Router, Data Fetching & Standard-Schema Forms
* **Phase 6**: DevTools Bridge, Profiler & Testing Harness
* **Phase 7**: Benchmarks, Security Fuzzing & Public Alpha Release
`
  }
];
