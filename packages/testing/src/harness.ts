/**
 * @license Apache-2.0
 * @samrey/testing - Component Test Harness
 */

import { createRoot, signal, computed } from '@samrey/reactivity';

export interface TestRenderResult<TNode = unknown> {
  container: TNode;
  unmount: () => void;
}

export function renderTest(componentFactory: () => unknown): TestRenderResult {
  let disposeRoot: () => void;

  let container: HTMLElement | null = null;
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    container = document.createElement('div');
    container.setAttribute('data-samrey-test-container', 'true');
    if (document.body) {
      document.body.appendChild(container);
    }
  }

  const node = createRoot((dispose) => {
    disposeRoot = dispose;
    const res = componentFactory();
    if (container && res) {
      if (typeof res === 'object' && res !== null && 'nodeType' in res) {
        container.appendChild(res as Node);
      } else if (Array.isArray(res)) {
        res.forEach((n) => n && typeof n === 'object' && 'nodeType' in n && container!.appendChild(n as Node));
      }
    }
    return res;
  });

  return {
    container: (container || node) as any,
    unmount: () => {
      disposeRoot();
      if (container && container.parentNode) {
        container.remove();
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
