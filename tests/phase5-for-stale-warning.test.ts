import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { signal, createRoot, createStore } from '../packages/reactivity/src/index.js';
import { For, getDevDiagnosticHistory, clearDevDiagnosticHistory } from '../packages/runtime/src/index.js';

class TestNode {
  public nodeType: number;
  public nodeName: string;
  public textContent: string = '';
  public parentNode: TestNode | null = null;
  public childNodes: TestNode[] = [];
  public id: string = '';

  constructor(type: number, name: string, text = '') {
    this.nodeType = type;
    this.nodeName = name;
    this.textContent = text;
  }

  get nextSibling(): TestNode | null {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    if (idx === -1 || idx === this.parentNode.childNodes.length - 1) return null;
    return this.parentNode.childNodes[idx + 1];
  }

  appendChild(child: TestNode): TestNode {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    this.childNodes.push(child);
    child.parentNode = this;
    return child;
  }

  insertBefore(newChild: TestNode, refChild: TestNode | null): TestNode {
    if (newChild.parentNode) {
      newChild.parentNode.removeChild(newChild);
    }
    if (!refChild) {
      this.childNodes.push(newChild);
    } else {
      const idx = this.childNodes.indexOf(refChild);
      if (idx === -1) {
        this.childNodes.push(newChild);
      } else {
        this.childNodes.splice(idx, 0, newChild);
      }
    }
    newChild.parentNode = this;
    return newChild;
  }

  removeChild(child: TestNode): TestNode {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) {
      this.childNodes.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }
}

