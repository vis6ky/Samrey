/**
 * Reference Solution: Challenge 01 - Reactive Counter
 */

import { signal } from '@samrey/reactivity';
import { template, on, bindText } from '@samrey/runtime';

export interface CounterProps {
  initial?: number;
}

const _counterTmpl = template(
  '<div class="counter"><button ref="dec" aria-label="Decrement">-</button><span ref="count"></span><button ref="inc" aria-label="Increment">+</button><button ref="reset">Reset</button></div>'
);

export function Counter(props?: CounterProps): HTMLElement {
  const initialValue = props?.initial ?? 0;
  const count = signal(initialValue);
  const root = _counterTmpl.clone();
  const { dec, inc, reset, count: countEl } = root.refs;

  bindText(countEl, () => count.value.toString());

  on(inc, 'click', () => count.update(n => n + 1));
  on(dec, 'click', () => count.update(n => n - 1));
  on(reset, 'click', () => count.set(initialValue));

  return root;
}
