/**
 * @license Apache-2.0
 * @samrey/reactivity - Computed Derived Primitive
 */

import { Dependency, ReadonlySignal, Subscriber } from './types.js';
import { trackDependency, setActiveSubscriber, incrementClock } from './batch.js';
import { getOwner, onCleanup } from './owner.js';

export function computed<T>(fn: () => T): ReadonlySignal<T> {
  let cachedValue: T;
  let isInitialized = false;
  let hasError = false;
  let lastError: unknown;
  const trackedVersions: number[] = [];

  const owner = getOwner();

  const disposeComputedNode = () => {
    node.isDisposed = true;
    for (const source of node.sources) {
      source.subscribers.delete(node);
    }
    node.sources.clear();
    node.subscribers.clear();
    trackedVersions.length = 0;
  };

  const isDead = () => {
    if (node.isDisposed) return true;
    if (owner && (owner.isDisposed || (owner as any).isDisposing)) {
      disposeComputedNode();
      return true;
    }
    return false;
  };

  const node: Subscriber & Dependency = {
    version: 0,
    isDirty: true,
    isDisposed: false,
    sources: new Set<Dependency>(),
    subscribers: new Set<Subscriber>(),
    notify() {
      if (isDead()) return;
      if (!this.isDirty) {
        this.isDirty = true;
        for (const sub of [...this.subscribers]) {
          sub.notify(this.version);
        }
      }
    },
    update() {
      if (isDead()) return;
      if (this.isDirty) {
        evaluate();
      }
    }
  };

  isDead();

  function evaluate(): T {
    if (isDead()) {
      return cachedValue;
    }

    if (!node.isDirty) {
      if (hasError) throw lastError;
      if (isInitialized) return cachedValue;
    }

    if (isInitialized || hasError) {
      let i = 0;
      let anyChanged = node.sources.size === 0;
      for (const source of node.sources) {
        const maybeSub = source as unknown as Partial<Subscriber>;
        if (typeof maybeSub.update === 'function' && maybeSub.isDirty) {
          try {
            maybeSub.update();
          } catch {
            anyChanged = true;
            break;
          }
        }
        if (source.version !== trackedVersions[i]) {
          anyChanged = true;
          break;
        }
        i++;
      }
      if (!anyChanged) {
        node.isDirty = false;
        if (hasError) throw lastError;
        return cachedValue;
      }
    }

    // Clean up previous dependency links
    for (const source of node.sources) {
      source.subscribers.delete(node);
    }
    node.sources.clear();

    const prevSub = setActiveSubscriber(node);
    try {
      const nextVal = fn();
      let i = 0;
      for (const source of node.sources) {
        trackedVersions[i++] = source.version;
      }
      trackedVersions.length = i;

      if (!isInitialized || hasError || !Object.is(cachedValue, nextVal)) {
        node.version = incrementClock();
      }
      cachedValue = nextVal;
      isInitialized = true;
      hasError = false;
      lastError = undefined;
      node.isDirty = false;
    } catch (err) {
      let i = 0;
      for (const source of node.sources) {
        trackedVersions[i++] = source.version;
      }
      trackedVersions.length = i;
      hasError = true;
      lastError = err;
      node.version = incrementClock();
      node.isDirty = false;
      throw err;
    } finally {
      setActiveSubscriber(prevSub);
      if (node.isDisposed) {
        for (const source of node.sources) {
          source.subscribers.delete(node);
        }
        node.sources.clear();
        node.subscribers.clear();
      }
    }

    return cachedValue;
  }

  function read(): T {
    if (isDead()) {
      return cachedValue;
    }
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

  onCleanup(disposeComputedNode);

  return accessor;
}

export const createMemo = computed;
