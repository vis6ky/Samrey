# Samrey Framework — Complete API Reference

## `@samrey/reactivity`

### `signal<T>(initialValue: T): Signal<T>`
Creates a mutable signal holding a value of type `T`.
- `.value`: Getter/setter for the underlying value. Reading tracks dependency; writing triggers downstream invalidation.

### `computed<T>(fn: () => T): Computed<T>`
Creates a memoized computation. Lazily re-evaluates only when upstream dependencies change.

### `effect(fn: () => void): () => void`
Creates a reactive effect that re-runs whenever read signals change. Returns a dispose function.

### `batch<T>(fn: () => T): T`
Executes mutations inside a single atomic transaction.

### `untrack<T>(fn: () => T): T`
Executes `fn` without establishing dependencies.

### `createRoot<T>(fn: (dispose: () => void) => T): T`
Creates a detached reactive Owner scope.

### `onCleanup(fn: () => void): void`
Registers a cleanup handler for the active Owner.

---

## `@samrey/compiler`

### `compileTemplate(source: string, options?: CompileOptions): CompileResult`
Parses JSX/HTML template markup into AIR representation, hoists static subtrees, and generates runtime code with source maps.

### `classifySecurityContext(attributeName: string, tagName: string): SecurityContext`
Statically categorizes attribute or text bindings (HTML, URI, SafeAttr, CSS).

---

## `@samrey/runtime`

### `template<S extends string>(htmlString: S): TemplateFactory<S>`
Returns a factory function with a `.clone()` method and fine-grained template references (`root.refs`). Clones pre-parsed HTML via native `cloneNode(true)` with O(1) child path indexing.

- **`factory()` / `factory.clone()`**: Instantiates the template into a `TemplateRoot<S>`.
- **`root.refs`**: Strongly-typed registry object containing named element references defined via `ref="..."` attributes.
- **`root.ref(name: string)`**: Dynamic element lookup returning the referenced `HTMLElement` or `undefined` if not found.
- **`root.disposeRefs()`**: Explicitly releases references to underlying DOM nodes for garbage collection. Automatic cleanup is also registered when called within a reactive scope (`onCleanup`).

#### Example
```ts
const view = template(`
  <form ref="form">
    <input ref="email" type="email" />
    <button ref="submit">Login</button>
  </form>
`);

const root = view.clone();
const { form, email, submit } = root.refs;
bindEvent(submit, 'click', login);
```

### `bindText(node: Node, getter: () => unknown): void`
Surgically updates node `textContent` reactively.

### `bindAttr(element: Element, name: string, getter: () => unknown): void`
Binds dynamic attribute values with runtime security validations.

### `bindEvent(element: Element, eventName: string, handler: EventListener): void`
Attaches an event listener bound to the active Owner lifecycle.

### `Show<T>(props: ShowProps<T>): Node`
Declarative conditional rendering component.
- **Boolean Gate (Fast Path)**: When `children` takes no parameter (`children.length === 0` or a static Node/array), `Show` operates as a pure boolean gate: changes between truthy values do not re-render.
- **Keyed by Value**: When `children` declares a parameter (`(item: NonNullable<T>) => Node`), **Show is keyed by the value when children use it**, re-rendering whenever the truthy value changes (`Object.is` identity comparison).
- **Fallback**: Mounts `fallback?: () => Node` when `when` evaluates to falsy.

### `Switch(props: SwitchProps): Node`
Declarative multi-branch control flow primitive.
- Evaluates child `Match` definitions in order and mounts the first branch whose `when` condition evaluates to truthy.
- **Active Match Keying**: Re-renders when the active match changes (comparing the matched `Match` object, then its value), independent of `Show`'s boolean gate.
- Mounts `fallback?: () => Node` when no cases match.

### `Match<T>(props: MatchProps<T>): MatchProps<T>`
Declares a conditional branch definition within a `Switch` component.

### `For<T, K = unknown>(props: ForProps<T, K>): Node`
Keyed list differential reconciliation component. Reconciles dynamic collections with DOM node reuse via LIS optimization. Prunes duplicate-key tracking tokens after each reconcile.

---

## `@samrey/security`

### `escapeHtmlText(str: string): string`
Context-aware HTML escaping for text nodes (`&`, `<`, `>`, `"`, `'`).

### `sanitizeUri(uri: string, fallback?: string): string`
Sanitizes URLs against `javascript:`, `vbscript:`, and `data:` schemes.

### `sanitizeRedirectUri(uri: string, fallback?: string): string`
Enforces relative same-origin redirect targets.

### `getTrustedTypesPolicy(): TrustedTypePolicy`
Provides the native W3C Trusted Types policy or compliant fallback.

### `createCsrfToken(): string` / `verifyCsrfToken(a: string, b: string): boolean`
Generates entropy-backed CSRF tokens and verifies them via constant-time comparison.

---

## `@samrey/router`

### `createRouter(routes: RouteRecord[], initialPath?: string): RouterInstance`
Creates a reactive router instance.
- `.currentPath`: Computed signal of current path.
- `.currentParams`: Computed signal of active route parameters.
- `.navigate(path: string)`: Navigates safely to a new path.

### `matchPath(pattern: string, pathname: string): Record<string, string> | null`
Matches a parameterized URL pattern (e.g. `/users/:id`) against an incoming pathname.

### `matchRoutes(routes: RouteRecord[], pathname: string): RouteMatch | null`
Evaluates a collection of route records to find the first matching route and extracted parameters.

---

## `@samrey/http`

### `createResource<T>(fetcher: () => Promise<T>): Resource<T>`
### `createResource<T, S>(source: () => S, fetcher: (val: S) => Promise<T>): Resource<T>`
Creates an asynchronous reactive resource with automatic request deduplication and abort controller tracking.

### `HttpClient`
Zero-dependency HTTP client wrapper with built-in URL sanitization.

---

## `@samrey/forms`

### `createForm(options: FormOptions): FormInstance`
Initializes reactive form state with field validation and Standard Schema compliance.

### `bindField(element: HTMLInputElement, field: FormField, options?: BindFieldOptions): void`
Binds form state to DOM input with automatic ARIA attributes.

---

## `@samrey/ssr`

### `renderToString(app: () => unknown, options?: RenderToStringOptions): Promise<string>`
Renders application to complete HTML string with resolved data loaders.

### `renderToStream(app: () => unknown, options?: RenderToStreamOptions): ReadableStream<Uint8Array>`
Streams HTML chunks over Web Streams API.

### `generateStaticSite(routes: StaticRouteConfig[], options: SSGOptions): Promise<SSGResult>`
Generates pre-rendered HTML files and XML sitemaps.

### `hydrate(container: Element, app: () => unknown): HydrationResult`
Hydrates server-rendered DOM nodes and replays early user interactions.
