/**
 * @license Apache-2.0
 * @samrey/ssr - SSR Context Accessor Registry (Browser Safe)
 */

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

let currentAccessor: () => SSRContext | null = () => null;
let currentErrorGetter: (ctx: SSRContext, key: string) => Error | undefined = () => undefined;

export function registerSSRContextProvider(
  accessor: () => SSRContext | null,
  errorGetter?: (ctx: SSRContext, key: string) => Error | undefined
): void {
  currentAccessor = accessor;
  if (errorGetter) {
    currentErrorGetter = errorGetter;
  }
}

export function getSSRContext(): SSRContext | null {
  return currentAccessor();
}

export function getSSRLoaderError(ctx: SSRContext, key: string): Error | undefined {
  return currentErrorGetter(ctx, key);
}
