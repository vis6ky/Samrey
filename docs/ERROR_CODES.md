# Samrey Framework — Error Codes Reference

> **Samrey v2.1.0 Standard Diagnostic Error System**

Samrey features a centralized, deterministic error model defined in `ERROR_REGISTRY` (`@samrey/compiler`) with structured codes (`SAMREY-xxx`). Every error emitted by Samrey provides:
1. **Stable Error Code**: Machine-readable identifier with subsystem range prefix.
2. **Human-Readable Message**: Clear, concise statement of what went wrong.
3. **Actionable Explanation**: Root-cause architectural or runtime diagnosis.
4. **Source Location Frame**: Visual line and column indicator highlighting the offending code snippet (for compiler and template errors).
5. **Recovery Suggestion**: Concrete, copy-pasteable instructions for fixing the problem.

---

## Quick Reference Summary (`ERROR_REGISTRY` Authoritative Ranges)

| Code Range | Category | Package / Subsystem |
| :--- | :--- | :--- |
| `SAMREY-001` – `SAMREY-099` | CLI & Project Tooling | `@samrey/cli` |
| `SAMREY-101` – `SAMREY-199` | Compiler & Template Parsing | `@samrey/compiler` |
| `SAMREY-201` – `SAMREY-299` | Security & Accessibility | `@samrey/security`, `@samrey/compiler` |
| `SAMREY-301` – `SAMREY-399` | Reactivity, Runtime & SSR Hydration | `@samrey/reactivity`, `@samrey/runtime`, `@samrey/ssr` |
| `SAMREY-401` – `SAMREY-499` | Router & HTTP Resource Fetching | `@samrey/router`, `@samrey/http` |
| `SAMREY-501` – `SAMREY-599` | Forms & Validation | `@samrey/forms` |

---

## Detailed Error Code Catalog

### CLI & Project Tooling (`SAMREY-001` – `SAMREY-099`)

#### `SAMREY-001`: Invalid Project Name or Directory
- **Message**: `[SAMREY-001] Invalid project name or target directory.`
- **Explanation**: The project name is empty, contains forbidden path traversal sequences (`..`), absolute root paths, or illegal filename characters.
- **Suggestion**: Use alphanumeric characters, hyphens, and underscores (e.g. `samrey create my-dashboard-app`).

#### `SAMREY-002`: Unknown Starter Template
- **Message**: `[SAMREY-002] Unknown starter template "<name>".`
- **Explanation**: The `--template` argument provided to `samrey create` is not recognized.
- **Suggestion**: Specify one of the supported starter templates: `ssr`, `spa`, `minimal`, or `ssg`.

#### `SAMREY-003`: Invalid Server Port or Network Host
- **Message**: `[SAMREY-003] Invalid port number or host configuration.`
- **Explanation**: The port passed to `samrey dev` or `samrey preview` is out of the valid range (1–65535) or unavailable.
- **Suggestion**: Pass a valid open port number, e.g. `--port 3000`.

#### `SAMREY-004`: Unknown CLI Command
- **Message**: `[SAMREY-004] Unknown command "<command>".`
- **Explanation**: The requested CLI command is not registered.
- **Suggestion**: Run `samrey --help` to list all available commands (`create`, `dev`, `build`, `preview`, `test`, `audit`, `analyze`, `generate`).

#### `SAMREY-005`: Missing Generator Artifact
- **Message**: `[SAMREY-005] Missing artifact type or name for generator.`
- **Explanation**: `samrey generate` requires both an artifact type (`component`, `route`, `store`, `resource`) and a valid name.
- **Suggestion**: Run `samrey generate component UserProfile`.

---

### Compiler & Template Parsing (`SAMREY-101` – `SAMREY-199`)

#### `SAMREY-101`: Unclosed HTML Tag
- **Message**: `[SAMREY-101] Unclosed <TagName> tag, expected </TagName>`
- **Explanation**: An opening tag in a `.samrey` or `template(...)` string was not matched with a corresponding closing tag before the end of the template or parent container.
- **Example**:
  ```html
  <!-- ❌ Error -->
  <div>
    <p>Welcome to Samrey
  </div>

  <!-- ✅ Fix -->
  <div>
    <p>Welcome to Samrey</p>
  </div>
  ```
- **Suggestion**: Add closing tag `</TagName>` or use void/self-closing syntax where valid (e.g. `<input />`, `<br />`).

#### `SAMREY-102`: Invalid Expression / Unterminated Interpolation
- **Message**: `[SAMREY-102] Unterminated interpolation expression, missing "}"`
- **Explanation**: An interpolation expression was started with `{` in a template string but not properly closed with `}` or contains malformed syntax.
- **Example**:
  ```html
  <!-- ❌ Error -->
  <span>{user.name</span>

  <!-- ✅ Fix -->
  <span>{user.name}</span>
  ```
