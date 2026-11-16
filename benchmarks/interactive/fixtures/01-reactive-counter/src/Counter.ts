/**
 * Challenge 01: Build a Reactive Counter
 * 
 * Implement Counter(props?: { initial?: number }): HTMLElement
 * using fine-grained signals from @samrey/reactivity and static template
 * hoisting with surgical bindings from @samrey/runtime.
 */

import { signal } from '@samrey/reactivity';
import { template, on, bindText } from '@samrey/runtime';

export interface CounterProps {
  initial?: number;
}

export function Counter(props?: CounterProps): HTMLElement {
  // TODO: Implement according to benchmarks/interactive/tasks/01-reactive-counter.md
  throw new Error('Not implemented');
}
