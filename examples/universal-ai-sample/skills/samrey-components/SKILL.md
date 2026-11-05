---
name: samrey-components
description: Create idiomatic Samrey components using static template cloning, surgical bindings, and props.
---

# Samrey Components & DOM Bindings

## Purpose
Instructs how to author native Samrey component functions that return DOM nodes with surgical reactive bindings.

## When to Use
- Writing UI elements, buttons, cards, modals, or layout wrappers.
- Attaching dynamic text or attribute bindings.
- Registering event listeners on real DOM nodes.

## Relevant APIs
- `template(html: string): () => Node` from `@samrey/runtime`
- `bindText(node: Text, getter: () => string): void` from `@samrey/runtime`
- `bindAttr(el: Element, name: string, getter: () => any): void` from `@samrey/runtime`
- `on(el: Element, event: string, handler: Function): void` from `@samrey/runtime`
- `createComponent(fn: Function, props: object): Node` from `@samrey/runtime`

## Verified Code Example
```ts
import { signal } from '@samrey/reactivity';
import { template, on, bindText, bindAttr } from '@samrey/runtime';

const _tmpl = template(`
<div class="user-card p-4 border rounded">
  <h3 class="name font-bold"></h3>
  <span class="badge text-xs px-2 py-1">Active</span>
  <button class="toggle-btn mt-2 px-3 py-1 bg-blue-500 text-white rounded">Toggle Status</button>
</div>`);

export function UserCard(props: { username: string }) {
  const isActive = signal(true);
  const root = _tmpl() as HTMLElement;

  bindText(root.querySelector('.name')!, () => props.username);
  bindAttr(root.querySelector('.badge')!, 'class', () =>
    isActive.value ? 'badge bg-green-100 text-green-800' : 'badge bg-gray-100 text-gray-800'
  );

  on(root.querySelector('.toggle-btn')!, 'click', () => {
    isActive.update(v => !v);
  });

  return root;
}
```

## Common Mistakes
- **Mistake**: Returning a JSX string instead of DOM elements.
- **Mistake**: Writing `onClick={...}` inside `template('<button onClick="...">')`. Handlers must be attached via `on(el, 'click', handler)`.

## Validation Instructions
Validate component code using `npx @samrey/cli ai validate <file.ts>`.