- **Suggestion**: Ensure all curly braces `{` are paired with closing `}` and expressions are syntactically valid.

#### `SAMREY-103`: Missing Required Directive Prop
- **Message**: `[SAMREY-103] Missing Required Directive Prop`
- **Explanation**: Control flow calls require specific properties: `Show()` requires `when` and `children`, and `For()` requires `each`, `key`, and `children`. (Note: Writing XML/JSX control flow tags in `.samrey` templates triggers `SAMREY-108`.)
- **Example**:
  ```ts
  // ✅ Compose control flow in TypeScript using Show() / For()
  import { signal } from '@samrey/reactivity';
  import { For, el } from '@samrey/runtime';

  const items = signal([{ id: 1, name: 'Item Alpha' }]);

  const list = el(
    'ul',
    null,
    For({
      each: () => items.value,
      key: (item) => item.id,
      children: (item) => el('li', null, item.name)
    })
  );
  ```
- **Suggestion**: Provide `when` and `children` for `Show({...})`, and `each`, `key`, and `children` for `For({...})` in TypeScript.

#### `SAMREY-104`: Unexpected Closing Tag
- **Message**: `[SAMREY-104] Mismatched closing tag </TagName>`
- **Explanation**: Encountered a closing tag that does not correspond to any active open tag in the AST hierarchy.
- **Suggestion**: Check tag nesting order and ensure closing tags match their opening counterpart in reverse order of opening.

#### `SAMREY-105`: Invalid Attribute Syntax
- **Message**: `[SAMREY-105] Invalid Attribute Syntax`
- **Explanation**: Attribute name or value contains invalid directive syntax (e.g., empty `class:` or `.` directive), unquoted strings, or an unterminated quote literal.
- **Suggestion**: Wrap static string attributes in quotes (`class="btn"`) and dynamic attributes or directives in curly braces (`class:active={isActive}`).

#### `SAMREY-106`: Unclosed Comment
- **Message**: `[SAMREY-106] Unclosed HTML comment`
- **Explanation**: An HTML comment `<!--` was opened in a template but reached the end of the file without a matching `-->`.
- **Suggestion**: Add `-->` to close the comment block.

#### `SAMREY-107`: Duplicate Attribute
- **Message**: `[SAMREY-107] Duplicate attribute "<name>" on <TagName>`
- **Explanation**: The same attribute name is defined multiple times on a single element.
- **Suggestion**: Remove or consolidate duplicate attribute declarations into a single attribute or dynamic binding.

#### `SAMREY-108`: Unsupported Template-Level Control Flow or Custom Component Tag
- **Message**: `[SAMREY-108] Unsupported template tag <TagName>: Template-level control flow is not supported. Compose it with Show()/For() in TypeScript.`
- **Explanation**: `@samrey/compiler` is a static HTML template compiler and intentionally rejects JSX/XML control flow tags (`<Show>`, `<For>`, `<Switch>`, `<Match>`, `<Dynamic>`, `<Portal>`) and capitalized custom component tags (`<MyWidget />`) inside `.samrey` or `template(...)` markup. Samrey composes control flow and components directly in plain TypeScript.
- **Example**:
  ```ts
  // ❌ Error: triggers SAMREY-108 in template() or .samrey files
  // template('<div><Show when={isOpen()}><span>Hi</span></Show></div>');

  // ✅ Fix: compose Show(), For(), and createComponent() in TypeScript
  import { signal } from '@samrey/reactivity';
  import { Show, el } from '@samrey/runtime';

  export function Greeting() {
    const isOpen = signal(true);
    return el(
      'div',
      null,
      Show({
        when: () => isOpen.value,
        children: () => el('span', null, 'Hi')
      })
    );
  }
  ```
- **Suggestion**: Compose control flow with `Show({...})` / `For({...})` and instantiate child components directly or via `createComponent(MyWidget, props)` in TypeScript.

#### `SAMREY-109`: Duplicate Template Reference
- **Message**: `[SAMREY-109] Duplicate template ref "<name>" on <TagName>`
- **Explanation**: A template `ref` attribute was defined multiple times with the same identifier within the template scope.
- **Suggestion**: Use unique `ref` names for each referenced element in the template.

#### `SAMREY-110`: Invalid Template Reference Identifier
- **Message**: `[SAMREY-110] Invalid template ref identifier "<name>" on <TagName>`
- **Explanation**: A template `ref` attribute value is not a valid JavaScript identifier.
- **Suggestion**: Reference names must match `/^[a-zA-Z_$][a-zA-Z0-9_$]*$/` (must start with a letter, `_`, or `$`, and contain no spaces or hyphens).

