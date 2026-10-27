/**
 * @license Apache-2.0
 * @samrey/runtime - Fine-Grained Reactive DOM Slot Binders
 */

import { effect } from '@samrey/reactivity';
import { sanitizeUri, sanitizeCssStyle } from '@samrey/security';

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
    const nextText = val === null || val === undefined || val === false || val === true ? '' : typeof val === 'object' && 'nodeType' in (val as any) ? '' : String(val);
    if (nextText !== prevText) {
      prevText = nextText;
      node.textContent = nextText;
    }
  });
}

export function bindDynamicChild(parent: Node, getter: () => unknown): void {
  let currentNodes: Node[] = [];
  const marker = typeof document !== 'undefined' && typeof document.createComment === 'function'
    ? document.createComment('samrey:dynamic')
    : ({ nodeType: 8, nodeName: '#comment', parentNode: null } as unknown as Node);

  parent.appendChild(marker);

  effect(() => {
    const val = getter();
    const p = marker.parentNode || parent;

    // Fast path: single text update on existing single text node
    if ((typeof val === 'string' || typeof val === 'number') && currentNodes.length === 1 && currentNodes[0].nodeType === 3) {
      currentNodes[0].textContent = String(val);
      return;
    }

    // Normalize val into Node[]
    let nextNodes: Node[] = [];
    if (val === null || val === undefined || val === false || val === true) {
      nextNodes = [];
    } else if (Array.isArray(val)) {
      for (const item of val) {
        if (item === null || item === undefined || item === false || item === true) continue;
        if (typeof item === 'object' && item !== null && 'nodeType' in item) {
          nextNodes.push(item as Node);
        } else {
          const t = typeof document !== 'undefined' && typeof document.createTextNode === 'function'
            ? document.createTextNode(String(item))
            : ({ nodeType: 3, nodeName: '#text', textContent: String(item) } as unknown as Node);
          nextNodes.push(t);
        }
      }
    } else if (typeof val === 'object' && val !== null && 'nodeType' in (val as any)) {
      nextNodes = [val as Node];
    } else {
      const t = typeof document !== 'undefined' && typeof document.createTextNode === 'function'
        ? document.createTextNode(String(val))
        : ({ nodeType: 3, nodeName: '#text', textContent: String(val) } as unknown as Node);
      nextNodes = [t];
    }

    if (p) {
      for (const oldNode of currentNodes) {
        if (oldNode.parentNode === p && !nextNodes.includes(oldNode)) {
          p.removeChild(oldNode);
        }
      }
      for (let i = 0; i < nextNodes.length; i++) {
        p.insertBefore(nextNodes[i], marker);
      }
    }
    currentNodes = nextNodes;
  });
}

export function bindAttr(element: Element, attrName: string, getter: () => unknown): void {
  const lowerName = attrName.toLowerCase();

  // Defend against arbitrary inline event handler injection and direct HTML injection via setAttribute
  if (DANGEROUS_ATTR_NAMES.has(lowerName) || lowerName.startsWith('on')) {
    console.warn(`[Samrey Security Warning] Refusing to bind dangerous attribute "${attrName}". Use dedicated event bindings or trusted primitives.`);
    return;
  }

  let prevVal: string | null = null;
  let prevNull = true;

  effect(() => {
    let val = getter();

    if (val === null || val === undefined || val === false) {
      if (!prevNull) {
        prevNull = true;
        prevVal = null;
        try {
          element.removeAttribute(attrName);
          if (attrName === 'value' && 'value' in element) {
            (element as any).value = '';
          } else if (attrName === 'checked' && 'checked' in element) {
            (element as any).checked = false;
          }
        } catch {
          // Ignore removal errors on mock/detached nodes
        }
      }
      return;
    }

    if (URI_ATTRS.has(lowerName)) {
      val = sanitizeUri(String(val));
    } else if (lowerName === 'style') {
      val = sanitizeCssStyle(val);
    }

    const nextStr = String(val);
    if (prevNull || nextStr !== prevVal) {
      prevNull = false;
      prevVal = nextStr;
      try {
        element.setAttribute(attrName, nextStr);
        if (attrName === 'value' && 'value' in element) {
          (element as any).value = nextStr;
        } else if (attrName === 'checked' && 'checked' in element) {
          (element as any).checked = Boolean(val);
        }
      } catch (err) {
        console.warn(`[Samrey Runtime] Failed to set attribute "${attrName}":`, err);
      }
    }
  });
}

export const bindAttribute = bindAttr;

export function bindProperty(element: Element, propName: string, getter: () => unknown): void {
  effect(() => {
    (element as any)[propName] = getter();
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

