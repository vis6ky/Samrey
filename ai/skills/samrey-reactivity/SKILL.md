---
name: samrey-reactivity
description: Reactive state management, signals, computeds, effects, stores, batching, and lifecycle management in @samrey/reactivity.
---

# Samrey Reactivity Engine (`samrey-reactivity`)

## 1. Skill Description & Activation Criteria
- **Purpose**: Teaches how to manage fine-grained state with signals, computed values, side effects, proxies, stores, and memory cleanup.
- **Activation Criteria**: Trigger when managing state, creating reactive stores, deriving calculations, handling side-effects, or debugging reactivity cycles.

## 2. Framework Concepts
- **`signal(value)`**: Primitive reactive container holding a value. Notifies subscribers on reference changes (`Object.is`).
- **`computed(() => fn)`**: Derived lazy, memoized reactive value.
- **`effect(() => fn)`**: Eager side effect that re-runs when its read signal dependencies change.
- **`batch(() => fn)`**: Groups multiple signal mutations so downstream effects only fire once.
- **`createStore(initial)`**: Deep reactive proxy for complex objects and arrays.
- **`createRoot` / `onCleanup`**: Memory management and disposal scopes.

## 3. Correct API Usage
```ts
import { signal, computed, effect, batch, createStore, produce } from '@samrey/reactivity';

// Primitive Signal
const count = signal(0);
count.value++;            // Write
count.update(n => n + 1); // Functional update

// Derived
const isEven = computed(() => count.value % 2 === 0);

// Deep Store
const [state, setState] = createStore({ user: { name: 'Alex' } });
produce(state, draft => {
  draft.user.name = 'Bob';
});
```

## 4. Verified Code Example
```ts
import { signal, computed, effect, onCleanup } from '@samrey/reactivity';

export function createStopwatch() {
  const elapsed = signal(0);
  const isRunning = signal(false);
  const formatted = computed(() => `${(elapsed.value / 1000).toFixed(1)}s`);

  effect(() => {
    if (!isRunning.value) return;
    const interval = setInterval(() => {
      elapsed.update(ms => ms + 100);
    }, 100);

    onCleanup(() => clearInterval(interval));
  });

  return {
    elapsed,
    isRunning,
    formatted,
    start: () => isRunning.set(true),
    pause: () => isRunning.set(false),
    reset: () => { isRunning.set(false); elapsed.set(0); }
  };
}
```

## 5. Common Mistakes
- **Mistake**: In-place array mutation (e.g. `items.value.push(x)`).
  - *Correction*: Always reassign a new reference: `items.value = [...items.value, x]`.
- **Mistake**: Forgetting `.value` accessor when reading a signal.
  - *Correction*: Use `signal.value` to subscribe or read.

## 6. Forbidden Patterns
- ❌ Do NOT call a signal as a function: `count()`.
- ❌ Do NOT create circular dependencies in effects without `untrack()`.
- ❌ Do NOT use React hooks (`useState`, `useReducer`).

## 7. Validation Procedures
1. Run `npx @samrey/cli test` to execute reactivity tests.
2. Verify with `serious-bugs-verification.test.ts`.

## 8. Authoritative Documentation
- [ai/REACTIVITY_RULES.md](../../REACTIVITY_RULES.md)
- [ai/API_CONTRACTS.md](../../API_CONTRACTS.md#1-samreyreactivity)
