/**
 * @license Apache-2.0
 * @samrey/testing - Component Test Harness
 */

import { createRoot, signal, computed } from '@samrey/reactivity';
import { el } from '@samrey/runtime';

export interface TestRenderResult<TNode = HTMLElement> {
  container: TNode;
  unmount: () => void;
}

export function renderTest<TNode = HTMLElement>(componentFactory: () => unknown): TestRenderResult<TNode> {
  let disposeRoot: () => void;

  // Use el('div') so that in both browser (document.createElement) and Node.js
  // (createHeadlessElement), a container element wraps mounted components, enabling
  // container.querySelector(...) to find component root elements consistently.
  const container = el('div', { 'data-samrey-test-container': 'true' }) as HTMLElement;
  if (typeof document !== 'undefined' && document.body) {
    document.body.appendChild(container);
  }

  let node: unknown;
  createRoot((dispose) => {
    disposeRoot = dispose;
    node = componentFactory();
    if (node) {
      if (typeof node === 'object' && 'nodeType' in node) {
        container.appendChild(node as Node);
      } else if (Array.isArray(node)) {
        node.forEach((n) => n && typeof n === 'object' && 'nodeType' in n && container.appendChild(n as Node));
      }
    }
  });

  const isMountedDom = Boolean(
    node && typeof node === 'object' && ('nodeType' in node || Array.isArray(node))
  );

  return {
    container: (isMountedDom ? container : node) as any,
    unmount: () => {
      disposeRoot();
      if (container && container.parentNode) {
        if (typeof container.parentNode.removeChild === 'function') {
          container.parentNode.removeChild(container);
        } else if (typeof (container as any).remove === 'function') {
          (container as any).remove();
        }
      }
    }
  };
}

export async function flushReactivity(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

export const renderTestComponent = renderTest;
export const mount = renderTest;
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

export function createMockResource<T>(initialData?: T) {
  const dataSig = signal<T | undefined>(initialData);
  const errorSig = signal<Error | null>(null);
  const statusSig = signal<'idle' | 'pending' | 'success' | 'error'>('success');

  return {
    data: computed(() => dataSig.value),
    error: computed(() => errorSig.value),
    status: computed(() => statusSig.value),
    loading: computed(() => statusSig.value === 'pending'),
    read: () => dataSig.value,
    mutate: (newData: T) => {
      dataSig.value = newData;
      statusSig.value = 'success';
      errorSig.value = null;
    },
    setError: (err: Error) => {
      errorSig.value = err;
      statusSig.value = 'error';
    },
    refetch: async () => dataSig.value as T
  };
}
