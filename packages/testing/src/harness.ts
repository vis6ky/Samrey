/**
 * @license Apache-2.0
 * @aether/testing - Component Test Harness
 */

import { createRoot } from '@aether/reactivity';

export interface TestRenderResult<TNode = unknown> {
  container: TNode;
  unmount: () => void;
}

export function renderTest(componentFactory: () => unknown): TestRenderResult {
  let disposeRoot: () => void;

  const node = createRoot((dispose) => {
    disposeRoot = dispose;
    return componentFactory();
  });

  return {
    container: node,
    unmount: () => {
      disposeRoot();
    }
  };
}

export async function flushReactivity(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}
