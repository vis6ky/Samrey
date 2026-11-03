# @samrey/reactivity

Fine-grained push-pull topological signal engine with versioned transaction clocks, automatic batching, and reactive Owner cleanup scopes.

## Purpose

`@samrey/reactivity` is the foundation of the Samrey Framework. It provides high-performance reactive state management without virtual DOM diffing, dirty-checking, or monkey-patching. Signals act as reactive state atoms that notify only the specific DOM nodes or computations that depend on them.

## Installation

```bash
npm install @samrey/reactivity
```

## Quick Example

```ts
import { signal, computed, effect, batch, createStore } from '@samrey/reactivity';

// 1. Primitive state signal
const count = signal(0);

// 2. Memoized computed derivation
const doubled = computed(() => count.value * 2);

// 3. Side-effect subscriber
const dispose = effect(() => {
  console.log(`Count is ${count.value}, Doubled is ${doubled.value}`);
});

// 4. Batch updates
batch(() => {
  count.value = 1;
  count.value = 2;
}); // Logs once: "Count is 2, Doubled is 4"

// 5. Reactive Proxy Store
const store = createStore({ user: { name: 'Alice', age: 30 } });
store.user.age = 31;

// Cleanup effect
dispose();
```

## API

- `signal<T>(initialValue: T): Signal<T>` — Creates a read-write reactive signal.
- `computed<T>(fn: () => T): ReadonlySignal<T>` — Creates a lazily-evaluated cached derivation.
- `effect(fn: () => void | (() => void)): () => void` — Creates an active side-effect subscriber. Returns disposal callback.
- `batch<T>(fn: () => T): T` — Groups multiple signal mutations into a single topological notification cycle.
- `untrack<T>(fn: () => T): T` — Reads signal values without creating a reactive dependency.
- `createStore<T extends object>(initial: T): T` — Creates a deep reactive proxy store with fine-grained path tracking.
- `produce<T>(draft: T, fn: (draft: T) => void): void` — Performs immutable-style mutable draft updates on store state.
- `reconcile<T>(target: T, source: T): void` — Structural state reconciliation algorithm preserving unchanged node references.
- `createRoot<T>(fn: (dispose: () => void) => T): T` — Creates an isolated reactive ownership scope with manual teardown.
- `onCleanup(fn: () => void): void` — Registers a disposal callback for the active reactive owner.
- `createContext<T>(defaultValue?: T): Context<T>` — Creates a dependency injection context identifier.
- `useContext<T>(context: Context<T>): T` — Retrieves context value provided by the nearest ancestor provider.

## Environment

Universal: Runs in Node.js (>= 18.0.0), Bun, Deno, and all modern browsers (Chrome, Firefox, Safari, Edge).

## Security

Zero-eval architecture. Deep reactive stores include built-in prototype pollution scrubbing (`__proto__`, `constructor`, `prototype` keys are blocked).

## Related Packages

- `@samrey/runtime` — Direct DOM bindings and control flow built on `@samrey/reactivity`.
- `@samrey/router` — Reactive URL routing.
- `@samrey/forms` — Reactive form validation and accessible field bindings.

