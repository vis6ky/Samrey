/**
 * @license Apache-2.0
 * @aether/runtime - Delegated & Direct Event Binding
 */

import { onCleanup } from '@aether/reactivity';

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
