# @samrey/testing

Deterministic unit testing utilities, component test harnesses, reactivity microtask flushers, and DOM event simulators.

## Purpose

`@samrey/testing` provides ergonomic utilities for testing Samrey components and signals in simulated or headless browser environments without relying on external testing framework plugins.

## Installation

```bash
npm install -D @samrey/testing @samrey/runtime @samrey/reactivity
```

## Quick Example

```ts
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { el } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';

function Counter() {
  const count = signal(0);
  return el('button', {
    id: 'btn',
    type: 'button',
    onClick: () => count.value++
  }, () => `Count: ${count.value}`);
}

const { container, unmount } = renderTest(Counter);
const btn = container.querySelector('#btn')!;

fireEvent(btn, 'click');
await flushReactivity();

console.log(btn.textContent); // "Count: 1"

unmount();
```

## API

- `renderTest(componentFactory)` — Mounts component inside an isolated reactive root and container. Returns `{ container, unmount }` (`renderTestComponent` and `mount` are aliases).
- `fireEvent(element, eventName, eventInit?)` — Dispatches bubbling synthetic DOM events (`click`, `input`, etc.).
- `flushReactivity(): Promise<void>` — Resolves when all pending reactive microtasks have completed (`waitForNextUpdate` is an alias).
- `waitFor(predicate: () => boolean | Promise<boolean>, timeoutMs?: number): Promise<void>` — Polls a boolean predicate until it returns true or times out.
- `cleanupAllTestContainers(): void` — Removes all remaining `[data-samrey-test-container]` elements from the DOM.
- `createMockResource<T>(initialData?: T)` — Creates a lightweight signal-backed mock resource with `mutate()`, `setError()`, and `refetch()`.

## Environment

Universal: Node.js (with happy-dom or jsdom), Bun, and browser-based test runners (Vitest, Playwright, Jest).

## Security

Safely handles isolated unmounting to prevent DOM leakage and timer retention between tests.

## Related Packages

- `@samrey/runtime` — Target component rendering system.
- `@samrey/reactivity` — State engine tested with reactivity flushers.

