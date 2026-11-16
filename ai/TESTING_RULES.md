# Samrey Framework — Testing Rules & Test Harness (TESTING_RULES.md)

**Package:** `@samrey/testing`  
**Version:** 2.1.0  
**Authority:** Mandatory Testing Guidelines for AI Agents

---

## 1. Headless Component Testing (`renderTest`)

Samrey components can be unit-tested without a browser using the Node.js native test runner and `@samrey/testing`.

### Test Execution Flow
1. Mount the component via `renderTest(() => MyComponent(props))`.
2. Inspect or interact with DOM elements via standard DOM APIs (`querySelector`, `textContent`, `getAttribute`).
3. Dispatch events using `fireEvent(element, 'click')`.
4. Await asynchronous reactive updates with `await flushReactivity()`.
5. Assert outcomes.

```ts
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity, cleanupAllTestContainers } from '@samrey/testing';
import { Counter } from './Counter.js';

describe('Counter Component', () => {
  afterEach(() => {
    cleanupAllTestContainers();
  });

  it('renders initial state and increments reactively', async () => {
    const { container } = renderTest(() => Counter({ initial: 10 }));
    const button = container.querySelector('button')!;

    assert.ok(button.textContent?.includes('10'), 'Initial count must be 10');

    // Simulate click
    fireEvent(button, 'click');
    await flushReactivity();

    assert.ok(button.textContent?.includes('11'), 'Count must be incremented to 11');
  });
});
```

---

## 2. Asynchronous Assertions (`waitFor`)

When testing asynchronous data fetching (`createResource`) or delayed effects:
```ts
import { waitFor } from '@samrey/testing';

await waitFor(() => {
  assert.equal(container.querySelector('.user-name')?.textContent, 'Alice');
}, { timeout: 1000, interval: 20 });
```

---

## 3. Mocking Resources & HTTP Caches

When testing components that use `@samrey/http`, provide a mock resource or pre-populated response using `createMockResource`:
```ts
import { createMockResource } from '@samrey/testing';

const [usersMock] = createMockResource([
  { id: 1, name: 'Test User' }
]);
```
