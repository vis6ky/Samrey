/**
 * @license Apache-2.0
 * @samrey/runtime - Fine-Grained Reactive Element & DOM Tree Constructors
 */

import { bindText, bindAttr, bindClass, bindDynamicChild } from './bindings.js';
import { on } from './events.js';
import { sanitizeHtmlString } from '@samrey/security';
import { effect } from '@samrey/reactivity';

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
    const attributes: Record<string, string> = {};
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v !== undefined && v !== null && typeof v !== 'function') {
          attributes[k] = String(v);
        }
      }
    }
    const childNodes: any[] = [];
    for (const c of children) {
      if (c === null || c === undefined || c === false || c === true) continue;
      if (Array.isArray(c)) {
        for (const item of c) {
          if (item !== null && item !== undefined) {
            childNodes.push(typeof item === 'object' ? item : { nodeType: 3, nodeName: '#text', textContent: String(item) });
          }
        }
      } else if (typeof c === 'object') {
        childNodes.push(c);
      } else {
        childNodes.push({ nodeType: 3, nodeName: '#text', textContent: String(c) });
      }
    }

    const mockElem: any = {
      nodeType: 1,
      nodeName: String(tagName).toUpperCase(),
      tagName: String(tagName).toUpperCase(),
      attributes,
      childNodes,
      parentNode: null,
      nextSibling: null,
      previousSibling: null,
      setAttribute(k: string, v: string) { attributes[k] = String(v); },
      getAttribute(k: string) { return attributes[k] ?? null; },
      removeAttribute(k: string) { delete attributes[k]; },
      classList: {
        add: (...cls: string[]) => {
          const current = (attributes['class'] || attributes['className'] || '').split(/\s+/).filter(Boolean);
          attributes['class'] = [...new Set([...current, ...cls])].join(' ');
        },
        remove: (...cls: string[]) => {
          const current = (attributes['class'] || attributes['className'] || '').split(/\s+/).filter(Boolean);
          attributes['class'] = current.filter(c => !cls.includes(c)).join(' ');
        },
        toggle: (cls: string) => {
          const current = (attributes['class'] || attributes['className'] || '').split(/\s+/).filter(Boolean);
          if (current.includes(cls)) {
            attributes['class'] = current.filter(c => c !== cls).join(' ');
          } else {
            attributes['class'] = [...current, cls].join(' ');
          }
        },
        contains: (cls: string) => (attributes['class'] || attributes['className'] || '').split(/\s+/).filter(Boolean).includes(cls)
      },
      querySelector: (selector: string) => {
        const selectors = selector.split(',').map(s => s.trim().toUpperCase());
        function find(node: any): any {
          if (!node || !node.childNodes) return null;
          for (const child of node.childNodes) {
            if (child && child.nodeType === 1) {
              if (selectors.includes(child.tagName) || selectors.some(s => s.startsWith('.') && child.classList?.contains(s.slice(1)))) {
                return child;
              }
              const nested = find(child);
              if (nested) return nested;
            }
          }
          return null;
        }
        return find({ childNodes });
      },
      querySelectorAll: (selector: string) => {
        const selectors = selector.split(',').map(s => s.trim().toUpperCase());
        const results: any[] = [];
        function collect(node: any) {
          if (!node || !node.childNodes) return;
          for (const child of node.childNodes) {
            if (child && child.nodeType === 1) {
              if (selectors.includes(child.tagName) || selectors.some(s => s.startsWith('.') && child.classList?.contains(s.slice(1)))) {
                results.push(child);
              }
              collect(child);
            }
          }
        }
        collect({ childNodes });
        return results;
      },
      insertBefore(newChild: any, refChild: any) {
        if (newChild && typeof newChild === 'object') newChild.parentNode = mockElem;
        const idx = childNodes.indexOf(refChild);
        if (idx !== -1) {
          childNodes.splice(idx, 0, newChild);
        } else {
          childNodes.push(newChild);
        }
        return newChild;
      },
      removeChild(child: any) {
        const idx = childNodes.indexOf(child);
        if (idx !== -1) {
          childNodes.splice(idx, 1);
          if (child && typeof child === 'object') child.parentNode = null;
        }
        return child;
      },
      appendChild(child: any) {
        if (child && typeof child === 'object') child.parentNode = mockElem;
        childNodes.push(child);
        return child;
      },
      addEventListener: () => {},
      removeEventListener: () => {},
      focus: () => {},
      blur: () => {},
      click: () => {},
      dispatchEvent: () => true,
      get outerHTML() {
        const tag = String(tagName).toLowerCase();
        let attrStr = '';
        for (const [k, v] of Object.entries(attributes)) {
          attrStr += ` ${k}="${String(v).replace(/"/g, '&quot;')}"`;
        }
        const childrenHtml = childNodes.map((ch: any) => ch.outerHTML ?? ch.textContent ?? '').join('');
        return `<${tag}${attrStr}>${childrenHtml}</${tag}>`;
      },
      get textContent() {
        return childNodes.map((ch: any) => ch.textContent ?? '').join('');
      }
    };

    for (const ch of childNodes) {
      if (ch && typeof ch === 'object') {
        ch.parentNode = mockElem;
      }
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

export const svg = svgEl;
export const fragment = frag;

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
