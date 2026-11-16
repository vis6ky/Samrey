# Samrey Framework — Error & Diagnostic Reference (ERROR_REFERENCE.md)

**Version:** 2.1.0  
**Authority:** Canonical Diagnostic Codes & Solutions Catalog

This reference lists all diagnostic error codes emitted by the Samrey compiler and runtime, along with their causes, explanations, and verifiable resolutions.

---

## 1. Compiler Diagnostics (SAMREY-100 Series)

### SAMREY-101: Unclosed Tag
- **Severity**: Error
- **Cause**: An opening HTML tag lacks a corresponding closing tag or self-closing slash.
- **Example**: `<div><span>Unclosed</div>`
- **Solution**: Add the matching closing tag `</span>` or self-close `<span />`.

### SAMREY-102: Invalid Expression / Unclosed Interpolation
- **Severity**: Error
- **Cause**: An interpolation expression `{...` lacks a terminating closing brace `}`.
- **Example**: `<span class="{activeClass"></span>`
- **Solution**: Close the expression with `}`: `{activeClass}`.

### SAMREY-103: Missing Required Directive Prop
- **Severity**: Error
- **Cause**: A control flow directive is missing a required parameter (e.g. `when` on `Show` or `each`/`key` on `For`).
- **Solution**: Provide all mandatory directive props.

### SAMREY-104: Unexpected Closing Tag
- **Severity**: Error
- **Cause**: Found a closing tag that does not match the current opening context.
- **Solution**: Verify tag nesting order and remove orphaned closing tags.

### SAMREY-107: Duplicate Attribute
- **Severity**: Error
- **Cause**: An element defines the same HTML attribute multiple times on a single tag.
- **Solution**: Consolidate into a single attribute definition.

### SAMREY-108: Unsupported Template-Level Control Flow Tag
- **Severity**: Error
- **Cause**: `<Show>` or `<For>` was used as an HTML tag inside template markup.
- **Explanation**: In Samrey, `Show` and `For` are component functions, NOT HTML template tags.
- **Solution**: Call them as TypeScript functions:
  ```ts
  // Replace: <Show when={isAuth}>...</Show>
  Show({
    when: () => isAuth.value,
    children: () => AuthView(),
    fallback: () => GuestView()
  });
  ```

### SAMREY-109: Duplicate Template Reference
- **Severity**: Error
- **Cause**: Two elements within the same template root define identical `ref="..."` identifiers.
- **Solution**: Ensure each `ref` name is unique per template.

---

## 2. Security & Accessibility Diagnostics (SAMREY-200 Series)

### SAMREY-201: Dangerous URI / Insecure Payload
- **Severity**: Error
- **Cause**: An attribute (such as `href` or `src`) contains a prohibited script scheme (`javascript:`, `vbscript:`).
- **Solution**: Sanitize the URL using `sanitizeUrl()` from `@samrey/security` and avoid script-based URI protocols.

### SAMREY-202: Accessibility Violation
- **Severity**: Warning / Error (in strict mode)
- **Cause**: An interactive or visual element lacks required a11y attributes (e.g. `<img>` without `alt`, or `<button>` without accessible text).
- **Solution**: Provide meaningful `alt` text, `aria-label`, or accessible child text.

---

## 3. Reactivity & Runtime Diagnostics (SAMREY-300 Series)

### SAMREY-301: Cyclic Dependency / Infinite Effect Loop
- **Severity**: Error
- **Cause**: An effect modifies a signal that it synchronously reads without untracking.
- **Solution**: Wrap read dependencies that should not trigger re-execution in `untrack(() => signal.value)`.

### SAMREY-302: Duplicate Key in `<For>` Reconciliation
- **Severity**: Error / Warning
- **Cause**: The `key()` function passed to `For()` returned duplicate keys for multiple items in the list.
- **Solution**: Ensure the `key` function returns a strictly unique identifier (such as `item.id`).

### SAMREY-303: SSR / Hydration Mismatch
- **Severity**: Warning
- **Cause**: The DOM tree rendered on the server differs from the initial client render tree.
- **Solution**: Ensure dynamic, browser-only state (e.g. `window.innerWidth`, current time) is deferred until `onMount()`.

---

## 4. Router & HTTP Diagnostics (SAMREY-400 Series)

### SAMREY-401: Route Not Found / Invalid Route Configuration
- **Severity**: Error
- **Cause**: Navigation target does not match any route in `createRouter()`, and no catch-all `*` route is defined.
- **Solution**: Add a catch-all `{ path: '*', component: NotFoundView }` route.

### SAMREY-402: Resource Request Failure
- **Severity**: Error
- **Cause**: A resource fetcher inside `createResource()` rejected.
- **Solution**: Inspect `resource.error.value` and provide fallback rendering via `Show`.

---

## 5. Forms Diagnostics (SAMREY-501)

### SAMREY-501: Form Schema Validation Failure
- **Severity**: Error
- **Cause**: Form field value does not conform to the schema defined in `createForm()`.
- **Solution**: Inspect `form.errors.value` and provide accessible feedback to the user.
