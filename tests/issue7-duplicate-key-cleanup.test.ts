import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import v8 from 'node:v8';
import vm from 'node:vm';
import { For } from '../packages/runtime/src/index.js';
import { signal, createRoot } from '../packages/reactivity/src/index.js';
import { setupBenchmarkDOM, BenchmarkNode } from '../benchmarks/utils/dom-mock.js';

if (typeof (globalThis as any).gc !== 'function') {
  try {
    v8.setFlagsFromString('--expose_gc');
    (globalThis as any).gc = vm.runInNewContext('gc');
  } catch {
    // Fallback if V8 flags cannot be set dynamically
  }
}

describe('Item 7: Duplicate-Key Token Map Cleanup & Flat Memory', () => {
  setupBenchmarkDOM();

  it('drops duplicate key tokens for keys no longer present after each reconcile', () => {
    const listSig = signal<string[]>(['dupA', 'dupA', 'dupB', 'dupB']);
    const container = new BenchmarkNode(1, 'UL');

    createRoot((dispose) => {
      const forNode = For({
        each: () => listSig.value,
        children: (item) => {
          const li = new BenchmarkNode(1, 'LI', item);
          return li as unknown as Node;
        }
      });
      container.appendChild(forNode as unknown as BenchmarkNode);

      // Initially 2 duplicate keys present: 'dupA' and 'dupB'
      assert.equal((forNode as any)._duplicateKeyTokensCount, 2, 'Initial duplicate token count must be 2');

      // Reconcile: replace with 'dupC' (dupA and dupB are no longer present)
      listSig.value = ['dupC', 'dupC'];
      assert.equal((forNode as any)._duplicateKeyTokensCount, 1, 'Token count must drop to 1 after removing old duplicate keys');

      // Reconcile: replace with non-duplicate keys (dupC is no longer present)
      listSig.value = ['unique1', 'unique2'];
      assert.equal((forNode as any)._duplicateKeyTokensCount, 0, 'Token count must drop to 0 when no duplicate keys are present');

      dispose();
    });
  });

  it('processes 40,000 distinct duplicate keys: memory stays flat and token map size stays bounded', () => {
    const container = new BenchmarkNode(1, 'UL');
    const listSig = signal<string[]>([]);
    let forNodeRef: any = null;
    let disposeRoot: () => void = () => {};

    createRoot((dispose) => {
      disposeRoot = dispose;
      const forNode = For({
        each: () => listSig.value,
        children: (item) => {
          const li = new BenchmarkNode(1, 'LI', item);
          return li as unknown as Node;
        }
      });
      forNodeRef = forNode;
      container.appendChild(forNode as unknown as BenchmarkNode);
    });

    if (global.gc) global.gc();
    const initialHeap = process.memoryUsage().heapUsed;

    const BATCH_SIZE = 1000;
    const NUM_BATCHES = 40; // 40 * 1,000 = 40,000 distinct duplicate keys

    const origWarn = console.warn;
    console.warn = () => {}; // Suppress console warning spam during 40,000 key benchmark

    try {
      for (let batch = 0; batch < NUM_BATCHES; batch++) {
        const batchItems: string[] = [];
        const offset = batch * BATCH_SIZE;
        for (let i = 0; i < BATCH_SIZE; i++) {
          const key = `key_${offset + i}`;
          batchItems.push(key, key); // duplicate keys
        }
        listSig.value = batchItems;

        // At each batch, exactly BATCH_SIZE duplicate keys are active, not accumulating
        assert.equal(
          forNodeRef._duplicateKeyTokensCount,
          BATCH_SIZE,
          `Token count at batch ${batch} must be bounded to ${BATCH_SIZE}, not accumulating prior batches`
        );
      }
    } finally {
      console.warn = origWarn;
    }

    // Transition to 2 duplicate keys
    listSig.value = ['final_1', 'final_1', 'final_2', 'final_2'];
    assert.equal(forNodeRef._duplicateKeyTokensCount, 2, 'Token count must drop to 2 for 2 active duplicate keys');

    const gcFn = (globalThis as any).gc;
    if (typeof gcFn === 'function') gcFn();
    const finalHeap = process.memoryUsage().heapUsed;

    const rows = container.childNodes.filter((n) => n.nodeName === 'LI');
    assert.equal(rows.length, 4);

    disposeRoot();

    // With tokens dropped after each reconcile, memory growth remains flat
    const heapGrowthMb = (finalHeap - initialHeap) / (1024 * 1024);
    const heapLimitMb = typeof gcFn === 'function' ? 15 : 100;
    assert.ok(
      heapGrowthMb < heapLimitMb,
      `Memory should stay flat across 40,000 duplicate keys: heap growth was ${heapGrowthMb.toFixed(2)} MB, expected < ${heapLimitMb} MB`
    );
  });
});
