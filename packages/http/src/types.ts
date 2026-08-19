/**
 * @license Apache-2.0
 * @aether/http - Types
 */

import { ReadonlySignal } from '@aether/reactivity';

export type ResourceStatus = 'idle' | 'pending' | 'success' | 'error';

export interface Resource<T> {
  data: ReadonlySignal<T | undefined>;
  error: ReadonlySignal<Error | null>;
  status: ReadonlySignal<ResourceStatus>;
  loading: ReadonlySignal<boolean>;
  refetch: () => Promise<T>;
}
