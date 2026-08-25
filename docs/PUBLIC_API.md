# Samrey Framework — Public API Authoritative Reference

> **Samrey v1.0.0 Formal API Contract & Package Specification**

This document serves as the authoritative Public API contract for all 11 packages comprising the Samrey Framework.

---

## Architectural Principles

1. **Standalone Purity**: Samrey uses only Samrey. Zero runtime dependencies on external frameworks (React, Vue, Angular, Svelte, Solid, Preact, Lit, etc.).
2. **Fine-Grained Reactivity**: Signal graph propagation without Virtual DOM diffing. DOM nodes are created once and updated directly via signal subscriptions.
3. **Deterministic Type Safety**: TypeScript-first architecture with strict generic inference and full IDE autocomplete.
4. **Security by Default**: Automatic URI sanitization, template XSS defense, prototype pollution scrubbing, and SSR secret stripping.

---

## 1. `@samrey/reactivity`

Fine-grained reactive foundation and state management.

### Public Exports

| Export | Type | Description | Target |
| :--- | :--- | :--- | :--- |
| `signal<T>(initialValue: T)` | Function | Creates a read-write reactive signal. | Universal |
| `computed<T>(fn: () => T)` | Function | Creates a lazily-evaluated cached derivation. | Universal |
| `effect(fn: () => void \| (() => void))` | Function | Creates an active side-effect subscriber. Returns a disposal function. | Universal |
| `batch<T>(fn: () => T)` | Function | Groups multiple signal updates into a single notification cycle. | Universal |
| `untrack<T>(fn: () => T)` | Function | Reads signal values without creating a reactive subscription. | Universal |
| `createStore<T extends object>(initial: T)` | Function | Creates a deep reactive proxy store with fine-grained path tracking. | Universal |
| `produce<T>(draft: T, fn: (draft: T) => void)` | Function | Performs immutable-style mutable draft updates on store state. | Universal |
| `reconcile<T>(target: T, source: T)` | Function | Structural state reconciliation algorithm preserving unchanged node references. | Universal |
| `createMemo<T>(fn: () => T)` | Function | Alias for `computed` memoized derivation. | Universal |
| `createRoot<T>(fn: (dispose: () => void) => T)` | Function | Creates an isolated reactive ownership scope with manual teardown. | Universal |
| `getOwner()` | Function | Returns the active reactive Owner node in current execution context. | Universal |
| `runWithOwner<T>(owner: Owner, fn: () => T)` | Function | Executes a function under a specific reactive ownership scope. | Universal |
| `onCleanup(fn: () => void)` | Function | Registers a disposal callback for the active reactive owner. | Universal |
| `createContext<T>(defaultValue?: T)` | Function | Creates a dependency injection context identifier. | Universal |
| `useContext<T>(context: Context<T>)` | Function | Retrieves context value provided by the nearest ancestor provider. | Universal |

### Key TypeScript Types

```ts
export interface Signal<T> {
  value: T;
  peek(): T;
  subscribe(fn: (val: T) => void): () => void;
}

export interface ReadonlySignal<T> {
  readonly value: T;
  peek(): T;
  subscribe(fn: (val: T) => void): () => void;
}

export interface Owner {
  parent: Owner | null;
  children: Owner[];
  cleanups: (() => void)[];
  context?: Map<symbol, unknown>;
  dispose(): void;
}

export interface Context<T> {
  readonly id: symbol;
  readonly defaultValue?: T;
  Provider(props: { value: T; children: any }): any;
}
```

---

## 2. `@samrey/runtime`

Direct DOM instantiation, reactive bindings, lifecycle hooks, and control flow.

### Public Exports

