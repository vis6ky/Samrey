import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getDelegatedEventScript, replayCapturedEvents, hydrate } from '../src/index.js';

describe('@samrey/ssr - Client Hydration & Event Replay', () => {
  it('generates ultra-compact pre-hydration event listener script', () => {
    const script = getDelegatedEventScript(['click', 'input', 'submit']);
    assert.ok(script.includes('window.__AETHER_EVENTS__=[]'));
    assert.ok(script.includes('"click"'));
    assert.ok(script.includes('"input"'));
    assert.ok(script.includes('"submit"'));
  });

  it('replays captured events to hydrated elements', () => {
    // Mock window and event queue in node test environment
    let eventDispatched = false;
    const mockElement = {
      dispatchEvent: (evt: unknown) => {
        eventDispatched = true;
        return true;
      }
    };

    const mockEvent = {
      type: 'click',
      target: mockElement
    } as unknown as Event;

    // Attach to global window
    (globalThis as unknown as { window: { __AETHER_EVENTS__: Event[] } }).window = {
      __AETHER_EVENTS__: [mockEvent]
    };

    const replayed = replayCapturedEvents();
    assert.equal(replayed, 1);
    assert.equal(eventDispatched, true);
    assert.equal((globalThis as unknown as { window: { __AETHER_EVENTS__: Event[] } }).window.__AETHER_EVENTS__.length, 0);
  });

  it('hydrates container and repairs mismatch gracefully', () => {
    let replacedChildren: unknown[] = [];
    const mockContainer = {
      childNodes: [
        { nodeType: 1, textContent: 'Server Rendered Text' }
      ],
      replaceChildren: (...nodes: unknown[]) => {
        replacedChildren = nodes;
      }
    } as unknown as HTMLElement;

    const mockClientNode = {
      nodeType: 1,
      textContent: 'Client Reactive Node'
    } as unknown as Node;

    let mismatchDetected = false;
    const result = hydrate(
      () => mockClientNode,
      mockContainer,
      {
        onMismatch: () => {
          mismatchDetected = true;
        },
        repairMismatch: true
      }
    );

    assert.ok(typeof result.dispose === 'function');
    assert.equal(replacedChildren.length, 1);
    assert.equal(replacedChildren[0], mockClientNode);

    result.dispose();
  });
});
