/**
 * @license Apache-2.0
 * @samrey/reactivity - Deep Store with Hermetic Prototype Defense
 */

import { signal } from './signal.js';

const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const PROXIED = Symbol('SAMREY_PROXIED');

export function createStore<T extends object>(initialObject: T): T {
  if (!initialObject || typeof initialObject !== 'object') return initialObject;
  if ((initialObject as any)[PROXIED]) return initialObject;

  const signalMap = new Map<string | symbol, ReturnType<typeof signal>>();
  const childStores = new Map<string | symbol, any>();

  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      if (prop === PROXIED) return true;
      if (PROTOTYPE_POLLUTION_KEYS.has(String(prop))) {
        return undefined;
      }

      let s = signalMap.get(prop);
      if (!s) {
        const rawVal = Reflect.get(target, prop, receiver);
        s = signal(rawVal);
        signalMap.set(prop, s);
      }

      const currentVal = s.value;
      if (currentVal && typeof currentVal === 'object' && !Array.isArray(currentVal)) {
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
      let s = signalMap.get(prop);
      if (!s) {
        s = signal(val);
        signalMap.set(prop, s);
      } else {
        s.value = val;
      }

      return Reflect.set(target, prop, val, receiver);
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
