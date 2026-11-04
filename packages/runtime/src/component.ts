/**
 * @license Apache-2.0
 * @samrey/runtime - Single-Execution Component Instantiator
 */

import { createRoot, createOwner, getOwner, runWithOwner, Owner, onCleanup, handleError } from '@samrey/reactivity';

export type Component<P = Record<string, unknown>> = (props: P) => Node | Node[];

export function onMount(fn: () => void | (() => void)): void {
  const owner = getOwner();
  let isDisposed = false;

  if (owner) {
    onCleanup(() => {
      isDisposed = true;
    });
  }

  queueMicrotask(() => {
    if (isDisposed) return;
    if (owner) {
      runWithOwner(owner, () => {
        try {
          const cleanup = fn();
          if (typeof cleanup === 'function') {
            onCleanup(cleanup);
          }
        } catch (err) {
          handleError(err, owner);
        }
      });
    } else {
      try {
        fn();
      } catch (err) {
        console.error('[Samrey Runtime] Error in onMount hook:', err);
      }
    }
  });
}

export function createComponent<P>(comp: Component<P>, props: P): Node | Node[] {
  const owner = createOwner();
  return runWithOwner(owner, () => comp(props));
}

const mountedRoots = new WeakMap<object, () => void>();

export function mount(componentFn: () => Node | Node[], container: HTMLElement): () => void {
  // Dispose existing mounted root on the same container if present
  const prevUnmount = mountedRoots.get(container);
  if (prevUnmount) {
    prevUnmount();
  }

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

  const unmount = () => {
    if (mountedRoots.get(container) === unmount) {
      mountedRoots.delete(container);
    }
    if (disposeRoot) {
      disposeRoot();
      disposeRoot = null;
    }
    container.replaceChildren();
  };

  mountedRoots.set(container, unmount);
  return unmount;
}

export { onCleanup, onError } from '@samrey/reactivity';

export function hydrate(componentFn: () => Node | Node[], container: HTMLElement): () => void {
  return mount(componentFn, container);
}

