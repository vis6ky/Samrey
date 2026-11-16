# @samrey/devtools

Runtime DevTools bridge, reactive graph inspection hooks, and transaction event telemetry.

## Purpose

`@samrey/devtools` provides introspection hooks for debugging Samrey applications. It tracks signal dependency graphs, transaction clock ticks, component mount hierarchies, and emits telemetry to the browser DevTools extension.

## Installation

```bash
npm install -D @samrey/devtools @samrey/reactivity
```

## Quick Example

```ts
import { initDevTools, getGraphSnapshot, defaultGraphInspector } from '@samrey/devtools';
import { signal, effect } from '@samrey/reactivity';

// 1. Initialize devtools bridge
const devtools = initDevTools({ isDev: true });

const count = signal(0);
const dispose = effect(() => {
  console.log(count.value);
});

// 2. Capture reactive topology snapshot
const snapshot = getGraphSnapshot();
console.log(`Active nodes: ${snapshot.length}`, defaultGraphInspector.getSnapshot());
```

## API

- `initDevTools(options?: { targetOrigin?: string; isDev?: boolean }): DevToolsBridge` — Initializes the runtime inspection bridge (alias: `initDevtools`).
- `getGraphSnapshot(): InspectedSignalNode[]` — Captures the current reactive dependency graph snapshot via `GraphInspector`.
- `isDevToolsActive(): boolean` / `computeIsDev(...)` — Reports active DevTools mode.
- `GraphInspector` / `ComponentInspector` / `OwnerInspector` / `RouterInspector` / `NetworkInspector` / `FormInspector` / `PerformanceInspector` — Built-in telemetry inspector classes (with `default*` singletons).
- `sanitizePayload(payload)` / `isSensitiveKey(key)` — Strips credential and secret fields from telemetry events.

## Environment

Universal: Browser environments (uses `window.postMessage` or console bridge) and Node.js (for debug logging).

## Security

Zero-overhead in production builds when tree-shaken. DevTools messaging strictly validates message origin and structure.

## Related Packages

- `@samrey/reactivity` — Target reactive signals engine.
- `@samrey/runtime` — Target component tree.

