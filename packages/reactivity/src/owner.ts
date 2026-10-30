/**
 * @license Apache-2.0
 * @samrey/reactivity - Owner Scoped Disposal Hierarchy
 */

import { Owner, Context } from './types.js';

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
          handleError(err, this);
        }
      }
      this.cleanups.length = 0;

      if (this.children.length > 0) {
        const ch = this.children;
        this.children = [];
        for (let i = 0; i < ch.length; i++) {
          ch[i].parent = null;
          ch[i].dispose();
        }
      }

      if (this.parent) {
        const idx = this.parent.children.indexOf(this);
        if (idx !== -1) this.parent.children.splice(idx, 1);
        this.parent = null;
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

export function createContext<T>(defaultValue?: T): Context<T> {
  const id = Symbol('Samrey_Context');
  return {
    id,
    defaultValue,
    Provider(props: { value: T; children: any }) {
      if (currentOwner) {
        if (!currentOwner.context) currentOwner.context = Object.create(null);
        currentOwner.context[id] = props.value;
      }
      return typeof props.children === 'function' ? props.children() : props.children;
    }
  };
}

export function useContext<T>(context: Context<T>): T {
  let curr = currentOwner;
  while (curr) {
    if (curr.context && context.id in curr.context) {
      return curr.context[context.id] as T;
    }
    curr = curr.parent;
  }
  return context.defaultValue as T;
}

let globalErrorHandler: ((err: unknown) => void) | null = null;

export function setGlobalErrorHandler(handler: ((err: unknown) => void) | null): void {
  globalErrorHandler = handler;
}

export function getGlobalErrorHandler(): ((err: unknown) => void) | null {
  return globalErrorHandler;
}

export function onError(fn: (err: unknown) => void): void {
  if (currentOwner) {
    if (!currentOwner.errorHandlers) currentOwner.errorHandlers = [];
    currentOwner.errorHandlers.push(fn);
  }
}

export function handleError(err: unknown, owner: Owner | null = currentOwner): void {
  let curr = owner;
  while (curr) {
    if (curr.errorHandlers && curr.errorHandlers.length > 0) {
      for (let i = 0; i < curr.errorHandlers.length; i++) {
        try {
          curr.errorHandlers[i](err);
        } catch (handlerErr) {
          console.error('[Samrey Reactivity] Error inside onError handler:', handlerErr);
          console.error('[Samrey Reactivity] Original unhandled error:', err);
        }
      }
      return;
    }
    curr = curr.parent;
  }

  if (globalErrorHandler) {
    try {
      globalErrorHandler(err);
      return;
    } catch (globalErr) {
      console.error('[Samrey Reactivity] Error inside global error handler:', globalErr);
      console.error('[Samrey Reactivity] Original unhandled error:', err);
      return;
    }
  }

  console.error('[Samrey Reactivity] Unhandled error in effect:', err);
}
