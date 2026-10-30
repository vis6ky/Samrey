/**
 * @license Apache-2.0
 * @samrey/reactivity - Deep Store with Hermetic Prototype Defense
 */

import { signal } from './signal.js';
import { incrementClock } from './batch.js';

const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
export const PROXIED = Symbol.for('SAMREY_PROXIED');

export function isStore(val: unknown): boolean {
  return Boolean(val && typeof val === 'object' && (val as any)[PROXIED]);
}

function isWrappable(val: unknown): val is object {
  if (!val || typeof val !== 'object') return false;
  if (Array.isArray(val)) return true;
  // Check if it's a plain object (not Date, Map, Set, RegExp, etc.)
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

export function createStore<T extends object>(initialObject: T): T {
  if (!initialObject || typeof initialObject !== 'object') return initialObject;
  if ((initialObject as any)[PROXIED]) return initialObject;

  const signalMap = new Map<string | symbol, ReturnType<typeof signal>>();
  const childStores = new Map<string | symbol, any>();
  const iterationSignal = signal(0);

  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      if (prop === PROXIED) return true;
      if (PROTOTYPE_POLLUTION_KEYS.has(String(prop))) {
        return undefined;
      }

      const rawVal = Reflect.get(target, prop, target);
      if (typeof rawVal === 'function') {
        if (target instanceof Map || target instanceof Set || target instanceof Date || target instanceof RegExp) {
          return rawVal.bind(target);
        }
        return rawVal.bind(receiver);
      }

      let s = signalMap.get(prop);
      if (!s) {
        s = signal(rawVal);
        signalMap.set(prop, s);
      }

      const currentVal = s.value;
      if (isWrappable(currentVal)) {
        let child = childStores.get(prop);
        if (!child) {
          child = createStore(currentVal);
          childStores.set(prop, child);
        }
        return child;
      }

      return currentVal;
    },
    set(target, prop, val, receiver) {
      if (PROTOTYPE_POLLUTION_KEYS.has(String(prop))) {
        return true;
      }

      childStores.delete(prop);
      const hadKey = Reflect.has(target, prop);
      const res = Reflect.set(target, prop, val, target);

      let s = signalMap.get(prop);
      if (!s) {
        s = signal(val);
        signalMap.set(prop, s);
      } else {
        s.value = val;
      }

      if (!hadKey || (Array.isArray(target) && prop === 'length')) {
        iterationSignal.value = incrementClock();
      }

      return res;
    },
    deleteProperty(target, prop) {
      if (PROTOTYPE_POLLUTION_KEYS.has(String(prop))) {
        return false;
      }
      const hadKey = Reflect.has(target, prop);
      const success = Reflect.deleteProperty(target, prop);
      if (hadKey && success) {
        childStores.delete(prop);
        const s = signalMap.get(prop);
        if (s) {
          s.value = undefined;
        }
        iterationSignal.value = incrementClock();
      }
      return success;
    },
    has(target, prop) {
      if (prop === PROXIED) return true;
      let s = signalMap.get(prop);
      if (!s) {
        s = signal(Reflect.get(target, prop));
        signalMap.set(prop, s);
      }
      s.value;
      return Reflect.has(target, prop);
    },
    ownKeys(target) {
      iterationSignal.value;
      return Reflect.ownKeys(target);
    }
  };

  return new Proxy(initialObject, handler);
}

/**
 * Runs a mutator function on a store draft or target object.
 */
export function produce<T extends object>(target: T, fn: (draft: T) => void): T {
  fn(target);
  return target;
}

/**
 * Reconciles target object properties with new data.
 */
export function reconcile<T extends object>(target: T, source: Partial<T>): T {
  for (const [key, value] of Object.entries(source)) {
    if (!PROTOTYPE_POLLUTION_KEYS.has(key)) {
      (target as any)[key] = value;
    }
  }
  return target;
}
