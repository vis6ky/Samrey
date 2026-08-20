/**
 * @license Apache-2.0
 * @aether/runtime - Fine-Grained Reactive DOM Slot Binders
 */

import { effect } from '@aether/reactivity';
import { sanitizeUri, escapeHtmlAttribute } from '@aether/security';

export function bindText(node: Node, getter: () => unknown): void {
  let prevText: string | null = null;
  effect(() => {
    const val = getter();
    const nextText = val === null || val === undefined ? '' : String(val);
    if (nextText !== prevText) {
      prevText = nextText;
      node.textContent = nextText;
    }
  });
}

export function bindAttr(element: Element, attrName: string, getter: () => unknown): void {
  let prevVal: string | null = null;
  let prevNull = true;

  effect(() => {
    let val = getter();
    if (attrName === 'href' || attrName === 'src') {
      val = sanitizeUri(val as string);
    }

    if (val === null || val === undefined || val === false) {
      if (!prevNull) {
        prevNull = true;
        prevVal = null;
        element.removeAttribute(attrName);
      }
    } else {
      const nextStr = String(val);
      if (prevNull || nextStr !== prevVal) {
        prevNull = false;
        prevVal = nextStr;
        element.setAttribute(attrName, nextStr);
      }
    }
  });
}

export function bindClass(element: Element, className: string, getter: () => boolean): void {
  let prevActive: boolean | null = null;
  effect(() => {
    const active = Boolean(getter());
    if (active !== prevActive) {
      prevActive = active;
      if (active) {
        element.classList.add(className);
      } else {
        element.classList.remove(className);
      }
    }
  });
}
