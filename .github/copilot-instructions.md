# GitHub Copilot Repository Instructions for Samrey

You are assisting developers writing code for **Samrey**, an independent high-performance reactive web framework.
Always consult the canonical specification in [AGENTS.md](../AGENTS.md) and [ai/SPEC.md](../ai/SPEC.md).

## Critical Autocomplete & Generation Rules

1. **Zero Virtual DOM**: Component functions execute **EXACTLY ONCE**. Never suggest React-style hooks (`useState`, `useEffect`, `useCallback`, `useRef`).
2. **Reactivity**:
   - Primitive state: `signal(initialValue)` from `@samrey/reactivity`. Read with `.value`, write with `.value = next` or `.update(fn)`.
   - Derived state: `computed(() => expr)`.
   - Side effects: `effect(() => { ... })`.
   - Stores: `createStore(initialObject)`. Mutate with `produce(state, draft => { ... })`.
3. **Templates & DOM**:
   - Always hoist invariant HTML templates at module scope using `template('...')` from `@samrey/runtime`.
   - Use `ref="name"` for element targets: `const root = _tmpl.clone(); const { name } = root.refs;`.
   - Bind dynamically with `bindText`, `bindAttr`, `bindClass`, `bindStyle`, `on`.
4. **Control Flow**:
   - Conditional: `Show({ when: () => cond.value, children: () => View(), fallback: () => Fallback() })`.
   - Keyed list: `For({ each: () => items.value, key: i => i.id, children: (item) => Row(item) })`.
   - Do NOT emit `<Show>` or `<For>` as HTML tags.
