# Samrey Framework: Research Evidence Map

**Document Classification:** Empirical Architecture Evidence Map  
**Target System:** Samrey Framework v1.0.0 (`@samrey/*`)  
**Repository State:** Frozen Production Release (v1.0.0, Apache-2.0)  
**Historical Lineage:** Aether (v0.1.0–v0.8.0) → Gati (v0.9.0) → Samrey (v1.0.0)

---

## 1. System Identity and Package Topology

| Package Name | Version | Role in Ecosystem | Production Dependencies | Source Files | Evidence File |
| :--- | :---: | :--- | :--- | :---: | :--- |
| `@samrey/reactivity` | `1.0.0` | Core Topological Push-Pull Signal Graph | **0 (Zero)** | 6 | `packages/reactivity/src/index.ts` |
| `@samrey/security` | `1.0.0` | Contextual Sanitization, Trusted Types, CSRF | **0 (Zero)** | 7 | `packages/security/src/index.ts` |
| `@samrey/runtime` | `1.0.0` | Direct DOM Engine, `<template>` Cloning, Lifecycle | `@samrey/reactivity`, `@samrey/security` | 11 | `packages/runtime/src/index.ts` |
| `@samrey/compiler` | `1.0.0` | AOT AST Parser, AIR Generator, Surgical Codegen | `@samrey/security` | 8 | `packages/compiler/src/index.ts` |
| `@samrey/router` | `1.0.0` | Type-Safe File & Code Routing, Streaming Loaders | `@samrey/reactivity`, `@samrey/runtime`, `@samrey/security` | 6 | `packages/router/src/index.ts` |
| `@samrey/http` | `1.0.0` | Reactive HTTP Resources, Deduplication, Abort | `@samrey/reactivity`, `@samrey/security` | 5 | `packages/http/src/index.ts` |
| `@samrey/forms` | `1.0.0` | Standard Schema Validation, Auto-ARIA Generation | `@samrey/reactivity`, `@samrey/runtime` | 5 | `packages/forms/src/index.ts` |
| `@samrey/ssr` | `1.0.0` | Out-of-Order HTML Streaming, Safe State Serializer | `@samrey/reactivity`, `@samrey/security` | 6 | `packages/ssr/src/index.ts` |
| `@samrey/testing` | `1.0.0` | Headless Reactive Test Harness, Mock DOM Runner | `@samrey/reactivity`, `@samrey/runtime` | 4 | `packages/testing/src/index.ts` |
| `@samrey/devtools` | `1.0.0` | Graph Visualizer, State Inspector, Audit Bridge | `@samrey/reactivity` | 5 | `packages/devtools/src/index.ts` |
| `@samrey/cli` | `1.0.0` | Project Scaffolding, Bundler Plugins, Audit CLI | `@samrey/compiler` | 6 | `packages/cli/src/index.ts` |

**Invariant Verified:** Monorepo package dependency graph is a strict Directed Acyclic Graph (DAG) with zero cycles and zero external production UI dependencies (`docs/DEPENDENCY_INDEPENDENCE_AUDIT.md`).

---

## 2. Quantitative Empirical Evidence

### 2.1 Test Suite Verification
- **Total Test Suites:** 81 test suites
- **Total Executed Tests:** 278 automated assertions
- **Passing Rate:** 100% of functional & security tests passing (273 passing suite tests + 27/27 developer assistant integration tests passing)
- **Framework Verification:** Verified using native Node.js test runner (`node:test`, `node:assert/strict`) without third-party test framework overhead.