| Export | Type | Description | Target |
| :--- | :--- | :--- | :--- |
| `el(tag, props, ...children)` | Function | Creates and configures a real DOM Element with reactive attribute bindings. | Browser |
| `svg(tag, props, ...children)` | Function | Creates an SVG namespace DOM element. | Browser |
| `fragment(...children)` | Function | Creates a lightweight DOM DocumentFragment. | Browser |
| `text(content)` | Function | Creates a reactive DOM TextNode updated via signal bindings. | Browser |
| `mount(component, container)` | Function | Mounts a root component into a DOM element with lifecycle scope. Returns unmount function. | Browser |
| `hydrate(component, container)` | Function | Hydrates server-rendered HTML into an interactive client DOM tree without redraw. | Browser |
| `Show` | Component | Conditional rendering component (`when`, `fallback`, `children`). | Universal |
| `For` | Component | High-performance keyed list reconciliation component (`each`, `key`, `children`, `fallback`). | Universal |
| `Switch` / `Match` | Components | Multi-branch conditional selection control flow. | Universal |
| `ErrorBoundary` | Component | Declarative error boundary catching component subtree errors with fallback rendering. | Universal |
| `Dynamic` | Component | Renders a dynamic component or HTML tag determined at runtime (`component`, props). | Universal |
| `Portal` | Component | Teleports children elements into a separate DOM container target (e.g. `document.body`). | Browser |
| `Suspense` | Component | Displays fallback while asynchronous resources are pending. | Universal |
| `onMount(fn: () => void)` | Function | Registers a callback executed once after the component mounts into the DOM. | Browser |
| `onCleanup(fn: () => void)` | Function | Registers a callback executed when the component is unmounted or recomputed. | Universal |
| `onError(fn: (err: unknown) => void)` | Function | Registers an error handler for errors in child reactive scopes. | Universal |
| `createComponent(Comp, props)` | Function | Instantiates a component function inside a new reactive owner node. | Universal |

---

## 3. `@samrey/security`

Zero-trust sanitization, CSP enforcement, URI scheme verification, and anti-forgery.

### Public Exports

| Export | Type | Description | Target |
| :--- | :--- | :--- | :--- |
| `sanitizeHtml(input: string)` | Function | Escapes raw HTML tags and dangerous tokens to prevent XSS. | Universal |
| `sanitizeUrl(url: string)` | Function | Strips dangerous schemes (`javascript:`, `data:text/html`, `vbscript:`). | Universal |
| `sanitizeAttribute(attr, val)` | Function | Context-aware attribute sanitizer. | Universal |
| `isSafeUrl(url: string)` | Function | Validates if a URL uses a safe protocol (`http`, `https`, `mailto`, relative). | Universal |
| `safeJsonParse<T>(json: string)` | Function | Deserializes JSON while neutralizing prototype pollution keys (`__proto__`, `constructor`). | Universal |
| `safeJsonStringify(obj: unknown)` | Function | Serializes JSON safely with Unicode HTML entity escaping (`<` -> `\u003c`). | Universal |
| `createCsrfToken(secret: string)` | Function | Generates a cryptographically secure CSRF session token. | Universal |
| `validateCsrfToken(token, secret)` | Function | Validates CSRF token authenticity and timestamp expiration. | Universal |
| `TrustedTypesPolicy` | Class | Manages browser Trusted Types security policy integration. | Browser |

---

## 4. `@samrey/compiler`

Samrey Intermediate Representation (AIR), security AST classifier, a11y linter, and code generation.

### Public Exports

| Export | Type | Description | Target |
| :--- | :--- | :--- | :--- |
| `compileTemplate(source, options?)` | Function | Compiles JSX/HTML templates into optimized reactive JavaScript code with static template hoisting. | Node / Universal |
| `parseTemplate(source, options?)` | Function | Parses template syntax into an Samrey AST. | Node / Universal |
| `buildAIR(ast, options?)` | Function | Transforms AST into Samrey Intermediate Representation (AIR). | Node / Universal |
| `generateCode(air, options?)` | Function | Emits production JavaScript code with cloneNode calls and targeted signal bindings. | Node / Universal |
| `classifySecurityNode(node)` | Function | Classifies AST nodes for dynamic security risks. | Node / Universal |
| `lintAccessibility(ast)` | Function | Audits AST nodes against WCAG AA accessibility standards. | Node / Universal |
| `SamreyCompilerError` | Class | Structured compiler error class with source frames. | Node / Universal |
| `generateSourceFrame(src, l, c)` | Function | Generates a terminal-friendly visual code pointer frame. | Node / Universal |
| `ERROR_REGISTRY` | Constant | Catalog of compiler and framework error definitions. | Node / Universal |

