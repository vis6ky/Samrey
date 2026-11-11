import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getDelegatedEventScript, replayCapturedEvents, hydrate } from '../src/index.js';

describe('@samrey/ssr - Client Hydration & Event Replay', () => {
  it('generates ultra-compact pre-hydration event listener script', () => {
    const script = getDelegatedEventScript(['click', 'input', 'submit']);
    assert.ok(script.includes('window.__SAMREY_EVENTS__=[]'));
    assert.ok(script.includes('"click"'));
    assert.ok(script.includes('"input"'));
    assert.ok(script.includes('"submit"'));
  });

  it('replays captured events to hydrated elements', () => {
    // Mock window and event queue in node test environment
    let eventDispatched = false;
    const mockElement = {
      dispatchEvent: (_evt: unknown) => {
        eventDispatched = true;
        return true;
      }
    };

    const mockEvent = {
      type: 'click',
      target: mockElement
    } as unknown as Event;

    // Attach to global window
    (globalThis as unknown as { window: { __SAMREY_EVENTS__: Event[] } }).window = {
      __SAMREY_EVENTS__: [mockEvent]
    };

    const replayed = replayCapturedEvents();
    assert.equal(replayed, 1);
    assert.equal(eventDispatched, true);
    assert.equal((globalThis as unknown as { window: { __SAMREY_EVENTS__: Event[] } }).window.__SAMREY_EVENTS__.length, 0);
  });

  it('hydrates container and repairs mismatch gracefully', () => {
    let replacedChildren: unknown[] = [];
    const mockContainer = {
      nodeType: 1,
      childNodes: [
        { nodeType: 1, tagName: 'P', textContent: 'Server Rendered Text' }
      ],
      replaceChildren: (...nodes: unknown[]) => {
        replacedChildren = nodes;
      }
    } as unknown as HTMLElement;

    const mockClientNode = {
      nodeType: 1,
      tagName: 'DIV',
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
    assert.equal(mismatchDetected, true);
    assert.equal(replacedChildren.length, 1);
    assert.equal(replacedChildren[0], mockClientNode);

    result.dispose();
  });

  it('performs non-destructive in-place hydration without replacing matching SSR DOM nodes (Bug 14)', async () => {
    const { signal } = await import('@samrey/reactivity');
    const { el, bindText, on } = await import('@samrey/runtime');

    // Construct pre-existing SSR DOM nodes using headless runtime elements
    const serverSpan = el('span', null, '0') as any;
    const serverBtn = el('button', { type: 'button' }, '+') as any;
    const serverRoot = el('div', { class: 'counter' }, serverSpan, serverBtn) as any;
    serverRoot.__preservedIdentity = 'ssr-node-1';

    let replaceCalls = 0;
    const containerObj: any = {
      nodeType: 1,
      childNodes: [serverRoot] as any[],
      replaceChildren: (...nodes: unknown[]) => {
        replaceCalls++;
        containerObj.childNodes = [...nodes];
      }
    };
    const container = containerObj as HTMLElement;

    let mismatchCalled = false;
    const count = signal(0);

    const ClientCounter = () => {
      const clientSpan = el('span') as any;
      bindText(clientSpan, () => String(count.value));
      const clientBtn = el('button', { type: 'button' }, '+') as any;
      on(clientBtn, 'click', () => count.update((n) => n + 1));
      return el('div', { class: 'counter' }, clientSpan, clientBtn);
    };

    const result = hydrate(ClientCounter, container, {
      onMismatch: () => {
        mismatchCalled = true;
      }
    });

    assert.equal(mismatchCalled, false);
    assert.equal(replaceCalls, 0, 'Non-destructive hydration must not call replaceChildren when SSR DOM matches');
    assert.equal((container.childNodes[0] as any).__preservedIdentity, 'ssr-node-1');

    // Clicking the ORIGINAL server button updates signal and mutates ORIGINAL server span text in-place
    serverBtn.click();
    assert.equal(count.value, 1);
    assert.equal(serverSpan.textContent, '1');

    // Updating signal programmatically also mutates original server span in-place
    count.value = 42;
    assert.equal(serverSpan.textContent, '42');

    // Dispose detaches listener from serverBtn cleanly
    result.dispose();
    serverBtn.click();
    assert.equal(count.value, 42);
  });

  it('escapes special CSS identifier characters during captured event replay (Bug 14)', () => {
    let replayedOnIdTarget = false;
    let replayedOnClassTarget = false;
    const selectorsQueried: string[] = [];

    const liveIdTarget = {
      dispatchEvent: () => {
        replayedOnIdTarget = true;
        return true;
      }
    };
    const liveClassTarget = {
      dispatchEvent: () => {
        replayedOnClassTarget = true;
        return true;
      }
    };

    const originalDoc = (globalThis as any).document;
    (globalThis as any).document = {
      contains: () => false
    };

    const mockContainer = {
      querySelector: (sel: string) => {
        selectorsQueried.push(sel);
        if (sel.includes('#')) return liveIdTarget;
        if (sel.includes('.')) return liveClassTarget;
        return null;
      }
    } as unknown as HTMLElement;

    (globalThis as unknown as { window: { __SAMREY_EVENTS__: Event[] } }).window = {
      __SAMREY_EVENTS__: [
        { type: 'click', target: { id: 'item:0[x]' } } as unknown as Event,
        { type: 'click', target: { className: 'hover:bg-blue-500 w-[50%]' } } as unknown as Event
      ]
    };

    try {
      const replayed = replayCapturedEvents(mockContainer);
      assert.equal(replayed, 2);
      assert.equal(replayedOnIdTarget, true);
      assert.equal(replayedOnClassTarget, true);
      assert.ok(selectorsQueried[0].includes('item\\:0\\[x\\]'));
      assert.ok(selectorsQueried[1].includes('.hover\\:bg-blue-500.w-\\[50\\%\\]'));
    } finally {
      if (originalDoc) {
        (globalThis as any).document = originalDoc;
      } else {
        delete (globalThis as any).document;
      }
    }
  });
});
