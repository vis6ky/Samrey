# @gati/runtime

Direct DOM rendering engine, reactive hole bindings, declarative control flow, and lifecycle management with zero Virtual DOM.

## Purpose

`@gati/runtime` provides the core rendering and component system for Gati applications. It executes components exactly once to construct direct DOM trees and attaches fine-grained signal subscriptions to dynamic text and attribute slots.

## Installation

```bash
npm install @gati/runtime @gati/reactivity
```

## Quick Example

```ts
import { el, Show, For, mount } from '@gati/runtime';
import { signal } from '@gati/reactivity';

function App() {
  const count = signal(0);
  const items = signal(['Alpha', 'Beta', 'Gamma']);

  return el('div', { class: 'app-container' },
    el('h1', null, 'Gati Runtime Application'),
    el('button', {
      type: 'button',
      onClick: () => { count.value++; }
    }, () => `Clicks: ${count.value}`),
    
    Show({
      when: () => count.value > 5,
      children: () => el('p', { class: 'milestone' }, 'Milestone reached!'),
      fallback: () => el('p', null, 'Keep clicking...')
    }),

    For({
      each: () => items.value,
      key: (item) => item,
      children: (item) => el('li', null, item)
    })
  );
}

mount(App, document.getElementById('root')!);
```

## API

- `el(tag, props, ...children)` — Creates a DOM Element with reactive attribute and property bindings.
- `svg(tag, props, ...children)` — Creates an SVG namespace DOM element.
- `fragment(...children)` — Creates a lightweight DOM DocumentFragment.
- `mount(component, container)` — Mounts a root component into a DOM element with lifecycle scope. Returns unmount function.
- `hydrate(component, container)` — Hydrates server-rendered HTML into an interactive client DOM tree.
- `Show({ when, fallback, children })` — Conditional rendering control flow.
- `For({ each, key, fallback, children })` — High-performance keyed list reconciliation.
- `Switch` / `Match` — Multi-branch conditional selection.
- `ErrorBoundary({ fallback, children })` — Declarative error boundary catching component subtree errors.
- `Dynamic({ component, ...props })` — Renders a dynamic component or HTML tag determined at runtime.
- `Portal({ mount, children })` — Teleports children elements into a separate DOM container target (e.g. `document.body`).
- `Suspense({ fallback, children })` — Displays fallback while asynchronous resources are pending.
- `onMount(fn)` — Registers a callback executed once after the component mounts into the DOM.
- `onCleanup(fn)` — Registers a callback executed when the component is unmounted.
- `onError(fn)` — Registers an error handler for errors in child reactive scopes.

## Environment

Universal: Node.js (>= 18.0.0 for SSR), browser environments (DOM APIs required for client rendering).

## Security

Automatic HTML attribute sanitization and URL validation for `href`, `src`, and `action` bindings.

## Related Packages

- `@gati/reactivity` — Fine-grained signals engine powering runtime bindings.
- `@gati/router` — Declarative routing for Gati applications.
- `@gati/ssr` — Server-Side Rendering and hydration.

