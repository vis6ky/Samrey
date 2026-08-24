/**
 * @license Apache-2.0
 * @gati/testing - Synthetic DOM Event Dispatchers
 */

export function fireEvent(element: EventTarget, eventName: string, eventInit?: EventInit): void {
  if (typeof element.dispatchEvent === 'function') {
    const event = typeof Event !== 'undefined' 
      ? new Event(eventName, { bubbles: true, cancelable: true, ...eventInit }) 
      : ({ type: eventName, ...eventInit } as unknown as Event);
    element.dispatchEvent(event);
  }
}
