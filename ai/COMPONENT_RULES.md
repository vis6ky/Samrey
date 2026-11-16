# Samrey Framework — Component Rules & DOM Binding Invariants (COMPONENT_RULES.md)

**Package:** `@samrey/runtime`  
**Version:** 2.1.0  
**Authority:** Mandatory Component Construction Guidelines for AI Agents

---

## 1. The Component Execution Model

### Invariant: Components Execute EXACTLY ONCE
In Samrey, a component is a factory function that sets up DOM nodes and wires reactive subscriptions. It runs **once** when created. It does **not** re-execute when signals change.

```ts
import { signal } from '@samrey/reactivity';
import { template, bindText, on } from '@samrey/runtime';

// 1. Static template hoisted at module scope with Template References (refs)
const _tmpl = template('<div class="counter"><span ref="val"></span><button ref="btn">+</button></div>');

export function Counter(props: { initial?: number }) {
  // Executed ONCE
  const count = signal(props.initial ?? 0);

  // Clone template
  const root = _tmpl.clone();
  const { val, btn } = root.refs;

  // Wire surgical fine-grained bindings
  bindText(val, () => count.value.toString());
  on(btn, 'click', () => count.update(n => n + 1));

  return root;
}
```

---

## 2. Hoisted Templates & Template References (`ref="..."`)

- Always declare templates at **module scope** so the browser parses the HTML string into a `<template>` element only once.
- Use `ref="name"` attributes in the template string to allow $O(1)$ property lookup via `root.refs.name`.

```ts
// GOOD: Hoisted at module level
const _cardTmpl = template('<div class="card"><h2 ref="title"></h2><p ref="desc"></p></div>');

export function Card(props: { title: string; desc: string }) {
  const root = _cardTmpl.clone();
  const { title, desc } = root.refs;
  title.textContent = props.title;
  desc.textContent = props.desc;
  return root;
}
```

---

## 3. Surgical Reactive Bindings

Samrey provides microscopic DOM binding helpers:
- `bindText(node, () => string)`: Updates the text content of a text node or element without touching attributes or siblings.
- `bindAttr(element, 'attr', () => value)`: Updates or removes an attribute.
- `bindClass(element, 'className', () => boolean)`: Toggles a single CSS class.
- `bindStyle(element, 'propertyName', () => string)`: Updates an inline CSS property.
- `on(element, 'eventName', handler)`: Registers an event listener with automatic cleanup.

---

## 4. Control Flow Functions (`Show`, `Switch`, `For`)

### Absolute Rule: Never use HTML tags `<Show>` or `<For>`
In Samrey, control flow structures are **TypeScript component functions**, NOT template markup tags. Using `<Show>` or `<For>` in raw HTML triggers compiler error `SAMREY-108`.

### Conditional Rendering (`Show`)
```ts
import { signal } from '@samrey/reactivity';
import { Show, template } from '@samrey/runtime';

const _authTmpl = template('<div class="auth-view">Welcome Member!</div>');
const _guestTmpl = template('<div class="guest-view">Please Login</div>');

export function UserSection() {
  const loggedIn = signal(false);

  return Show({
    when: () => loggedIn.value,
    children: () => _authTmpl(),
    fallback: () => _guestTmpl()
  });
}
```

### List Rendering (`For`)
```ts
import { signal } from '@samrey/reactivity';
import { For, template, bindText } from '@samrey/runtime';

interface Task { id: string; title: string; }

const _rowTmpl = template('<li class="task-item"><span ref="title"></span></li>');

export function TaskList() {
  const tasks = signal<Task[]>([
    { id: '1', title: 'Install Samrey' },
    { id: '2', title: 'Build Application' }
  ]);

  return For({
    each: () => tasks.value,
    key: (task) => task.id,
    children: (task) => {
      const row = _rowTmpl.clone();
      bindText(row.refs.title, () => task.title);
      return row;
    },
    fallback: () => template('<p>No tasks found.</p>')()
  });
}
```

---

## 5. Mounting & Hydration

```ts
import { mount, hydrate } from '@samrey/runtime';
import { App } from './App.js';

const root = document.getElementById('app')!;

// Greenfield SPA client mount:
mount(() => App(), root);

// SSR client hydration:
// hydrate(() => App(), root);
```
