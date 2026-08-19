import { signal, computed } from '../../packages/reactivity/src/index.js';
import { template, bindText } from '../../packages/runtime/src/index.js';

export function runCounterExample() {
  const count = signal(0);
  const double = computed(() => count.value * 2);

  const tmpl = template(`
    <div class="counter-card">
      <h2>Counter Demo</h2>
      <p>Count: <span></span></p>
      <p>Double: <span></span></p>
    </div>
  `);

  const root = tmpl() as HTMLElement;
  const spans = root.querySelectorAll('span');

  if (spans[0]) bindText(spans[0], () => count.value);
  if (spans[1]) bindText(spans[1], () => double.value);

  // Increment
  count.value = 1;
  count.value = 5;

  return { root, count, double };
}
