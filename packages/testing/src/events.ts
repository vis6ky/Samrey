/**
 * @license Apache-2.0
 * @samrey/testing - Synthetic DOM Event Dispatchers
 */

export function fireEvent(element: EventTarget, eventName: string, eventInit?: Record<string, unknown>): void {
  if (typeof element.dispatchEvent === 'function') {
    let event: Event;
    if (typeof MouseEvent !== 'undefined' && /^(click|dblclick|mousedown|mouseup|mousemove|contextmenu)/i.test(eventName)) {
      event = new MouseEvent(eventName, {
        bubbles: true,
        cancelable: true,
        button: 0,
        ...eventInit
      });
    } else if (typeof CustomEvent !== 'undefined') {
      event = new CustomEvent(eventName, {
        bubbles: true,
        cancelable: true,
        ...eventInit
      });
    } else if (typeof Event !== 'undefined') {
      event = new Event(eventName, { bubbles: true, cancelable: true, ...eventInit });
    } else {
      event = { type: eventName, button: 0, ...eventInit } as unknown as Event;
    }
    element.dispatchEvent(event);
  }
}
