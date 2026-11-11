/**
 * @license Apache-2.0
 * @samrey/runtime - Fine-Grained Reactive Element & DOM Tree Constructors
 */

import { bindText, bindAttr, bindClass, bindDynamicChild } from './bindings.js';
import { on } from './events.js';
import {
  URL_ATTRIBUTES,
  SRCSET_ATTRIBUTES,
  sanitizeUri,
  sanitizeSrcset,
  sanitizeCssStyle,
  TrustedTypesPolicy
} from '@samrey/security';
import { effect } from '@samrey/reactivity';
import {
  DANGEROUS_ATTR_NAMES,
  VALID_ATTR_NAME_RE,
  HTML_BOOLEAN_ATTRS,
  sanitizeStaticAttribute,
  createHeadlessElement,
  createHeadlessFragment,
  createHeadlessTextNode
} from './headless-dom.js';

export type ChildValue =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | (() => unknown)
  | ChildValue[];

export type ElementProps = Record<string, unknown>;

const SVG_NS = 'http://www.w3.org/2000/svg';

export function appendChildren(parent: Node, children: ChildValue[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false || child === true) {
      continue;
    }
    if (Array.isArray(child)) {
      appendChildren(parent, child);
    } else if (typeof child === 'function') {
      bindDynamicChild(parent, child as () => unknown);
    } else if (typeof child === 'object' && child !== null && 'nodeType' in child) {
      parent.appendChild(child as Node);
    } else {
      if (typeof document !== 'undefined' && typeof document.createTextNode === 'function') {
        parent.appendChild(document.createTextNode(String(child)));
      } else {
        parent.appendChild(createHeadlessTextNode(String(child)) as unknown as Node);
      }
    }
  }
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attrs?: ElementProps | null,
  ...children: ChildValue[]
): HTMLElementTagNameMap[K] {
  if (typeof document === 'undefined') {
    const attributes: Record<string, string> = {};
    const eventListeners: Record<string, Function[]> = {};
    let deferredBindings: Array<[string, unknown]> | null = null;

    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null) continue;
        if (!VALID_ATTR_NAME_RE.test(k)) continue;
        const lk = k.toLowerCase();
        if (lk === '__proto__' || lk === 'constructor' || lk === 'prototype' || DANGEROUS_ATTR_NAMES.has(lk)) continue;
        if (lk.startsWith('on')) {
          if (typeof v === 'function') {
            const evt = lk.slice(2);
            eventListeners[evt] = eventListeners[evt] || [];
            eventListeners[evt].push(v);
          } else {
            console.warn(`[Samrey Security Warning] Refusing to bind inline event attribute "${k}".`);
          }
          continue;
        }
        if (k.startsWith('class:') || typeof v === 'function') {
          if (!deferredBindings) deferredBindings = [];
          deferredBindings.push([k, v]);
          continue;
        }
        if (v === false) continue;
        const attrName = k === 'className' ? 'class' : k;
        if (v === true) {
          attributes[attrName] = HTML_BOOLEAN_ATTRS.has(lk) ? '' : 'true';
          continue;
        }
        const safeV = sanitizeStaticAttribute(attrName, v);
        if (safeV !== null) {
          attributes[attrName] = safeV;
        }
      }
    }

    const mockElem = createHeadlessElement(tagName, attributes, eventListeners);
    if (deferredBindings) {
      for (let i = 0; i < deferredBindings.length; i++) {
        const [k, v] = deferredBindings[i]!;
        if (k.startsWith('class:')) {
          const clsName = k.slice(6);
          if (typeof v === 'function') {
            bindClass(mockElem as unknown as Element, clsName, v as () => boolean);
          } else if (v) {
            mockElem.classList.add(clsName);
          }
        } else {
          const targetAttr = k === 'className' ? 'class' : k;
          bindAttr(mockElem as unknown as Element, targetAttr, v as () => unknown);
        }
      }
    }
    if (children.length > 0) {
      appendChildren(mockElem as unknown as Node, children);
    }
    return mockElem as unknown as HTMLElementTagNameMap[K];
  }

  const elem = document.createElement(tagName);
  applyAttributes(elem, attrs);
  if (children.length > 0) {
    appendChildren(elem, children);
  }
  return elem;
}

