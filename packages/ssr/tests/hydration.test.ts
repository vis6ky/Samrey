import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { signal } from '@samrey/reactivity';
import { el } from '@samrey/runtime';
import { getDelegatedEventScript, replayCapturedEvents, hydrate, deserializeHydrationState } from '../src/index.js';

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

  it('F-06: flattens client DocumentFragment trees during non-destructive SSR matching and adoption', async () => {
    const { recordHydrationRetarget } = await import('@samrey/reactivity');
    let retargetedServerNode: unknown = null;
    let mismatched = false;

    const serverSpan = { nodeType: 1, tagName: 'SPAN', childNodes: [{ nodeType: 3, textContent: 'SSR' }] };
    const serverChildNodes: any[] = [serverSpan];
    const insertedMarkers: any[] = [];
    const serverContainer = {
      nodeType: 1,
      childNodes: serverChildNodes,
      insertBefore(node: any, refNode: any) {
        insertedMarkers.push({ node, refNode });
        const idx = serverChildNodes.indexOf(refNode);
        if (idx !== -1) serverChildNodes.splice(idx, 0, node);
        else serverChildNodes.push(node);
        return node;
      },
      replaceChildren(...nodes: unknown[]) {
        if (nodes.length > 0) {
          throw new Error('replaceChildren must not run with replacement nodes when flattened fragment matches SSR');
        }
        serverChildNodes.length = 0;
      }
    } as unknown as HTMLElement;

    const res = hydrate(
      () => {
        const marker = { nodeType: 8, nodeName: '#comment', nodeValue: 'samrey:show', parentNode: null };
        const clientSpan = { nodeType: 1, tagName: 'SPAN', childNodes: [{ nodeType: 3, textContent: 'SSR' }] };
        recordHydrationRetarget(clientSpan, (adopted) => {
          retargetedServerNode = adopted;
        });
        return {
          nodeType: 11,
          nodeName: '#document-fragment',
          childNodes: [marker, clientSpan]
        } as unknown as Node;
      },
      serverContainer,
      { onMismatch: () => { mismatched = true; } }
    );

    assert.equal(mismatched, false, 'Flattened DocumentFragment must match SSR DOM without mismatch');
    assert.equal(retargetedServerNode, serverSpan, 'Client element inside DocumentFragment must retarget to SSR node');
    assert.equal(insertedMarkers.length, 1, 'Control flow comment marker must mount before adopted SSR sibling');
    res.dispose();
  });

  it('escapes </script> payloads in getDelegatedEventScript and cleans up document listeners on replay', () => {
    const script = getDelegatedEventScript(['</script><script>alert(1)</script>']);
    assert.ok(!script.includes('</script><script>'));
    assert.ok(script.includes('\\u003c/script\\u003e'));
    assert.ok(script.includes('__SAMREY_EVENTS_CLEANUP__'));

    let cleanupCalled = 0;
    const hadWindow = 'window' in globalThis;
    const origWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = {
        __SAMREY_EVENTS__: [],
        __SAMREY_EVENTS_CLEANUP__: () => { cleanupCalled++; }
      };
      const count = replayCapturedEvents();
      assert.equal(count, 0);
      assert.equal(cleanupCalled, 1, 'Delegated event listeners must be detached even when 0 events queued');
    } finally {
      if (hadWindow) (globalThis as any).window = origWindow;
      else delete (globalThis as any).window;
    }
  });

  it('hydrates and splits coalesced SSR Text nodes for adjacent reactive children without clobbering', async () => {
    const { signal } = await import('@samrey/reactivity');
    const { el } = await import('@samrey/runtime');

    const greeting = signal('Hello');
    const target = signal('Alice');
    let mismatchCalls = 0;

    // Server HTML merges adjacent text into a single Text("HelloAlice") node inside <p>
    let splitTextCalls = 0;
    const createMockText = (txt: string): any => {
      const node: any = {
        nodeType: 3,
        nodeName: '#text',
        textContent: txt,
        parentNode: null,
        nextSibling: null,
        previousSibling: null,
        splitText: (offset: number) => {
          splitTextCalls++;
          const full = String(node.textContent ?? '');
          const clamped = Math.max(0, Math.min(offset, full.length));
          node.textContent = full.slice(0, clamped);
          const remainder = createMockText(full.slice(clamped));
          if (node.parentNode && typeof node.parentNode.insertBefore === 'function') {
            node.parentNode.insertBefore(remainder, node.nextSibling ?? null);
          }
          return remainder;
        },
        cloneNode: () => createMockText(node.textContent)
      };
      return node;
    };
    const mergedSsrText = createMockText('HelloAlice');
    const ssrPChildren: any[] = [mergedSsrText];
    const ssrP: any = {
      nodeType: 1,
      tagName: 'P',
      childNodes: ssrPChildren,
      insertBefore: (newNode: any, refNode: any) => {
        const idx = refNode ? ssrPChildren.indexOf(refNode) : -1;
        if (idx === -1) ssrPChildren.push(newNode);
        else ssrPChildren.splice(idx, 0, newNode);
        newNode.parentNode = ssrP;
        return newNode;
      },
      removeChild: (ch: any) => {
        const i = ssrPChildren.indexOf(ch);
        if (i !== -1) ssrPChildren.splice(i, 1);
        return ch;
      },
      get textContent() {
        return ssrPChildren.map((c) => (c.nodeType === 8 ? '' : (c.textContent ?? ''))).join('');
      }
    };
    mergedSsrText.parentNode = ssrP;

    const containerChildren: any[] = [ssrP];
    const container = {
      childNodes: containerChildren,
      replaceChildren: (...nodes: any[]) => {
        if (nodes.length > 0) {
          throw new Error('replaceChildren must not run on valid coalesced-text SSR match');
        }
        containerChildren.length = 0;
      }
    } as unknown as HTMLElement;

    const res = hydrate(
      () => el('p', null, () => greeting.value, () => target.value) as unknown as Node,
      container,
      { onMismatch: () => { mismatchCalls++; } }
    );

    assert.equal(mismatchCalls, 0);
    assert.equal(ssrP.textContent, 'HelloAlice');

    greeting.value = 'Hi ';
    assert.equal(ssrP.textContent, 'Hi Alice');

    target.value = 'Bob';
    assert.equal(ssrP.textContent, 'Hi Bob');

    res.dispose();
  });

  it('snapshots __SAMREY_EVENTS__ before dispatch, tolerates DOM-clobbered globals & forms, and creates text nodes in headless mode', () => {
    const script = getDelegatedEventScript(['click']);
    assert.ok(script.includes('Array.isArray(window.__SAMREY_EVENTS__)'), 'Delegated script must check Array.isArray');

    const prevWindow = (globalThis as any).window;
    const prevDocument = (globalThis as any).document;
    try {
      // 1. Re-entrant replayCapturedEvents must not double-dispatch queued events, and DOM-clobbered non-array returns 0
      let dispatchCount = 0;
      const target = {
        dispatchEvent: () => {
          dispatchCount++;
          // Re-entrant call during dispatch must see empty queue
          assert.equal(replayCapturedEvents(), 0);
          return true;
        }
      };
      (globalThis as any).window = { __SAMREY_EVENTS__: [{ type: 'click', target }] };
      const replayed = replayCapturedEvents();
      assert.equal(replayed, 1);
      assert.equal(dispatchCount, 1);

      (globalThis as any).window = { __SAMREY_EVENTS__: { length: 2 } };
      assert.equal(replayCapturedEvents(), 0);

      // 2. DOM-clobbered <form id="__SAMREY_STATE__"> before real state <script>
      const realScript: any = {
        tagName: 'SCRIPT',
        nodeName: 'SCRIPT',
        getAttribute: (name: string) => (name === 'type' ? 'application/json' : name === 'id' ? '__SAMREY_STATE__' : null),
        textContent: '{"user":"alice"}'
      };
      const clobberForm: any = {
        tagName: 'FORM',
        nodeName: { value: 'SCRIPT' },
        getAttribute: { value: 'application/json' },
        textContent: '{"evil":true}'
      };
      (globalThis as any).document = {
        getElementById: () => clobberForm,
        querySelector: () => realScript,
        querySelectorAll: () => [realScript]
      };
      // If form returned first in querySelector, filter must skip non-script tags and pick realScript
      (globalThis as any).document.querySelector = () => clobberForm;
      (globalThis as any).document.querySelectorAll = () => [clobberForm, realScript];
      const state = deserializeHydrationState<{ user?: string; evil?: boolean }>();
      assert.equal(state?.user, 'alice');
      assert.equal(state?.evil, undefined);

      // 3. Headless hydration: leading empty reactive text child before <span> must produce nodeType 3, never clone <span>
      delete (globalThis as any).document;
      const val = signal('');
      const makeSpan = () => ({
        nodeType: 1,
        tagName: 'SPAN',
        nodeName: 'SPAN',
        childNodes: [] as any[],
        nextSibling: null as any,
        previousSibling: null as any,
        parentNode: null as any,
        cloneNode: () => ({ nodeType: 1, tagName: 'SPAN', nodeName: 'SPAN', textContent: '' })
      });
      const span = makeSpan();
      const rootChildren: any[] = [span];
      const divSsr: any = {
        nodeType: 1,
        tagName: 'DIV',
        nodeName: 'DIV',
        childNodes: rootChildren,
        get firstChild() { return rootChildren[0] ?? null; },
        appendChild: (n: any) => { rootChildren.push(n); n.parentNode = divSsr; return n; },
        insertBefore: (n: any, ref: any) => {
          const i = ref ? rootChildren.indexOf(ref) : -1;
          if (i === -1) rootChildren.push(n);
          else rootChildren.splice(i, 0, n);
          n.parentNode = divSsr;
          return n;
        },
        replaceChildren: (...nodes: any[]) => { rootChildren.splice(0, rootChildren.length, ...nodes); }
      };
      span.parentNode = divSsr;
      const container: any = {
        nodeType: 1,
        childNodes: [divSsr],
        get firstChild() { return divSsr; },
        replaceChildren: (...nodes: any[]) => { container.childNodes = nodes; }
      };
      let mismatchCount = 0;
      const hydrated = hydrate(
        () => el('div', null, () => val.value, el('span', null)) as unknown as Node,
        container,
        { onMismatch: () => { mismatchCount++; } }
      );
      assert.equal(mismatchCount, 0);
      const nonCommentChildren = rootChildren.filter((n) => n.nodeType !== 8);
      assert.equal(nonCommentChildren.length, 2);
      assert.equal(nonCommentChildren[0]?.nodeType, 3, `Expected inserted nodeType 3, got nodeType=${nonCommentChildren[0]?.nodeType} tagName=${nonCommentChildren[0]?.tagName}`);
      assert.equal(nonCommentChildren[0]?.tagName, undefined);
      val.value = 'hi';
      assert.equal(nonCommentChildren[0]?.textContent, 'hi');
      hydrated.dispose();

      // 4. Multi-split Text.splitText in headless DOM when server text merges 3 client text nodes
      let multiSplitCalls = 0;
      const makeRealSplitText = (txt: string): any => {
        const tNode: any = {
          nodeType: 3,
          nodeName: '#text',
          textContent: txt,
          parentNode: null as any,
          nextSibling: null as any,
          previousSibling: null as any,
          splitText: (offset: number) => {
            multiSplitCalls++;
            const full = String(tNode.textContent ?? '');
            const clamped = Math.max(0, Math.min(offset, full.length));
            tNode.textContent = full.slice(0, clamped);
            const remainder = makeRealSplitText(full.slice(clamped));
            if (tNode.parentNode && typeof tNode.parentNode.insertBefore === 'function') {
              tNode.parentNode.insertBefore(remainder, tNode.nextSibling ?? null);
            }
            return remainder;
          },
          cloneNode: () => makeRealSplitText('')
        };
        return tNode;
      };
      const textNode: any = makeRealSplitText('ABC');
      const pChildren: any[] = [textNode];
      const syncSiblings = () => {
        for (let i = 0; i < pChildren.length; i++) {
          pChildren[i].previousSibling = i > 0 ? pChildren[i - 1] : null;
          pChildren[i].nextSibling = i + 1 < pChildren.length ? pChildren[i + 1] : null;
        }
      };
      const pSsr: any = {
        nodeType: 1,
        tagName: 'P',
        nodeName: 'P',
        childNodes: pChildren,
        get firstChild() { return pChildren[0] ?? null; },
        insertBefore: (n: any, ref: any) => {
          const idx = ref ? pChildren.indexOf(ref) : -1;
          if (idx === -1) pChildren.push(n);
          else pChildren.splice(idx, 0, n);
          n.parentNode = pSsr;
          syncSiblings();
          return n;
        },
        appendChild: (n: any) => pSsr.insertBefore(n, null),
        replaceChildren: (...nodes: any[]) => { pChildren.splice(0, pChildren.length, ...nodes); syncSiblings(); }
      };
      textNode.parentNode = pSsr;
      let pMismatch = 0;
      const pContainer: any = { nodeType: 1, childNodes: [pSsr], replaceChildren: () => {} };
      const pHyd = hydrate(
        () => ({
          nodeType: 1,
          tagName: 'P',
          childNodes: [
            { nodeType: 3, textContent: 'A' },
            { nodeType: 3, textContent: 'B' },
            { nodeType: 3, textContent: 'C' }
          ]
        }) as unknown as Node,
        pContainer,
        { onMismatch: () => { pMismatch++; } }
      );
      assert.equal(pMismatch, 0);
      assert.equal(pChildren.map((n) => n.textContent).join('|'), 'A|B|C');
      assert.equal(multiSplitCalls, 2, 'Real DOM Text.splitText must be used to split merged ABC into A|B|C');
      pHyd.dispose();
    } finally {
      (globalThis as any).window = prevWindow;
      (globalThis as any).document = prevDocument;
    }
  });

  it('Item 6 regression: preserves events across multiple getDelegatedEventScript tags, cleans all listeners, and handles SVGAnimatedString & DOM-clobbered form targets', async () => {
    const origWindow = (globalThis as any).window;
    const origDocument = (globalThis as any).document;
    const origElement = (globalThis as any).Element;

    try {
      const listeners = new Map<string, Set<Function>>();
      const mockDocument: any = {
        addEventListener: (type: string, fn: Function) => {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type)!.add(fn);
        },
        removeEventListener: (type: string, fn: Function) => {
          listeners.get(type)?.delete(fn);
        },
        contains: () => false
      };
      const mockWindow: any = {};
      (globalThis as any).window = mockWindow;
      (globalThis as any).document = mockDocument;

      const execScriptTag = (tagHtml: string) => {
        const match = /^<script[^>]*>([\s\S]*)<\/script>$/.exec(tagHtml.trim());
        assert.ok(match, 'Expected <script> wrapper');
        const runner = new Function('window', 'document', match![1]);
        runner(mockWindow, mockDocument);
      };

      const dispatchToDoc = (type: string, ev: any) => {
        for (const fn of Array.from(listeners.get(type) ?? [])) {
          fn(ev);
        }
      };

      // 1. Multiple delegated event script tags must NOT wipe queued events or leak listeners
      execScriptTag(getDelegatedEventScript(['click']));
      const preEv = { type: 'click', target: null };
      dispatchToDoc('click', preEv);
      assert.equal(mockWindow.__SAMREY_EVENTS__.length, 1);

      execScriptTag(getDelegatedEventScript(['click', 'keydown']));
      assert.equal(mockWindow.__SAMREY_EVENTS__.length, 1, 'Second getDelegatedEventScript must preserve already-queued events');

      const postClickEv = { type: 'click', target: null };
      const keyEv = { type: 'keydown', target: null };
      dispatchToDoc('click', postClickEv);
      dispatchToDoc('keydown', keyEv);
      assert.equal(mockWindow.__SAMREY_EVENTS__.length, 3, 'Duplicate event types across script tags must not double-push');

      const replayedCount = replayCapturedEvents();
      assert.equal(replayedCount, 3);
      assert.equal(listeners.get('click')?.size ?? 0, 0, 'All click listeners must be removed on replay cleanup');
      assert.equal(listeners.get('keydown')?.size ?? 0, 0, 'All keydown listeners must be removed on replay cleanup');

      // 2. SVGAnimatedString className and DOM-clobbered form properties (id/tagName/className as child inputs)
      const svgDispatched: any[] = [];
      const svgTargetReplacement = {
        dispatchEvent: (e: any) => { svgDispatched.push(e); return true; }
      };
      const clobberedFormDispatched: any[] = [];
      const clobberedFormReplacement = {
        dispatchEvent: (e: any) => { clobberedFormDispatched.push(e); return true; }
      };
      const clobberedInputStub = { nodeType: 1, tagName: 'INPUT', name: 'clobbered' };

      class FakeElement {}
      const fakeAttrs = new WeakMap<object, Record<string, string>>();
      const fakeTags = new WeakMap<object, string>();
      Object.defineProperty(FakeElement.prototype, 'tagName', {
        get() { return fakeTags.get(this) || ''; }
      });
      (FakeElement.prototype as any).getAttribute = function (name: string) {
        return fakeAttrs.get(this)?.[name] ?? null;
      };
      (globalThis as any).Element = FakeElement;

      const detachedSvg: any = new FakeElement();
      fakeTags.set(detachedSvg, 'svg');
      fakeAttrs.set(detachedSvg, { class: 'svg-btn icon' });
      // Real browsers expose SVGElement.className as SVGAnimatedString { baseVal }
      detachedSvg.className = { baseVal: 'svg-btn icon', animVal: 'svg-btn icon' };
      detachedSvg.dispatchEvent = () => { throw new Error('Should retarget to replacement'); };

      const detachedClobberedForm: any = new FakeElement();
      fakeTags.set(detachedClobberedForm, 'FORM');
      fakeAttrs.set(detachedClobberedForm, { id: 'real-form', class: 'form-cls' });
      // Simulate <form id="real-form"><input name="id"><input name="tagName"><input name="className"><input name="getAttribute">
      Object.defineProperties(detachedClobberedForm, {
        id: { value: clobberedInputStub, configurable: true },
        tagName: { value: clobberedInputStub, configurable: true },
        className: { value: clobberedInputStub, configurable: true },
        getAttribute: { value: clobberedInputStub, configurable: true }
      });

      const detachedClobberedTagOnlyForm: any = new FakeElement();
      fakeTags.set(detachedClobberedTagOnlyForm, 'FORM');
      fakeAttrs.set(detachedClobberedTagOnlyForm, {});
      Object.defineProperty(detachedClobberedTagOnlyForm, 'tagName', { value: clobberedInputStub, configurable: true });

      const queriesSeen: string[] = [];
      const mockContainer: any = {
        querySelector: (sel: string) => {
          queriesSeen.push(sel);
          if (sel === '.svg-btn.icon') return svgTargetReplacement;
          if (sel === '#real-form') return clobberedFormReplacement;
          if (sel === 'form') return clobberedFormReplacement;
          return null;
        }
      };

      mockWindow.__SAMREY_EVENTS__ = [
        { type: 'click', target: detachedSvg },
        { type: 'submit', target: detachedClobberedForm },
        { type: 'submit', target: detachedClobberedTagOnlyForm }
      ];
      const total = replayCapturedEvents(mockContainer);
      assert.equal(total, 3);
      assert.equal(svgDispatched.length, 1, 'SVGAnimatedString target must retarget via .svg-btn.icon selector, not fallback to tag');
      assert.equal(clobberedFormDispatched.length, 2, 'DOM-clobbered form targets must still retarget via #real-form and form safely');
      assert.ok(queriesSeen.includes('.svg-btn.icon'), `Expected .svg-btn.icon query, got ${JSON.stringify(queriesSeen)}`);
      assert.ok(queriesSeen.includes('#real-form'), `Expected #real-form query, got ${JSON.stringify(queriesSeen)}`);
      assert.ok(queriesSeen.includes('form'), `Expected lowercase form query, got ${JSON.stringify(queriesSeen)}`);
    } finally {
      if (origWindow === undefined) delete (globalThis as any).window;
      else (globalThis as any).window = origWindow;
      if (origDocument === undefined) delete (globalThis as any).document;
      else (globalThis as any).document = origDocument;
      if (origElement === undefined) delete (globalThis as any).Element;
      else (globalThis as any).Element = origElement;
    }
  });
});
