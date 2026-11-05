/**
 * @license Apache-2.0
 * MetricsDashboard Component - Reactive Metrics & Signal Batching
 */

import { signal, computed, effect, batch } from '@samrey/reactivity';
import { template, on, bindText } from '@samrey/runtime';

const _metricsTmpl = template(`
  <section class="metrics-panel">
    <h2>Reactive State Metrics</h2>
    <div class="metrics-grid">
      <div class="card">
        <label>Counter</label>
        <span class="value val-count">0</span>
      </div>
      <div class="card">
        <label>Doubled Value</label>
        <span class="value val-double">0</span>
      </div>
      <div class="card">
        <label>Total Operations</label>
        <span class="value val-ops">0</span>
      </div>
    </div>
    <div class="controls">
      <button class="btn btn-inc" type="button">+1 Increment</button>
      <button class="btn btn-dec" type="button">-1 Decrement</button>
      <button class="btn btn-batch" type="button">+10 (Batched Mutation)</button>
      <button class="btn btn-reset" type="button">Reset</button>
    </div>
  </section>
`);

export function MetricsDashboard(props?: { initial?: number }) {
  const count = signal<number>(props?.initial ?? 0);
  const operations = signal<number>(0);

  const double = computed(() => count.value * 2);

  // Track operations side-effect
  effect(() => {
    // Reading count.value causes operation to increment when count changes
    const _ = count.value;
    operations.update((n) => n + 1);
  });

  const root = _metricsTmpl() as HTMLElement;

  const countEl = root.querySelector('.val-count') as HTMLElement;
  const doubleEl = root.querySelector('.val-double') as HTMLElement;
  const opsEl = root.querySelector('.val-ops') as HTMLElement;

  bindText(countEl, () => count.value.toString());
  bindText(doubleEl, () => double.value.toString());
  bindText(opsEl, () => operations.value.toString());

  const incBtn = root.querySelector('.btn-inc') as HTMLButtonElement;
  const decBtn = root.querySelector('.btn-dec') as HTMLButtonElement;
  const batchBtn = root.querySelector('.btn-batch') as HTMLButtonElement;
  const resetBtn = root.querySelector('.btn-reset') as HTMLButtonElement;

  on(incBtn, 'click', () => {
    count.update((n) => n + 1);
  });

  on(decBtn, 'click', () => {
    count.update((n) => n - 1);
  });

  on(batchBtn, 'click', () => {
    batch(() => {
      count.value += 10;
    });
  });

  on(resetBtn, 'click', () => {
    count.set(0);
  });

  return root;
}

