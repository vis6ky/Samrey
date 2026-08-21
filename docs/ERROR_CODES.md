# Aether Framework — Error Codes Reference

> **Aether v1.0.0-rc.1 Standard Diagnostic Error System**

Aether features a centralized, deterministic error model with structured codes (`AETH-xxx`). Every error emitted by Aether provides:
1. **Stable Error Code**: Machine-readable identifier with category prefix.
2. **Human-Readable Message**: Clear, concise statement of what went wrong.
3. **Actionable Explanation**: Root-cause architectural or runtime diagnosis.
4. **Source Location Frame**: Visual line and column indicator highlighting the offending code snippet (for compiler and template errors).
5. **Recovery Suggestion**: Concrete, copy-pasteable instructions for fixing the problem.

---

## Quick Reference Summary

| Code Range | Category | Package / Subsystem |
| :--- | :--- | :--- |
| `AETH-001` – `AETH-099` | CLI & Project Tooling | `@aether/cli` |
| `AETH-101` – `AETH-199` | Compiler & Parsing | `@aether/compiler` |
| `AETH-201` – `AETH-299` | Security & Accessibility | `@aether/security`, `@aether/compiler` |
| `AETH-301` – `AETH-399` | Reactivity & Runtime | `@aether/reactivity`, `@aether/runtime` |
| `AETH-401` – `AETH-499` | Router & Navigation | `@aether/router` |
| `AETH-501` – `AETH-599` | Forms & Validation | `@aether/forms` |
| `AETH-601` – `AETH-699` | HTTP & Data Fetching | `@aether/http` |
| `AETH-701` – `AETH-799` | SSR & Hydration | `@aether/ssr` |
| `AETH-801` – `AETH-899` | DevTools & Testing | `@aether/devtools`, `@aether/testing` |

---

## Detailed Error Code Catalog

### CLI & Project Tooling (`AETH-001` – `AETH-099`)

#### `AETH-001`: Invalid Project Name or Directory
- **Message**: `[AETH-001] Invalid project name or target directory.`
- **Explanation**: The project name is empty, contains forbidden path traversal sequences (`..`), absolute root paths, or illegal filename characters.
- **Suggestion**: Use alphanumeric characters, hyphens, and underscores (e.g. `aether create my-dashboard-app`).

#### `AETH-002`: Unknown Starter Template
- **Message**: `[AETH-002] Unknown starter template "<name>".`
- **Explanation**: The `--template` argument provided to `aether create` is not recognized.
- **Suggestion**: Specify one of the supported starter templates: `ssr`, `spa`, `minimal`, or `ssg`.

#### `AETH-003`: Invalid Server Port or Network Host
- **Message**: `[AETH-003] Invalid port number or host configuration.`
- **Explanation**: The port passed to `aether dev` or `aether preview` is out of the valid range (1–65535) or unavailable.
- **Suggestion**: Pass a valid open port number, e.g. `--port 3000`.

#### `AETH-004`: Unknown CLI Command
- **Message**: `[AETH-004] Unknown command "<command>".`
- **Explanation**: The requested CLI command is not registered.
- **Suggestion**: Run `aether --help` to list all available commands (`create`, `dev`, `build`, `preview`, `test`, `audit`, `analyze`, `generate`).

#### `AETH-005`: Missing Generator Artifact
- **Message**: `[AETH-005] Missing artifact type or name for generator.`
- **Explanation**: `aether generate` requires both an artifact type (`component`, `route`, `store`, `resource`) and a valid name.
- **Suggestion**: Run `aether generate component UserProfile`.

---

### Compiler & Template Parsing (`AETH-101` – `AETH-199`)

#### `AETH-101`: Unclosed HTML/JSX Tag
- **Message**: `[AETH-101] Unclosed HTML/JSX tag <TagName>`
- **Explanation**: An opening element tag was not matched with a corresponding closing tag before the end of the template file or parent container.
- **Example**:
  ```tsx
  // ❌ Error
  <div>
    <p>Welcome to Aether
  </div>

  // ✅ Fix
  <div>
    <p>Welcome to Aether</p>
  </div>
  ```
