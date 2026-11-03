import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { For } from '../packages/runtime/src/index.js';
import { signal, createRoot, onCleanup } from '../packages/reactivity/src/index.js';

// Simulated array-backed DOM node where removing the tail element is O(1)
// but removing from the head/front is O(N) due to array shifting.
class ArrayBackedDOMNode {
  public childNodes: ArrayBackedDOMNode[] = [];
  public parentNode: ArrayBackedDOMNode | null = null;
  public nodeType: number;
  public nodeName: string;
  public textContent: string = '';

  constructor(type = 1, name = 'DIV') {
    this.nodeType = type;
    this.nodeName = name;
  }

  get nextSibling(): ArrayBackedDOMNode | null {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    if (idx === -1 || idx === this.parentNode.childNodes.length - 1) return null;
    return this.parentNode.childNodes[idx + 1];
  }

  appendChild(child: ArrayBackedDOMNode): ArrayBackedDOMNode {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    this.childNodes.push(child);
    child.parentNode = this;
    return child;
  }

  insertBefore(newChild: ArrayBackedDOMNode, refChild: ArrayBackedDOMNode | null): ArrayBackedDOMNode {
    if (newChild.parentNode) {
      newChild.parentNode.removeChild(newChild);
    }
    if (!refChild) {
      this.childNodes.push(newChild);
    } else {
      const idx = this.childNodes.indexOf(refChild);
      if (idx !== -1) {
        this.childNodes.splice(idx, 0, newChild);
      } else {
        this.childNodes.push(newChild);
      }
    }
    newChild.parentNode = this;
    return newChild;
  }

  removeChild(child: ArrayBackedDOMNode): ArrayBackedDOMNode {
    child.parentNode = null;
    const len = this.childNodes.length;
    // Popping the last element is an O(1) array operation (no elements to shift).
    // Removing from anywhere else shifts remaining elements (O(N) cost).
    if (len > 0 && this.childNodes[len - 1] === child) {
      this.childNodes.pop();
    } else {
      const idx = this.childNodes.indexOf(child);
      if (idx !== -1) {
        this.childNodes.splice(idx, 1);
      }
    }
    return child;
  }
}

describe('Issue 9: <For> Dispose Linearity and Reverse-Order Removal', () => {
  it('disposing a 10,000-row list stays linear (ratio 10k/5k is far below 4x) and all nodes and owners are removed', () => {
    function measureDispose(count: number): { timeMs: number; cleanupsRan: number; remainingChildCount: number } {
      const items = Array.from({ length: count }, (_, i) => ({ id: i, label: `Item ${i}` }));
      let doDispose: () => void = () => {};
      let cleanupsRan = 0;
      const container = new ArrayBackedDOMNode(1, 'UL');

      createRoot((dispose) => {
        doDispose = dispose;
        const listSig = signal(items);
        const forNode = For({
          each: () => listSig.value,
          children: (item) => {
            onCleanup(() => {
              cleanupsRan++;
            });
            const li = new ArrayBackedDOMNode(1, 'LI');
            li.textContent = item.label;
            return li as unknown as Node;
          }
        });
        container.appendChild(forNode as unknown as ArrayBackedDOMNode);
      });

      // Measure dispose time
      const start = performance.now();
      doDispose();
      const elapsed = performance.now() - start;

      return {
        timeMs: elapsed,
        cleanupsRan,
        remainingChildCount: container.childNodes.length
      };
    }

    // Warmup
    measureDispose(1000);

    const res5k = measureDispose(5000);
    const res10k = measureDispose(10000);

    // Verify all owners and nodes were cleaned up
    assert.equal(res5k.cleanupsRan, 5000, 'All 5,000 row owners should be disposed');
    assert.equal(res10k.cleanupsRan, 10000, 'All 10,000 row owners should be disposed');

    // In container, only the control flow marker comment should remain
    assert.equal(res5k.remainingChildCount, 1, 'Container should only have marker left after 5k dispose');
    assert.equal(res10k.remainingChildCount, 1, 'Container should only have marker left after 10k dispose');

    const ratio = res10k.timeMs / Math.max(res5k.timeMs, 0.01);
    // Linear O(n) ratio for 2x data size is ~2x. Quadratic O(n^2) is ~4x-16x.
    // The ratio must be far below 4x (e.g., < 3.2x).
    assert.ok(
      ratio < 3.2,
      `Dispose should be linear: ratio 10k/5k was ${ratio.toFixed(2)}x (5k: ${res5k.timeMs.toFixed(2)}ms, 10k: ${res10k.timeMs.toFixed(2)}ms), expected < 3.2x`
    );
  });

  it('empty-list transition removes all rows and executes owner disposals in reverse order', () => {
    const count = 1000;
    const items = Array.from({ length: count }, (_, i) => ({ id: i, label: `Item ${i}` }));
    let cleanupsRan = 0;
    const cleanupOrder: number[] = [];
    const container = new ArrayBackedDOMNode(1, 'UL');
    const listSig = signal(items);

    createRoot((dispose) => {
      const forNode = For({
        each: () => listSig.value,
        children: (item) => {
          onCleanup(() => {
            cleanupsRan++;
            cleanupOrder.push(item.id);
          });
          const li = new ArrayBackedDOMNode(1, 'LI');
          li.textContent = item.label;
          return li as unknown as Node;
        }
      });
      container.appendChild(forNode as unknown as ArrayBackedDOMNode);

      // Transition to empty list
      listSig.value = [];

      // Verify all items removed and only marker remains
      assert.equal(container.childNodes.length, 1);
      assert.equal(cleanupsRan, count);

      // Verify reverse order: last item (999) disposed first, item 0 disposed last
      assert.equal(cleanupOrder[0], 999, 'Last item should be disposed first');
      assert.equal(cleanupOrder[cleanupOrder.length - 1], 0, 'First item should be disposed last');

      dispose();
    });
  });
});
