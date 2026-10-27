/**
 * @license Apache-2.0
 * @samrey/reactivity - Signal Primitive
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

  function write(next: T | ((prev: T) => T), direct = false): void {
    let nextValue: T;
    if (direct) {
      nextValue = next as T;
    } else if (typeof next === 'function' && typeof currentValue !== 'function') {
      nextValue = (next as (prev: T) => T)(currentValue);
    } else {
      nextValue = next as T;
    }

    if (nextValue !== currentValue) {
      currentValue = nextValue;
      node.version = incrementClock();

      if (node.subscribers.size > 0) {
        batch(() => {
          for (const sub of node.subscribers) {
            sub.notify(node.version);
          }
        });
      }
    }
  }

  function read(): T {
    trackDependency(node);
    return currentValue;
  }

  const accessor = function (this: unknown, ...args: unknown[]): T | void {
    if (args.length === 0) {
      return read();
    }
    write(args[0] as T | ((prev: T) => T));
  } as unknown as Signal<T>;

  Object.defineProperty(accessor, 'value', {
    get: read,
    set: (val: T) => write(val, true),
    enumerable: true
  });

  accessor.set = (val: T | ((prev: T) => T)) => write(val, false);

  return accessor;
}
