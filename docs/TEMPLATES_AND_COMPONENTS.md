# Templates & Components in Aether

## 1. The Template Cloning Model

Aether avoids Virtual DOM trees entirely. When you write markup in an Aether application, the compiler Ahead-of-Time separates the markup into:
1. **A static HTML skeleton**: Hoisted as a constant template string.
2. **Dynamic hole bindings**: Precise child path walks (e.g. `[0, 1]`) targeting dynamic texts, attributes, or event listeners.

At runtime, `template(htmlString)` creates an `<template>` element once. Every subsequent component instantiation calls native C++ `cloneNode(true)`, creating real DOM trees orders of magnitude faster than `document.createElement()` trees.

```typescript
import { template } from '@aether/runtime';

const cardTemplate = template(`
  <article class="user-card">
    <h3 class="user-name"></h3>
    <p class="user-bio"></p>
  </article>
`);
```

---

## 2. Component Composition

Components in Aether are plain JavaScript functions that accept `props` and return real DOM `Node` instances.

```typescript
import { template, bindText } from '@aether/runtime';
import { Signal } from '@aether/reactivity';

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

The `@aether/runtime` package provides surgical binding functions:

- `bindText(node, getter)`: Updates the `textContent` of a Text node or Element only when `getter()` changes.
- `bindAttr(element, name, getter)`: Updates attribute or property. Automatically blocks dangerous attributes like `innerHTML`, `srcdoc`, or inline `on*` event handlers.
- `bindEvent(element, eventName, handler)`: Attaches a native event listener scoped to the current Owner lifecycle for automatic disposal on unmount.
- `bindClass(element, className, getter)`: Toggles a CSS class based on boolean getter return value.
- `bindStyle(element, propertyName, getter)`: Updates inline CSS properties through safe style sanitization.
