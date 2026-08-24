# @aether/testing

Deterministic unit testing utilities, component test harnesses, reactivity microtask flushers, and DOM event simulators.

## Purpose

`@aether/testing` provides ergonomic utilities for testing Aether components and signals in simulated or headless browser environments without relying on external testing framework plugins.

## Installation

```bash
npm install -D @aether/testing @aether/runtime @aether/reactivity
```

## Quick Example

```ts
import { renderTest, fireEvent, flushReactivity } from '@aether/testing';
import { el } from '@aether/runtime';
import { signal } from '@aether/reactivity';

function Counter() {
  const count = signal(0);
  return el('button', {
    id: 'btn',
    onClick: () => count.value++
  }, () => `Count: ${count.value}`);
}

const { container, findByText, unmount } = renderTest(Counter);
const btn = container.querySelector('#btn')!;

fireEvent.click(btn);
await flushReactivity();

console.log(btn.textContent); // "Count: 1"

unmount();
```

## API

- `renderTest(component, options)` — Mounts component into a sandboxed test container. Returns `{ container, unmount, findByText, queryByText }`.
- `fireEvent(element, eventType, eventInit)` — Dispatches bubbling synthetic DOM events.
- `fireEvent.click(element)` — Convenience click dispatcher.
- `fireEvent.input(element, value)` — Convenience input change dispatcher.
- `flushReactivity(): Promise<void>` — Resolves when all pending reactive microtasks have completed.
- `waitFor(assertion: () => void | Promise<void>, options?): Promise<void>` — Polls an assertion function until it passes or times out.
- `createTestRouter(routes, initialPath)` — Creates an isolated router instance for testing navigation flows.

## Environment

Universal: Node.js (with happy-dom or jsdom), Bun, and browser-based test runners (Vitest, Playwright, Jest).

## Security

Safely handles isolated unmounting to prevent DOM leakage and timer retention between tests.

## Related Packages

- `@aether/runtime` — Target component rendering system.
- `@aether/reactivity` — State engine tested with reactivity flushers.

