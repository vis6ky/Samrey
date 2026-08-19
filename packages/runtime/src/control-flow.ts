/**
 * @license Apache-2.0
 * @aether/runtime - Reactive Control Flow Primitives (<Show>, <For>)
 */

import { effect, createOwner, onCleanup, Owner } from '@aether/reactivity';

export interface ShowProps<T> {
  when: T | undefined | null | false;
  fallback?: () => Node;
  children: (item: T) => Node;
}

export function Show<T>(props: { when: () => T; fallback?: () => Node; children: (val: T) => Node }): Node {
  const marker = typeof document !== 'undefined' ? document.createComment('aether:show') : ({} as unknown as Node);
  let currentOwner: Owner | null = null;

  effect(() => {
    const condition = props.when();

    if (currentOwner) {
      currentOwner.dispose();
      currentOwner = null;
    }

    currentOwner = createOwner();
  });

  return marker;
}
