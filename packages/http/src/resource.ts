/**
 * @license Apache-2.0
 * @samrey/http - Reactive Resource Primitive
 */

import { signal, effect, onCleanup, useContext, SuspenseTrackerContext, type ReadonlySignal, untrack } from '@samrey/reactivity';
import { Resource, ResourceStatus } from './types.js';
import { defaultRequestCache, RequestCache } from './cache.js';

function readonlyView<R>(getter: () => R): ReadonlySignal<R> {
  const view = (() => getter()) as ReadonlySignal<R>;
  Object.defineProperty(view, 'value', {
    get: getter,
    enumerable: true
  });
  return view;
}

export interface ResourceOptions<T = unknown> {
  initialValue?: T;
  timeoutMs?: number;
  key?: string | (() => string);
  tags?: string[];
  cache?: RequestCache | boolean;
  ttlMs?: number;
  dedupe?: boolean;
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
  const suspenseTracker = useContext(SuspenseTrackerContext);

  let activeSeq = 0;
  let activeController: AbortController | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  function load(explicitSource?: S): Promise<T> {
    if (disposed) {
      const abortErr = new Error('[Samrey HTTP] Resource has been disposed.');
      abortErr.name = 'AbortError';
      return Promise.reject(abortErr);
    }

    const seq = ++activeSeq;
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    const controller = new AbortController();
    activeController = controller;
    let timedOut = false;
    let timeoutPromise: Promise<never> | null = null;
    if (options.timeoutMs && options.timeoutMs > 0) {
      timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          if (seq === activeSeq) {
            timedOut = true;
            const timeoutErr = new Error(`[Samrey HTTP] Resource timed out after ${options.timeoutMs}ms`);
            timeoutErr.name = 'TimeoutError';
            if (activeController === controller) {
              activeController.abort(timeoutErr);
            }
            reject(timeoutErr);
          }
        }, options.timeoutMs);
      });
      timeoutPromise.catch(() => {});
    }

    status.value = 'pending';
    error.value = null;

    const run = (async () => {
      try {
        const sourceVal = explicitSource !== undefined ? explicitSource : (source ? source() : (undefined as unknown as S));
        const executeFetch = () => {
          const fetchPromise = Promise.resolve(fetcher(sourceVal, { abortSignal: controller.signal }));
          if (timeoutPromise) {
            fetchPromise.catch(() => {});
          }
          return timeoutPromise
            ? Promise.race([fetchPromise, timeoutPromise])
            : fetchPromise;
        };

        let result: T;
        const cacheKey = typeof options.key === 'function' ? options.key() : options.key;
        const activeCache = options.cache instanceof RequestCache
          ? options.cache
          : (options.cache !== false ? defaultRequestCache : null);

        if (cacheKey && activeCache && options.dedupe !== false) {
          result = await activeCache.dedupe(cacheKey, executeFetch, options.ttlMs, options.tags);
        } else {
          result = await executeFetch();
        }

        if (!disposed && seq === activeSeq) {
          data.value = result;
          status.value = 'success';
        }
        return result;
      } catch (err: any) {
        if (!disposed && seq === activeSeq) {
          if (timedOut || err?.name !== 'AbortError') {
            error.value = err instanceof Error ? err : new Error(String(err));
            status.value = 'error';
          }
        }
        throw err;
      } finally {
        if (seq === activeSeq && timeoutId !== undefined) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        if (activeController === controller) {
          activeController = null;
        }
      }
    })();

    if (suspenseTracker) {
      suspenseTracker.track(run.catch(() => {}));
    }

    return run;
  }

  // Reactive source tracking
  // BUG-08 FIX: Wrap load(sVal) in untrack() so that any synchronous signal reads
  // inside fetcher() are not registered as dependencies of this effect.
  if (source) {
    effect(() => {
      const sVal = source();
      untrack(() => {
        load(sVal).catch(() => {});
      });
    });
  } else {
    load().catch(() => {});
  }

  onCleanup(() => {
    disposed = true;
    activeSeq++;
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
  });

  const mutate = (optimisticValue: T | ((prev: T | undefined) => T)): void => {
    activeSeq++;
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    if (typeof optimisticValue === 'function') {
      data.value = (optimisticValue as (prev: T | undefined) => T)(data.value);
    } else {
      data.value = optimisticValue;
    }
    error.value = null;
    status.value = 'success';
  };

  const resource: Resource<T> = {
    data: readonlyView(() => data.value),
    error: readonlyView(() => error.value),
    status: readonlyView(() => status.value),
    loading: readonlyView(() => status.value === 'pending'),
    refetch: (explicitSource?: S) => load(explicitSource),
    mutate,
    *[Symbol.iterator]() {
      yield resource;
      yield { refetch: resource.refetch, mutate: resource.mutate };
    }
  };

  return resource;
}

(createResource as any).cache = defaultRequestCache;
(createResource as any).invalidateTags = (tags: string | string[]): number => defaultRequestCache.invalidateTags(tags);

export namespace createResource {
  export const cache: RequestCache = defaultRequestCache;
  export const invalidateTags: (tags: string | string[]) => number = (tags: string | string[]) => defaultRequestCache.invalidateTags(tags);
}

