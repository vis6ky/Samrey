/**
 * @license Apache-2.0
 * @samrey/reactivity - Transaction Batching & Dependency Tracking
 */

import { Subscriber, Dependency } from './types.js';

import { handleError } from './owner.js';

let activeSubscriber: Subscriber | null = null;
let globalClock = 1;
let batchDepth = 0;
const pendingEffects: Set<Subscriber> = new Set();

export function getGlobalClock(): number {
  return globalClock;
}

export function incrementClock(): number {
  return ++globalClock;
}

export function getActiveSubscriber(): Subscriber | null {
  return activeSubscriber;
}

export function setActiveSubscriber(sub: Subscriber | null): Subscriber | null {
  const prev = activeSubscriber;
  activeSubscriber = sub;
  return prev;
}

export function trackDependency(dep: Dependency): void {
  if (activeSubscriber) {
    dep.subscribers.add(activeSubscriber);
    activeSubscriber.sources.add(dep);
  }
}

export function queueEffect(sub: Subscriber): void {
  if (sub.isDisposed) return;
  if (batchDepth > 0) {
    pendingEffects.add(sub);
  } else {
    try {
      sub.update();
    } catch (err) {
      handleError(err);
    }
  }
}

export function cancelPendingEffect(sub: Subscriber): void {
  pendingEffects.delete(sub);
}

export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0 && pendingEffects.size > 0) {
      // Drain queue safely handling re-entrant queuing
      while (pendingEffects.size > 0) {
        const current = Array.from(pendingEffects);
        pendingEffects.clear();
        const len = current.length;
        for (let i = 0; i < len; i++) {
          const sub = current[i];
          if (!sub.isDisposed) {
            try {
              sub.update();
            } catch (err) {
              handleError(err);
            }
          }
        }
      }
    }
  }
}

export function untrack<T>(fn: () => T): T {
  const prev = setActiveSubscriber(null);
  try {
    return fn();
  } finally {
    setActiveSubscriber(prev);
  }
}
