/**
 * @license Apache-2.0
 * @samrey/ssr - Request-Scoped SSR Context
 */

import { AsyncLocalStorage } from 'node:async_hooks';

export interface SSRHeadMetadata {
  title?: string;
  meta: Array<{ name?: string; property?: string; content: string }>;
  links: Array<{ rel: string; href: string; as?: string }>;
  scripts: Array<{ src?: string; inline?: string; defer?: boolean; type?: string }>;
}

export interface SSRContext {
  id: string;
  state: Record<string, unknown>;
  loaders: Map<string, Promise<unknown>>;
  head: SSRHeadMetadata;
  statusCode: number;
  errors: Error[];
  headFlushed?: boolean;
  registerLoader: <T>(key: string, promise: Promise<T>) => void;
  setError: (err: Error, status?: number) => void;
  setTitle: (title: string) => void;
  addMeta: (meta: { name?: string; property?: string; content: string }) => void;
}

const asyncLocalStorage = new AsyncLocalStorage<SSRContext>();
let fallbackContext: SSRContext | null = null;

/**
 * Creates a fresh, isolated SSR context for a single server request.
 */
export function createSSRContext(initialState: Record<string, unknown> = {}): SSRContext {
  const loaders = new Map<string, Promise<unknown>>();
  const state: Record<string, unknown> = { ...initialState };
  const errors: Error[] = [];

  const context: SSRContext = {
    id: `ssr_${Math.random().toString(36).slice(2, 9)}`,
    state,
    loaders,
    statusCode: 200,
    errors,
    headFlushed: false,
    head: {
      meta: [],
      links: [],
      scripts: []
    },
    registerLoader: <T>(key: string, promise: Promise<T>) => {
      loaders.set(
        key,
        promise
          .then((val) => {
            state[key] = val;
            return val;
          })
          .catch((err) => {
            errors.push(err instanceof Error ? err : new Error(String(err)));
            throw err;
          })
      );
    },
    setError: (err: Error, status = 500) => {
      errors.push(err);
      context.statusCode = status;
    },
    setTitle: (title: string) => {
      if (context.headFlushed && typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
        console.warn(`Head change after flush ignored: title "${title}". Set it during shell render.`);
      }
      context.head.title = title;
    },
    addMeta: (meta) => {
      if (context.headFlushed && typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
        const desc = meta.name ? `meta name="${meta.name}"` : `meta property="${meta.property || ''}"`;
        console.warn(`Head change after flush ignored: ${desc}. Set it during shell render.`);
      }
      context.head.meta.push(meta);
    }
  };

  return context;
}

/**
 * Retrieves the currently active request's SSR context, or null if on client/unscoped.
 */
export function getSSRContext(): SSRContext | null {
  return asyncLocalStorage.getStore() ?? fallbackContext;
}

/**
 * Runs a function within the scope of an isolated SSR context.
 */
export function runWithSSRContext<T>(ctx: SSRContext, fn: () => T): T {
  const prevFallback = fallbackContext;
  fallbackContext = ctx;
  try {
    return asyncLocalStorage.run(ctx, fn);
  } finally {
    fallbackContext = prevFallback;
  }
}

/**
 * Awaits all pending server-side data loaders registered in the context.
 */
export async function resolveSSRContext(ctx: SSRContext): Promise<Record<string, unknown>> {
  if (ctx.loaders.size === 0) {
    return ctx.state;
  }

  const keys = Array.from(ctx.loaders.keys());
  const promises = Array.from(ctx.loaders.values());

  const results = await Promise.allSettled(promises);
  results.forEach((res, index) => {
    const key = keys[index];
    if (res.status === 'fulfilled') {
      ctx.state[key] = res.value;
    }
  });

  return ctx.state;
}
