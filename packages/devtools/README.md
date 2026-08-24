# @gati/devtools

Runtime DevTools bridge, reactive graph inspection hooks, and transaction event telemetry.

## Purpose

`@gati/devtools` provides introspection hooks for debugging Gati applications. It tracks signal dependency graphs, transaction clock ticks, component mount hierarchies, and emits telemetry to the browser DevTools extension.

## Installation

```bash
npm install -D @gati/devtools @gati/reactivity
```

## Quick Example

```ts
import { initDevtools, getGraphSnapshot } from '@gati/devtools';
import { signal, effect } from '@gati/reactivity';

// 1. Initialize devtools bridge
const devtools = initDevtools({ enableLogging: true });

const count = signal(0);
const dispose = effect(() => {
  console.log(count.value);
});

// 2. Capture reactive topology snapshot
const snapshot = getGraphSnapshot();
console.log(`Active signals: ${snapshot.nodes.length}`);
```

## API

- `initDevtools(options?: DevtoolsOptions): DevtoolsBridge` — Initializes the runtime inspection bridge.
- `getGraphSnapshot(): DependencyGraphSnapshot` — Returns the current reactive topology node and edge map.
- `trackSignal(signalInstance: Signal<unknown>, name?: string): void` — Explicitly labels a signal in the DevTools inspector.
- `trackComponent(componentName: string, element: HTMLElement): void` — Labels a DOM subtree in the DevTools component tree.
- `emitDevtoolsEvent(event: DevtoolsEvent): void` — Emits custom telemetry events over the DevTools channel.

## Environment

Universal: Browser environments (uses `window.postMessage` or console bridge) and Node.js (for debug logging).

## Security

Zero-overhead in production builds when tree-shaken. DevTools messaging strictly validates message origin and structure.

## Related Packages

- `@gati/reactivity` — Target reactive signals engine.
- `@gati/runtime` — Target component tree.