- **Suggestion**: Check for missing closing tags or self-closing syntax (e.g., `<input />`, `<br />`, `<Component />`).

#### `AETH-102`: Invalid Expression / Unclosed Interpolation
- **Message**: `[AETH-102] Invalid expression or unclosed curly brace`
- **Explanation**: A reactive interpolation expression was opened with `{` but was not closed with `}` or contains syntax errors.
- **Example**:
  ```tsx
  // ❌ Error
  <span>{user.name</span>

  // ✅ Fix
  <span>{user.name}</span>
  ```
- **Suggestion**: Ensure all curly brackets are balanced and the enclosed JavaScript/TypeScript expression is syntactically valid.

#### `AETH-103`: Missing Required Directive Prop
- **Message**: `[AETH-103] Missing required directive prop on <Show> or <For>`
- **Explanation**: Built-in control flow components require specific props: `<Show>` requires `when`, and `<For>` requires `each` and `key`.
- **Example**:
  ```tsx
  // ❌ Error
  <For each={items()}>
    {(item) => <li>{item.name}</li>}
  </For>

  // ✅ Fix
  <For each={items()} key="id">
    {(item) => <li>{item.name}</li>}
  </For>
  ```
- **Suggestion**: Provide `when` for `<Show>`, and `each` and `key` for `<For>`.

#### `AETH-104`: Unexpected Closing Tag
- **Message**: `[AETH-104] Unexpected closing tag </TagName>`
- **Explanation**: Encountered a closing tag that does not correspond to the currently open tag in the AST hierarchy.
- **Suggestion**: Check nesting order of elements and ensure tags are closed in reverse order of opening.

#### `AETH-105`: Invalid Attribute Syntax
- **Message**: `[AETH-105] Invalid attribute syntax`
- **Explanation**: An attribute name or value contains unquoted strings, unbalanced quotes, or malformed dynamic bindings.
- **Suggestion**: Wrap static string attributes in double quotes (`class="btn"`) and dynamic attributes in curly braces (`class={active() ? 'active' : ''}`).

#### `AETH-106`: Unclosed Comment
- **Message**: `[AETH-106] Unclosed HTML comment`
- **Explanation**: An HTML comment `<!--` reached the end of the file without a matching `-->`.
- **Suggestion**: Close comment blocks with `-->`.

#### `AETH-107`: Duplicate Attribute
- **Message**: `[AETH-107] Duplicate attribute "<name>" on element`
- **Explanation**: The same attribute name is declared multiple times on a single element.
- **Suggestion**: Consolidate duplicate attributes into a single dynamic binding or class expression.

---

### Security & Accessibility (`AETH-201` – `AETH-299`)

#### `AETH-201`: Security Violation (Dangerous Scheme / Unsafe Payload)
- **Message**: `[AETH-201] Security Violation: Insecure URI or raw script injection detected`
- **Explanation**: The template contains potentially dangerous URL schemes (`javascript:`, `data:text/html`), raw script blocks, or unescaped HTML injection.
- **Example**:
  ```tsx
  // ❌ Error
  <a href="javascript:alert(1)">Click</a>

  // ✅ Fix
  <button type="button" onClick={() => handleClick()}>Click</button>
  ```
- **Suggestion**: Use safe URL protocols (`http:`, `https:`, `mailto:`, relative paths) and event listeners (`onClick`) rather than inline JavaScript URIs.

#### `AETH-202`: Accessibility Non-Conformance
- **Message**: `[AETH-202] Accessibility Violation: Missing required accessibility attribute`
- **Explanation**: The element fails WCAG AA guidelines (e.g. `<img>` without `alt`, `<button>` without accessible text or `aria-label`, `<input>` without an associated `<label>`).
- **Suggestion**: Add an `alt` attribute to image elements, meaningful text or `aria-label` to interactive buttons, and `id`/`for` association to form inputs.

