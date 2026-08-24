/**
 * @license Apache-2.0
 * @gati/runtime - Fine-Grained Reactive DOM Slot Binders
 */

import { effect } from '@gati/reactivity';
import { sanitizeUri, sanitizeCssStyle } from '@gati/security';

const DANGEROUS_ATTR_NAMES = new Set([
  'innerhtml',
  'outerhtml',
  'srcdoc'
]);

const URI_ATTRS = new Set([
  'href',
  'src',
  'action',
  'formaction',
  'xlink:href',
  'data',
  'poster',
  'codebase'
]);

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
  const lowerName = attrName.toLowerCase();

  // Defend against arbitrary inline event handler injection and direct HTML injection via setAttribute
  if (DANGEROUS_ATTR_NAMES.has(lowerName) || lowerName.startsWith('on')) {
    console.warn(`[Gati Security Warning] Refusing to bind dangerous attribute "${attrName}". Use dedicated event bindings or trusted primitives.`);
    return;
  }

  let prevVal: string | null = null;
  let prevNull = true;

  effect(() => {
    let val = getter();
    if (URI_ATTRS.has(lowerName)) {
      val = sanitizeUri(val as string);
    } else if (lowerName === 'style') {
      val = sanitizeCssStyle(val);
    }

    if (val === null || val === undefined || val === false) {
      if (!prevNull) {
        prevNull = true;
        prevVal = null;
        try {
          element.removeAttribute(attrName);
        } catch {
          // Ignore removal errors on mock/detached nodes
        }
      }
    } else {
      const nextStr = String(val);
      if (prevNull || nextStr !== prevVal) {
        prevNull = false;
        prevVal = nextStr;
        try {
          element.setAttribute(attrName, nextStr);
        } catch (err) {
          console.warn(`[Gati Runtime] Failed to set attribute "${attrName}":`, err);
        }
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
