# Samrey Framework — Public API Contracts (API_CONTRACTS.md)

**Version:** 2.1.0  
**Status:** Living Canonical API Contract Specification

This document lists the exact, verified public APIs exported by all 13 official Samrey framework packages.

---

## 1. `@samrey/reactivity`

```ts
// Signals & Values
export function signal<T>(initialValue: T): Signal<T>;
export interface Signal<T> {
  value: T;
  get(): T;
  set(newValue: T): void;
  update(fn: (prev: T) => T): void;
}

// Derived State
export function computed<T>(fn: () => T): Computed<T>;
export interface Computed<T> {
  readonly value: T;
  get(): T;
}

// Side Effects
export function effect(fn: () => void | (() => void)): () => void;
export function batch<T>(fn: () => T): T;
export function untrack<T>(fn: () => T): T;

// Stores (Deep Reactive Proxies)
export function createStore<T extends object>(initialValue: T): [get: T, set: StoreMutator<T>];
export function produce<T extends object>(store: T, recipe: (draft: T) => void): void;
export function reconcile<T extends object>(target: T, source: Partial<T>): void;
export function isStore(val: unknown): boolean;

// Ownership & Lifecycle
export function createRoot<T>(fn: (dispose: () => void) => T): T;
export function createOwner(): Owner;
export function runWithOwner<T>(owner: Owner | null, fn: () => T): T;
export function getOwner(): Owner | null;
export function setOwner(owner: Owner | null): void;
export function onCleanup(fn: () => void): void;
export function onError(fn: (err: unknown) => void): void;

// Context
export function createContext<T>(defaultValue?: T): Context<T>;
export function useContext<T>(context: Context<T>): T | undefined;
```

---

## 2. `@samrey/runtime`

```ts
// Template Compilation & References
export function template(htmlString: string): TemplateResult;
export interface TemplateResult {
  (): Node;
  clone(): ClonedTemplate;
}
export interface ClonedTemplate extends HTMLElement {
  refs: Record<string, HTMLElement>;
}

// Surgical Reactive Bindings
export function bindText(element: Node, getter: () => string | number | null | undefined): () => void;
export function bindAttr(element: Element, attrName: string, getter: () => string | boolean | null | undefined): () => void;
export function bindClass(element: Element, className: string, getter: () => boolean): () => void;
export function bindStyle(element: HTMLElement, property: string, getter: () => string | null | undefined): () => void;
export function on(element: EventTarget, eventName: string, handler: (e: Event) => void, options?: boolean | AddEventListenerOptions): () => void;

// Control Flow Components (Called as functions, NOT HTML tags)
export function Show(props: {
  when: () => boolean | unknown;
  children: () => Node | string;
  fallback?: () => Node | string;
}): Node;

export function Switch(props: {
  fallback?: () => Node | string;
  children: MatchResult | MatchResult[];
}): Node;

export function Match(props: {
  when: () => boolean | unknown;
  children: () => Node | string;
}): MatchResult;

export function For<T>(props: {
  each: () => readonly T[] | T[];
  key: (item: T, index: number) => string | number;
  children: (item: T, index: () => number) => Node;
  fallback?: () => Node;
}): Node;

// Lifecycles & Error Boundaries
export function onMount(fn: () => void | Promise<void>): void;
export function onCleanup(fn: () => void): void;
export function ErrorBoundary(props: {
  fallback: (error: unknown, reset: () => void) => Node;
  children: () => Node;
}): Node;
export function Suspense(props: {
  fallback: () => Node;
  children: () => Node;
}): Node;
export function Portal(props: {
  target?: Element | string;
  children: () => Node;
}): Node;

// DOM Mounting & Hydration
export function mount(componentFactory: () => Node, container: Element): () => void;
export function hydrate(componentFactory: () => Node, container: Element): () => void;
```

---

## 3. `@samrey/compiler`

```ts
export function compileTemplate(source: string, options?: CompileOptions): CompileResult;
export function parseTemplate(source: string): TemplateAST;
export function buildAIR(ast: TemplateAST): AIR;
export function generateCode(air: AIR): string;
export function lintAccessibility(air: AIR): A11yDiagnostic[];
export function classifySecurityNode(node: ASTNode): SecurityClassification;

// Diagnostic Error Catalog
export class SamreyCompilerError extends Error {
  code: SamreyErrorCode;
  filename?: string;
  line: number;
  column: number;
  explanation: string;
  suggestion: string;
  sourceFrame?: string;
}
export function formatSamreyDiagnostic(err: SamreyCompilerError | DiagnosticOptions): string;
```

---

## 4. `@samrey/router`

```ts
export interface RouteRecord {
  path: string;
  component: () => Node;
  children?: RouteRecord[];
  beforeEnter?: (to: string, from: string) => boolean | Promise<boolean>;
}

export function createRouter(routes: RouteRecord[], options?: RouterOptions): Router;
export function RouterOutlet(): Node;
export function Link(props: { href: string; children: Node | string; class?: string }): HTMLElement;
export function useNavigate(): (path: string, options?: { replace?: boolean }) => void;
export function useLocation(): () => { pathname: string; search: string; hash: string };
export function useParams(): () => Record<string, string>;
export function useSearchParams(): () => URLSearchParams;
```

