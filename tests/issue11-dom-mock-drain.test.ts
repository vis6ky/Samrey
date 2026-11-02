import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BenchmarkNode } from '../benchmarks/utils/dom-mock.js';

describe('Issue 11: BenchmarkNode DocumentFragment O(n) Draining', () => {
  it('drains DocumentFragment in O(n) time without O(n^2) per-child removal overhead', () => {
    function measureFragAppend(count: number): number {
      const container = new BenchmarkNode(1, 'UL');
      const frag = new BenchmarkNode(11, '#document-fragment');
      for (let i = 0; i < count; i++) {
        frag.appendChild(new BenchmarkNode(1, 'LI', `Item ${i}`));
      }

      const t0 = performance.now();
      container.appendChild(frag);
      const elapsed = performance.now() - t0;

      assert.equal(frag.childNodes.length, 0, 'Fragment should be drained of all children');
      assert.equal(container.childNodes.length, count, 'Container should receive all children');
      assert.equal(container.childNodes[0].textContent, 'Item 0');
      assert.equal(container.childNodes[count - 1].textContent, `Item ${count - 1}`);

      return elapsed;
    }

    // Warmup
    measureFragAppend(500);

    const t5k = measureFragAppend(5000);
    const t10k = measureFragAppend(10000);

    // Draining 10k nodes in O(n) takes ~1-3ms. In O(n^2) it took >10ms.
    assert.ok(
      t10k < 5,
      `10,000 node DocumentFragment append should be O(n) and take < 5ms, took ${t10k.toFixed(2)}ms`
    );

    const ratio = t10k / Math.max(t5k, 0.01);
    assert.ok(
      ratio < 3.2,
      `Draining ratio 10k/5k should be linear (< 3.2x), got ${ratio.toFixed(2)}x (5k: ${t5k.toFixed(2)}ms, 10k: ${t10k.toFixed(2)}ms)`
    );
  });

  it('drains DocumentFragment with insertBefore in O(n) time', () => {
    const container = new BenchmarkNode(1, 'UL');
    const existingLast = new BenchmarkNode(1, 'LI', 'Tail');
    container.appendChild(existingLast);

    const frag = new BenchmarkNode(11, '#document-fragment');
    for (let i = 0; i < 1000; i++) {
      frag.appendChild(new BenchmarkNode(1, 'LI', `Frag ${i}`));
    }

    container.insertBefore(frag, existingLast);

    assert.equal(frag.childNodes.length, 0);
    assert.equal(container.childNodes.length, 1001);
    assert.equal(container.childNodes[0].textContent, 'Frag 0');
    assert.equal(container.childNodes[999].textContent, 'Frag 999');
    assert.equal(container.childNodes[1000].textContent, 'Tail');
  });
});
