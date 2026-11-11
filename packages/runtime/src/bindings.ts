/**
 * @license Apache-2.0
 * @samrey/runtime - Fine-Grained Reactive DOM Slot Binders
 */

import { effect, isHydrationCapturing, recordHydrationRetarget } from '@samrey/reactivity';
import { URL_ATTRIBUTES, SRCSET_ATTRIBUTES, sanitizeUri, sanitizeSrcset, sanitizeCssStyle } from '@samrey/security';
import { createHeadlessTextNode, createHeadlessCommentNode } from './headless-dom.js';

const DANGEROUS_ATTR_NAMES = new Set([
  'innerhtml',
  'outerhtml',
  'srcdoc'
]);

const HTML_BOOLEAN_ATTRS = new Set([
  'disabled', 'checked', 'selected', 'readonly', 'required', 'multiple', 'hidden',
  'open', 'autofocus', 'autoplay', 'controls', 'loop', 'muted', 'novalidate',
  'reversed', 'scoped', 'ismap', 'defer', 'async', 'allowfullscreen', 'default', 'inert'
]);

export function bindText(node: Node, getter: () => unknown): void {
  let targetNode: Node = node;
  if (node && node.nodeType === 8) {
    const textNode = typeof document !== 'undefined' && typeof document.createTextNode === 'function'
      ? document.createTextNode('')
      : (() => {
          const t = createHeadlessTextNode('');
          t.parentNode = node.parentNode;
          return t as unknown as Node;
        })();
    if (node.parentNode) {
      if (typeof node.parentNode.replaceChild === 'function') {
        node.parentNode.replaceChild(textNode, node);
      } else if (typeof node.parentNode.insertBefore === 'function') {
        node.parentNode.insertBefore(textNode, node);
        if (typeof node.parentNode.removeChild === 'function') {
          node.parentNode.removeChild(node);
        }
      }
    }
    targetNode = textNode;
  }

  let prevText: string | null = null;
  effect(() => {
    const val = getter();
    const nextText = val === null || val === undefined || val === false || val === true ? '' : typeof val === 'object' && 'nodeType' in (val as any) ? '' : String(val);
    if (nextText !== prevText) {
      prevText = nextText;
      targetNode.textContent = nextText;
    }
  });
  if (isHydrationCapturing()) {
    recordHydrationRetarget(targetNode as object, (nextNode: Node) => {
      targetNode = nextNode;
      if (prevText !== null && targetNode.textContent !== prevText) {
        targetNode.textContent = prevText;
      }
    });
  }
}

export function bindDynamicChild(parent: Node, getter: () => unknown): void {
  let currentNodes: Node[] = [];
  const marker = typeof document !== 'undefined' && typeof document.createComment === 'function'
    ? document.createComment('samrey:dynamic')
    : (createHeadlessCommentNode('samrey:dynamic') as unknown as Node);

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
    const nextNodes: Node[] = [];
    function pushNormalizedVal(item: unknown): void {
      if (item === null || item === undefined || item === false || item === true) return;
      if (Array.isArray(item)) {
        for (const sub of item) pushNormalizedVal(sub);
        return;
      }
      if (typeof item === 'object' && item !== null && 'nodeType' in (item as any)) {
        const node = item as any;
        if (node.nodeType === 11 && node.childNodes) {
          for (const ch of Array.from(node.childNodes as Node[])) {
            nextNodes.push(ch);
          }
          return;
        }
        nextNodes.push(node as Node);
        return;
      }
      const t = typeof document !== 'undefined' && typeof document.createTextNode === 'function'
        ? document.createTextNode(String(item))
        : (createHeadlessTextNode(String(item)) as unknown as Node);
      nextNodes.push(t);
    }
    pushNormalizedVal(val);

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

    if (isHydrationCapturing() && currentNodes.length > 0) {
      for (let i = 0; i < currentNodes.length; i++) {
        const idx = i;
        recordHydrationRetarget(currentNodes[idx] as object, (adopted: Node) => {
          if (idx < currentNodes.length) {
            currentNodes[idx] = adopted;
          }
        });
      }
    }
  });
}

