/**
 * @license Apache-2.0
 * @samrey/runtime - Delegated & Direct Event Binding
 */

import { onCleanup, isHydrationCapturing, recordHydrationRetarget, getOwner } from '@samrey/reactivity';
import { isDev } from './diagnostics.js';

export function on<K extends keyof HTMLElementEventMap>(
  element: EventTarget,
  eventName: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: boolean | AddEventListenerOptions
): void;
export function on(
  element: EventTarget,
  eventName: string,
  handler: (event: Event) => void,
  options?: boolean | AddEventListenerOptions
): void;
export function on(
  element: EventTarget,
  eventName: string,
  handler: (event: any) => void,
  options?: boolean | AddEventListenerOptions
): void {
  // BUG-14 FIX: Warn in development when on() is called outside a reactive owner scope,
  // as onCleanup() is a silent no-op without an active owner and the listener will leak.
  if (isDev && !getOwner()) {
    console.warn(
      `[Samrey Runtime Warning] on("${eventName}", ...) was called outside a reactive owner scope. ` +
      'The event listener will not be automatically cleaned up. Wrap in createRoot(), an effect(), ' +
      'or call inside a component function.'
    );
  }

  let activeElement: EventTarget = element;
  activeElement.addEventListener(eventName, handler as EventListener, options);
  if (isHydrationCapturing()) {
    recordHydrationRetarget(element as object, (nextTarget: EventTarget) => {
      if (nextTarget === activeElement) return;
      activeElement.removeEventListener(eventName, handler as EventListener, options);
      activeElement = nextTarget;
      activeElement.addEventListener(eventName, handler as EventListener, options);
    });
  }
  onCleanup(() => {
    activeElement.removeEventListener(eventName, handler as EventListener, options);
  });
}

export const bindEvent = on;

