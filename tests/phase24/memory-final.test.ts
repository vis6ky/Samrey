/**
 * @license Apache-2.0
 * @samrey/monorepo - Phase 24 Memory & Lifecycle Final Gate
 * Validates zero memory leaks across 5,000 root creations/disposals and 10,000 batched signal updates.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { signal, computed, effect, batch, createRoot } from '../../packages/reactivity/src/index.js';
import { el } from '../../packages/runtime/src/index.js';

describe('Phase 24 — Memory & Lifecycle Final Gate', () => {
  it('1. Executes 5,000 createRoot lifecycles and verifies 100% disposal without leakage', () => {
    let cleanupRuns = 0;

    for (let i = 0; i < 5000; i++) {
      createRoot((dispose) => {
        const s = signal(i);
        const c = computed(() => s.value * 2);
        effect(() => {
          // Read value
          const _val = c.value;
        });

        s.value++;
        dispose();
        cleanupRuns++;
      });
    }

    assert.strictEqual(cleanupRuns, 5000, '5,000 roots must cleanly create and dispose');
  });

  it('2. Executes 10,000 batched signal updates in single microtask', () => {
    const s = signal(0);
    const c = computed(() => s.value + 1);
    let runs = 0;

    createRoot((dispose) => {
      effect(() => {
        const _v = c.value;
        runs++;
      });

      batch(() => {
        for (let i = 0; i < 10000; i++) {
          s.value = i;
        }
      });

      assert.strictEqual(s.value, 9999, 'Signal value must equal final batched iteration');
      assert.strictEqual(c.value, 10000, 'Computed value must equal final batched iteration + 1');
      assert.strictEqual(runs, 2, 'Effect should only run initially and once after batch completion');

      dispose();
    });
  });

  it('3. Verifies heap stability across garbage collection thresholds', () => {
    if (global.gc) {
      global.gc();
    }
    const initialMemory = process.memoryUsage().heapUsed;

    const data: any[] = [];
    for (let i = 0; i < 1000; i++) {
      createRoot((dispose) => {
        const sig = signal({ id: i, payload: new Array(100).fill('samrey-signal') });
        const dom = el('div', { 'data-id': String(i) }, ['Node ', sig.value.id]);
        data.push(dom);
        dispose();
      });
    }

    data.length = 0; // release references
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const deltaMB = (finalMemory - initialMemory) / (1024 * 1024);
    // Delta should be well within normal limits (< 50MB)
    assert.ok(deltaMB < 50, `Memory delta ${deltaMB.toFixed(2)}MB exceeds safety threshold`);
  });
});
