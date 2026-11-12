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
  const parentDisposed = Boolean(parent && (parent.isDisposed || (parent as any).isDisposing));
  const owner: Owner = {
    parent: parentDisposed ? null : parent,
    children: [],
    cleanups: [],
    isDisposed: parentDisposed,
    context: parent?.context ? Object.create(parent.context) : Object.create(null),
    dispose() {
      if (this.isDisposed) return;
      const isParentDisposing = (this.parent as any)?.isDisposing;
      this.isDisposed = true;
      (this as any).isDisposing = true;

      try {
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

        if (this.parent && !isParentDisposing) {
          const ch = this.parent.children;
          const len = ch.length;
          const idx = len > 0 && ch[len - 1] === this ? len - 1 : ch.indexOf(this);
          if (idx !== -1) {
            if (idx === len - 1) {
              ch.pop();
            } else {
              ch.splice(idx, 1);
            }
          }
          this.parent = null;
        }
      } finally {
        (this as any).isDisposing = false;
      }
    }
  };

  if (parent && !parentDisposed) {
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
  if (currentOwner && !currentOwner.isDisposed) {
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
        let ctx = currentOwner.context;
        if (!ctx) {
          ctx = Object.create(null) as Record<string | symbol, unknown>;
          currentOwner.context = ctx;
        }
        ctx[id] = props.value;
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
  if (currentOwner && !currentOwner.isDisposed) {
    if (!currentOwner.errorHandlers) currentOwner.errorHandlers = [];
    currentOwner.errorHandlers.push(fn);
  }
}

function tryErrorHandlerChain(err: unknown, startOwner: Owner | null): boolean {
  let curr = startOwner;
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
      return true;
    }
    curr = curr.parent;
  }
  return false;
}

export function handleError(
  err: unknown,
  owner: Owner | null = currentOwner,
  fallbackOwner: Owner | null = null
): void {
  if (tryErrorHandlerChain(err, owner)) {
    return;
  }
  if (fallbackOwner && fallbackOwner !== owner && tryErrorHandlerChain(err, fallbackOwner)) {
    return;
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

export interface SuspenseTracker {
  track(promise: Promise<unknown>): void;
}

/**
 * Shared context connecting `<Suspense>` boundaries (in `@samrey/runtime`)
 * with async data primitives such as `createResource()` (in `@samrey/http`).
 */
export const SuspenseTrackerContext = createContext<SuspenseTracker | null>(null);

export interface HydrationCaptureRegistry {
  retargeters: WeakMap<object, Array<(newTarget: any) => void>>;
}

let activeHydrationCapture: HydrationCaptureRegistry | null = null;

/**
 * Runs a component instantiation under non-destructive hydration capture mode so
 * bindings and event listeners created by `@samrey/runtime` can be retargeted onto
 * matching server-rendered DOM nodes in `@samrey/ssr`.
 */
export function runWithHydrationCapture<T>(fn: () => T): { result: T; capture: HydrationCaptureRegistry } {
  const capture: HydrationCaptureRegistry = {
    retargeters: new WeakMap()
  };
  const prev = activeHydrationCapture;
  activeHydrationCapture = capture;
  try {
    return { result: fn(), capture };
  } finally {
    activeHydrationCapture = prev;
  }
}

export function isHydrationCapturing(): boolean {
  return activeHydrationCapture !== null;
}

export function recordHydrationRetarget(target: object, retargetFn: (newTarget: any) => void): void {
  if (!activeHydrationCapture || !target || typeof target !== 'object') return;
  let list = activeHydrationCapture.retargeters.get(target);
  if (!list) {
    list = [];
    activeHydrationCapture.retargeters.set(target, list);
  }
  list.push(retargetFn);
}
