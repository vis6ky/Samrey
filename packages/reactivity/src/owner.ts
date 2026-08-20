/**
 * @license Apache-2.0
 * @aether/reactivity - Owner Scoped Disposal Hierarchy
 */

import { Owner } from './types.js';

let currentOwner: Owner | null = null;

export function getOwner(): Owner | null {
  return currentOwner;
}

export function setOwner(owner: Owner | null): Owner | null {
  const prev = currentOwner;
  currentOwner = owner;
  return prev;
}

export function createOwner(parent = currentOwner): Owner {
  const owner: Owner = {
    parent,
    children: [],
    cleanups: [],
    context: parent?.context ? Object.create(parent.context) : Object.create(null),
    dispose() {
      for (let i = 0; i < this.cleanups.length; i++) {
        try {
          this.cleanups[i]();
        } catch (err) {
          console.error('[Aether Reactivity] Error during cleanup:', err);
        }
      }
      this.cleanups.length = 0;

      for (let i = 0; i < this.children.length; i++) {
        this.children[i].dispose();
      }
      this.children.length = 0;

      if (this.parent) {
        const idx = this.parent.children.indexOf(this);
        if (idx !== -1) this.parent.children.splice(idx, 1);
      }
    }
  };

  if (parent) {
    parent.children.push(owner);
  }

  return owner;
}

export function runWithOwner<T>(owner: Owner | null, fn: () => T): T {
  const prev = currentOwner;
  currentOwner = owner;
  try {
    return fn();
  } finally {
    currentOwner = prev;
  }
}

export function createRoot<T>(fn: (dispose: () => void) => T): T {
  const owner = createOwner(null);
  return runWithOwner(owner, () => fn(() => owner.dispose()));
}

export function onCleanup(fn: () => void): void {
  if (currentOwner) {
    currentOwner.cleanups.push(fn);
  }
}
