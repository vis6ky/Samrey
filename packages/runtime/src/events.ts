/**
 * @license Apache-2.0
 * @gati/runtime - Delegated & Direct Event Binding
 */

import { onCleanup } from '@gati/reactivity';

export function on(
  element: EventTarget,
  eventName: string,
  handler: (event: Event) => void,
  options?: boolean | AddEventListenerOptions
): void {
  element.addEventListener(eventName, handler, options);
  onCleanup(() => {
    element.removeEventListener(eventName, handler, options);
  });
}
