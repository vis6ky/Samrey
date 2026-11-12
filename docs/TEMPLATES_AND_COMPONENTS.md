# Templates & Components in Samrey

## 1. The Template Cloning Model

Samrey avoids Virtual DOM trees entirely. When you write markup in an Samrey application, the compiler Ahead-of-Time separates the markup into:
1. **A static HTML skeleton**: Hoisted as a constant template string.
2. **Dynamic hole bindings**: Precise child path walks (e.g. `[0, 1]`) targeting dynamic texts, attributes, or event listeners.

At runtime, `template(htmlString)` creates an `<template>` element once. Every subsequent component instantiation calls native C++ `cloneNode(true)`, creating real DOM trees orders of magnitude faster than `document.createElement()` trees.

```typescript
import { template } from '@samrey/runtime';

const cardTemplate = template(`
  <article class="user-card">
    <h3 class="user-name"></h3>
    <p class="user-bio"></p>
  </article>
`);
```

---

## 2. Component Composition

Components in Samrey are plain JavaScript functions that accept `props` and return real DOM `Node` instances.

```typescript
import { template, bindText } from '@samrey/runtime';

interface CardProps {
  title: string | (() => string);
  badge?: string;
}

export function Card(props: CardProps): HTMLElement {
  const tmpl = template(`
    <div class="card">
      <h3 class="card-title"></h3>
      <span class="card-badge"></span>
    </div>
  `);

  const root = tmpl() as HTMLElement;
  const titleEl = root.querySelector('.card-title')!;
  const badgeEl = root.querySelector('.card-badge')!;

  bindText(titleEl, typeof props.title === 'function' ? props.title : () => props.title);
  if (props.badge) {
    badgeEl.textContent = props.badge;
  } else {
    badgeEl.remove();
  }

  return root;
}
```

---

## 3. Dynamic Bindings

The `@samrey/runtime` package provides surgical binding functions:

- `bindText(node, getter)`: Updates the `textContent` of a Text node or Element only when `getter()` changes.
- `bindAttr(element, name, getter)`: Updates attribute or property. Automatically blocks dangerous attributes like `innerHTML`, `srcdoc`, or inline `on*` event handlers.
- `bindEvent(element, eventName, handler)`: Attaches a native event listener scoped to the current Owner lifecycle for automatic disposal on unmount.
- `bindClass(element, className, getter)`: Toggles a CSS class based on boolean getter return value.
- `bindStyle(element, propertyName, getter)`: Updates inline CSS properties through safe style sanitization.

---

## 4. Template References (`root.refs` & `root.ref()`) — Samrey 2.1.0

Samrey 2.1.0 introduces fine-grained **Template References**. Instead of slow runtime `querySelector` lookups, template references resolve DOM elements through compile-time static path walks with zero Virtual DOM.

### 4.1 All Four Supported Access Patterns

Every cloned template exposes both static and dynamic reference access:

```typescript
import { template } from '@samrey/runtime';

const loginView = template(`
  <form ref="form">
    <input ref="email" type="email" />
    <input ref="password" type="password" />
    <button ref="submit">Login</button>
  </form>
`);

const root = loginView.clone();

// 1. Direct Destructuring of Specific References
const { form, email, password, submit } = root.refs;

// 2. Destructuring the Entire refs Registry
const { refs } = root;
refs.email.value = 'user@example.com';

// 3. Direct Property Access
root.refs.submit.focus();

// 4. Dynamic Lookup (documented return type: HTMLElement | undefined)
const emailInput = root.ref('email');
const dynElement = root.ref<HTMLInputElement>('email');
```

### 4.2 Prototype Collision Immunity

The internal reference registry uses `Object.create(null)`. Inherited prototype properties (such as `constructor`, `toString`, `valueOf`) never collide with reference names and unknown names consistently return `undefined`.

### 4.3 Static Type Safety & Compile-Time Inference

When using TypeScript, element types are inferred directly from tag names:
- `<input ref="email" />` $\rightarrow$ `HTMLInputElement`
- `<button ref="submit" />` $\rightarrow$ `HTMLButtonElement`
- `<p ref="status" />` $\rightarrow$ `HTMLParagraphElement`

Invalid static reference names (e.g. `root.refs.nonexistent`) are rejected at compile time.

### 4.4 Lifecycle & Memory Disposal

Reference registries are automatically scrubbed when a template is instantiated inside a reactive scope (`createRoot` or component lifecycle). For long-lived or standalone roots, manual cleanup is available:

```typescript
// Explicitly release node references to allow garbage collection
root.disposeRefs();
```

### 4.5 Compiler Diagnostics

The Samrey compiler validates reference usage and emits authoritative diagnostics:
- **`SAMREY-109`**: Duplicate reference identifier within the same template.
- **`SAMREY-110`**: Invalid reference identifier (must match `/^[a-zA-Z_$][a-zA-Z0-9_$]*$/`).
- **`SAMREY-111`**: Unsupported reference placement on custom components (`<CustomCard ref="..." />`) or control-flow primitives (`<Show ref="..." />`, `<For ref="..." />`).
