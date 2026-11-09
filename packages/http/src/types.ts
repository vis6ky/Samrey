/**
 * @license Apache-2.0
 * @samrey/http - Types
 */

import { ReadonlySignal } from '@samrey/reactivity';

export type ResourceStatus = 'idle' | 'pending' | 'success' | 'error';

export interface ResourceActions<T = unknown> {
  refetch: (explicitSource?: any) => Promise<T>;
}

export interface Resource<T> extends Iterable<any> {
  data: ReadonlySignal<T | undefined>;
  error: ReadonlySignal<Error | null>;
  status: ReadonlySignal<ResourceStatus>;
  loading: ReadonlySignal<boolean>;
  refetch: (explicitSource?: any) => Promise<T>;
  [Symbol.iterator](): Iterator<any>;
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = 'HttpError';
  }
}
