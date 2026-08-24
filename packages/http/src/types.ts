/**
 * @license Apache-2.0
 * @gati/http - Types
 */

import { ReadonlySignal } from '@gati/reactivity';

export type ResourceStatus = 'idle' | 'pending' | 'success' | 'error';

export interface Resource<T> {
  data: ReadonlySignal<T | undefined>;
  error: ReadonlySignal<Error | null>;
  status: ReadonlySignal<ResourceStatus>;
  loading: ReadonlySignal<boolean>;
  refetch: () => Promise<T>;
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = 'HttpError';
  }
}
