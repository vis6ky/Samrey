/**
 * @license Apache-2.0
 * @aether/runtime - Fine-Grained Reactive DOM Slot Binders
 */

import { effect } from '@aether/reactivity';
import { sanitizeUri, escapeHtmlAttribute } from '@aether/security';

export function bindText(node: Node, getter: () => unknown): void {
  effect(() => {
    const val = getter();
    node.textContent = val === null || val === undefined ? '' : String(val);
  });
}

export function bindAttr(element: Element, attrName: string, getter: () => unknown): void {
  effect(() => {
    let val = getter();
    if (attrName === 'href' || attrName === 'src') {
      val = sanitizeUri(val as string);
    }

    if (val === null || val === undefined || val === false) {
      element.removeAttribute(attrName);
    } else {
      element.setAttribute(attrName, String(val));
    }
  });
}

export function bindClass(element: Element, className: string, getter: () => boolean): void {
  effect(() => {
    const active = getter();
    if (active) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
  });
}
