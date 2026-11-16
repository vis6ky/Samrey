---
name: samrey-performance
description: High-throughput performance optimization, static hoisting, memory leak prevention, and zero-VDOM fine-grained updates in Samrey.
---

# Samrey Performance Optimization (`samrey-performance`)

## 1. Skill Description & Activation Criteria
- **Purpose**: Instructs how to architect ultra-high-throughput, low-memory Samrey applications and avoid performance regressions.
- **Activation Criteria**: Trigger when building high-frequency data streams (e.g. trading dashboards, real-time charts), virtualized lists, large data tables, or diagnosing memory leaks.

## 2. Framework Concepts
- **Zero VDOM Advantage**: Because components run once, runtime cost is localized entirely to the modified signal subscribers ($O(1)$ operations).
- **Template Cloning Throughput**: Cloning `<template>` nodes via native `cloneNode(true)` is $3\times$ to $5\times$ faster than iterative `createElement()` calls.
- **Topological Transaction Clock**: Ensures intermediate computed values in complex graph networks are never computed more than once per batch.
- **Disposal Trees**: Subscriptions are tied to owners (`createOwner`, `runWithOwner`). When an owner is disposed, all descendant listeners detach cleanly.

## 3. Correct API Usage
```ts
import { batch } from '@samrey/reactivity';

// Batch multiple high-frequency updates into a single browser frame
batch(() => {
  stockPrice.value = 142.50;
  volume.value = 120500;
  bidAskSpread.value = 0.05;
});
```

## 4. Verified Code Example: Keyed List Optimization
```ts
import { signal } from '@samrey/reactivity';
import { template, bindText, For } from '@samrey/runtime';

interface MetricRow { id: string; name: string; value: number; }

const _rowTmpl = template('<tr class="metric-row"><td ref="name"></td><td ref="val"></td></tr>');

export function MetricTable(props: { metrics: Signal<MetricRow[]> }) {
  return For({
    each: () => props.metrics.value,
    // Stable key prevents unnecessary DOM node recreation
    key: (item) => item.id,
    children: (item) => {
      const row = _rowTmpl.clone();
      const { name, val } = row.refs;
      bindText(name, () => item.name);
      bindText(val, () => item.value.toFixed(2));
      return row;
    }
  });
}
```

## 5. Common Mistakes
- **Mistake**: Re-creating the `template("...")` inside the component function body.
  - *Correction*: Always hoist `template()` at module level so the browser parses HTML once.
- **Mistake**: Creating orphaned long-running effects outside an Owner or component lifecycle.
  - *Correction*: Wrap standalone effects in `createRoot(dispose => ...)` and call `dispose()` when unmounting.

## 6. Forbidden Patterns
- ❌ Do NOT trigger synchronous signal writes inside render loops.
- ❌ Do NOT use unstable keys (such as `Math.random()`) in `For()`.

## 7. Validation Procedures
1. Run `npx @samrey/cli analyze` to inspect production bundle sizes.
2. Run benchmark regression tests via `npm run benchmark`.

## 8. Authoritative Documentation
- [ai/ARCHITECTURE.md](../../ARCHITECTURE.md)
- [ai/REACTIVITY_RULES.md](../../REACTIVITY_RULES.md)
