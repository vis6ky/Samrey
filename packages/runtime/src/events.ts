/**
 * @license Apache-2.0
 * @samrey/runtime - Delegated & Direct Event Binding
 */

import { onCleanup, isHydrationCapturing, recordHydrationRetarget } from '@samrey/reactivity';

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

