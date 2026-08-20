import { template, bindText, bindAttr, on, createComponent } from '../../packages/runtime/src/index.js';
import { signal, createRoot } from '../../packages/reactivity/src/index.js';
import { benchmark, BenchmarkResult } from '../utils/harness.js';
import { setupBenchmarkDOM, BenchmarkNode } from '../utils/dom-mock.js';

export function runRuntimeBenchmarks(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const category = 'Runtime DOM';
  setupBenchmarkDOM();

  // 1. Initial Mount (Template cloning & DOM tree construction)
  for (const count of [100, 1000, 10000]) {
    const tmpl = template('<div class="card"><span class="title"></span><p class="body"></p></div>');
    results.push(benchmark(`Initial Mount (${count.toLocaleString()} nodes)`, () => {
      const container = new BenchmarkNode(1, 'DIV');
      for (let i = 0; i < count; i++) {
        const node = tmpl();
        container.appendChild(node as unknown as BenchmarkNode);
      }
    }, { category, iterations: count > 1000 ? 5 : 15, trackMemory: true }));
  }

  // 2. Text Updates (Fine-grained reactive bindings)
  for (const count of [100, 1000, 10000]) {
    results.push(benchmark(`Text Binding Updates (${count.toLocaleString()} nodes)`, () => {
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
    }, { category, iterations: count > 1000 ? 5 : 15 }));
  }

  // 3. Attribute & Class Updates
  for (const count of [100, 1000]) {
    results.push(benchmark(`Attribute Updates (${count.toLocaleString()} elements)`, () => {
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
    }, { category, iterations: 15 }));

    results.push(benchmark(`Class Dynamic Updates (${count.toLocaleString()} elements)`, () => {
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
    }, { category, iterations: 15 }));
  }

  // 4. Event Registration & Dispatch
  for (const count of [100, 1000]) {
    results.push(benchmark(`Event Registration & Dispatch (${count.toLocaleString()} elements)`, () => {
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
    }, { category, iterations: 15 }));
  }

  // 5. Component Creation & Disposal
  for (const count of [100, 1000]) {
    const TestComponent = (props: { id: number; title: string }) => {
      const el = new BenchmarkNode(1, 'DIV');
      el.setAttribute('data-id', String(props.id));
      el.textContent = props.title;
      return el as unknown as Node;
    };

    results.push(benchmark(`Component Creation & Mount (${count.toLocaleString()} components)`, () => {
      createRoot((dispose) => {
        const root = new BenchmarkNode(1, 'MAIN');
        for (let i = 0; i < count; i++) {
          const comp = createComponent(TestComponent, { id: i, title: `Title ${i}` });
          root.appendChild(comp as unknown as BenchmarkNode);
        }
        dispose();
      });
    }, { category, iterations: 15 }));
  }

  return results;
}
