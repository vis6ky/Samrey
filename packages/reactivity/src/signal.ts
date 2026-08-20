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

  function write(next: T | ((prev: T) => T)): void {
    const nextValue = typeof next === 'function' ? (next as (prev: T) => T)(currentValue) : next;
    if (nextValue !== currentValue) {
      currentValue = nextValue;
      node.version = incrementClock();

      batch(() => {
        for (const sub of node.subscribers) {
          sub.notify(node.version);
        }
      });
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
    set: write,
    enumerable: true
  });

  accessor.set = write;

  return accessor;
}
