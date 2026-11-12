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
    owner: effectOwner,
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
        let anyChanged = false;
        for (const source of this.sources) {
          const maybeSub = source as unknown as Partial<Subscriber>;
          if (typeof maybeSub.update === 'function') {
            hasComputeds = true;
            if (maybeSub.isDirty) {
              try {
                maybeSub.update();
              } catch {
                anyChanged = true;
                break;
              }
            }
          }
          if (source.version !== sourceVersions.get(source)) {
            anyChanged = true;
            break;
          }
        }

        if (hasComputeds && !anyChanged) {
          this.isDirty = false;
          return;
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
        (effectOwner as any).isDisposing = true;
        try {
          for (let i = ch.length - 1; i >= 0; i--) {
            const child = ch[i];
            child.parent = null;
            child.dispose();
          }
        } finally {
          ch.length = 0;
          (effectOwner as any).isDisposing = false;
        }
      }

      if (effectOwner.errorHandlers && effectOwner.errorHandlers.length > 0) {
        effectOwner.errorHandlers.length = 0;
      }

      // Reset dirty flag BEFORE executing fn so any signal write inside fn sets dirty and re-queues
      this.isDirty = false;

      // Clean up previous dependency links so conditional branches don't retain stale subscriptions
      if (hasRun) {
        for (const source of this.sources) {
          source.subscribers.delete(this);
        }
        this.sources.clear();
      }

      const prevSub = setActiveSubscriber(this);
      try {
        userCleanup = runWithOwner(effectOwner, () => fn());
        hasRun = true;
      } catch (err) {
        hasRun = true;
        handleError(err, effectOwner);
      } finally {
        setActiveSubscriber(prevSub);
        if (this.isDisposed || effectOwner.isDisposed) {
          this.isDisposed = true;
          if (typeof userCleanup === 'function') {
            try {
              userCleanup();
            } catch (err) {
              handleError(err, effectOwner);
            }
            userCleanup = undefined;
          }
          for (const source of this.sources) {
            source.subscribers.delete(this);
          }
          this.sources.clear();
          sourceVersions.clear();
        } else {
          sourceVersions.clear();
          for (const source of this.sources) {
            sourceVersions.set(source, source.version);
          }
        }
      }
    }
  };

  if (effectOwner.isDisposed) {
    node.isDisposed = true;
    return () => {};
  }

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