---

## 5. `@samrey/router`

Declarative client-side and SSR-compatible routing with zero dependencies.

### Public Exports

| Export | Type | Description | Target |
| :--- | :--- | :--- | :--- |
| `Router` | Component | Root router provider managing browser/memory history and matching. | Universal |
| `Route` | Component | Declarative route definition (`path`, `component`, `guard`). | Universal |
| `Link` | Component | Accessible client navigation anchor with pushState interception and active class styling. | Browser |
| `useRouter()` | Function | Returns the active Router instance with `navigate()`, `back()`, `forward()`. | Universal |
| `useParams<T>()` | Function | Returns a reactive signal of URL route parameters (e.g. `:id`). | Universal |
| `useSearchParams()` | Function | Returns reactive search/query parameters with setter. | Universal |
| `useLocation()` | Function | Returns reactive signal of current pathname, search, and hash. | Universal |
| `matchRoute(pattern, path)` | Function | Fast regex-compiled parameterized route pattern matcher. | Universal |
| `createBrowserHistory()` | Function | Creates HTML5 pushState history manager. | Browser |
| `createMemoryHistory(initial?)`| Function | Creates an in-memory history manager for tests and SSR. | Universal |

---

## 6. `@samrey/http`

Declarative asynchronous resource management and typed HTTP client.

### Public Exports

| Export | Type | Description | Target |
| :--- | :--- | :--- | :--- |
| `createResource<T, S>(source, fetcher, options?)` | Function | Creates a reactive async resource signal (`data`, `loading`, `error`, `refetch`, `mutate`). | Universal |
| `httpClient` | Object | Typed HTTP client with `get`, `post`, `put`, `patch`, `delete`. | Universal |
| `createHttpCache(options?)` | Function | Creates an in-memory stale-while-revalidate HTTP cache with TTL. | Universal |
| `HttpError` | Class | Structured HTTP request failure error class. | Universal |

### Key TypeScript Types

```ts
export interface ResourceReturn<T> {
  data: ReadonlySignal<T | undefined>;
  loading: ReadonlySignal<boolean>;
  error: ReadonlySignal<Error | null>;
  refetch: () => Promise<T>;
  mutate: (updater: T | ((prev: T | undefined) => T)) => void;
}
```

---

## 7. `@samrey/forms`

Standard Schema (`~standard` v1) form state, dirty tracking, and accessible ARIA attributes.

### Public Exports

| Export | Type | Description | Target |
| :--- | :--- | :--- | :--- |
| `createForm<T>(options)` | Function | Creates a reactive form manager with validation, dirty states, and submit handling. | Universal |
| `createField<T, K>(form, name, options?)` | Function | Creates a reactive field controller with input bindings (`value`, `error`, `dirty`, `touched`). | Universal |
| `validateSchema(schema, data)` | Function | Executes Standard Schema (`~standard`) validation on arbitrary data. | Universal |
| `getAccessibleFieldProps(field)` | Function | Generates `aria-invalid`, `aria-describedby`, and `aria-required` attribute bags. | Universal |

---

## 8. `@samrey/ssr`

Server-Side Rendering, Streaming HTML, Secret Stripping, and Static Site Generation (SSG).

### Public Exports

