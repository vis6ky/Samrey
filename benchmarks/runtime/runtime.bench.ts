import { template, bindText, bindAttr, on, createComponent } from '../../packages/runtime/src/index.js';
import { signal, createRoot } from '../../packages/reactivity/src/index.js';
import { benchmark, BenchmarkResult } from '../utils/harness.js';
import { setupBenchmarkDOM, BenchmarkNode } from '../utils/dom-mock.js';

export function runRuntimeBenchmarks(targetBenchmark?: string): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const category = 'Runtime DOM';
  setupBenchmarkDOM();

  const shouldBench = (name: string) => !targetBenchmark || name === targetBenchmark;

  // 1. Initial Mount (Template cloning & DOM tree construction)
  for (const count of [100, 1000, 10000]) {
    const name = `Initial Mount (${count.toLocaleString()} nodes)`;
    if (shouldBench(name)) {
      const tmpl = template('<div class="card"><span class="title"></span><p class="body"></p></div>');
      results.push(benchmark(name, () => {
        const container = new BenchmarkNode(1, 'DIV');
        for (let i = 0; i < count; i++) {
          const node = tmpl();
          container.appendChild(node as unknown as BenchmarkNode);
        }
      }, {
        category,
        warmup: count === 100 ? 20 : (count === 1000 ? 15 : 3),
        iterations: count > 1000 ? 5 : (count === 100 ? 50 : 40),
        trackMemory: true
      }));
    }
  }

  // 2. Text Updates (Fine-grained reactive bindings)
  for (const count of [100, 1000, 10000]) {
    const name = `Text Binding Updates (${count.toLocaleString()} nodes)`;
    if (shouldBench(name)) {
      results.push(benchmark(name, () => {
        createRoot((dispose) => {
          const sig = signal('initial');
          const nodes: BenchmarkNode[] = [];
          for (let i = 0; i < count; i++) {
            const n = new BenchmarkNode(3, '#text');
            nodes.push(n);
            bindText(n as unknown as Node, () => sig.value);
          }
          sig.value = 'updated-1';
          sig.value = 'updated-2';
          dispose();
        });
      }, {
        category,
        warmup: count === 100 ? 20 : (count === 1000 ? 15 : 3),
        iterations: count > 1000 ? 5 : (count === 100 ? 50 : 40)
      }));
    }
  }

  // 3. Attribute & Class Updates
  for (const count of [100, 1000]) {
    const attrName = `Attribute Updates (${count.toLocaleString()} elements)`;
    if (shouldBench(attrName)) {
      results.push(benchmark(attrName, () => {
        createRoot((dispose) => {
          const attrSig = signal('primary');
          const nodes: BenchmarkNode[] = [];
          for (let i = 0; i < count; i++) {
            const el = new BenchmarkNode(1, 'BUTTON');
            nodes.push(el);
            bindAttr(el as unknown as HTMLElement, 'data-theme', () => attrSig.value);
          }
          attrSig.value = 'secondary';
          attrSig.value = 'dark';
          dispose();
        });
      }, { category, warmup: count === 100 ? 20 : 15, iterations: count === 100 ? 50 : 40 }));
    }

    const className = `Class Dynamic Updates (${count.toLocaleString()} elements)`;
    if (shouldBench(className)) {
      results.push(benchmark(className, () => {
        createRoot((dispose) => {
          const classSig = signal('btn btn-primary');
          const nodes: BenchmarkNode[] = [];
          for (let i = 0; i < count; i++) {
            const el = new BenchmarkNode(1, 'DIV');
            nodes.push(el);
            bindAttr(el as unknown as HTMLElement, 'class', () => classSig.value);
          }
          classSig.value = 'btn btn-danger active';
          dispose();
        });
      }, { category, warmup: count === 100 ? 20 : 15, iterations: count === 100 ? 50 : 40 }));
    }
  }

  // 4. Event Registration & Dispatch
  for (const count of [100, 1000]) {
    const name = `Event Registration & Dispatch (${count.toLocaleString()} elements)`;
    if (shouldBench(name)) {
      results.push(benchmark(name, () => {
        createRoot((dispose) => {
          let clicks = 0;
          const nodes: BenchmarkNode[] = [];
          for (let i = 0; i < count; i++) {
            const el = new BenchmarkNode(1, 'BUTTON');
            nodes.push(el);
            on(el as unknown as HTMLElement, 'click', () => { clicks++; });
          }
          for (let i = 0; i < count; i += 5) {
            nodes[i].dispatchEvent({ type: 'click' });
          }
          dispose();
        });
      }, { category, warmup: count === 100 ? 20 : 25, iterations: 50 }));
    }
  }

  // 5. Component Creation & Disposal
  for (const count of [100, 1000]) {
    const name = `Component Creation & Mount (${count.toLocaleString()} components)`;
    if (shouldBench(name)) {
      const TestComponent = (props: { id: number; title: string }) => {
        const el = new BenchmarkNode(1, 'DIV');
        el.setAttribute('data-id', String(props.id));
        el.textContent = props.title;
        return el as unknown as Node;
      };

      results.push(benchmark(name, () => {
        createRoot((dispose) => {
          const root = new BenchmarkNode(1, 'MAIN');
          for (let i = 0; i < count; i++) {
            const comp = createComponent(TestComponent, { id: i, title: `Title ${i}` });
            root.appendChild(comp as unknown as BenchmarkNode);
          }
          dispose();
        });
      }, { category, warmup: count === 100 ? 20 : 15, iterations: count === 100 ? 50 : 40 }));
    }
  }

  return results;
}
