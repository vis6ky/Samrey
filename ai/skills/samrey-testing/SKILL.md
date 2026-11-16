---
name: samrey-testing
description: Headless DOM component unit testing, event simulation, reactivity flushing, and async assertions in @samrey/testing.
---

# Testing Samrey Applications (`samrey-testing`)

## 1. Skill Description & Activation Criteria
- **Purpose**: Teaches how to write robust unit, integration, and component tests using the headless DOM test harness in `@samrey/testing`.
- **Activation Criteria**: Trigger when authoring test files, asserting reactive updates, simulating user clicks/inputs, testing form submissions, or verifying async data resources.

## 2. Framework Concepts
- **`renderTest(componentFactory)`**: Mounts a component in a headless DOM wrapper and returns `{ container, unmount }`.
- **`fireEvent(element, eventType, options)`**: Dispatches synthetic DOM events.
- **`flushReactivity()`**: Flushes microtasks and pending effects synchronously to ensure assertions run after reactive state propagates.
- **`waitFor(assertionFn, options)`**: Polls an assertion until it passes or times out.
- **`createMockResource(data)`**: Creates mock `@samrey/http` resources for testing.

## 3. Correct API Usage
```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';

describe('Widget', () => {
  it('updates state', async () => {
    const { container } = renderTest(() => MyWidget());
    fireEvent(container.querySelector('button')!, 'click');
    await flushReactivity();
    assert.equal(container.querySelector('.val')?.textContent, 'Updated');
  });
});
```

## 4. Verified Code Example
```ts
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity, cleanupAllTestContainers } from '@samrey/testing';
import { Counter } from './Counter.js';

describe('Counter Unit Tests', () => {
  afterEach(() => {
    cleanupAllTestContainers();
  });

  it('increments count on click', async () => {
    const { container } = renderTest(() => Counter({ initial: 5 }));
    const button = container.querySelector('button')!;

    assert.ok(button.textContent?.includes('5'), 'Expected initial count of 5');

    fireEvent(button, 'click');
    await flushReactivity();

    assert.ok(button.textContent?.includes('6'), 'Expected count to increment to 6');
  });
});
```

## 5. Common Mistakes
- **Mistake**: Asserting DOM changes immediately after `fireEvent` without awaiting `flushReactivity()`.
  - *Correction*: Always `await flushReactivity()` before asserting DOM node values.
- **Mistake**: Forgetting `cleanupAllTestContainers()` in `afterEach()`.
  - *Correction*: Clean up test containers to prevent memory growth across large test suites.

## 6. Forbidden Patterns
- ❌ Do NOT import Jest, Mocha, or testing-library/react.
- ❌ Do NOT mock signals with non-reactive objects.

## 7. Validation Procedures
1. Run `npx @samrey/cli test` to execute all project tests.
2. Ensure exit code is 0.

## 8. Authoritative Documentation
- [ai/TESTING_RULES.md](../../TESTING_RULES.md)
- [ai/API_CONTRACTS.md](../../API_CONTRACTS.md#9-samreytesting)
