/**
 * @license Apache-2.0
 * @gati/reactivity - Computed Derived Primitive
 */

import { Dependency, ReadonlySignal, Subscriber } from './types.js';
import { trackDependency, setActiveSubscriber, incrementClock } from './batch.js';
import { createOwner, onCleanup } from './owner.js';

export function computed<T>(fn: () => T): ReadonlySignal<T> {
  let cachedValue: T;
  let isInitialized = false;

  const node: Subscriber & Dependency = {
    version: 0,
    isDirty: true,
    sources: new Set<Dependency>(),
    subscribers: new Set<Subscriber>(),
    notify() {
      if (!this.isDirty) {
        this.isDirty = true;
        // Propagate dirty flag down to downstream subscribers
        for (const sub of this.subscribers) {
          sub.notify(this.version);
        }
      }
    },
    update() {
      // Lazy evaluation: actual update happens on read
    }
  };

  function evaluate(): T {
    if (!node.isDirty && isInitialized) {
      return cachedValue;
    }

    // Clean up previous dependency links
    for (const source of node.sources) {
      source.subscribers.delete(node);
    }
    node.sources.clear();

    const prevSub = setActiveSubscriber(node);
    try {
      cachedValue = fn();
      isInitialized = true;
      node.isDirty = false;
      node.version = incrementClock();
    } finally {
      setActiveSubscriber(prevSub);
    }

    return cachedValue;
  }

  function read(): T {
    trackDependency(node);
    return evaluate();
  }

  const accessor = function (): T {
    return read();
  } as ReadonlySignal<T>;

  Object.defineProperty(accessor, 'value', {
    get: read,
    enumerable: true
  });

  onCleanup(() => {
    for (const source of node.sources) {
      source.subscribers.delete(node);
    }
    node.sources.clear();
    node.subscribers.clear();
  });

  return accessor;
}

export const createMemo = computed;
