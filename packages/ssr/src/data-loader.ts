/**
 * @license Apache-2.0
 * @samrey/ssr - Server-Side Data Loading & Hydration Cache
 */

import { signal, Signal, ReadonlySignal } from '@samrey/reactivity';
import { getSSRContext } from './context.js';
import { deserializeHydrationState } from './serializer.js';

export interface ServerDataOptions<T> {
  initialValue?: T;
  defer?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (err: Error) => void;
}

export interface ServerDataActions<T> {
  loading: ReadonlySignal<boolean>;
  error: ReadonlySignal<Error | null>;
  refetch: () => Promise<T | undefined>;
  mutate: (val: T) => void;
}

// Client-side in-memory singleton cache to prevent duplicate fetches across re-renders
const clientDataCache = new Map<string, unknown>();
let hasHydratedInitialState = false;

/**
 * Initializes client cache from serialized hydration state once on boot.
 */
function primeClientCache(): void {
  if (hasHydratedInitialState || typeof document === 'undefined') return;
  hasHydratedInitialState = true;
  const hydrated = deserializeHydrationState<Record<string, unknown>>();
  if (hydrated && typeof hydrated === 'object') {
    for (const [k, v] of Object.entries(hydrated)) {
      clientDataCache.set(k, v);
    }
  }
}

export function invalidateClientDataCache(key?: string): void {
  if (key) {
    clientDataCache.delete(key);
  } else {
    clientDataCache.clear();
  }
}

/**
 * Reactive primitive for server-side data loading with zero-waterfall client hydration.
 *
 * During SSR: Executes the loader on the server and attaches data to the serialized state.
 * During Client Hydration: Immediately populates the signal from serialized state with NO network roundtrip.
 */
export function createServerData<T>(
  key: string,
  loader: () => Promise<T>,
  options: ServerDataOptions<T> = {}
): [ReadonlySignal<T | undefined>, ServerDataActions<T>] {
  const ssrContext = getSSRContext();

  // 1. SERVER EXECUTION
  if (ssrContext) {
    if (ssrContext.state[key] !== undefined) {
      // Pass 2: Data already loaded and resolved!
      const resolvedVal = ssrContext.state[key] as T;
      const dataSig = signal<T | undefined>(resolvedVal);
      const loadingSig = signal(false);
      const errorSig = signal<Error | null>(null);

      return [
        dataSig,
        {
          loading: loadingSig,
          error: errorSig,
          refetch: async () => resolvedVal,
          mutate: (val: T) => dataSig.set(val)
        }
      ];
    }

    const initialVal = options.initialValue;
    const dataSig = signal<T | undefined>(initialVal);
    const loadingSig = signal(true);
    const errorSig = signal<Error | null>(null);

    // Register loader promise in the request context (Pass 1)
    const promise = loader()
      .then((res) => {
        dataSig.set(res);
        loadingSig.set(false);
        if (options.onSuccess) options.onSuccess(res);
        return res;
      })
      .catch((err) => {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        errorSig.set(errorObj);
        loadingSig.set(false);
        if (options.onError) options.onError(errorObj);
        throw errorObj;
      });

    ssrContext.registerLoader(key, promise);

    return [
      dataSig,
      {
        loading: loadingSig,
        error: errorSig,
        refetch: async () => undefined,
        mutate: (val: T) => dataSig.set(val)
      }
    ];
  }

  // 2. CLIENT EXECUTION
  primeClientCache();

  const isCached = clientDataCache.has(key);
  const cachedValue = isCached ? (clientDataCache.get(key) as T) : options.initialValue;

  const dataSig = signal<T | undefined>(cachedValue);
  const loadingSig = signal(!isCached);
  const errorSig = signal<Error | null>(null);

  const executeFetch = async (): Promise<T | undefined> => {
    loadingSig.set(true);
    errorSig.set(null);
    try {
      const res = await loader();
      dataSig.set(res);
      clientDataCache.set(key, res);
      if (options.onSuccess) options.onSuccess(res);
      return res;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      errorSig.set(errorObj);
      if (options.onError) options.onError(errorObj);
      return undefined;
    } finally {
      loadingSig.set(false);
    }
  };

  // If not primed from SSR and not deferred, fetch immediately on client
  if (!isCached && !options.defer && typeof window !== 'undefined') {
    queueMicrotask(() => {
      executeFetch();
    });
  }

  return [
    dataSig,
    {
      loading: loadingSig,
      error: errorSig,
      refetch: executeFetch,
      mutate: (val: T) => {
        dataSig.set(val);
        clientDataCache.set(key, val);
      }
    }
  ];
}
