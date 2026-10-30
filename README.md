# Samrey Framework

> **The Next-Generation Fine-Grained Reactive Web Framework**  
> Direct DOM Hole Bindings • Ahead-of-Time Air Compiler • Native Security Primitives • Isomorphic Streaming SSR • Zero Virtual DOM Overhead

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%20%7C%2020%20%7C%2022%20LTS-green.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-130%20passed%20%2F%200%20failed-brightgreen.svg)]()
[![Zero-eval](https://img.shields.io/badge/Security-Zero--Eval%20%2F%20CSP%20Strict-purple.svg)]()

---

## Overview

Samrey is an isomorphic web framework designed from first principles to deliver extreme runtime execution speed, mathematical reactive consistency, and airtight compile-time security. Unlike traditional Virtual DOM frameworks (React, Vue) that re-render entire component subtrees or diff virtual trees on every state change, Samrey compiles templates Ahead-of-Time into static HTML strings cloned via native C++ `cloneNode(true)` and surgical point-to-point DOM bindings.

### Core Architectural Highlights

- **Fine-Grained Push-Pull Signal Engine (`@samrey/reactivity`)**: Topological dependency ordering with versioned transaction clocks (`globalClock`) guaranteeing zero glitches, zero redundant computations, and automatic owner-based memory reclamation.
- **Ahead-of-Time AIR Compiler (`@samrey/compiler`)**: Translates JSX/HTML templates into Abstract Interface Representation (AIR), hoisting static HTML fragments and computing localized DOM path holes with constant folding.
- **High-Performance Surgical Runtime (`@samrey/runtime`)**: Replaces Virtual DOM diffing with native `cloneNode(true)` cloning and surgical node mutations.
- **Enterprise Security First (`@samrey/security`)**: Zero `eval()`, zero `new Function()`, built-in W3C Trusted Types policy provider, contextual URI sanitization, and secret scrubbing.
- **Isomorphic Streaming SSR & Resumable Hydration (`@samrey/ssr`)**: Streaming HTML renderer over Web Streams (`ReadableStream`), Unicode-safe state serialization, pre-hydration user event queueing, and static site generation (SSG).
- **Standard Schema Form Validation (`@samrey/forms`)**: First-class support for Standard Schema (Zod, Valibot, ArkType) with reactive validation and automated ARIA attributes.
- **Reactive Networking & Deduplication (`@samrey/http`)**: Resource primitive (`createResource`) with in-flight request deduplication, cache tags, and automatic signal synchronization.
- **Developer Experience & Tooling (`@samrey/cli`, `@samrey/devtools`, `@samrey/testing`)**: Scaffolding CLI, Vite plugin, time-travel reactive inspection bridge, and deterministic DOM test harnesses.

---

## Quick Start

### 1. Installation

```bash
npm install @samrey/reactivity @samrey/runtime @samrey/compiler
```

### 2. Hello World Example

```typescript
import { signal, computed } from '@samrey/reactivity';
import { template, bindText, bindEvent } from '@samrey/runtime';

function Counter() {
  const count = signal(0);
  const double = computed(() => count.value * 2);

  const tmpl = template(`
    <div class="counter-card">
      <h2>Count: <span>0</span></h2>
      <p>Doubled: <span>0</span></p>
      <button>Increment</button>
    </div>
  `);

  const root = tmpl() as HTMLElement;
  const spans = root.querySelectorAll('span');
  const button = root.querySelector('button');

  if (spans[0]) bindText(spans[0], () => count.value);
  if (spans[1]) bindText(spans[1], () => double.value);
  if (button) bindEvent(button, 'click', () => count.value++);

  return root;
}

document.getElementById('app')?.appendChild(Counter());
```

### Keyed Identity Semantics (`<For>`)

In Samrey, `<For>` preserves DOM elements and owner scopes using keyed identity reconciliation. Row render functions execute **once** upon mounting; when a row's key matches, the existing DOM row is reused.

- **Wrong**: Passing a new object reference under an existing key (`todos.value = [{ id: 1, text: 'New' }]`) leaves the row displaying initial data and emits a dev warning (`AETH-502`).
- **Correct**: Use fine-grained signals inside item properties (`{ id: 1, text: signal('New') }`) for surgical DOM updates, or provide a key that changes when data changes (`key={(item) => `${item.id}:${item.updatedAt}`}`).

---

## Framework Packages

| Package | Version | Description |
| :--- | :--- | :--- |
| [`@samrey/reactivity`](./packages/reactivity) | `1.0.0` | Topological push-pull signal graph, computed signals, effects, and Owner scopes |
| [`@samrey/compiler`](./packages/compiler) | `1.0.0` | Ahead-of-Time AST parser, AIR generator, constant folding & static HTML hoister |
| [`@samrey/runtime`](./packages/runtime) | `1.0.0` | Template cloning, direct DOM hole bindings, runtime control flow (`Show()`, `For()`) |
| [`@samrey/security`](./packages/security) | `1.0.0` | W3C Trusted Types, HTML/URI sanitizers, timing-safe CSRF, secret guard |
| [`@samrey/router`](./packages/router) | `1.0.0` | Reactive client/server router with parameterized segments & redirect security |
| [`@samrey/http`](./packages/http) | `1.0.0` | Async `createResource`, in-flight request deduplication, fetch client |
| [`@samrey/forms`](./packages/forms) | `1.0.0` | Standard Schema form engine with reactive validation & ARIA bindings |
| [`@samrey/ssr`](./packages/ssr) | `1.0.0` | Streaming SSR (`ReadableStream`), SSG generator, Unicode serializer & event replay |
| [`@samrey/testing`](./packages/testing) | `1.0.0` | Test component mounting harness, signal flushers, assertion helpers |
| [`@samrey/devtools`](./packages/devtools) | `1.0.0` | Origin-gated devtools bridge, dependency graph inspection, transaction logging |
| [`@samrey/cli`](./packages/cli) | `1.0.0` | CLI scaffold generator, Vite plugin, security and a11y static auditor |

---

## Documentation

Comprehensive architecture, guides, and API references are located in the [`docs/`](./docs) directory:

- [**Getting Started Guide**](./docs/GETTING_STARTED.md)
- [**Architecture & Design Decisions**](./docs/ARCHITECTURE.md)
- [**Templates & Component System**](./docs/TEMPLATES_AND_COMPONENTS.md)
- [**Reactivity & Control Flow**](./docs/REACTIVITY_AND_CONTROL_FLOW.md)
- [**Router & HTTP Client**](./docs/ROUTER_AND_HTTP.md)
- [**Forms & Schema Validation**](./docs/FORMS_AND_VALIDATION.md)
- [**SSR, SSG & Hydration**](./docs/SSR_AND_HYDRATION.md)
- [**Testing & Developer Tooling**](./docs/TESTING_AND_TOOLING.md)
- [**Security Model & Audit**](./docs/SECURITY_MODEL.md)
- [**Performance & Benchmarks**](./docs/PERFORMANCE.md)
- [**Deployment & Packaging**](./docs/DEPLOYMENT_AND_PACKAGING.md)
- [**API Reference**](./docs/API_REFERENCE.md)
- [**Migration Guide (from React/Solid/Svelte)**](./docs/MIGRATION_GUIDE.md)
- [**Frequently Asked Questions (FAQ)**](./docs/FAQ.md)
- [**Release Candidate 1.0.0 Audit**](./docs/RELEASE_CANDIDATE_AUDIT.md)

---

## Browser & Runtime Compatibility Matrix

### Supported Browsers

| Browser | Minimum Version | Tested Capabilities |
| :--- | :--- | :--- |
| **Google Chrome / Chromium** | `90+` | Native `cloneNode`, `ReadableStream`, Trusted Types, CSS Variables |
| **Mozilla Firefox** | `90+` | ES2022, Fine-Grained Microtask Scheduling, Web Streams |
| **Apple Safari** | `15.4+` | WebKit DOM Cloning, Polyfill Fallbacks, ResizeObserver |
| **Microsoft Edge** | `90+` | Full Blink feature parity & native Trusted Types |

### Supported Server & CLI Runtimes

| Runtime | Version | Status |
| :--- | :--- | :--- |
| **Node.js** | `18.x LTS` | Supported (Minimum required for global `fetch` and `ReadableStream`) |
| **Node.js** | `20.x LTS` | Fully Supported & Recommended (Active LTS) |
| **Node.js** | `22.x LTS` | Fully Supported (Current / Next LTS) |

---

## Verification & Testing

To run the complete test suite (130 unit, integration, adversarial security, fuzzing, and example tests):

```bash
npm test
```

To run TypeScript verification:

```bash
npm run typecheck
```

To run performance benchmarks:

```bash
npm run benchmark
```

---

## License

Samrey is open-source software licensed under the [Apache-2.0 License](./LICENSE).