describe('Phase 5.2 - <For> Keyed-Identity Semantics & Stale Item Warning', () => {
  let warnedMessages: string[] = [];
  let originalWarn: typeof console.warn;

  beforeEach(() => {
    warnedMessages = [];
    clearDevDiagnosticHistory();
    originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      warnedMessages.push(args.map(a => String(a)).join(' '));
    };
  });

  afterEach(() => {
    console.warn = originalWarn;
    clearDevDiagnosticHistory();
  });

  test('same key + new item reference -> one warning, no DOM change', () => {
    const list = signal([
      { id: 'item-1', text: 'Original Title' }
    ]);

    createRoot((dispose) => {
      const parent = new TestNode(1, 'DIV');
      let createdSpan: TestNode | null = null;
      const forMarker = For({
        each: () => list.value,
        key: (item) => item.id,
        children: (item) => {
          const el = new TestNode(1, 'SPAN', item.text);
          createdSpan = el;
          return el as unknown as Node;
        }
      });
      parent.appendChild(forMarker as unknown as TestNode);

      assert.strictEqual(createdSpan!.textContent, 'Original Title');
      assert.strictEqual(warnedMessages.length, 0);

      // Mutate by supplying a new object reference under the same key
      list.value = [
        { id: 'item-1', text: 'Mutated Title' }
      ];

      // Row is reused without re-executing children: DOM stays stale with original item reference
      assert.strictEqual(createdSpan!.textContent, 'Original Title', 'DOM output remains unchanged (keyed identity semantics)');

      // A warning must have been emitted
      assert.strictEqual(warnedMessages.length, 1);
      assert.ok(warnedMessages[0].includes('item-1'), 'Warning message must mention key');
      assert.ok(warnedMessages[0].includes('reused') || warnedMessages[0].includes('stale') || warnedMessages[0].includes('changed under existing key'), 'Warning message must explain reuse');

      dispose();
    });
  });

  test('same key + same reference -> no warning', () => {
    const item1 = { id: 'k1', text: 'Item 1' };
    const list = signal([item1]);

    createRoot((dispose) => {
      const parent = new TestNode(1, 'DIV');
      const forMarker = For({
        each: () => list.value,
        key: (item) => item.id,
        children: (item) => new TestNode(1, 'SPAN', item.text) as unknown as Node
      });
      parent.appendChild(forMarker as unknown as TestNode);

      // Trigger update with same item reference
      list.value = [item1];

      assert.strictEqual(warnedMessages.length, 0, 'Must not warn when item reference is identical');
      dispose();
    });
  });

  test('default key -> no warning', () => {
    // When no key prop is supplied, default key is the item reference itself
    const itemA = { text: 'Alpha' };
    const itemB = { text: 'Beta' };
    const list = signal([itemA]);

    createRoot((dispose) => {
      const parent = new TestNode(1, 'DIV');
      const forMarker = For({
        each: () => list.value,
        // No key prop
        children: (item) => new TestNode(1, 'SPAN', item.text) as unknown as Node
      });
      parent.appendChild(forMarker as unknown as TestNode);

      // Update list
      list.value = [itemB];

      assert.strictEqual(warnedMessages.length, 0, 'Default key must never warn about stale keyed items');
      dispose();
    });
  });

  test('repeated updates for the same key -> still one warning', () => {
    const list = signal([
      { id: 'k2', text: 'v1' }
    ]);

    createRoot((dispose) => {
      const parent = new TestNode(1, 'DIV');
      const forMarker = For({
        each: () => list.value,
        key: (item) => item.id,
        children: (item) => new TestNode(1, 'SPAN', item.text) as unknown as Node
      });
      parent.appendChild(forMarker as unknown as TestNode);

      // First update with new reference
      list.value = [{ id: 'k2', text: 'v2' }];
      assert.strictEqual(warnedMessages.length, 1);

      // Second update with yet another reference under the same key
      list.value = [{ id: 'k2', text: 'v3' }];
      assert.strictEqual(warnedMessages.length, 1, 'Must warn once per key per For instance, not on every update');

      dispose();
    });
  });

  test('warning state is cleared after the row is removed', () => {
    const list = signal([
      { id: 'k3', text: 'initial' }
    ]);

    createRoot((dispose) => {
      const parent = new TestNode(1, 'DIV');
      const forMarker = For({
        each: () => list.value,
        key: (item) => item.id,
        children: (item) => new TestNode(1, 'SPAN', item.text) as unknown as Node
      });
      parent.appendChild(forMarker as unknown as TestNode);

      // Trigger warning
      list.value = [{ id: 'k3', text: 'modified' }];
      assert.strictEqual(warnedMessages.length, 1);

      // Remove row
      list.value = [];
      assert.strictEqual(parent.childNodes.length, 1); // only marker remains

      // Re-add row with key 'k3'
      list.value = [{ id: 'k3', text: 'brand new mount' }];
      assert.strictEqual(warnedMessages.length, 1);

      // Now mutate it again: should be able to warn again since the previous row was disposed and warning state cleared
      list.value = [{ id: 'k3', text: 'second mutation cycle' }];
      assert.strictEqual(warnedMessages.length, 2, 'Warning state should be cleared after row is removed and re-created');

      dispose();
    });
  });

  test('store proxy -> no warning', () => {
    const store = createStore({
      items: [
        { id: 'store-1', count: 10 }
      ]
    });

    createRoot((dispose) => {
      const parent = new TestNode(1, 'DIV');
      const forMarker = For({
        each: () => store.items,
        key: (item) => item.id,
        children: (item) => new TestNode(1, 'SPAN', String(item.count)) as unknown as Node
      });
      parent.appendChild(forMarker as unknown as TestNode);

      // Mutate store property directly
      store.items[0].count = 20;

      assert.strictEqual(warnedMessages.length, 0, 'Store proxy items must not trigger stale item warning');
      dispose();
    });
  });

  test('DOM output and row identity are byte-identical to before', () => {
    const list = signal([
      { id: 'a', val: 'A' },
      { id: 'b', val: 'B' },
      { id: 'c', val: 'C' }
    ]);

    createRoot((dispose) => {
      const parent = new TestNode(1, 'DIV');
      let nodeA: TestNode | null = null;
      let nodeB: TestNode | null = null;
      let nodeC: TestNode | null = null;

      const forMarker = For({
        each: () => list.value,
        key: (item) => item.id,
        children: (item) => {
          const p = new TestNode(1, 'P', item.val);
          p.id = `item-${item.id}`;
          if (item.id === 'a') nodeA = p;
          if (item.id === 'b') nodeB = p;
          if (item.id === 'c') nodeC = p;
          return p as unknown as Node;
        }
      });
      parent.appendChild(forMarker as unknown as TestNode);

      assert.ok(nodeA && nodeB && nodeC);

      // Reorder
      list.value = [
        { id: 'c', val: 'C' },
        { id: 'a', val: 'A' },
        { id: 'b', val: 'B' }
      ];

      // Exclude marker at index 0
      const contentNodes = parent.childNodes.slice(1);
      assert.strictEqual(contentNodes[0], nodeC, 'Item C node identity preserved');
      assert.strictEqual(contentNodes[1], nodeA, 'Item A node identity preserved');
      assert.strictEqual(contentNodes[2], nodeB, 'Item B node identity preserved');

      dispose();
    });
  });

  test('production mode -> no warning, no extra work', async () => {
    // Run an isolated child process with NODE_ENV=production to test production behavior
    const { execSync } = await import('node:child_process');
    const script = `
      import assert from 'node:assert';
      import { signal, createRoot } from './packages/reactivity/src/index.js';
      import { For, isDev } from './packages/runtime/src/index.js';

      assert.strictEqual(isDev, false, 'isDev must be false in production');

      let warned = 0;
      const origWarn = console.warn;
      console.warn = () => { warned++; };

      const list = signal([{ id: 'p1', name: 'Prod Item' }]);
      createRoot((dispose) => {
        For({
          each: () => list.value,
          key: (item) => item.id,
          children: (item) => ({ nodeType: 1, textContent: item.name })
        });
        list.value = [{ id: 'p1', name: 'Updated Prod Item' }];
        dispose();
      });

      console.warn = origWarn;
      assert.strictEqual(warned, 0, 'No warning must be emitted in production mode');
    `;

    execSync('npx tsx', {
      input: script,
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: 'pipe'
    });
  });
});