export function svgEl(
  tagName: string,
  attrs?: ElementProps | null,
  ...children: ChildValue[]
): SVGElement {
  if (typeof document === 'undefined') {
    return el(tagName as any, attrs, ...children) as unknown as SVGElement;
  }

  const elem = document.createElementNS(SVG_NS, tagName) as SVGElement;
  applyAttributes(elem, attrs);
  if (children.length > 0) {
    appendChildren(elem, children);
  }
  return elem;
}

export function text(content: string | number | (() => unknown)): Node {
  if (typeof document === 'undefined') {
    if (typeof content === 'function') {
      const node = createHeadlessTextNode('') as unknown as Node;
      bindText(node, content);
      return node;
    }
    return createHeadlessTextNode(String(content)) as unknown as Node;
  }

  if (typeof content === 'function') {
    const textNode = document.createTextNode('');
    bindText(textNode, content);
    return textNode;
  }
  return document.createTextNode(String(content));
}

export const svg = svgEl;
export const fragment = frag;

export function frag(...children: ChildValue[]): DocumentFragment {
  if (typeof document === 'undefined') {
    const mockFrag = createHeadlessFragment();
    if (children.length > 0) {
      appendChildren(mockFrag as unknown as Node, children);
    }
    return mockFrag as unknown as DocumentFragment;
  }

  const fragment = document.createDocumentFragment();
  appendChildren(fragment, children);
  return fragment;
}

export function rawHtml(html: string | (() => string)): Node {
  const sanitize = (str: string) => {
    return TrustedTypesPolicy.createHTML(str);
  };
  if (typeof document === 'undefined') {
    const span = createHeadlessElement('span');
    if (typeof html === 'function') {
      let prev: string | null = null;
      effect(() => {
        const val = html() || '';
        if (val !== prev) {
          prev = val;
          span.innerHTML = val;
        }
      });
    } else {
      span.innerHTML = html || '';
    }
    return span as unknown as Node;
  }

  const span = document.createElement('span');
  if (typeof html === 'function') {
    let prev: string | null = null;
    effect(() => {
      const val = html() || '';
      if (val !== prev) {
        prev = val;
        span.innerHTML = sanitize(val) as unknown as string;
      }
    });
  } else {
    span.innerHTML = sanitize(html || '') as unknown as string;
  }
  return span;
}

function applyAttributes(elem: Element, attrs?: ElementProps | null): void {
  if (!attrs) return;

  for (const [key, val] of Object.entries(attrs)) {
    if (val === undefined || val === null) continue;
    const lowerKey = key.toLowerCase();

    // Defend against arbitrary inline event handler injection and dangerous attributes
    if (lowerKey.startsWith('on')) {
      if (typeof val === 'function') {
        const eventName = key.slice(2).toLowerCase();
        on(elem, eventName, val as (e: Event) => void);
      } else {
        console.warn(`[Samrey Security Warning] Refusing to bind inline event attribute "${key}".`);
      }
      continue;
    }

    if (DANGEROUS_ATTR_NAMES.has(lowerKey)) {
      console.warn(`[Samrey Security Warning] Refusing to set dangerous attribute "${key}".`);
      continue;
    }

    if (key === 'className' || key === 'class') {
      if (typeof val === 'function') {
        bindAttr(elem, 'class', val as () => unknown);
      } else {
        elem.setAttribute('class', String(val));
      }
    } else if (key === 'style') {
      if (typeof val === 'function') {
        bindAttr(elem, 'style', val as () => unknown);
      } else {
        elem.setAttribute('style', sanitizeCssStyle(val));
      }
    } else if (key.startsWith('class:')) {
      const clsName = key.slice(6);
      if (typeof val === 'function') {
        bindClass(elem, clsName, val as () => boolean);
      } else if (val) {
        elem.classList.add(clsName);
      }
    } else if (typeof val === 'function') {
      bindAttr(elem, key, val as () => unknown);
    } else if (typeof val === 'boolean') {
      if (val) {
        elem.setAttribute(key, HTML_BOOLEAN_ATTRS.has(lowerKey) ? '' : 'true');
      }
    } else {
      let finalVal = String(val);
      if (SRCSET_ATTRIBUTES.has(lowerKey)) {
        finalVal = sanitizeSrcset(finalVal);
      } else if (URL_ATTRIBUTES.has(lowerKey)) {
        finalVal = sanitizeUri(finalVal, { allowImageDataUri: true });
      }
      elem.setAttribute(key, finalVal);
    }
  }
}
