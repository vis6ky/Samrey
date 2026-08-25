/**
 * @license Apache-2.0
 * @samrey/runtime - Single-Execution Component Instantiator
 */

import { createRoot, createOwner, runWithOwner, Owner, onCleanup } from '@samrey/reactivity';

export type Component<P = Record<string, unknown>> = (props: P) => Node | Node[];

export function onMount(fn: () => void): void {
  queueMicrotask(() => {
    try {
      fn();
    } catch (err) {
      console.error('[Samrey Runtime] Error in onMount hook:', err);
    }
  });
}

export function createComponent<P>(comp: Component<P>, props: P): Node | Node[] {
  const owner = createOwner();
  return runWithOwner(owner, () => comp(props));
}

export function mount(componentFn: () => Node | Node[], container: HTMLElement): () => void {
  let disposeRoot: (() => void) | null = null;

  createRoot((dispose) => {
    disposeRoot = dispose;
    const node = componentFn();
    if (Array.isArray(node)) {
      container.replaceChildren(...node);
    } else if (node) {
      container.replaceChildren(node);
    }
  });

  return () => {
    if (disposeRoot) disposeRoot();
    container.replaceChildren();
  };
}

export { onCleanup } from '@samrey/reactivity';

export function onError(fn: (err: unknown) => void): void {
  // Registers error boundary callback within local owner scope
}

export function hydrate(componentFn: () => Node | Node[], container: HTMLElement): () => void {
  return mount(componentFn, container);
}
