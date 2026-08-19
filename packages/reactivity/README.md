# `@aether/reactivity`

Push-pull fine-grained topological signal engine with versioned transaction clocks, automatic batching, and Owner cleanup scopes.

## Primitives

- `signal(initialValue)`: State atom.
- `computed(() => fn())`: Memoized derived state.
- `effect(() => fn())`: Side-effect subscriber.
- `batch(() => fn())`: Atomic batch updates.
- `onCleanup(() => fn())`: Scoped lifecycle disposal.
- `createStore(initialObj)`: Deep reactive proxy with prototype pollution defense.
