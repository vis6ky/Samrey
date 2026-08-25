# Migration Guide to Samrey

This guide assists engineering teams migrating applications from React, SolidJS, or Svelte to Samrey.

---

## 1. Migrating from React

### Mental Model Shift
- **React**: Components re-run top-to-bottom on every state update. Hooks must obey strict rules of call order.
- **Samrey**: Components run once during initialization. State updates directly mutate specific DOM nodes without re-executing component bodies.

### Comparison Table

| Feature | React | Samrey |
| :--- | :--- | :--- |
| State | `useState(0)` | `signal(0)` |
| Derived State | `useMemo(() => ...)` | `computed(() => ...)` |
| Side Effects | `useEffect(() => ...)` | `effect(() => ...)` |
| Conditional Render | `{isOpen ? <Modal /> : null}` | `<Show when={() => isOpen.value}><Modal /></Show>` |
| List Rendering | `{items.map(item => <Item key={item.id} />)}` | `<For each={() => items.value} by={item => item.id}>{item => ...}</For>` |
| Cleanup | Return callback in `useEffect` | `onCleanup(() => ...)` |
| Rendering Engine | Virtual DOM reconciler | Native `cloneNode` + direct hole bindings |

---

## 2. Migrating from SolidJS

If you are coming from SolidJS, Samrey's fine-grained reactive model will feel familiar, with key differences in security and compiler architecture:

- **Security Model**: Samrey embeds W3C Trusted Types policies and strict context-aware URI/CSS sanitization directly into the compiler and runtime.
- **SSR Hydration**: Samrey uses zero-overhead delegated event capture (`getDelegatedEventScript`) and deep secret protection (`stripSecrets`) to prevent server credential leakage.
- **Standard Schema**: `@samrey/forms` natively supports Standard Schema validators without additional adapters.

---

## 3. Migrating from Svelte

- Svelte relies on compiler-generated `.svelte` files and let bindings (`let count = 0; count += 1`).
- Samrey uses standard TypeScript `.tsx` or template strings with explicit signal objects (`count.value++`), ensuring universal IDE intellisense and standard ES Module distribution.
