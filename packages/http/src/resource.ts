/**
 * @license Apache-2.0
 * @gati/http - Reactive Resource Primitive
 */

import { signal, computed, onCleanup } from '@gati/reactivity';
import { Resource, ResourceStatus } from './types.js';

export function createResource<T>(
  fetcher: (info: { abortSignal: AbortSignal }) => Promise<T>
): Resource<T>;
export function createResource<T, S>(
  source: () => S,
  fetcher: (sourceVal: S, info: { abortSignal: AbortSignal }) => Promise<T>
): Resource<T>;
export function createResource<T, S = unknown>(
  sourceOrFetcher: (() => S) | ((info: { abortSignal: AbortSignal }) => Promise<T>),
  fetcherArg?: (sourceVal: S, info: { abortSignal: AbortSignal }) => Promise<T>
): Resource<T> {
  const isDirectFetcher = typeof fetcherArg === 'undefined';
  const source = isDirectFetcher ? null : (sourceOrFetcher as () => S);
  const fetcher = isDirectFetcher
    ? (_: S, info: { abortSignal: AbortSignal }) => (sourceOrFetcher as (info: { abortSignal: AbortSignal }) => Promise<T>)(info)
    : fetcherArg!;

  const data = signal<T | undefined>(undefined);
  const error = signal<Error | null>(null);
  const status = signal<ResourceStatus>('idle');

  let activeController: AbortController | null = null;

  async function load(): Promise<T> {
    if (activeController) {
      activeController.abort();
    }
    activeController = new AbortController();

    status.value = 'pending';
    error.value = null;

    try {
      const sourceVal = source ? source() : (undefined as unknown as S);
      const result = await fetcher(sourceVal, { abortSignal: activeController.signal });
      data.value = result;
      status.value = 'success';
      return result;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        error.value = err instanceof Error ? err : new Error(String(err));
        status.value = 'error';
        throw err;
      }
      return data.value as T;
    }
  }

  // Trigger initial fetch
  load().catch(() => {});

  onCleanup(() => {
    if (activeController) {
      activeController.abort();
    }
  });

  return {
    data: computed(() => data.value),
    error: computed(() => error.value),
    status: computed(() => status.value),
    loading: computed(() => status.value === 'pending'),
    refetch: load
  };
}
