/**
 * @license Apache-2.0
 * @gati/reactivity - Effect Side-Effect Primitive
 */

import { Dependency, Subscriber } from './types.js';
import { setActiveSubscriber, queueEffect } from './batch.js';
import { createOwner, onCleanup, runWithOwner } from './owner.js';

export function effect(fn: () => void | (() => void)): () => void {
  const effectOwner = createOwner();
  let userCleanup: (() => void) | void;

  const node: Subscriber = {
    version: 0,
    isDirty: true,
    sources: new Set<Dependency>(),
    notify() {
      if (!this.isDirty) {
        this.isDirty = true;
        queueEffect(this);
      }
    },
    update() {
      if (!this.isDirty) return;

      // Run previous cleanup
      if (typeof userCleanup === 'function') {
        try {
          userCleanup();
        } catch (err) {
          console.error('[Gati Reactivity] Error during effect cleanup:', err);
        }
        userCleanup = undefined;
      }

      // Detach old dependencies
      for (const source of this.sources) {
        source.subscribers.delete(this);
      }
      this.sources.clear();

      const prevSub = setActiveSubscriber(this);
      try {
        userCleanup = runWithOwner(effectOwner, () => fn());
        this.isDirty = false;
      } finally {
        setActiveSubscriber(prevSub);
      }
    }
  };

  // Initial execution
  node.update();

  const dispose = () => {
    if (typeof userCleanup === 'function') {
      try {
        userCleanup();
      } catch (err) {
        console.error('[Gati Reactivity] Error during effect cleanup:', err);
      }
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
