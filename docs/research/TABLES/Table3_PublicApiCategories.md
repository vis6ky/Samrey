# Table 3: Public API Categories & Export Invariants

| Functional Category | Primary Exported Primitives | Paradigm Contract | Lifecycle Rules |
| :--- | :--- | :--- | :--- |
| **Reactive State** | `signal<T>(val)`, `createStore<T>(obj)`, `produce(fn)` | Read via `.value` inside reactive tracking contexts; writes via direct assignment (`sig.value = x`) or setter methods. | Belongs to hierarchical `Owner`; automatically torn down on scope cleanup. |
| **Derived Computation** | `computed<T>(fn)` | Pure derivations; evaluated lazily on read; dirty flag checked against dependency clock version. | Dependency subscriptions established dynamically during accessor evaluation. |
| **Reactive Effects** | `effect(fn)`, `batch(fn)`, `untrack(fn)` | Side-effect execution queued topologically; auto-batches microtask flushes. | Registered with active owner; invokes cleanups on re-trigger or disposal. |
| **DOM Construction** | `el(tag, props, ...children)`, `svgEl()`, `text()`, `frag()` | Instantiates native DOM nodes directly. Functions in props/children automatically subscribe to signals. | Created once during component setup; direct surgical element updates. |
| **Control Flow** | `Show({ when, fallback, children })`, `For({ each, key, children })` | Keyed surgical anchors using DOM `Comment` nodes. Zero VDOM tree diffing overhead. | Reuses 90% of keyed DOM nodes during list mutation benchmarks. |
| **Form Validation** | `createForm(opts)`, `createField(opts)` | Accepts standard schema validators (Zod/Valibot/ArkType). Auto-wires ARIA error relationships. | Reactive dirty, touched, and error states updated synchronously. |
| **Data Fetching** | `createResource(fetcher)`, `createHttpClient()` | Reactive resource tracking `{ data, loading, error, mutate, refetch }`. Deduplicates concurrent flights. | AbortController automatically signals abort if parent component unmounts. |
| **Server Rendering** | `renderToString(root)`, `renderToStream(root)` | Generates complete HTML or out-of-order chunks via Web `ReadableStream`. | Automatically encodes SSR state via Unicode escapes to prevent `<script>` XSS. |
