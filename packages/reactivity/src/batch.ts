/**
 * @license Apache-2.0
 * @samrey/reactivity - Transaction Batching & Dependency Tracking
 */

import { Subscriber, Dependency } from './types.js';

import { handleError } from './owner.js';

let activeSubscriber: Subscriber | null = null;
let globalClock = 1;
let batchDepth = 0;
let isFlushing = false;
const MAX_BATCH_CYCLES = 1000;
const pendingEffects: Set<Subscriber> = new Set();

function drainPendingEffects(): void {
  if (isFlushing) return;
  isFlushing = true;
  try {
    let cycles = 0;
    while (pendingEffects.size > 0) {
      if (++cycles > MAX_BATCH_CYCLES) {
        // BUG-03 FIX: Do NOT reset isFlushing before handleError.
        // Keeping isFlushing = true during handleError prevents recursive re-entry
        // into drainPendingEffects if handleError writes signals.
        // The finally block will reset isFlushing = false after the throw,
        // and any effects newly queued by handleError will be drained in a
        // fresh non-reentrant call after isFlushing becomes false.
        const firstSubOwner = Array.from(pendingEffects)[0]?.owner ?? null;
        pendingEffects.clear();
        const err = new Error('[SAMREY-301] Maximum reactive batch update cycles (1000) exceeded. Detected cyclic dependency or infinite effect loop.');
        handleError(err, firstSubOwner, activeSubscriber?.owner ?? null);
        throw err;
        // finally block below will: set isFlushing = false, then
        // the signal write that caused this will re-drain if new effects arrived.
      }
      const current = Array.from(pendingEffects);
      pendingEffects.clear();
      const len = current.length;
      for (let i = 0; i < len; i++) {
        const sub = current[i];
        if (!sub.isDisposed) {
          try {
            sub.update();
          } catch (err) {
            handleError(err, sub.owner ?? null);
          }
        }
      }
    }
  } finally {
    isFlushing = false;
    // BUG-03 FIX: If handleError queued new effects (via signal writes inside error
    // handlers), drain them now that isFlushing is false. This replaces the
    // unsafe recursive call that was inside the cycle-limit branch above.
    if (pendingEffects.size > 0 && batchDepth === 0) {
      drainPendingEffects();
    }
  }
}

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
  if (activeSubscriber && !activeSubscriber.isDisposed) {
    dep.subscribers.add(activeSubscriber);
    activeSubscriber.sources.add(dep);
  }
}

export function queueEffect(sub: Subscriber): void {
  if (sub.isDisposed) return;
  pendingEffects.add(sub);
  if (batchDepth === 0) {
    drainPendingEffects();
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
      drainPendingEffects();
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
