# Reactivity & Control Flow in Samrey

## 1. Topological Push-Pull Signal Engine

The reactive system in `@samrey/reactivity` uses a push-pull dependency algorithm coupled with a monotonic versioned transaction clock (`globalClock`).

### Key Reactive Primitives

- `signal(initialValue)`: Creates a mutable reactive value. Reading `.value` registers a dependency with the currently running computation. Writing `.value = next` increments the clock and marks downstream dependencies dirty.
- `computed(fn)`: Creates a memoized derived computation that is lazily evaluated on pull and caches its value until upstream dependencies change.
- `effect(fn)`: Creates a side-effect computation that runs immediately and re-executes automatically whenever its read dependencies mutate.
- `batch(fn)`: Groups multiple signal mutations into a single atomic transaction, preventing intermediate glitch states.
- `untrack(fn)`: Runs code without tracking any signal reads inside it.

```typescript
import { signal, computed, effect, batch } from '@samrey/reactivity';

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

Samrey uses an explicit `Owner` hierarchy. Every effect, computation, and component lifecycle runs inside an `Owner` context.

- `createRoot(fn)`: Creates an isolated top-level reactive root that persists until manually disposed.
- `onCleanup(fn)`: Registers a disposal callback that executes when the current Owner scope is destroyed or re-evaluated.

```typescript
import { createRoot, onCleanup, effect } from '@samrey/reactivity';

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

## 3. Declarative Control Flow (`Show()` & `For()`)

Instead of JavaScript ternary operators or `.map()` in Virtual DOM templates, Samrey provides fine-grained control flow primitives in TypeScript that surgically insert, swap, and remove DOM nodes without destroying surrounding state.

> **Note**: Control flow is composed at the TypeScript layer using `Show()` and `For()`. Template-level `<Show>`, `<For>`, `<Switch>`, etc., inside raw templates are rejected at compile time (`SAMREY-108`) to ensure explicit ownership and fine-grained reactivity.

### `Show` (Conditional Rendering)

```typescript
import { Show } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';

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
import { For } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';

interface Todo {
  id: number;
  text: string;
}

const todos = signal<Todo[]>([
  { id: 1, text: 'Design Samrey Compiler' },
  { id: 2, text: 'Verify Zero-Eval Security' }
]);

const listNode = For({
  each: () => todos.value,
  key: (item) => item.id,
  children: (item, index) => {
    const li = document.createElement('li');
    li.textContent = `${item.id}: ${item.text}`;
    return li;
  }
});
```

#### Keyed Identity Semantics

In Samrey, the `key` function (`key={(item) => item.id}`) defines the persistent identity of each row. The reconciliation algorithm uses keys to preserve DOM elements, component owners, and local state across list reorders, insertions, and removals via Longest Increasing Subsequence (LIS) optimization.

**What happens when an item changes under the same key:**
Because `<For>` reuses existing DOM rows when their key matches, the child render function (`children: (item, index) => ...`) runs **once** at row creation and is **not** re-invoked on existing keys. If a new object reference is provided under an already mounted key, the row is reused without re-rendering, leaving the row displaying its initial data and emitting a development warning (`AETH-502`).

**Wrong Pattern (Row Stays Stale):**
```typescript
// ❌ WRONG: Passing a new plain object under the same key; row does not re-render
const todos = signal([{ id: 1, text: 'Initial' }]);
For({
  each: () => todos.value,
  key: (item) => item.id,
  children: (item) => <li>{item.text}</li>
});

// Later update:
todos.value = [{ id: 1, text: 'Updated Text' }]; // Row retains 'Initial'
```

**Correct Patterns:**
```typescript
// ✅ PATTERN 1: Fine-grained signals or reactive store inside item properties
const todos = signal([
  { id: 1, text: signal('Initial') }
]);
For({
  each: () => todos.value,
  key: (item) => item.id,
  children: (item) => {
    const li = document.createElement('li');
    bindText(li, () => item.text.value);
    return li;
  }
});
todos.value[0].text.value = 'Updated Text'; // Surgical text update!

// ✅ PATTERN 2: Key that changes when item data changes
For({
  each: () => todos.value,
  key: (item) => `${item.id}:${item.updatedAt}`, // Key changes -> row re-creates
  children: (item) => <li>{item.text}</li>
});
```

