/**
 * @license Apache-2.0
 * @samrey/reactivity - Effect Side-Effect Primitive
 */

import { Dependency, Subscriber } from './types.js';
import { setActiveSubscriber, queueEffect, cancelPendingEffect } from './batch.js';
import { createOwner, onCleanup, runWithOwner, handleError } from './owner.js';

export function effect(fn: () => void | (() => void)): () => void {
  const effectOwner = createOwner();
  let userCleanup: (() => void) | void;
  const sourceVersions = new Map<Dependency, number>();
  let hasRun = false;

  const node: Subscriber = {
    version: 0,
    isDirty: true,
    isDisposed: false,
    sources: new Set<Dependency>(),
    notify() {
      if (this.isDisposed) return;
      if (!this.isDirty) {
        this.isDirty = true;
        queueEffect(this);
      }
    },
    update() {
      if (this.isDisposed || !this.isDirty) return;

      if (hasRun) {
        let hasComputeds = false;
        for (const source of this.sources) {
          if (typeof (source as Subscriber).update === 'function') {
            hasComputeds = true;
            if ((source as Subscriber).isDirty) {
              (source as Subscriber).update();
            }
          }
        }

        if (hasComputeds) {
          let anyChanged = false;
          for (const source of this.sources) {
            if (source.version !== sourceVersions.get(source)) {
              anyChanged = true;
              break;
            }
          }
          if (!anyChanged) {
            this.isDirty = false;
            return;
          }
        }
      }

      // Run previous cleanup
      if (typeof userCleanup === 'function') {
        try {
          userCleanup();
        } catch (err) {
          handleError(err, effectOwner);
        }
        userCleanup = undefined;
      }

      // Dispose child owners and cleanups inside effectOwner between re-runs
      if (effectOwner.cleanups.length > 0) {
        const cl = effectOwner.cleanups;
        for (let i = 0; i < cl.length; i++) {
          try {
            cl[i]();
          } catch (err) {
            handleError(err, effectOwner);
          }
        }
        cl.length = 0;
      }
      if (effectOwner.children.length > 0) {
        const ch = effectOwner.children;
        for (let i = 0; i < ch.length; i++) {
          ch[i].dispose();
        }
        ch.length = 0;
      }

      // Reset dirty flag BEFORE executing fn so any signal write inside fn sets dirty and re-queues
      this.isDirty = false;

      const prevSub = setActiveSubscriber(this);
      try {
        userCleanup = runWithOwner(effectOwner, () => fn());
        hasRun = true;
        for (const source of this.sources) {
          if (typeof (source as Subscriber).update === 'function') {
            sourceVersions.set(source, source.version);
          }
        }
      } catch (err) {
        handleError(err, effectOwner);
      } finally {
        setActiveSubscriber(prevSub);
      }
    }
  };

  // Initial execution
  node.update();

  const dispose = () => {
    if (node.isDisposed) return;
    node.isDisposed = true;
    cancelPendingEffect(node);

    if (typeof userCleanup === 'function') {
      try {
        userCleanup();
      } catch (err) {
        handleError(err, effectOwner);
      }
      userCleanup = undefined;
    }
    for (const source of node.sources) {
      source.subscribers.delete(node);
    }
    node.sources.clear();
    effectOwner.dispose();
  };

  onCleanup(dispose);

  return dispose;
}
