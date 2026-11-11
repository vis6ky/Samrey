/**
 * @license Apache-2.0
 * @samrey/runtime - Delegated & Direct Event Binding
 */

import { onCleanup, isHydrationCapturing, recordHydrationRetarget } from '@samrey/reactivity';

export function on(
  element: EventTarget,
  eventName: string,
  handler: (event: Event) => void,
  options?: boolean | AddEventListenerOptions
): void {
  let activeElement: EventTarget = element;
  activeElement.addEventListener(eventName, handler, options);
  if (isHydrationCapturing()) {
    recordHydrationRetarget(element as object, (nextTarget: EventTarget) => {
      if (nextTarget === activeElement) return;
      activeElement.removeEventListener(eventName, handler, options);
      activeElement = nextTarget;
      activeElement.addEventListener(eventName, handler, options);
    });
  }
  onCleanup(() => {
    activeElement.removeEventListener(eventName, handler, options);
  });
}

export const bindEvent = on;

