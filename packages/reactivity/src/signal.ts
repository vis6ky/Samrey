/**
 * @license Apache-2.0
 * @samrey/reactivity - Signal Primitive
 */

import { Dependency, Signal, Subscriber } from './types.js';
import { trackDependency, incrementClock, batch } from './batch.js';

function isDevRuntime(): boolean {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV !== 'production';
  }
  return Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
}

function arraysShallowDifferent(prev: unknown[], next: unknown[]): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i++) {
    if (!Object.is(prev[i], next[i])) return true;
  }
  return false;
}

export function signal<T>(initialValue: T): Signal<T> {
  let currentValue = initialValue;
  let lastArraySnapshot: unknown[] | null =
    Array.isArray(initialValue) && isDevRuntime() ? initialValue.slice() : null;

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

    if (!Object.is(nextValue, currentValue)) {
      currentValue = nextValue;
      if (lastArraySnapshot !== null || Array.isArray(nextValue)) {
        lastArraySnapshot =
          Array.isArray(nextValue) && isDevRuntime() ? nextValue.slice() : null;
      }
      node.version = incrementClock();

      if (node.subscribers.size > 0) {
        batch(() => {
          for (const sub of node.subscribers) {
            sub.notify(node.version);
          }
        });
      }
    } else if (
      lastArraySnapshot !== null &&
      Array.isArray(nextValue) &&
      isDevRuntime() &&
      arraysShallowDifferent(lastArraySnapshot, nextValue)
    ) {
      lastArraySnapshot = nextValue.slice();
      console.warn(
        '[Samrey Reactivity Warning] In-place array mutation detected without returning a new array reference. Reactivity requires immutable reference replacement (e.g. signal.update(arr => [...arr, item])).'
      );
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
  accessor.update = (updater: (prev: T) => T) => write(updater, false);

  return accessor;
}
