import { Show, createComponent } from '../../packages/runtime/src/index.js';
import { signal, createRoot, onCleanup } from '../../packages/reactivity/src/index.js';
import { benchmark, BenchmarkResult } from '../utils/harness.js';
import { setupBenchmarkDOM, BenchmarkNode } from '../utils/dom-mock.js';

export function runShowBenchmarks(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const category = 'Control Flow - Show';
  setupBenchmarkDOM();

  // 1. Single Transition: false -> true
  results.push(benchmark('Show: Single Transition (false -> true)', () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'DIV');
      const condition = signal(false);
      const showNode = Show({
        when: () => condition.value,
        children: () => {
          const el = new BenchmarkNode(1, 'SECTION');
          el.textContent = 'Active Content';
          return el as unknown as Node;
        },
        fallback: () => {
          const el = new BenchmarkNode(1, 'SPAN');
          el.textContent = 'Fallback';
          return el as unknown as Node;
        }
      });
      container.appendChild(showNode as unknown as BenchmarkNode);

      condition.value = true;
      dispose();
    });
  }, { category, iterations: 25 }));

  // 2. Single Transition: true -> false
  results.push(benchmark('Show: Single Transition (true -> false)', () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'DIV');
      const condition = signal(true);
      const showNode = Show({
        when: () => condition.value,
        children: () => {
          const el = new BenchmarkNode(1, 'SECTION');
          el.textContent = 'Active Content';
          return el as unknown as Node;
        },
        fallback: () => {
          const el = new BenchmarkNode(1, 'SPAN');
          el.textContent = 'Fallback';
          return el as unknown as Node;
        }
      });
      container.appendChild(showNode as unknown as BenchmarkNode);

      condition.value = false;
      dispose();
    });
  }, { category, iterations: 25 }));

  // 3. Repeated Toggling (100 toggles back and forth)
  results.push(benchmark('Show: Repeated Toggling (100 cycles)', () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'DIV');
      const condition = signal(false);
      let cleanups = 0;
      let renders = 0;

      const showNode = Show({
        when: () => condition.value,
        children: () => {
          renders++;
          onCleanup(() => { cleanups++; });
          const el = new BenchmarkNode(1, 'DIV');
          el.textContent = 'Active Pane';
          return el as unknown as Node;
        },
        fallback: () => {
          const el = new BenchmarkNode(1, 'DIV');
          el.textContent = 'Empty Pane';
          return el as unknown as Node;
        }
      });
      container.appendChild(showNode as unknown as BenchmarkNode);

      for (let i = 0; i < 100; i++) {
        condition.value = i % 2 === 0;
      }
      dispose();
    });
  }, { category, iterations: 20, trackMemory: true }));

  // 4. Nested Show (Depth 3)
  results.push(benchmark('Show: Nested Show (3 levels deep)', () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'DIV');
      const c1 = signal(true);
      const c2 = signal(true);
      const c3 = signal(true);

      const showNode = Show({
        when: () => c1.value,
        children: () => Show({
          when: () => c2.value,
          children: () => Show({
            when: () => c3.value,
            children: () => {
              const el = new BenchmarkNode(1, 'P');
              el.textContent = 'Deeply Nested';
              return el as unknown as Node;
            }
          })
        })
      });
      container.appendChild(showNode as unknown as BenchmarkNode);

      for (let i = 0; i < 20; i++) {
        c3.value = !c3.value;
        c2.value = !c2.value;
        c1.value = !c1.value;
      }
      dispose();
    });
  }, { category, iterations: 15 }));

  // 5. Show with Custom Components & Lifecycle Cleanup
  const ComplexWidget = (props: { name: string }) => {
    onCleanup(() => {});
    const box = new BenchmarkNode(1, 'DIV');
    box.textContent = props.name;
    return box as unknown as Node;
  };

  results.push(benchmark('Show: Complex Component Lifecycle', () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'DIV');
      const condition = signal(true);

      const showNode = Show({
        when: () => condition.value,
        children: () => createComponent(ComplexWidget, { name: 'Widget Alpha' })
      });
      container.appendChild(showNode as unknown as BenchmarkNode);

      for (let i = 0; i < 50; i++) {
        condition.value = i % 2 === 1;
      }
      dispose();
    });
  }, { category, iterations: 20 }));

  return results;
}
