/**
 * @license Apache-2.0
 * @aether/reactivity - Signal Primitive
 */

import { Dependency, Signal, Subscriber } from './types.js';
import { trackDependency, incrementClock, batch } from './batch.js';

export function signal<T>(initialValue: T): Signal<T> {
  let currentValue = initialValue;

  const node: Dependency = {
    version: 1,
    isDirty: false,
    subscribers: new Set<Subscriber>()
  };

  function read(): T {
    trackDependency(node);
    return currentValue;
  }

  function write(next: T | ((prev: T) => T)): void {
    const nextValue = typeof next === 'function' ? (next as (prev: T) => T)(currentValue) : next;
    if (nextValue !== currentValue) {
      currentValue = nextValue;
      node.version = incrementClock();

      batch(() => {
        const subs = Array.from(node.subscribers);
        for (const sub of subs) {
          sub.notify(node.version);
        }
      });
    }
  }

  const accessor = function (): T {
    return read();
  } as Signal<T>;

  Object.defineProperty(accessor, 'value', {
    get: read,
    set: write,
    enumerable: true
  });

  accessor.set = write;

  return accessor;
}