#### `SAMREY-111`: Unsupported Template Reference Placement
- **Message**: `[SAMREY-111] Unsupported template ref on <TagName>`
- **Explanation**: A template `ref` attribute was placed on an unsupported tag such as a capitalized custom component tag, control flow tag, or nested template.
- **Suggestion**: Place `ref` attributes directly on standard HTML elements within the template, and compose control flow with `Show()`/`For()` in TypeScript.

---

### Security & Accessibility (`SAMREY-201` – `SAMREY-299`)

#### `SAMREY-201`: Security Violation
- **Message**: `[SAMREY-201] Security Violation`
- **Explanation**: The template or component contains potentially dangerous code constructs such as `javascript:` / `vbscript:` / `data:text/html` URIs, unescaped raw HTML injection, or forbidden inline scripts.
- **Example**:
  ```ts
  // ❌ Error
  // el('a', { href: 'javascript:alert(1)' }, 'Click')

  // ✅ Fix
  import { el } from '@samrey/runtime';

  function handleClick() {
    console.log('Clicked safely');
  }

  const actionButton = el('button', { type: 'button', onClick: () => handleClick() }, 'Click');
  ```
- **Suggestion**: Use safe URL protocols (`http:`, `https:`, `mailto:`, relative paths) validated via `sanitizeUri()` and attach event handlers via `onClick` in `el()` or `on(el, 'click', handler)`.

#### `SAMREY-202`: Accessibility Non-Conformance
- **Message**: `[SAMREY-202] Accessibility Non-Conformance`
- **Explanation**: The element fails WCAG accessibility guidelines (e.g. `<img>` without `alt`, `<a>` without `href` or accessible label, `<button>` without accessible text or `aria-label`).
- **Suggestion**: Add meaningful `alt` attributes to `<img>` elements, `href` or `aria-label` to `<a>` elements, and accessible labels to interactive controls.

#### `SAMREY-203`: Prototype Pollution Detected
- **Message**: `[SAMREY-203] Security Violation: Dangerous object key "__proto__" or "constructor.prototype" detected`
- **Explanation**: Deserialized state payload or store mutation contained hazardous keys targeting `Object.prototype` pollution.
- **Suggestion**: Sanitize input payloads using `safeJsonParse()` or `scrubPrototypePollution()` from `@samrey/security`.

#### `SAMREY-204`: CSRF Token Mismatch
- **Message**: `[SAMREY-204] CSRF Token validation failed`
- **Explanation**: The incoming mutation request failed constant-time CSRF anti-forgery token verification via `validateCsrfToken()`.
- **Suggestion**: Generate tokens with `createCsrfToken()` and verify with `validateCsrfToken()` using constant-time comparison.

---

### Reactivity, Runtime & SSR Hydration (`SAMREY-301` – `SAMREY-399`)

#### `SAMREY-301`: Cyclic Reactive Graph Dependency
- **Message**: `[SAMREY-301] Cyclic reactive dependency detected in effect or computed signal`
- **Explanation**: A signal or computed dependency graph cycle was detected during propagation or effect execution (exceeding the cycle threshold).
- **Example**:
  ```ts
  import { signal, effect, untrack } from '@samrey/reactivity';

  // ❌ Error: triggers infinite cycle
  // const count = signal(0);
  // effect(() => {
  //   count.value = count.value + 1;
  // });

  // ✅ Fix
  const count = signal(0);
  effect(() => {
    const current = untrack(() => count.value);
    console.log('Count was:', current);
  });
  ```
- **Suggestion**: Avoid writing to a signal inside an `effect()` that synchronously reads that same signal without `untrack()`.

#### `SAMREY-302`: Duplicate Key in Keyed List
- **Message**: `[SAMREY-302] Duplicate key "<key>" detected in For() keyed reconciliation`
- **Explanation**: Multiple items in a `For({ each, key, children })` collection returned the identical key value, breaking DOM node reconciliation identity.
- **Example**:
  ```ts
  import { signal } from '@samrey/reactivity';
  import { For, el } from '@samrey/runtime';

  const users = signal([
    { id: 'u1', name: 'Alice' },
    { id: 'u2', name: 'Bob' }
  ]);

  const list = For({
    each: () => users.value,
    key: (user) => user.id,
    children: (user) => el('li', null, user.name)
  });
  ```
- **Suggestion**: Ensure the `key` callback passed to `For({...})` generates strictly unique identifiers across all active list items.

