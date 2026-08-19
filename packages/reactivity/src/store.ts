/**
 * @license Apache-2.0
 * @aether/reactivity - Deep Store with Hermetic Prototype Defense
 */

import { signal } from './signal.js';

const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function createStore<T extends object>(initialObject: T): T {
  const signalMap = new Map<string | symbol, ReturnType<typeof signal>>();

  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      if (PROTOTYPE_POLLUTION_KEYS.has(String(prop))) {
        return undefined;
      }

      let s = signalMap.get(prop);
      if (!s) {
        const val = Reflect.get(target, prop, receiver);
        s = signal(val);
        signalMap.set(prop, s);
      }
      return s.value;
    },
    set(target, prop, val, receiver) {
      if (PROTOTYPE_POLLUTION_KEYS.has(String(prop))) {
        return true;
      }

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