### 2.2 Performance Benchmark Suite (`docs/PERFORMANCE.md`)
- **Benchmark Suite:** 31 distinct automated performance gates across 6 categories.
- **Hardware & Environment:** Linux x64, 2x Core Virtualized Container, 4.00 GB RAM, Node.js v22.23.1.
- **Key Measured Results:**
  - *Compiler (Small template ~10 nodes):* 0.075ms avg (~13,300 ops/s).
  - *Compiler (Medium template ~100 nodes):* 0.916ms avg (~1,090 ops/s).
  - *Compiler (Large template ~1,000 nodes):* 2.651ms avg (~377 ops/s).
  - *Reactivity (Single signal, 10,000 mutations):* 8.557ms avg.
  - *Reactivity (100 independent signals with effects):* 0.604ms avg (~1,655 ops/s).
  - *Reactivity (Batched updates, 1,000 signals in 1 transaction):* 3.156ms avg (~316 ops/s).
  - *Runtime DOM (Initial mount, 100 nodes via template clone):* 0.323ms avg (~3,095 ops/s).
  - *Runtime DOM (Initial mount, 1,000 nodes):* 1.035ms avg (~966 ops/s).
  - *Runtime DOM (Attribute updates, 1,000 elements):* 3.892ms avg.
  - *Control Flow (Show transition false -> true):* 0.028ms avg (~35,700 ops/s).
  - *Control Flow (For list initial keyed mount, 1,000 items):* 5.628ms avg (~177 ops/s).
  - *Control Flow (For list node reuse rate on update):* 90% verified node reuse without remounting.
  - *SSR (`renderToString`, 1,000 nodes):* 0.193ms avg (~5,180 ops/s).
  - *SSR (`renderToStream` completion, 1,000 nodes):* 1.940ms avg.
  - *SSR Payload Secret Scrubbing (500 items deep scan):* 1.033ms avg.

### 2.3 Developer Assistant Blind Challenge Benchmark (`docs/DEVELOPER_ASSISTANT_BLIND_BENCHMARK.md`)
- **Design:** 20 distinct, frozen developer challenges tested in isolated, clean contexts with zero prior conversational history.
- **Benchmark Dimensions:** Concept accuracy, API accuracy, code quality, TypeScript compilation, task completeness, Samrey-native architecture.
- **Results:**
  - *Total Score:* **582 / 600 points (97.0%)** (Pass threshold $\ge 500$).
  - *Average Score:* **29.1 / 30 points**.
  - *TypeScript Compilation Rate:* **100% (20 / 20)** (Pass threshold $\ge 95\%$).
  - *Public API Accuracy Rate:* **100%** (Pass threshold $\ge 98\%$).
  - *Task Completion Rate:* **90%** (Pass threshold $\ge 90\%$).
  - *Hallucinated API Occurrences:* **0% (Strictly 0)**.
  - *Foreign Framework Primitives:* **0% (Strictly 0)**.
  - *Forbidden `@aether/*` Historical Incursions:* **0 (Strictly 0)**.

---

## 3. Qualitative and Architectural Evidence

### 3.1 One-Time Component Execution
- Component functions execute **exactly once** during initialization to assemble the reactive graph (`packages/runtime/src/dom.ts`, `docs/ARCHITECTURE.md`).
- Updates occur via direct DOM closures rather than re-executing component bodies or reconciling virtual node trees.

### 3.2 Security by Default
- Zero dynamic code generation (`eval`, `new Function`, `innerHTML` strings) in any production runtime path (`docs/SECURITY_MODEL.md`).
- Context-aware compiler classification separating text, safe attributes, URIs, CSS styles, and trusted HTML.
- W3C Trusted Types policy enforcement (`window.trustedTypes.createPolicy('samrey#html')`).
- SSR serialization escaping replacing HTML characters (`<`, `>`, `&`, `\u2028`, `\u2029`) with Unicode escapes (`\u003c`, `\u003e`, `\u0026`).

### 3.3 Zero Foreign Framework Self-Hosting (Dogfooding)
- Entire interactive developer portal and documentation application (`src/*`) is implemented in 100% native Samrey primitives (`@samrey/runtime`, `@samrey/reactivity`, `@samrey/forms`, `@samrey/router`, `@samrey/security`) with zero React, Vue, Angular, or Svelte (`docs/PHASE_14_5_AETHER_NATIVE_DOGFOODING.md`).

---

## 4. Boundaries of Evidence (Explicit Negative Audit)

The following areas have **NOT** been evaluated in the current study and must be explicitly identified as unmeasured:
1. *Large-scale external developer user study:* Not evaluated in the current study (all usability data stems from automated developer challenge benchmarks and internal dogfooding).
2. *Third-party independent lab benchmarks (e.g. official external js-framework-benchmark run by external third-party reviewers):* Not evaluated in the current study (benchmarks are internally executed using standard automated test harnesses).
3. *Multi-year enterprise production maintenance telemetry:* Not evaluated in the current study.
4. *Longitudinal memory fragmentation over months of continuous execution in production mobile browsers:* Not evaluated in the current study.
