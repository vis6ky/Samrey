import { For } from '../../packages/runtime/src/index.js';
import { signal, createRoot } from '../../packages/reactivity/src/index.js';
import { benchmark, BenchmarkResult } from '../utils/harness.js';
import { setupBenchmarkDOM, BenchmarkNode } from '../utils/dom-mock.js';

interface TestItem {
  id: number;
  label: string;
}

export function runForBenchmarks(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const category = 'Control Flow - For (Keyed)';
  setupBenchmarkDOM();

  // 1. Initial Mount for various scales (100, 1,000, 10,000)
  for (const count of [100, 1000, 10000]) {
    const rawItems: TestItem[] = Array.from({ length: count }, (_, i) => ({ id: i, label: `Item ${i}` }));
    results.push(benchmark(`For: Initial Keyed Mount (${count.toLocaleString()} items)`, () => {
      createRoot((dispose) => {
        const container = new BenchmarkNode(1, 'UL');
        const listSig = signal(rawItems);
        const forNode = For({
          each: () => listSig.value,
          children: (item) => {
            const li = new BenchmarkNode(1, 'LI');
            li.textContent = item.label;
            return li as unknown as Node;
          }
        });
        container.appendChild(forNode as unknown as BenchmarkNode);
        dispose();
      });
    }, { category, iterations: count > 1000 ? 5 : 15, trackMemory: true }));
  }

  // 2. Reconciliation Operations on 1,000 items
  const baseCount = 1000;
  const initialItems: TestItem[] = Array.from({ length: baseCount }, (_, i) => ({ id: i, label: `Item ${i}` }));

  // Append 100 items
  results.push(benchmark(`For: Append 100 items (${baseCount.toLocaleString()} base)`, () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'UL');
      const listSig = signal([...initialItems]);
      const forNode = For({
        each: () => listSig.value,
        children: (item) => {
          const li = new BenchmarkNode(1, 'LI');
          li.textContent = item.label;
          return li as unknown as Node;
        }
      });
      container.appendChild(forNode as unknown as BenchmarkNode);

      // Append
      const appended = [...initialItems];
      for (let i = baseCount; i < baseCount + 100; i++) {
        appended.push({ id: i, label: `Appended ${i}` });
      }
      listSig.value = appended;
      dispose();
    });
  }, { category, iterations: 10 }));

  // Prepend 100 items
  results.push(benchmark(`For: Prepend 100 items (${baseCount.toLocaleString()} base)`, () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'UL');
      const listSig = signal([...initialItems]);
      const forNode = For({
        each: () => listSig.value,
        children: (item) => {
          const li = new BenchmarkNode(1, 'LI');
          li.textContent = item.label;
          return li as unknown as Node;
        }
      });
      container.appendChild(forNode as unknown as BenchmarkNode);

      // Prepend
      const prepended: TestItem[] = [];
      for (let i = 1; i <= 100; i++) {
        prepended.push({ id: -i, label: `Prepended ${i}` });
      }
      listSig.value = [...prepended, ...initialItems];
      dispose();
    });
  }, { category, iterations: 10 }));

  // Remove first 100 items
  results.push(benchmark(`For: Remove first 100 items (${baseCount.toLocaleString()} base)`, () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'UL');
      const listSig = signal([...initialItems]);
      const forNode = For({
        each: () => listSig.value,
        children: (item) => {
          const li = new BenchmarkNode(1, 'LI');
          li.textContent = item.label;
          return li as unknown as Node;
        }
      });
      container.appendChild(forNode as unknown as BenchmarkNode);

      listSig.value = initialItems.slice(100);
      dispose();
    });
  }, { category, iterations: 10 }));

  // Remove middle 100 items
  results.push(benchmark(`For: Remove middle 100 items (${baseCount.toLocaleString()} base)`, () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'UL');
      const listSig = signal([...initialItems]);
      const forNode = For({
        each: () => listSig.value,
        children: (item) => {
          const li = new BenchmarkNode(1, 'LI');
          li.textContent = item.label;
          return li as unknown as Node;
        }
      });
      container.appendChild(forNode as unknown as BenchmarkNode);

      const mid = [...initialItems];
      mid.splice(450, 100);
      listSig.value = mid;
      dispose();
    });
  }, { category, iterations: 10 }));

  // Remove last 100 items
  results.push(benchmark(`For: Remove last 100 items (${baseCount.toLocaleString()} base)`, () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'UL');
      const listSig = signal([...initialItems]);
      const forNode = For({
        each: () => listSig.value,
        children: (item) => {
          const li = new BenchmarkNode(1, 'LI');
          li.textContent = item.label;
          return li as unknown as Node;
        }
      });
      container.appendChild(forNode as unknown as BenchmarkNode);

      listSig.value = initialItems.slice(0, baseCount - 100);
      dispose();
    });
  }, { category, iterations: 10 }));

  // Reverse list
  results.push(benchmark(`For: Reverse 1,000 items`, () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'UL');
      const listSig = signal([...initialItems]);
      const forNode = For({
        each: () => listSig.value,
        children: (item) => {
          const li = new BenchmarkNode(1, 'LI');
          li.textContent = item.label;
          return li as unknown as Node;
        }
      });
      container.appendChild(forNode as unknown as BenchmarkNode);

      listSig.value = [...initialItems].reverse();
      dispose();
    });
  }, { category, iterations: 10 }));

  // Random Reorder / Shuffle (1,000 items)
  results.push(benchmark(`For: Random Shuffle 1,000 items`, () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'UL');
      const listSig = signal([...initialItems]);
      const forNode = For({
        each: () => listSig.value,
        children: (item) => {
          const li = new BenchmarkNode(1, 'LI');
          li.textContent = item.label;
          return li as unknown as Node;
        }
      });
      container.appendChild(forNode as unknown as BenchmarkNode);

      // Deterministic pseudo-shuffle
      const shuffled = [...initialItems].sort((a, b) => ((a.id * 17) % 100) - ((b.id * 17) % 100));
      listSig.value = shuffled;
      dispose();
    });
  }, { category, iterations: 10 }));

  // Node Reuse Verification Benchmark
  results.push(benchmark(`For: Verification of 90% Node Reuse (1,000 items, swap 100)`, () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'UL');
      const listSig = signal([...initialItems]);
      const forNode = For({
        each: () => listSig.value,
        children: (item) => {
          const li = new BenchmarkNode(1, 'LI');
          li.textContent = item.label;
          return li as unknown as Node;
        }
      });
      container.appendChild(forNode as unknown as BenchmarkNode);

      const modified = [...initialItems];
      for (let i = 0; i < 100; i++) {
        modified[i] = { id: 9000 + i, label: `New Item ${i}` };
      }
      listSig.value = modified;
      dispose();
    });
  }, { category, iterations: 10 }));

  return results;
}