#### `AETH-203`: Prototype Pollution Detected
- **Message**: `[AETH-203] Security Violation: Dangerous object key "__proto__" or "constructor.prototype" detected`
- **Explanation**: Deserialized state payload or store mutation contained hazardous keys targeting Object prototype pollution.
- **Suggestion**: Sanitize input payloads using `safeJsonParse()` and avoid passing untrusted user input directly to object spread/assign.

#### `AETH-204`: CSRF Token Mismatch
- **Message**: `[AETH-204] CSRF Token validation failed`
- **Explanation**: The incoming mutation request failed CSRF anti-forgery token verification.
- **Suggestion**: Ensure the client sends the `X-CSRF-Token` header matching the session cookie.

---

### Reactivity & Runtime (`AETH-301` – `AETH-399`)

#### `AETH-301`: Cyclic Reactive Graph Dependency / Infinite Loop
- **Message**: `[AETH-301] Cyclic reactive dependency detected in effect or computed signal`
- **Explanation**: An effect synchronously writes to a signal that it also reads, causing an infinite reaction cycle exceeding the maximum propagation threshold (100 iterations).
- **Example**:
  ```ts
  // ❌ Error
  const count = signal(0);
  effect(() => {
    count.value = count.value + 1; // Infinite loop!
  });

  // ✅ Fix
  const count = signal(0);
  effect(() => {
    const current = untrack(() => count.value);
    console.log('Count was:', current);
  });
  ```
- **Suggestion**: Use `untrack()` to read signals without subscribing, or decouple signal writes into event handlers.

#### `AETH-302`: Duplicate Key in Keyed List
- **Message**: `[AETH-302] Duplicate key "<key>" detected in <For> keyed reconciliation`
- **Explanation**: Multiple items in a `<For>` collection returned the identical key identifier, breaking DOM node reconciliation mapping.
- **Suggestion**: Ensure every item has a strictly unique `key` attribute or provide a unique ID selector callback.

#### `AETH-303`: Lifecycle Hook Outside Owner Context
- **Message**: `[AETH-303] Lifecycle hook (onMount, onCleanup) called outside reactive owner context`
- **Explanation**: `onMount()` or `onCleanup()` was invoked in asynchronous code or outside a component setup scope without an active owner.
- **Suggestion**: Call lifecycle hooks synchronously within the component function body.

#### `AETH-304`: Missing Context Provider
- **Message**: `[AETH-304] Context not found in hierarchy and no default value defined`
- **Explanation**: `useContext(MyContext)` was called in a component tree where `<MyContext.Provider>` was not provided as an ancestor.
- **Suggestion**: Wrap the component subtree with `<MyContext.Provider value={...}>` or provide a default fallback value in `createContext(defaultValue)`.

---

### Router & Navigation (`AETH-401` – `AETH-499`)

#### `AETH-401`: Route Not Found / Unmatched Path
- **Message**: `[AETH-401] Route not found for path "<path>"`
- **Explanation**: The active browser URL does not match any registered `<Route>` and no catch-all wildcard (`path="*"`) fallback was registered.
- **Suggestion**: Add a fallback route `<Route path="*" component={NotFoundView} />`.

#### `AETH-402`: Invalid Route Definition
- **Message**: `[AETH-402] Invalid route: missing path or component`
- **Explanation**: A `<Route>` element was registered without a string `path` or without a valid component function.
- **Suggestion**: Provide both `path` and `component` props (e.g. `<Route path="/users" component={UsersView} />`).

#### `AETH-403`: Navigation Guard Rejection
- **Message**: `[AETH-403] Navigation to "<path>" was cancelled by navigation guard`
- **Explanation**: A router `beforeEach` or route-level guard returned `false` or redirected to another route.
- **Suggestion**: Review authentication or authorization checks in your navigation guards.