#### `SAMREY-303`: SSR Hydration Mismatch
- **Message**: `[SAMREY-303] SSR Hydration Mismatch`
- **Explanation**: The DOM structure or attribute rendered on the server (`renderToString` / `renderToStream`) does not match the client initial render during `hydrate()`.
- **Example**:
  ```ts
  import { signal } from '@samrey/reactivity';
  import { el, onMount } from '@samrey/runtime';

  export function ViewportBadge() {
    const width = signal<number | null>(null);

    // Defer browser-only APIs to onMount() so server & initial client DOM match
    onMount(() => {
      width.value = window.innerWidth;
    });

    return el('span', null, () => (width.value !== null ? `${width.value}px` : 'Loading...'));
  }
  ```
- **Suggestion**: Ensure server-rendered state and client initial state are identical, or defer browser-only reads (`window`, `localStorage`, dynamic timestamps) to `onMount()`.

---

### Router & HTTP Resource Fetching (`SAMREY-401` – `SAMREY-499`)

#### `SAMREY-401`: Route Resolution Error
- **Message**: `[SAMREY-401] Route Resolution Error`
- **Explanation**: The requested URL path did not match any registered route in `createRouter()` / `Router()` and no catch-all fallback route (`path: '*'`) was defined.
- **Example**:
  ```ts
  import { createRouter } from '@samrey/router';
  import { el } from '@samrey/runtime';

  const router = createRouter([
    { path: '/', component: () => el('h1', null, 'Home') },
    { path: '*', component: () => el('h1', null, '404 Not Found') }
  ]);
  ```
- **Suggestion**: Register a catch-all route (`{ path: '*', component: NotFoundView }`) or verify the navigation URL.

#### `SAMREY-402`: HTTP Resource Error
- **Message**: `[SAMREY-402] HTTP Resource Error`
- **Explanation**: A `createResource()` request or `HttpClient` call failed due to network unavailability, abort/timeout, or returned a non-2xx HTTP status code.
- **Example**:
  ```ts
  import { createResource } from '@samrey/http';
  import { Show, el } from '@samrey/runtime';

  const [data] = createResource(async () => {
    const res = await fetch('/api/items');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

  const view = Show({
    when: () => Boolean(data.error.value),
    children: () => el('p', { role: 'alert' }, () => `Failed to load: ${data.error.value?.message}`),
    fallback: () => el('pre', null, () => JSON.stringify(data.data.value ?? null))
  });
  ```
- **Suggestion**: Check endpoint availability, network status, and handle errors via `resource.error.value` or `ErrorBoundary({ fallback: (err) => ..., children: () => ... })`.

---

### Forms & Validation (`SAMREY-501` – `SAMREY-599`)

#### `SAMREY-501`: Form Validation Schema Error
- **Message**: `[SAMREY-501] Form Validation Schema Error`
- **Explanation**: Form input values failed field validators or Standard Schema (`~standard` v1) validation constraints during `form.submit()`.
- **Example**:
  ```ts
  import { createForm, validators } from '@samrey/forms';
  import { el } from '@samrey/runtime';

  const form = createForm({
    initialValues: { email: '' },
    validators: {
      email: [validators.required('Email is required'), validators.email('Invalid email')]
    },
    onSubmit: async (values) => {
      console.log('Valid submit:', values);
    }
  });

  const errorBanner = el('p', { role: 'alert' }, () => form.fields.email.error.value ?? '');
  ```
- **Suggestion**: Verify field validation requirements and inspect `form.fields.<name>.error.value` and `form.formError.value`.

---

## Development-Only Runtime Diagnostic Events (`@samrey/runtime`)

In addition to `ERROR_REGISTRY`, `@samrey/runtime` emits non-fatal development diagnostics via `onDevDiagnostic()` / `getDevDiagnosticHistory()` (stripped in production builds when `isDev` is false):

| Dev Diagnostic Code | Type | Trigger |
| :--- | :--- | :--- |
| `SAMREY-301` | `reactive-graph` | Potential cycle / reactive graph warning via `reportReactiveGraphWarning()` |
| `SAMREY-302` | `unnecessary-update` | Redundant signal write detected via `reportUnnecessaryUpdate()` |
| `SAMREY-401` | `hydration-mismatch` | Runtime dev warning logged by `reportHydrationMismatch()` when hydrated DOM differs |
| `SAMREY-501` | `duplicate-key` | Duplicate key detected during `For()` reconciliation (`reportDuplicateKey()`) |
| `SAMREY-502` | `unnecessary-update` | Item reference changed under same key in `For()` without reactive signals (`reportStaleItemWarning()`) |
| `SAMREY-ROUTER-404` | `router-error` | Navigation / route error logged via `reportRouterError()` |
| `SAMREY-RES-ERR` | `resource-error` | Async resource failure logged via `reportResourceError()` |
