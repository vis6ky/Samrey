---
name: samrey-reactivity
description: Master fine-grained reactive state, computed values, side effects, batching, and stores in Samrey.
---

# Samrey Reactivity System (@samrey/reactivity)

## Purpose
Teaches how to model reactive data flow using signals, derivations, effects, and deep proxies.

## Core Rules
1. **Read with `.value`**: To subscribe to a signal in an effect or computation, read `mySignal.value`.
2. **Write with `.value =` or `.set()`**: Trigger subscriber notifications by assigning a new value.
3. **Use `.update(fn)` for state transitions**: `count.update(n => n + 1)`.
4. **Immutable Collections**: Always assign a new array or object reference when updating signal state: `items.value = [...items.value, newItem]`.
5. **Batch Related Writes**: Wrap multiple signal mutations in `batch(() => { ... })`.

## Verified Code Example
```ts
import { signal, computed, effect, batch, createStore } from '@samrey/reactivity';

// 1. Primitive Signal
const count = signal(0);

// 2. Computed Derivation (memoized)
const isEven = computed(() => count.value % 2 === 0);

// 3. Side Effect
const dispose = effect(() => {
  console.log(`Count: ${count.value}, isEven: ${isEven.value}`);
});

// 4. Batching
batch(() => {
  count.value = 2;
  count.value = 4;
}); // logs once with count: 4

// 5. Deep Proxy Store
const appState = createStore({
  user: { name: 'Alice', preferences: { darkTheme: true } }
});
appState.user.preferences.darkTheme = false; // deeply reactive!
```

## Common Mistakes
- **Mistake**: In-place mutation (`myArray.value.push(x)`). This mutates the interior array without changing the signal reference and will NOT trigger reactivity.
- **Mistake**: Calling `count()` instead of `count.value`.

## Validation Instructions
Run unit tests checking signal subscriber notifications and value correctness.
