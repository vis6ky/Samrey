/**
 * @license Apache-2.0
 * @samrey/testing - Component Test Harness
 */

import { createRoot } from '@samrey/reactivity';

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

export const renderTestComponent = renderTest;
export const waitForNextUpdate = flushReactivity;

export async function waitFor(predicate: () => boolean | Promise<boolean>, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  if (!(await predicate())) {
    throw new Error(`[Samrey Testing] waitFor timed out after ${timeoutMs}ms`);
  }
}

export function cleanupAllTestContainers(): void {
  // Cleans up any remaining test containers in DOM
  if (typeof document !== 'undefined') {
    const containers = document.querySelectorAll('[data-samrey-test-container]');
    containers.forEach((c) => c.remove());
  }
}

export function createMockResource<T>(initialData: T) {
  let currentData = initialData;
  return {
    read: () => currentData,
    mutate: (newData: T) => { currentData = newData; },
    refetch: async () => currentData
  };
}
