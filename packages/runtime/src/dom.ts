/**
 * @license Apache-2.0
 * @aether/runtime - Fine-Grained Reactive Element & DOM Tree Constructors
 */

import { bindText, bindAttr, bindClass } from './bindings.js';
import { on } from './events.js';
import { sanitizeHtmlString } from '@aether/security';
import { effect } from '@aether/reactivity';

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
      const fn = child as () => unknown;
      if (typeof document !== 'undefined' && typeof document.createTextNode === 'function') {
        const textNode = document.createTextNode('');
        parent.appendChild(textNode);
        bindText(textNode, fn);
      } else {
        // Mock environment
        const mockText = { nodeType: 3, nodeName: '#text', textContent: '' } as unknown as Node;
        parent.appendChild(mockText);
        bindText(mockText, fn);
      }
    } else if (typeof child === 'object' && child !== null && 'nodeType' in child) {
      parent.appendChild(child as Node);
    } else {
      if (typeof document !== 'undefined' && typeof document.createTextNode === 'function') {
        parent.appendChild(document.createTextNode(String(child)));
      } else {
        parent.appendChild({ nodeType: 3, nodeName: '#text', textContent: String(child) } as unknown as Node);
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
    return {
      nodeType: 1,
      nodeName: tagName.toUpperCase(),
      tagName: tagName.toUpperCase(),
      attributes: {},
      childNodes: [],
      setAttribute: () => {},
      getAttribute: () => null,
      removeAttribute: () => {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
      appendChild: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    } as unknown as HTMLElementTagNameMap[K];
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
    return {
      nodeType: 1,
      nodeName: tagName,
      tagName: tagName,
      attributes: {},
      childNodes: [],
      setAttribute: () => {},
      getAttribute: () => null,
      removeAttribute: () => {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
      appendChild: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    } as unknown as SVGElement;
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
    return { nodeType: 3, nodeName: '#text', textContent: typeof content === 'function' ? '' : String(content) } as unknown as Node;
  }

  if (typeof content === 'function') {
    const textNode = document.createTextNode('');
    bindText(textNode, content);
    return textNode;
  }
  return document.createTextNode(String(content));
}

export function frag(...children: ChildValue[]): DocumentFragment {
  if (typeof document === 'undefined') {
    return { nodeType: 11, nodeName: '#document-fragment', childNodes: [] } as unknown as DocumentFragment;
  }

  const fragment = document.createDocumentFragment();
  appendChildren(fragment, children);
  return fragment;
}

export function rawHtml(html: string | (() => string)): Node {
  if (typeof document === 'undefined') {
    const val = typeof html === 'function' ? html() : html;
    return { nodeType: 1, nodeName: 'SPAN', innerHTML: sanitizeHtmlString(val || '') } as unknown as Node;
  }

  const span = document.createElement('span');
  if (typeof html === 'function') {
    let prev = '';
    effect(() => {
      const val = html();
      if (val !== prev) {
        prev = val;
        span.innerHTML = sanitizeHtmlString(val || '');
      }
    });
  } else {
    span.innerHTML = sanitizeHtmlString(html || '');
  }
  return span;
}

function applyAttributes(elem: Element, attrs?: ElementProps | null): void {
  if (!attrs) return;

  for (const [key, val] of Object.entries(attrs)) {
    if (val === undefined || val === null) continue;

    if (key.startsWith('on') && typeof val === 'function') {
      const eventName = key.slice(2).toLowerCase();
      on(elem, eventName, val as (e: Event) => void);
    } else if (key === 'className' || key === 'class') {
      if (typeof val === 'function') {
        bindAttr(elem, 'class', val as () => unknown);
      } else {
        elem.setAttribute('class', String(val));
      }
    } else if (key === 'style') {
      if (typeof val === 'function') {
        bindAttr(elem, 'style', val as () => unknown);
      } else {
        elem.setAttribute('style', String(val));
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
        elem.setAttribute(key, '');
      }
    } else {
      elem.setAttribute(key, String(val));
    }
  }
}
