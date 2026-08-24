# AETHER FRAMEWORK — PERFORMANCE BENCHMARK & REGRESSION SPECIFICATION

## 1. Benchmark Methodology

The Gati Framework performance suite measures compiler throughput, fine-grained reactive graph execution, runtime DOM manipulation, control flow reconciliation, component instantiation, server-side rendering, and memory churn.

### Execution Parameters
- **Warmup Phase**: 3 warmup runs preceding all timed benchmark iterations to prime Node.js / V8 TurboFan JIT optimizations.
- **Timed Iterations**: 5 to 25 repetitions depending on workload scale.
- **Trimming & Outlier Rejection**: For suites with $\ge 8$ iterations, the maximum and minimum measurement points are excluded from the calculated average to eliminate background garbage collection pauses and CPU scheduling anomalies.
- **Metrics Collected**:
  - `Min (ms)`: Fastest observed run.
  - `Median (ms)`: 50th-percentile run.
  - `Avg (ms)`: Trimmed average execution time.
  - `p95 (ms)`: 95th-percentile latency.
  - `Ops/sec`: Throughput (calculated as $1000 / \text{Avg (ms)}$).
  - `Heap Δ (KB)`: Heap memory difference across benchmark iterations.

---

## 2. Environment Specification

Measurements recorded in the baseline environment:
- **Node.js**: v22.23.1
- **Platform**: Linux (x64)
- **CPUs**: 2x Core Virtualized Container
- **Memory**: 4.00 GB RAM
- **Source Artifacts**: TypeScript compiled via `tsx` with native V8 type stripping.

---

## 3. Baseline Measurements, Thresholds & Rationales

| Category | Benchmark | Baseline Avg | Acceptable Δ % | Min Allowed Ops/s | Rationale |
|---|---|---|---|---|---|
| **Compiler** | Full Compile: Small (~10 nodes) | 0.075ms | +35% | 7,000 | Inline JSX/AIR template compilation in hot dev loops. |
| **Compiler** | Full Compile: Medium (~100 nodes) | 0.916ms | +40% | 600 | Standard UI components with nested tags & dynamic bindings. Prevents $O(N^2)$ AST parser degradation. |
| **Compiler** | Full Compile: Large (~1,000 nodes) | 2.651ms | +40% | 180 | Large multi-module template parsing must scale linearly in $< 6\text{ms}$. |
| **Compiler** | Full Compile: Very Large (~10,000 nodes) | 37.725ms | +45% | 15 | Stress-test bounds. High volume allocations tolerate slight GC variance. |
| **Compiler** | Full Compile: Deeply Nested (150 levels) | 0.381ms | +40% | 500 | Validates recursive stack depth and avoids call-stack degradation. |
| **Reactivity** | Single Signal Update (10,000 mutations) | 8.557ms | +35% | 75 | Core fine-grained state mutator throughput. High frequency loops. |
| **Reactivity** | 100 Independent Signals with Effects | 0.604ms | +40% | 800 | Standard reactive UI component scope. Must execute in $\approx 1\text{ms}$. |
| **Reactivity** | 10,000 Signals Creation & Propagation | 32.542ms | +40% | 20 | Massive reactive graph instantiation. Verifies subscriber set efficiency. |
| **Reactivity** | Batched Updates (1,000 signals in 1 batch) | 3.156ms | +40% | 180 | Transactional batch flushing and re-entrant queue draining. |
| **Reactivity** | Owner Lifecycle (1,000 root owners) | 8.914ms | +40% | 65 | Owner context allocation and cleanup tree disposal. |
| **Runtime DOM** | Initial Mount (100 nodes) | 0.323ms | +40% | 1,500 | Fast DOM template instantiation and clone operations. |
| **Runtime DOM** | Initial Mount (1,000 nodes) | 1.035ms | +40% | 500 | Medium-size page mount. Must complete under $2\text{ms}$ avg. |
| **Runtime DOM** | Initial Mount (10,000 nodes) | 34.806ms | +45% | 15 | Heavy DOM node instantiation stress test. |
| **Runtime DOM** | Text Binding Updates (1,000 nodes) | 5.08ms | +40% | 100 | Text dirty-check and fine-grained DOM mutation. |
| **Runtime DOM** | Text Binding Updates (10,000 nodes) | 158.76ms | +45% | 4 | Massive text node dirty checking. Prevents redundant `textContent` writes. |
| **Runtime DOM** | Attribute Updates (1,000 elements) | 3.892ms | +40% | 120 | Attribute dirty check and `setAttribute` bypass. |
| **Runtime DOM** | Event Registration & Dispatch (1,000 elements) | 0.48ms | +50% | 1,000 | Delegated event dispatch throughput. |
| **Control Flow** | Show: Single Transition (false -> true) | 0.028ms | +35% | 18,000 | Conditional branch mount time. Must remain ultra-responsive. |
| **Control Flow** | Show: Single Transition (true -> false) | 0.018ms | +35% | 25,000 | Conditional unmount & owner disposal time. |
| **Control Flow** | Show: Repeated Toggling (100 cycles) | 0.264ms | +40% | 400 | Rapid toggle churn. Detects memory leaks or dangling event handlers. |
| **Control Flow** | For: Initial Keyed Mount (1,000 items) | 5.628ms | +45% | 80 | Keyed list mount and index tracking. |
| **Control Flow** | For: Initial Keyed Mount (10,000 items) | 159.496ms | +45% | 4 | Large virtual/keyed table mount. |
| **Control Flow** | For: Append 100 items (1,000 base) | 10.542ms | +40% | 50 | Tail-insert list reconciliation without shifting existing items. |
| **Control Flow** | For: Prepend 100 items (1,000 base) | 8.344ms | +250% | 25 | Head-insert list reconciliation index propagation. |
| **Control Flow** | For: Remove middle 100 items (1,000 base) | 6.952ms | +40% | 70 | Splice removal & DOM subtree cleanup. |
| **Control Flow** | For: Verification of 90% Node Reuse | 6.166ms | +40% | 80 | Keyed diffing reuses 90% of identical DOM nodes rather than remounting. |
| **Components** | Component Creation: 1,000 Flat Components | 0.698ms | +80% | 350 | Component instance lifecycle setup & hook invocation. |
| **SSR** | SSR: renderToString (1,000 nodes) | 0.193ms | +35% | 3,000 | Server-side HTML string generation speed. |
| **SSR** | SSR: renderToStream Complete (1,000 nodes) | 1.94ms | +40% | 300 | Streaming SSR chunk delivery speed. |
| **SSR** | SSR: Secret Scrubbing (500 items deep scan) | 1.033ms | +40% | 450 | Deep security secret sanitization over SSR hydration payloads. |

---

## 4. Benchmark CLI Commands

- `npm run benchmark`: Run full benchmark suite across all categories and regenerate `benchmarks/results.json`.
- `npm run benchmark:compiler`: Run isolated compiler benchmarks.
- `npm run benchmark:reactivity`: Run isolated reactivity graph benchmarks.
- `npm run benchmark:runtime`: Run isolated runtime DOM and control flow benchmarks.
- `npm run benchmark:ssr`: Run isolated SSR and streaming benchmarks.
- `npm run benchmark:gate`: Run CI performance regression gate against stored baseline.