export function bindAttr(element: Element, attrName: string, getter: () => unknown): void {
  const lowerName = attrName.toLowerCase();

  // Defend against arbitrary inline event handler injection and direct HTML injection via setAttribute
  if (DANGEROUS_ATTR_NAMES.has(lowerName) || lowerName.startsWith('on')) {
    console.warn(`[Samrey Security Warning] Refusing to bind dangerous attribute "${attrName}". Use dedicated event bindings or trusted primitives.`);
    return;
  }

  let targetElem: Element = element;
  let prevVal: string | null = null;
  let prevNull = true;

  const applyAttrValue = (elem: Element, rawVal: unknown, nextStr: string | null, remove: boolean) => {
    try {
      if (remove || nextStr === null) {
        elem.removeAttribute(attrName);
        if (attrName === 'value' && 'value' in elem) {
          (elem as any).value = '';
        } else if (attrName === 'checked' && 'checked' in elem) {
          (elem as any).checked = false;
        }
      } else {
        elem.setAttribute(attrName, nextStr);
        if (attrName === 'value' && 'value' in elem) {
          (elem as any).value = nextStr;
        } else if (attrName === 'checked' && 'checked' in elem) {
          (elem as any).checked = Boolean(rawVal);
        }
      }
    } catch (err) {
      if (!remove) {
        console.warn(`[Samrey Runtime] Failed to set attribute "${attrName}":`, err);
      }
    }
  };

  effect(() => {
    let val = getter();

    if (val === null || val === undefined || val === false) {
      if (!prevNull) {
        prevNull = true;
        prevVal = null;
        applyAttrValue(targetElem, val, null, true);
      }
      return;
    }

    if (SRCSET_ATTRIBUTES.has(lowerName)) {
      val = sanitizeSrcset(String(val));
    } else if (URL_ATTRIBUTES.has(lowerName)) {
      val = sanitizeUri(String(val), { allowImageDataUri: true });
    } else if (lowerName === 'style') {
      val = sanitizeCssStyle(val);
    }

    const nextStr = val === true && HTML_BOOLEAN_ATTRS.has(lowerName) ? '' : String(val);
    if (prevNull || nextStr !== prevVal) {
      prevNull = false;
      prevVal = nextStr;
      applyAttrValue(targetElem, val, nextStr, false);
    }
  });

  if (isHydrationCapturing()) {
    recordHydrationRetarget(element as object, (nextElem: Element) => {
      targetElem = nextElem;
      if (attrName !== 'value' && attrName !== 'checked') {
        if (!prevNull && prevVal !== null && targetElem.getAttribute?.(attrName) !== prevVal) {
          applyAttrValue(targetElem, prevVal, prevVal, false);
        } else if (prevNull && targetElem.hasAttribute?.(attrName)) {
          applyAttrValue(targetElem, null, null, true);
        }
      }
    });
  }
}

export const bindAttribute = bindAttr;

const DANGEROUS_PROP_NAMES = new Set([
  'innerhtml',
  'outerhtml',
  'srcdoc',
  '__proto__',
  'constructor',
  'prototype'
]);

export function bindProperty(element: Element, propName: string, getter: () => unknown): void {
  const lowerProp = propName.toLowerCase();
  if (DANGEROUS_PROP_NAMES.has(lowerProp) || lowerProp.startsWith('on')) {
    console.warn(`[Samrey Security Warning] Refusing to bind dangerous property "${propName}". Use dedicated event bindings or trusted primitives.`);
    return;
  }

  let targetElem: Element = element;
  effect(() => {
    try {
      (targetElem as any)[propName] = getter();
    } catch (err) {
      console.warn(`[Samrey Runtime] Failed to set property "${propName}":`, err);
    }
  });
  if (isHydrationCapturing()) {
    recordHydrationRetarget(element as object, (nextElem: Element) => {
      targetElem = nextElem;
    });
  }
}

export function bindClass(element: Element, className: string, getter: () => boolean): void {
  let targetElem: Element = element;
  let prevActive: boolean | null = null;
  effect(() => {
    const active = Boolean(getter());
    if (active !== prevActive) {
      prevActive = active;
      if (active) {
        targetElem.classList.add(className);
      } else {
        targetElem.classList.remove(className);
      }
    }
  });
  if (isHydrationCapturing()) {
    recordHydrationRetarget(element as object, (nextElem: Element) => {
      targetElem = nextElem;
      if (prevActive === true) {
        targetElem.classList?.add(className);
      } else if (prevActive === false) {
        targetElem.classList?.remove(className);
      }
    });
  }
}

export function bindStyle(element: Element, propertyName: string, getter: () => unknown): void {
  const cssProp = propertyName.startsWith('--')
    ? propertyName
    : propertyName.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

  let targetElem: Element = element;
  let prevVal: string | null = null;

  const applyStyle = (elem: Element, val: string | null) => {
    if (!('style' in elem) || !(elem as any).style) return;
    const s = (elem as any).style;
    if (val === null) {
      if (typeof s.removeProperty === 'function') {
        s.removeProperty(cssProp);
      } else {
        delete s[propertyName];
        delete s[cssProp];
      }
    } else if (typeof s.setProperty === 'function') {
      s.setProperty(cssProp, val);
    } else {
      s[propertyName] = val;
      s[cssProp] = val;
    }
  };

  effect(() => {
    const rawVal = getter();
    if (rawVal === null || rawVal === undefined || rawVal === false) {
      if (prevVal !== null) {
        prevVal = null;
        applyStyle(targetElem, null);
      }
      return;
    }

    const sanitized = sanitizeCssStyle(rawVal).trim();
    if (sanitized !== prevVal) {
      prevVal = sanitized;
      applyStyle(targetElem, sanitized);
    }
  });
  if (isHydrationCapturing()) {
    recordHydrationRetarget(element as object, (nextElem: Element) => {
      targetElem = nextElem;
      if (prevVal !== null) {
        applyStyle(targetElem, prevVal);
      }
    });
  }
}


