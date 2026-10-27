/**
 * @license Apache-2.0
 * @samrey/runtime - Fine-Grained Reactive Element & DOM Tree Constructors
 */

import { bindText, bindAttr, bindClass, bindDynamicChild } from './bindings.js';
import { on } from './events.js';
import { sanitizeHtmlString, sanitizeUri, sanitizeCssStyle, escapeHtmlText, escapeHtmlAttribute, TrustedTypesPolicy } from '@samrey/security';
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
const DANGEROUS_ATTR_NAMES = new Set(['innerhtml', 'outerhtml', 'srcdoc']);
const URI_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'poster', 'codebase']);

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
          const lk = k.toLowerCase();
          if (DANGEROUS_ATTR_NAMES.has(lk) || lk.startsWith('on')) continue;
          let safeV = String(v);
          if (URI_ATTRS.has(lk)) safeV = sanitizeUri(safeV);
          else if (lk === 'style') safeV = sanitizeCssStyle(safeV);
          attributes[k] = safeV;
        }
      }
    }
    const childNodes: any[] = [];
    for (const c of children) {
      if (c === null || c === undefined || c === false || c === true) continue;
      const resolved = typeof c === 'function' ? (c as () => unknown)() : c;
      if (resolved === null || resolved === undefined || resolved === false || resolved === true) continue;
      if (Array.isArray(resolved)) {
        for (const item of resolved) {
          if (item !== null && item !== undefined && item !== false && item !== true) {
            childNodes.push(typeof item === 'object' && item !== null && 'nodeType' in item ? item : { nodeType: 3, nodeName: '#text', textContent: String(item) });
          }
        }
      } else if (typeof resolved === 'object' && resolved !== null && 'nodeType' in resolved) {
        childNodes.push(resolved);
      } else {
        childNodes.push({ nodeType: 3, nodeName: '#text', textContent: String(resolved) });
      }
    }

    const eventListeners: Record<string, Function[]> = {};
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (typeof v === 'function' && k.startsWith('on')) {
          const evt = k.slice(2).toLowerCase();
          eventListeners[evt] = eventListeners[evt] || [];
          eventListeners[evt].push(v);
        }
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
        const rawSelectors = selector.split(',').map(s => s.trim());
        function matchNode(child: any): boolean {
          for (const s of rawSelectors) {
            if (s.startsWith('#')) {
              const id = s.slice(1);
              if (child.getAttribute?.('id') === id || child.id === id || child.attributes?.['id'] === id) return true;
            } else if (s.startsWith('.')) {
              const cls = s.slice(1);
              if (child.classList?.contains(cls)) return true;
            } else if (child.tagName === s.toUpperCase()) {
              return true;
            }
          }
          return false;
        }

        function find(node: any): any {
          if (!node || !node.childNodes) return null;
          for (const child of node.childNodes) {
            if (child && child.nodeType === 1) {
              if (matchNode(child)) {
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
        const rawSelectors = selector.split(',').map(s => s.trim());
        const results: any[] = [];
        function matchNode(child: any): boolean {
          for (const s of rawSelectors) {
            if (s.startsWith('#')) {
              const id = s.slice(1);
              if (child.getAttribute?.('id') === id || child.id === id || child.attributes?.['id'] === id) return true;
            } else if (s.startsWith('.')) {
              const cls = s.slice(1);
              if (child.classList?.contains(cls)) return true;
            } else if (child.tagName === s.toUpperCase()) {
              return true;
            }
          }
          return false;
        }

        function collect(node: any) {
          if (!node || !node.childNodes) return;
          for (const child of node.childNodes) {
            if (child && child.nodeType === 1) {
              if (matchNode(child)) {
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
      addEventListener: (type: string, fn: any) => {
        const evt = type.toLowerCase();
        eventListeners[evt] = eventListeners[evt] || [];
        eventListeners[evt].push(fn);
      },
      removeEventListener: (type: string, fn: any) => {
        const evt = type.toLowerCase();
        if (eventListeners[evt]) {
          eventListeners[evt] = eventListeners[evt].filter(f => f !== fn);
        }
      },
      focus: () => {},
      blur: () => {},
      click: () => {
        const handlers = eventListeners['click'] || [];
        for (const handler of handlers) {
          handler({ type: 'click', target: mockElem, currentTarget: mockElem, preventDefault: () => {} });
        }
      },
      dispatchEvent: (e: any) => {
        const type = (e?.type || '').toLowerCase();
        const handlers = eventListeners[type] || [];
        for (const handler of handlers) {
          handler(e);
        }
        return true;
      },
      get outerHTML() {
        const tag = String(tagName).toLowerCase();
        let attrStr = '';
        for (const [k, v] of Object.entries(attributes)) {
          attrStr += ` ${k}="${escapeHtmlAttribute(v)}"`;
        }
        const childrenHtml = childNodes.map((ch: any) => {
          if (ch.outerHTML !== undefined) return ch.outerHTML;
          if (ch.textContent !== undefined) return escapeHtmlText(ch.textContent);
          return '';
        }).join('');
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
  const sanitize = (str: string) => {
    return TrustedTypesPolicy.createHTML(str);
  };
  if (typeof document === 'undefined') {
    const val = typeof html === 'function' ? html() : html;
    return { nodeType: 1, nodeName: 'SPAN', innerHTML: sanitize(val || '') } as unknown as Node;
  }

  const span = document.createElement('span');
  if (typeof html === 'function') {
    let prev = '';
    effect(() => {
      const val = html();
      if (val !== prev) {
        prev = val;
        span.innerHTML = sanitize(val || '') as unknown as string;
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
        elem.setAttribute(key, '');
      }
    } else {
      let finalVal = String(val);
      if (URI_ATTRS.has(lowerKey)) {
        finalVal = sanitizeUri(finalVal);
      }
      elem.setAttribute(key, finalVal);
    }
  }
}