| Export | Type | Description | Target |
| :--- | :--- | :--- | :--- |
| `renderToString(fn, options?)` | Function | Renders an Samrey component tree into static HTML with state hydration tags. | Server / Node |
| `renderToStream(fn, options?)` | Function | Renders an Samrey component tree into a chunked web `ReadableStream`. | Server / Node |
| `generateStaticSite(options)` | Function | Generates static pre-rendered HTML files across a route manifest (SSG). | Server / Node |
| `hydrateFromSSR(fn, container)` | Function | Reconnects client event listeners and reactive signals to server-rendered HTML. | Browser |
| `escapeHtml(str: string)` | Function | Escapes raw characters (`&`, `<`, `>`, `"`, `'`) for safe HTML output. | Server / Node |
| `escapeJsonState(obj: unknown)` | Function | Escapes JSON stringified state against `</script>` tag breakout. | Server / Node |
| `sanitizeSsrState(state, opts?)`| Function | Scrubs secret credentials and sensitive keys from client state payload. | Server / Node |

---

## 9. `@samrey/testing`

DOM component mounting, simulated user events, and async testing utilities.

### Public Exports

| Export | Type | Description | Target |
| :--- | :--- | :--- | :--- |
| `renderTestComponent(fn, options?)` | Function | Mounts a component into an isolated test DOM node and returns querying helpers. | Universal |
| `fireEvent` | Object | Simulated event dispatcher (`click`, `input`, `change`, `keydown`, `submit`). | Universal |
| `waitFor(assertion, options?)` | Function | Polls an assertion until it passes or times out. | Universal |
| `waitForNextUpdate()` | Function | Waits for the next microtask reactive propagation cycle. | Universal |
| `createMockResource<T>(data)` | Function | Creates an instant mocked resource for unit tests. | Universal |
| `cleanupAllTestContainers()` | Function | Cleans up and unmounts all test containers created during tests. | Universal |

---

## 10. `@samrey/devtools`

Visual graph topology inspector, component tree inspector, and performance telemetry.

### Public Exports

| Export | Type | Description | Target |
| :--- | :--- | :--- | :--- |
| `initDevTools(options?)` | Function | Initializes browser window bridge (`window.__SAMREY_DEVTOOLS__`). | Browser |
| `SamreyDevToolsBridge` | Class | Core communication bridge between framework runtime and DevTools UI. | Browser |
| `ReactiveGraphInspector` | Class | Generates node/edge graph representations of signal dependencies. | Browser |
| `ComponentInspector` | Class | Inspects active component hierarchy and props. | Browser |
| `PerfInspector` | Class | Tracks render times, mutation counts, and memory allocation estimates. | Browser |

---

## 11. `@samrey/cli`

Project initialization, development server, production builder, preview server, and audit engine.

### Public Exports

| Export | Type | Description | Target |
| :--- | :--- | :--- | :--- |
| `runCLI(args: string[])` | Function | Programmatic CLI entry point executing commands. | Node |
| `generateStarterProject(name, opts)` | Function | Generates starter project file dictionary for `ssr`, `spa`, `minimal`, or `ssg`. | Node |
| `samreyVitePlugin(options?)` | Function | Vite plugin compiling `.samrey`, `.tsx`, `.jsx` templates via `@samrey/compiler`. | Node |
| `runCreateCommand(options)` | Function | Executes `samrey create <name>`. | Node |
| `runDevCommand(options)` | Function | Executes `samrey dev`. | Node |
| `runBuildCommand(options)` | Function | Executes `samrey build`. | Node |
| `runPreviewCommand(options)` | Function | Executes `samrey preview`. | Node |
| `runTestCommand(options)` | Function | Executes `samrey test`. | Node |
| `runAuditCommand(options)` | Function | Executes `samrey audit`. | Node |
| `runAnalyzeCommand(options)` | Function | Executes `samrey analyze`. | Node |
| `runGenerateCommand(options)` | Function | Executes `samrey generate <type> <name>`. | Node |