---

### Forms & Validation (`AETH-501` – `AETH-599`)

#### `AETH-501`: Form Validation Schema Error
- **Message**: `[AETH-501] Form submission rejected: Schema validation failed`
- **Explanation**: Form input data failed constraints specified in the Standard Schema (`~standard` v1).
- **Suggestion**: Review the `form.errors()` signal and display actionable field error messages to the user.

#### `AETH-502`: Unregistered Field Access
- **Message**: `[AETH-502] Field "<name>" is not registered in the form schema`
- **Explanation**: Attempted to bind to or query a form field name that does not exist in the defined schema.
- **Suggestion**: Ensure field names match schema property definitions exactly.

---

### HTTP & Data Fetching (`AETH-601` – `AETH-699`)

#### `AETH-601`: HTTP Resource Request Failure
- **Message**: `[AETH-601] HTTP request failed with status <status>`
- **Explanation**: An API fetch performed via `createResource` or `httpClient` failed due to network unavailability, CORS failure, or a non-2xx status code.
- **Suggestion**: Verify API endpoint availability and handle errors using `<ErrorBoundary fallback={(err) => ...}>`.

#### `AETH-602`: Resource Serialization Error
- **Message**: `[AETH-602] Failed to serialize or deserialize HTTP payload`
- **Explanation**: The response body could not be parsed as JSON or the request body could not be stringified.
- **Suggestion**: Verify that the server returns valid JSON with `Content-Type: application/json`.

#### `AETH-603`: Request Aborted
- **Message**: `[AETH-603] HTTP request was aborted by timeout or signal`
- **Explanation**: The network request was cancelled because the component was unmounted or the timeout exceeded.
- **Suggestion**: Adjust request timeout limits or handle aborted states gracefully in UI.

---

### SSR & Hydration (`AETH-701` – `AETH-799`)

#### `AETH-701`: SSR Hydration Mismatch
- **Message**: `[AETH-701] Hydration mismatch: Client DOM does not match server-rendered HTML`
- **Explanation**: The client initial render produced different HTML structure, tag types, or text content than the server HTML.
- **Suggestion**: Avoid reading browser-only globals (`window`, `localStorage`, random values, or dynamic current timestamps) during the initial render pass. Defer browser-specific operations to `onMount()`.

#### `AETH-702`: SSR Sensitive State Scrubbed
- **Message**: `[AETH-702] SSR Secret Guard: Sensitive credential stripped from serialized state`
- **Explanation**: Server state serialized into the HTML document contained secret keys (e.g. `password`, `apiKey`, `jwtToken`, `database_url`).
- **Suggestion**: Do not include private server-only credentials in client-shared state. Use server endpoints or environment variables on the backend.

#### `AETH-703`: SSR Stream Render Failure
- **Message**: `[AETH-703] Error during streaming HTML rendering`
- **Explanation**: An unhandled exception was thrown while streaming HTML document chunks to the response stream.
- **Suggestion**: Wrap dynamic components in `<ErrorBoundary>` to catch errors and emit fallback markup during streaming.

---

### DevTools & Testing (`AETH-801` – `AETH-899`)

#### `AETH-801`: DevTools Bridge Connection Failure
- **Message**: `[AETH-801] DevTools bridge connection failure`
- **Explanation**: DevTools could not attach to the global window hook or serialize the reactive dependency graph.
- **Suggestion**: Verify that `@aether/devtools` is initialized after the runtime mounts.

#### `AETH-802`: Test Component Mount Failure
- **Message**: `[AETH-802] Test container or component invalid`
- **Explanation**: The testing harness `mountTestComponent()` was passed a null container or invalid component function.
- **Suggestion**: Ensure `render()` in `@aether/testing` receives a valid component callback `() => <Component />`.
