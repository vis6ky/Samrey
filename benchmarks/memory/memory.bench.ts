import { signal, computed, effect, createRoot, onCleanup } from '../../packages/reactivity/src/index.js';
import { Show, For, createComponent, on } from '../../packages/runtime/src/index.js';
import { benchmark, BenchmarkResult } from '../utils/harness.js';
import { setupBenchmarkDOM, BenchmarkNode } from '../utils/dom-mock.js';

export function runMemoryBenchmarks(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const category = 'Memory & Leak Profiling';
  setupBenchmarkDOM();

  // 1. Reactive Signal & Effect Churn Cycle (500 cycles of createRoot -> mutate -> dispose)
  results.push(benchmark('Memory: 500 Reactive Root Mount/Update/Dispose Cycles', () => {
    for (let c = 0; c < 500; c++) {
      createRoot((dispose) => {
        const s = signal(0);
        const comp = computed(() => s.value * 2);
        let obs = 0;
        effect(() => { obs = comp.value; });
        for (let i = 0; i < 10; i++) {
          s.value = i;
        }
        dispose();
      });
    }
  }, { category, iterations: 5, trackMemory: true }));

  // 2. Control Flow <Show> Churn Cycle (100 toggles with listeners & cleanups)
  results.push(benchmark('Memory: Show Component Mount/Unmount Churn (100 cycles)', () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'DIV');
      const condition = signal(false);
      let cleanupCount = 0;

      const node = Show({
        when: () => condition.value,
        children: () => {
          onCleanup(() => { cleanupCount++; });
          const el = new BenchmarkNode(1, 'SECTION');
          on(el as unknown as HTMLElement, 'click', () => {});
          return el as unknown as Node;
        }
      });
      container.appendChild(node as unknown as BenchmarkNode);

      for (let i = 0; i < 100; i++) {
        condition.value = i % 2 === 0;
      }
      dispose();
    });
  }, { category, iterations: 5, trackMemory: true }));

  // 3. Control Flow <For> Keyed Churn Cycle (50 full list swaps of 200 items)
  results.push(benchmark('Memory: For Keyed List Churn (50 full list replacements of 200 items)', () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'UL');
      const listSig = signal(Array.from({ length: 200 }, (_, i) => ({ id: i, name: `Initial ${i}` })));

      const node = For({
        each: () => listSig.value,
        children: (item) => {
          onCleanup(() => {});
          const li = new BenchmarkNode(1, 'LI');
          li.textContent = item.name;
          return li as unknown as Node;
        }
      });
      container.appendChild(node as unknown as BenchmarkNode);

      for (let swap = 1; swap <= 50; swap++) {
        listSig.value = Array.from({ length: 200 }, (_, i) => ({ id: swap * 1000 + i, name: `Swap ${swap}-${i}` }));
      }
      dispose();
    });
  }, { category, iterations: 5, trackMemory: true }));

  // 4. Component Tree Mount/Unmount Cycle (100 nested trees)
  const LeafComp = (props: { id: number }) => {
    onCleanup(() => {});
    const span = new BenchmarkNode(1, 'SPAN');
    span.textContent = `Leaf ${props.id}`;
    return span as unknown as Node;
  };

  const ParentComp = (props: { count: number }) => {
    const box = new BenchmarkNode(1, 'DIV');
    for (let i = 0; i < props.count; i++) {
      const child = createComponent(LeafComp, { id: i });
      box.appendChild(child as unknown as BenchmarkNode);
    }
    return box as unknown as Node;
  };

  results.push(benchmark('Memory: Component Tree 100 Mount/Dispose Cycles (50 leaves per tree)', () => {
    for (let cycle = 0; cycle < 100; cycle++) {
      createRoot((dispose) => {
        const root = new BenchmarkNode(1, 'MAIN');
        const comp = createComponent(ParentComp, { count: 50 });
        root.appendChild(comp as unknown as BenchmarkNode);
        dispose();
      });
    }
  }, { category, iterations: 5, trackMemory: true }));

  return results;
}
