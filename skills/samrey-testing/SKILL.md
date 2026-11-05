---
name: samrey-testing
description: Unit and integration test Samrey components and reactive state with @samrey/testing.
---

# Testing Samrey Applications (@samrey/testing)

## Purpose
Teaches how to mount components into headless DOM test environments, simulate user events, and assert reactive DOM updates.

## Relevant APIs
- `renderTest(componentFactory: () => unknown): TestRenderResult`
- `fireEvent(element: Element, eventName: string, eventInit?: object): boolean`
- `flushReactivity(): Promise<void>`

## Verified Code Example
```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { Counter } from './Counter.js';

describe('Counter Component', () => {
  it('renders initial state and increments reactively', async () => {
    const { container } = renderTest(() => Counter({ initial: 5 }));
    const button = container.querySelector('button')!;

    assert.ok(button.textContent?.includes('5'), 'Initial count must be 5');

    fireEvent(button, 'click');
    await flushReactivity();

    assert.ok(button.textContent?.includes('6'), 'Count must increment to 6');
  });
});
```

## Validation Instructions
Run project test suites using `npx @samrey/cli test` or `npm test`.
