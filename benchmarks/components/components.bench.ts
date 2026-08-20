import { createComponent } from '../../packages/runtime/src/index.js';
import { signal, createRoot, onCleanup } from '../../packages/reactivity/src/index.js';
import { benchmark, BenchmarkResult } from '../utils/harness.js';
import { setupBenchmarkDOM, BenchmarkNode } from '../utils/dom-mock.js';

export function runComponentBenchmarks(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const category = 'Components';
  setupBenchmarkDOM();

  // 1. Flat Component Creation (1,000 components)
  const LeafComponent = (props: { id: number; title: string }) => {
    const el = new BenchmarkNode(1, 'DIV');
    el.setAttribute('data-id', String(props.id));
    el.textContent = props.title;
    return el as unknown as Node;
  };

  results.push(benchmark('Component Creation: 1,000 Flat Components', () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'DIV');
      for (let i = 0; i < 1000; i++) {
        const comp = createComponent(LeafComponent, { id: i, title: `Item ${i}` });
        container.appendChild(comp as unknown as BenchmarkNode);
      }
      dispose();
    });
  }, { category, iterations: 15, trackMemory: true }));

  // 2. Nested Components (Tree depth 20)
  const NestedBranch = (props: { depth: number; maxDepth: number }): Node => {
    const el = new BenchmarkNode(1, 'DIV');
    el.setAttribute('data-depth', String(props.depth));
    if (props.depth < props.maxDepth) {
      const child = createComponent(NestedBranch, { depth: props.depth + 1, maxDepth: props.maxDepth });
      el.appendChild(child as unknown as BenchmarkNode);
    }
    return el as unknown as Node;
  };

  results.push(benchmark('Nested Components: 20-Level Deep Component Tree', () => {
    createRoot((dispose) => {
      const container = new BenchmarkNode(1, 'SECTION');
      const rootComp = createComponent(NestedBranch, { depth: 1, maxDepth: 20 });
      container.appendChild(rootComp as unknown as BenchmarkNode);
      dispose();
    });
  }, { category, iterations: 20 }));

  // 3. Component Updates via Reactive Props
  const ReactiveComponent = (props: { countSig: () => number }) => {
    const el = new BenchmarkNode(1, 'DIV');
    el.textContent = `Count: ${props.countSig()}`;
    return el as unknown as Node;
  };

  results.push(benchmark('Component Reactive Prop Updates (500 updates across 100 components)', () => {
    createRoot((dispose) => {
      const count = signal(0);
      const container = new BenchmarkNode(1, 'DIV');
      for (let i = 0; i < 100; i++) {
        const comp = createComponent(ReactiveComponent, { countSig: () => count.value });
        container.appendChild(comp as unknown as BenchmarkNode);
      }
      for (let i = 0; i < 500; i++) {
        count.value = i;
      }
      dispose();
    });
  }, { category, iterations: 15 }));

  // 4. Component Lifecycle Disposal (1,000 components with cleanups)
  const LifecycleComponent = (props: { id: number }) => {
    onCleanup(() => {
      // Disposed
    });
    const el = new BenchmarkNode(1, 'SPAN');
    el.textContent = `Node ${props.id}`;
    return el as unknown as Node;
  };

  results.push(benchmark('Component Disposal: 1,000 Component Instances with onCleanup', () => {
    for (let i = 0; i < 1000; i++) {
      createRoot((dispose) => {
        createComponent(LifecycleComponent, { id: i });
        dispose();
      });
    }
  }, { category, iterations: 15, trackMemory: true }));

  return results;
}
