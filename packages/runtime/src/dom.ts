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
    const eventListeners: Record<string, Function[]> = {};

    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null) continue;
        const lk = k.toLowerCase();
        if (DANGEROUS_ATTR_NAMES.has(lk)) continue;
        if (lk.startsWith('on')) {
          if (typeof v === 'function') {
            const evt = lk.slice(2);
            eventListeners[evt] = eventListeners[evt] || [];
            eventListeners[evt].push(v);
          }
          continue;
        }
        const resolvedV = typeof v === 'function' ? (v as () => unknown)() : v;
        if (resolvedV === undefined || resolvedV === null || resolvedV === false) continue;
        if (resolvedV === true) {
          attributes[k] = '';
          continue;
        }
        let safeV = String(resolvedV);
        if (URI_ATTRS.has(lk)) safeV = sanitizeUri(safeV);
        else if (lk === 'style') safeV = sanitizeCssStyle(safeV);
        attributes[k] = safeV;
      }
    }

    const childNodes: any[] = [];
    function appendHeadlessChild(child: unknown): void {
      if (child === null || child === undefined || child === false || child === true) {
        return;
      }
      if (Array.isArray(child)) {
        for (const item of child) {
          appendHeadlessChild(item);
        }
        return;
      }
      if (typeof child === 'function') {
        appendHeadlessChild((child as () => unknown)());
        return;
      }
      if (typeof child === 'object' && child !== null && 'nodeType' in child) {
        if ((child as any).nodeType === 11 && Array.isArray((child as any).childNodes)) {
          for (const fragChild of (child as any).childNodes) {
            appendHeadlessChild(fragChild);
          }
          return;
        }
        childNodes.push(child);
        return;
      }
      childNodes.push({ nodeType: 3, nodeName: '#text', textContent: String(child) });
    }

    for (const c of children) {
      appendHeadlessChild(c);
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
        if (newChild && typeof newChild === 'object' && newChild.nodeType === 11 && Array.isArray(newChild.childNodes)) {
          const fragChildren = [...newChild.childNodes];
          for (const ch of fragChildren) {
            mockElem.insertBefore(ch, refChild);
          }
          return newChild;
        }
        if (newChild && typeof newChild === 'object') newChild.parentNode = mockElem;
        const idx = childNodes.indexOf(refChild);
        if (idx !== -1) {
          childNodes.splice(idx, 0, newChild);
        } else {
          childNodes.push(newChild);
        }
        return newChild;
      },
      replaceChild(newChild: any, oldChild: any) {
        const idx = childNodes.indexOf(oldChild);
        if (idx !== -1) {
          if (newChild && typeof newChild === 'object' && newChild.nodeType === 11 && Array.isArray(newChild.childNodes)) {
            const fragChildren = [...newChild.childNodes];
            childNodes.splice(idx, 1, ...fragChildren);
            for (const ch of fragChildren) {
              if (ch && typeof ch === 'object') ch.parentNode = mockElem;
            }
          } else {
            childNodes.splice(idx, 1, newChild);
            if (newChild && typeof newChild === 'object') newChild.parentNode = mockElem;
          }
          if (oldChild && typeof oldChild === 'object') oldChild.parentNode = null;
        } else {
          mockElem.appendChild(newChild);
        }
        return oldChild;
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
        if (child && typeof child === 'object' && child.nodeType === 11 && Array.isArray(child.childNodes)) {
          const fragChildren = [...child.childNodes];
          for (const ch of fragChildren) {
            mockElem.appendChild(ch);
          }
          return child;
        }
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
      get innerHTML() {
        return childNodes.map((ch: any) => {
          if (ch && ch.nodeType === 8) return '';
          if (ch.outerHTML !== undefined) return ch.outerHTML;
          if (ch.innerHTML !== undefined) {
            const chTag = (ch.tagName || ch.nodeName || 'span').toLowerCase();
            return `<${chTag}>${ch.innerHTML}</${chTag}>`;
          }
          if (ch.textContent !== undefined) return escapeHtmlText(ch.textContent);
          return '';
        }).join('');
      },
      set innerHTML(val: string) {
        childNodes.length = 0;
        childNodes.push({
          nodeType: 3,
          nodeName: '#text',
          textContent: String(val),
          outerHTML: String(val)
        });
      },
      get outerHTML() {
        const tag = String(tagName).toLowerCase();
        let attrStr = '';
        for (const [k, v] of Object.entries(attributes)) {
          attrStr += ` ${k}="${escapeHtmlAttribute(v)}"`;
        }
        return `<${tag}${attrStr}>${this.innerHTML}</${tag}>`;
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
    const childNodes: any[] = [];
    function appendHeadless(child: unknown): void {
      if (child === null || child === undefined || child === false || child === true) return;
      if (Array.isArray(child)) {
        for (const item of child) appendHeadless(item);
        return;
      }
      if (typeof child === 'function') {
        appendHeadless((child as () => unknown)());
        return;
      }
      if (typeof child === 'object' && child !== null && 'nodeType' in child) {
        if ((child as any).nodeType === 11 && Array.isArray((child as any).childNodes)) {
          for (const ch of (child as any).childNodes) appendHeadless(ch);
          return;
        }
        childNodes.push(child);
        return;
      }
      childNodes.push({ nodeType: 3, nodeName: '#text', textContent: String(child) });
    }
    for (const c of children) {
      appendHeadless(c);
    }
    const mockFrag: any = {
      nodeType: 11,
      nodeName: '#document-fragment',
      childNodes,
      appendChild(child: any) {
        appendHeadless(child);
        return child;
      },
      insertBefore(newChild: any, refChild: any) {
        const idx = childNodes.indexOf(refChild);
        if (idx !== -1) {
          if (newChild && typeof newChild === 'object' && newChild.nodeType === 11 && Array.isArray(newChild.childNodes)) {
            childNodes.splice(idx, 0, ...newChild.childNodes);
          } else {
            childNodes.splice(idx, 0, newChild);
          }
        } else {
          appendHeadless(newChild);
        }
        return newChild;
      },
      replaceChild(newChild: any, oldChild: any) {
        const idx = childNodes.indexOf(oldChild);
        if (idx !== -1) {
          if (newChild && typeof newChild === 'object' && newChild.nodeType === 11 && Array.isArray(newChild.childNodes)) {
            childNodes.splice(idx, 1, ...newChild.childNodes);
          } else {
            childNodes.splice(idx, 1, newChild);
          }
        } else {
          appendHeadless(newChild);
        }
        return oldChild;
      },
      removeChild(child: any) {
        const idx = childNodes.indexOf(child);
        if (idx !== -1) {
          childNodes.splice(idx, 1);
        }
        return child;
      },
      get innerHTML() {
        return childNodes.map((ch: any) => {
          if (ch && ch.nodeType === 8) return '';
          if (ch.outerHTML !== undefined) return ch.outerHTML;
          if (ch.innerHTML !== undefined) {
            const chTag = (ch.tagName || ch.nodeName || 'span').toLowerCase();
            return `<${chTag}>${ch.innerHTML}</${chTag}>`;
          }
          if (ch.textContent !== undefined) return escapeHtmlText(ch.textContent);
          return '';
        }).join('');
      },
      get outerHTML() {
        return this.innerHTML;
      },
      get textContent() {
        return childNodes.map((ch: any) => ch.textContent ?? '').join('');
      }
    };
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
