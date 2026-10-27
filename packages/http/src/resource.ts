/**
 * @license Apache-2.0
 * @samrey/http - Reactive Resource Primitive
 */

import { signal, computed, effect, onCleanup } from '@samrey/reactivity';
import { Resource, ResourceStatus } from './types.js';

export interface ResourceOptions<T = unknown> {
  initialValue?: T;
  timeoutMs?: number;
}

export function createResource<T>(
  fetcher: (info: { abortSignal: AbortSignal }) => Promise<T>,
  options?: ResourceOptions<T>
): Resource<T>;
export function createResource<T, S>(
  source: () => S,
  fetcher: (sourceVal: S, info: { abortSignal: AbortSignal }) => Promise<T>,
  options?: ResourceOptions<T>
): Resource<T>;
export function createResource<T, S = unknown>(
  sourceOrFetcher: (() => S) | ((info: { abortSignal: AbortSignal }) => Promise<T>),
  fetcherOrOptions?: ((sourceVal: S, info: { abortSignal: AbortSignal }) => Promise<T>) | ResourceOptions<T>,
  optionsArg?: ResourceOptions<T>
): Resource<T> {
  const isDirectFetcher = typeof fetcherOrOptions !== 'function';
  const source = isDirectFetcher ? null : (sourceOrFetcher as () => S);
  const fetcher = isDirectFetcher
    ? (_: S, info: { abortSignal: AbortSignal }) => (sourceOrFetcher as (info: { abortSignal: AbortSignal }) => Promise<T>)(info)
    : (fetcherOrOptions as (sourceVal: S, info: { abortSignal: AbortSignal }) => Promise<T>);
  const options = (isDirectFetcher ? (fetcherOrOptions as ResourceOptions<T>) : optionsArg) || {};

  const data = signal<T | undefined>(options.initialValue);
  const error = signal<Error | null>(null);
  const status = signal<ResourceStatus>('idle');

  let activeSeq = 0;
  let activeController: AbortController | null = null;
  let timeoutId: any;

  async function load(explicitSource?: S): Promise<T> {
    const seq = ++activeSeq;
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    activeController = new AbortController();
    if (options.timeoutMs && options.timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        if (seq === activeSeq && activeController) {
          activeController.abort(new Error(`[Samrey HTTP] Resource timed out after ${options.timeoutMs}ms`));
        }
      }, options.timeoutMs);
    }

    status.value = 'pending';
    error.value = null;

    try {
      const sourceVal = explicitSource !== undefined ? explicitSource : (source ? source() : (undefined as unknown as S));
      const result = await fetcher(sourceVal, { abortSignal: activeController.signal });
      if (seq === activeSeq) {
        data.value = result;
        status.value = 'success';
      }
      return result;
    } catch (err: any) {
      if (seq === activeSeq) {
        if (err?.name !== 'AbortError') {
          error.value = err instanceof Error ? err : new Error(String(err));
          status.value = 'error';
        }
      }
      throw err;
    } finally {
      if (seq === activeSeq && timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  // Reactive source tracking
  if (source) {
    effect(() => {
      const sVal = source();
      load(sVal).catch(() => {});
    });
  } else {
    load().catch(() => {});
  }

  onCleanup(() => {
    if (timeoutId) clearTimeout(timeoutId);
    if (activeController) {
      activeController.abort();
    }
  });

  return {
    data: computed(() => data.value),
    error: computed(() => error.value),
    status: computed(() => status.value),
    loading: computed(() => status.value === 'pending'),
    refetch: () => load()
  };
}
