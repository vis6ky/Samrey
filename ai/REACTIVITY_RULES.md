# Samrey Framework — Reactivity Rules & Invariants (REACTIVITY_RULES.md)

**Package:** `@samrey/reactivity`  
**Version:** 2.1.0  
**Authority:** Mandatory Reactivity Guidelines for AI Agents

---

## 1. Core Reactive Primitives

### Primitive Signals (`signal`)
- Signals are the fundamental unit of reactive state.
- **Reading**: Use `.value` or `.get()`.
- **Writing**: Use `.value = newValue`, `.set(newValue)`, or `.update(prev => next)`.
- **Equality Comparison**: Signals use `Object.is`. Emitting identical primitive values does not notify subscribers.

```ts
import { signal } from '@samrey/reactivity';

const count = signal(0);
console.log(count.value); // 0

count.value = 1;          // triggers subscribers
count.set(2);             // triggers subscribers
count.update(n => n + 1); // triggers subscribers (now 3)
```

### Derived Values (`computed`)
- Computeds derive state from one or more signals.
- **Lazy & Memoized**: Computeds evaluate lazily when read, and cache their value until an upstream dependency changes.
- **Read-Only**: Computeds do not have setters (`readonly value`).

```ts
import { signal, computed } from '@samrey/reactivity';

const price = signal(100);
const taxRate = signal(0.15);
const total = computed(() => price.value * (1 + taxRate.value));
```

### Side Effects (`effect`)
- Effects automatically execute an operation whenever any signal read inside their body mutates.
- **Cleanup**: If an effect returns a cleanup callback, it executes prior to the next re-execution or upon disposal.

```ts
import { signal, effect } from '@samrey/reactivity';

const title = signal('Dashboard');

const dispose = effect(() => {
  document.title = title.value;
  return () => {
    // optional cleanup
  };
});
```

### Batching (`batch`)
- Multiple synchronous signal writes can be batched to guarantee downstream effects and computeds fire exactly once.

```ts
import { signal, batch } from '@samrey/reactivity';

const first = signal('Jane');
const last = signal('Doe');

batch(() => {
  first.value = 'John';
  last.value = 'Smith';
  // effects subscribing to both only fire once here
});
```

### Stores (`createStore`, `produce`, `reconcile`)
- Use stores for complex nested objects and arrays.
- Stores use recursive proxies to intercept mutations.

```ts
import { createStore, produce } from '@samrey/reactivity';

const [state, setState] = createStore({
  user: { name: 'Alice', preferences: { theme: 'dark' } },
  tags: ['admin', 'billing']
});

// Deep mutation via produce
produce(state, (draft) => {
  draft.user.preferences.theme = 'light';
  draft.tags.push('superadmin');
});
```

---

## 2. Invariants & Absolute Prohibitions

1. ❌ **NEVER Mutate Arrays/Objects In-Place on Primitive Signals**:
   ```ts
   // BAD: Will NOT trigger reactivity!
   const items = signal([1, 2, 3]);
   items.value.push(4); 

   // GOOD: Reassign reference
   items.value = [...items.value, 4];
   // OR
   items.update(arr => [...arr, 4]);
   ```

2. ❌ **NEVER Call Signals as Functions**:
   ```ts
   // BAD: Throws TypeError: count is not a function
   const val = count();

   // GOOD:
   const val = count.value;
   ```

3. ❌ **NEVER Read State Without Reactivity in Template Bindings**:
   ```ts
   // BAD: Static snapshot, will never update!
   bindText(element, count.value.toString());

   // GOOD: Wrap in getter function
   bindText(element, () => count.value.toString());
   ```

4. ❌ **NEVER Create Circular Effect Loops**:
   Writing to a signal inside an effect that reads the same signal causes an infinite loop. Use `untrack()` for reads that should not register as dependencies.
   ```ts
   effect(() => {
     const current = untrack(() => count.value);
     history.value = [...history.value, current];
   });
   ```

---

## 3. Lifecycle & Ownership Hierarchies
- Always wrap standalone asynchronous or unparented effects inside `createRoot(dispose => ...)` if they exist outside a component tree, and invoke `dispose()` when unmounting to prevent memory leaks.
- Inside components or control flows, cleanups are registered via `onCleanup(() => ...)`.
