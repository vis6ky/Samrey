/**
 * @license Apache-2.0
 * @aether/runtime - Single-Execution Component Instantiator
 */

import { createRoot, createOwner, runWithOwner, Owner, onCleanup } from '@aether/reactivity';

export type Component<P = Record<string, unknown>> = (props: P) => Node | Node[];

export function createComponent<P>(comp: Component<P>, props: P): Node | Node[] {
  const owner = createOwner();
  return runWithOwner(owner, () => comp(props));
}

export function mount(componentFn: () => Node, container: HTMLElement): () => void {
  let disposeRoot: (() => void) | null = null;

  createRoot((dispose) => {
    disposeRoot = dispose;
    const node = componentFn();
    container.replaceChildren(node);
  });

  return () => {
    if (disposeRoot) disposeRoot();
    container.replaceChildren();
  };
}