---

## 5. `@samrey/forms`

```ts
export interface FormConfig<T extends Record<string, unknown>> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>> | Promise<Partial<Record<keyof T, string>>>;
  onSubmit: (values: T) => void | Promise<void>;
}

export function createForm<T extends Record<string, unknown>>(config: FormConfig<T>): FormInstance<T>;
export interface FormInstance<T> {
  values: Signal<T>;
  errors: Signal<Partial<Record<keyof T, string>>>;
  touched: Signal<Partial<Record<keyof T, boolean>>>;
  isSubmitting: Signal<boolean>;
  isValid: Computed<boolean>;
  handleSubmit: (e?: Event) => Promise<void>;
  reset: () => void;
  setFieldValue: <K extends keyof T>(field: K, val: T[K]) => void;
  setFieldError: <K extends keyof T>(field: K, error: string) => void;
}

export function bindField<T extends Record<string, unknown>, K extends keyof T>(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  form: FormInstance<T>,
  field: K
): () => void;

export function computeAriaAttributes(error?: string, touched?: boolean): Record<string, string>;
```

---

## 6. `@samrey/http`

```ts
export function createResource<T, S = unknown>(
  source: () => S | false | null | undefined,
  fetcher: (source: S) => Promise<T>
): [data: ResourceSignal<T>, actions: ResourceActions<T>];

export function createResource<T>(
  fetcher: () => Promise<T>
): [data: ResourceSignal<T>, actions: ResourceActions<T>];

export interface ResourceSignal<T> {
  value: T | undefined;
  loading: Signal<boolean>;
  error: Signal<unknown | undefined>;
}

export interface ResourceActions<T> {
  mutate: (val: T) => void;
  refetch: () => Promise<T>;
}

export function createHttpClient(baseUrl?: string): HttpClient;
```

---

## 7. `@samrey/ssr`

```ts
export function renderToString(rootFn: () => Node | Promise<Node>, context?: SSRContext): Promise<string>;
export function renderToStream(rootFn: () => Node, context?: SSRContext): ReadableStream;
export function hydrate(rootFn: () => Node, container: Element): () => void;
export function serializeStateForHydration(state: Record<string, unknown>): string;
export function deserializeHydrationState(): Record<string, unknown>;
export function generatePreHydrationScript(): string;
export function stripSecrets<T extends object>(state: T): T;
```

---

## 8. `@samrey/security`

```ts
export function sanitizeHtml(untrustedHtml: string): string;
export function sanitizeUrl(untrustedUrl: string): string;
export function sanitizeCssStyle(untrustedCss: string): string;
export function isSafeUrl(url: string): boolean;
export function escapeHtmlText(str: string): string;
export function escapeHtmlAttribute(str: string): string;
export function generateCsrfToken(): string;
export function verifyCsrfToken(submittedToken: string, sessionToken: string): boolean;
export function scrubPrototypePollution<T extends object>(obj: T): T;
```

---

## 9. `@samrey/testing`

```ts
export function renderTest(componentFactory: () => Node | unknown): {
  container: HTMLElement;
  unmount: () => void;
};
export function fireEvent(element: Element, eventName: string, eventInit?: object): boolean;
export function flushReactivity(): Promise<void>;
export function waitFor(assertionFn: () => void | Promise<void>, options?: { timeout?: number; interval?: number }): Promise<void>;
export function cleanupAllTestContainers(): void;
```

---

## 10. `@samrey/devtools`

```ts
export function initDevTools(options?: DevToolsOptions): SamreyDevToolsBridge;
export function isDevToolsActive(): boolean;
export function getGraphSnapshot(): ReactiveGraphSnapshot;
```

---

## 11. `@samrey/ai`

```ts
export function validateSamreyCode(code: string, options?: ValidationOptions): ValidationReport;
export function diagnoseError(errorMessage: string, sourceCode?: string): DiagnosticDiagnosis;
export function searchDocs(query: string): DocResult[];
export function getDocumentation(sectionId: string): DocSection | null;
export function getApiReference(packageName: string): ApiReference | null;
export function getExamples(query?: string): CodeExample[];
export function installSkills(targetDir: string, force?: boolean): string[];
export function writeAllInstructions(projectRoot?: string, force?: boolean): string[];
```

---

## 12. `@samrey/mcp-server`

Standardized Model Context Protocol server exposing JSON-RPC over stdio.
Key tools:
- `samrey_get_project_context`
- `samrey_get_architecture`
- `samrey_get_api_contracts`
- `samrey_generate_component`
- `samrey_generate_feature`
- `samrey_validate_project`
- `samrey_fix_diagnostics`
- `samrey_check_accessibility`
- `samrey_check_security`
- `samrey_verify_application`

---

## 13. `@samrey/cli`

Command-line interface (`samrey` / `npx @samrey/cli`):
- `samrey create <name> [--template ssr|spa|minimal]`
- `samrey dev [--port <port>]`
- `samrey build`
- `samrey test`
- `samrey check [--json]`
- `samrey doctor [--json]`
- `samrey explain <code-or-error> [--json]`
- `samrey audit [--security] [--a11y] [--json]`
- `samrey generate <type> <name>`
