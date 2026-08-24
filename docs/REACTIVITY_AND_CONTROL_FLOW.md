# Reactivity & Control Flow in Gati

## 1. Topological Push-Pull Signal Engine

The reactive system in `@gati/reactivity` uses a push-pull dependency algorithm coupled with a monotonic versioned transaction clock (`globalClock`).

### Key Reactive Primitives

- `signal(initialValue)`: Creates a mutable reactive value. Reading `.value` registers a dependency with the currently running computation. Writing `.value = next` increments the clock and marks downstream dependencies dirty.
- `computed(fn)`: Creates a memoized derived computation that is lazily evaluated on pull and caches its value until upstream dependencies change.
- `effect(fn)`: Creates a side-effect computation that runs immediately and re-executes automatically whenever its read dependencies mutate.
- `batch(fn)`: Groups multiple signal mutations into a single atomic transaction, preventing intermediate glitch states.
- `untrack(fn)`: Runs code without tracking any signal reads inside it.

```typescript
import { signal, computed, effect, batch } from '@gati/reactivity';

const price = signal(100);
const taxRate = signal(0.2);
const total = computed(() => price.value * (1 + taxRate.value));

effect(() => {
  console.log(`Total price is: $${total.value.toFixed(2)}`);
});

// Output: Total price is: $120.00

batch(() => {
  price.value = 200;
  taxRate.value = 0.15;
});
// Atomic update triggers effect exactly once: Total price is: $230.00
```

---

## 2. Memory Management & Owner Lifecycle

Gati uses an explicit `Owner` hierarchy. Every effect, computation, and component lifecycle runs inside an `Owner` context.

- `createRoot(fn)`: Creates an isolated top-level reactive root that persists until manually disposed.
- `onCleanup(fn)`: Registers a disposal callback that executes when the current Owner scope is destroyed or re-evaluated.

```typescript
import { createRoot, onCleanup, effect } from '@gati/reactivity';

const dispose = createRoot(() => {
  const timer = setInterval(() => {
    // interval work
  }, 1000);

  onCleanup(() => {
    clearInterval(timer);
    console.log('Timer cleaned up safely');
  });
});

// Later, to dispose everything:
dispose();
```

---

## 3. Declarative Control Flow (`<Show>` & `<For>`)

Instead of JavaScript ternary operators or `.map()` in Virtual DOM templates, Gati provides fine-grained control flow primitives that surgically insert, swap, and remove DOM nodes without destroying surrounding state.

### `<Show>` (Conditional Rendering)

```typescript
import { Show } from '@gati/runtime';
import { signal } from '@gati/reactivity';

const isLoggedIn = signal(false);

const node = Show({
  when: () => isLoggedIn.value,
  children: () => document.createTextNode('Welcome back, Admin!'),
  fallback: () => document.createTextNode('Please sign in.')
});
```

### `<For>` (Keyed List Reconciliation)

The `<For>` component uses an index-keyed differential reconciliation algorithm to move, insert, and remove DOM nodes with minimal mutations.

```typescript
import { For } from '@gati/runtime';
import { signal } from '@gati/reactivity';

interface Todo {
  id: number;
  text: string;
}

const todos = signal<Todo[]>([
  { id: 1, text: 'Design Gati Compiler' },
  { id: 2, text: 'Verify Zero-Eval Security' }
]);

const listNode = For({
  each: () => todos.value,
  by: (item) => item.id,
  children: (item, index) => {
    const li = document.createElement('li');
    li.textContent = `${item.id}: ${item.text}`;
    return li;
  }
});
```
