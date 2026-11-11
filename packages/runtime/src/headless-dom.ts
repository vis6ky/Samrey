/**
 * @license Apache-2.0
 * @samrey/runtime - Internal Headless DOM Implementation & HTML Fragment Parser
 */

import {
  URL_ATTRIBUTES,
  SRCSET_ATTRIBUTES,
  decodeHtmlEntities,
  sanitizeUri,
  sanitizeSrcset,
  sanitizeCssStyle,
  escapeHtmlText,
  escapeHtmlAttribute,
  TrustedTypesPolicy
} from '@samrey/security';

export const DANGEROUS_ATTR_NAMES = new Set(['innerhtml', 'outerhtml', 'srcdoc']);
export const VALID_ATTR_NAME_RE = /^[a-zA-Z_:][a-zA-Z0-9_.:-]*$/;
export const HTML_BOOLEAN_ATTRS = new Set([
  'disabled', 'checked', 'selected', 'readonly', 'required', 'multiple', 'hidden',
  'open', 'autofocus', 'autoplay', 'controls', 'loop', 'muted', 'novalidate',
  'reversed', 'scoped', 'ismap', 'defer', 'async', 'allowfullscreen', 'default', 'inert'
]);
export const HTML_VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

const FOREIGN_ROOT_TAGS = new Set(['svg', 'math']);

/**
 * Validates and sanitizes a static attribute name/value pair for headless elements.
 */
export function sanitizeStaticAttribute(key: string, value: unknown): string | null {
  if (!VALID_ATTR_NAME_RE.test(key)) return null;
  const lk = key.toLowerCase();
  if (lk === '__proto__' || lk === 'constructor' || lk === 'prototype') return null;
  if (DANGEROUS_ATTR_NAMES.has(lk) || lk.startsWith('on')) return null;
  let safeV = String(value);
  if (SRCSET_ATTRIBUTES.has(lk)) safeV = sanitizeSrcset(safeV);
  else if (URL_ATTRIBUTES.has(lk)) safeV = sanitizeUri(safeV, { allowImageDataUri: true });
  else if (lk === 'style') safeV = sanitizeCssStyle(safeV);
  return safeV;
}

function setSiblingLink(node: any, prop: 'nextSibling' | 'previousSibling', val: any): void {
  if (!node || typeof node !== 'object') return;
  const desc = Object.getOwnPropertyDescriptor(node, prop);
  if (desc && !desc.set && (desc.get || desc.writable === false)) return;
  node[prop] = val;
}

export function syncSiblingPointers(nodes: any[], startIdx = 0, endIdx = nodes.length - 1): void {
  const from = Math.max(0, startIdx);
  const to = Math.min(nodes.length - 1, endIdx);
  for (let i = from; i <= to; i++) {
    const ch = nodes[i];
    if (ch && typeof ch === 'object') {
      setSiblingLink(ch, 'previousSibling', i > 0 ? nodes[i - 1] : null);
      setSiblingLink(ch, 'nextSibling', i + 1 < nodes.length ? nodes[i + 1] : null);
    }
  }
}

function detachHeadlessNodes(nodes: any[], ownerNode: any): void {
  for (const ch of nodes) {
    if (ch && typeof ch === 'object') {
      if (ch.parentNode === ownerNode) ch.parentNode = null;
      setSiblingLink(ch, 'previousSibling', null);
      setSiblingLink(ch, 'nextSibling', null);
    }
  }
}

export function createHeadlessContainerMethods(ownerNode: any, childNodes: any[], setParentRef: boolean) {
  function removeChildAt(idx: number): void {
    const node = childNodes[idx];
    if (idx === childNodes.length - 1) {
      childNodes.pop();
    } else {
      childNodes.splice(idx, 1);
    }
    if (idx > 0 && childNodes[idx - 1]) {
      setSiblingLink(childNodes[idx - 1], 'nextSibling', idx < childNodes.length ? childNodes[idx] : null);
    }
    if (idx < childNodes.length && childNodes[idx]) {
      setSiblingLink(childNodes[idx], 'previousSibling', idx > 0 ? childNodes[idx - 1] : null);
    }
    if (node && typeof node === 'object') {
      if (setParentRef) node.parentNode = null;
      setSiblingLink(node, 'previousSibling', null);
      setSiblingLink(node, 'nextSibling', null);
    }
  }

  function detachNode(node: any): void {
    if (!node || typeof node !== 'object') return;
    const prevParent = node.parentNode;
    if (prevParent === ownerNode) {
      const len = childNodes.length;
      const idx = len > 0 && childNodes[len - 1] === node ? len - 1 : childNodes.indexOf(node);
      if (idx !== -1) {
        removeChildAt(idx);
      }
    } else if (prevParent && typeof prevParent.removeChild === 'function') {
      prevParent.removeChild(node);
    }
  }

  function expandNode(child: any): any[] {
    if (child && typeof child === 'object' && child.nodeType === 11 && Array.isArray(child.childNodes)) {
      return [...child.childNodes];
    }
    return [child];
  }

  return {
    insertBefore(newChild: any, refChild: any) {
      if (newChild === refChild && childNodes.includes(newChild)) {
        return newChild;
      }
      let targetRef = refChild;
      if (targetRef === newChild && targetRef && typeof targetRef === 'object') {
        targetRef = targetRef.nextSibling ?? null;
      }
      const items = expandNode(newChild);
      for (const item of items) {
        detachNode(item);
      }
      const idx = targetRef ? childNodes.indexOf(targetRef) : -1;
      const insertStart = idx !== -1 ? idx : childNodes.length;
      if (idx !== -1) {
        childNodes.splice(idx, 0, ...items);
      } else {
        childNodes.push(...items);
      }
      syncSiblingPointers(childNodes, insertStart - 1, insertStart + items.length);
      if (setParentRef) {
        for (const item of items) {
          if (item && typeof item === 'object') item.parentNode = ownerNode;
        }
      }
      return newChild;
    },
    replaceChild(newChild: any, oldChild: any) {
      if (newChild === oldChild) return oldChild;
      const idx = childNodes.indexOf(oldChild);
      if (idx === -1) {
        return ownerNode.appendChild(newChild);
      }
      ownerNode.insertBefore(newChild, oldChild);
      ownerNode.removeChild(oldChild);
      return oldChild;
    },
    removeChild(child: any) {
      const len = childNodes.length;
      const idx = len > 0 && childNodes[len - 1] === child ? len - 1 : childNodes.indexOf(child);
      if (idx !== -1) {
        removeChildAt(idx);
      }
      return child;
    },
    appendChild(child: any) {
      const items = expandNode(child);
      for (const item of items) {
        detachNode(item);
      }
      const insertStart = childNodes.length;
      childNodes.push(...items);
      syncSiblingPointers(childNodes, insertStart - 1, childNodes.length - 1);
      if (setParentRef) {
        for (const item of items) {
          if (item && typeof item === 'object') item.parentNode = ownerNode;
        }
      }
      return child;
    },
    replaceChildren(...nodes: any[]) {
      detachHeadlessNodes(childNodes, ownerNode);
      childNodes.length = 0;
      for (const n of nodes) {
        if (n === null || n === undefined) continue;
        if (typeof n === 'string') {
          ownerNode.appendChild(createHeadlessTextNode(n));
        } else {
          ownerNode.appendChild(n);
        }
      }
    }
  };
}

export function appendHeadlessChildTo(container: any, child: unknown): void {
  if (child === null || child === undefined || child === false || child === true) {
    return;
  }
  if (Array.isArray(child)) {
    for (const item of child) {
      appendHeadlessChildTo(container, item);
    }
    return;
  }
  if (typeof child === 'function') {
    appendHeadlessChildTo(container, (child as () => unknown)());
    return;
  }
  if (typeof child === 'object' && child !== null && 'nodeType' in child) {
    if ((child as any).nodeType === 11 && Array.isArray((child as any).childNodes)) {
      for (const ch of [...(child as any).childNodes]) {
        appendHeadlessChildTo(container, ch);
      }
      return;
    }
    container.appendChild(child);
    return;
  }
  container.appendChild(createHeadlessTextNode(String(child)));
}

export function serializeHeadlessInnerHTML(childNodes: any[]): string {
  return childNodes.map((ch: any) => {
    if (!ch || ch.nodeType === 8) return '';
    if (ch.outerHTML !== undefined) return ch.outerHTML;
    if (ch.innerHTML !== undefined) {
      const chTag = (ch.tagName || ch.nodeName || 'span').toLowerCase();
      return `<${chTag}>${ch.innerHTML}</${chTag}>`;
    }
    if (ch.textContent !== undefined) return escapeHtmlText(ch.textContent);
    return '';
  }).join('');
}

/** Concatenates descendant text content while excluding Comment (8), PI (7), and DocumentType (10) nodes per DOM spec. */
export function serializeHeadlessTextContent(childNodes: any[]): string {
  let out = '';
  for (let i = 0; i < childNodes.length; i++) {
    const ch = childNodes[i];
    if (!ch || ch.nodeType === 8 || ch.nodeType === 7 || ch.nodeType === 10) continue;
    if (ch.textContent !== undefined && ch.textContent !== null) {
      out += ch.textContent;
    }
  }
  return out;
}

export function setHeadlessTextContent(container: any, childNodes: any[], val: string): void {
  detachHeadlessNodes(childNodes, container);
  childNodes.length = 0;
  const str = val === null || val === undefined ? '' : String(val);
  if (str !== '') {
    const textNode = createHeadlessTextNode(str);
    textNode.parentNode = container;
    childNodes.push(textNode);
  }
}

export function createHeadlessTextNode(text: string): any {
  const node: any = {
    nodeType: 3,
    nodeName: '#text',
    textContent: String(text),
    parentNode: null,
    nextSibling: null,
    previousSibling: null,
    cloneNode() {
      return createHeadlessTextNode(node.textContent);
    }
  };
  return node;
}

export function createHeadlessCommentNode(text: string): any {
  const node: any = {
    nodeType: 8,
    nodeName: '#comment',
    nodeValue: text,
    textContent: text,
    parentNode: null,
    nextSibling: null,
    previousSibling: null,
    cloneNode() {
      return createHeadlessCommentNode(node.textContent);
    }
  };
  return node;
}

function getAttrInsensitive(attributes: Record<string, string>, name: string): string | null {
  if (Object.prototype.hasOwnProperty.call(attributes, name)) {
    return attributes[name]!;
  }
  const lower = name.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(attributes, lower)) {
    return attributes[lower]!;
  }
  for (const [k, v] of Object.entries(attributes)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

function matchesCompoundSelector(node: any, compound: string): boolean {
  if (!node || node.nodeType !== 1 || !compound) return false;
  let pos = 0;
  const len = compound.length;

  while (pos < len) {
    const ch = compound[pos]!;
    if (ch === '*') {
      pos++;
      continue;
    }
    if (ch === '#') {
      pos++;
      const start = pos;
      while (pos < len && !/[.#[\s>]/.test(compound[pos]!)) pos++;
      const expectedId = compound.slice(start, pos);
      const actualId = node.getAttribute?.('id') ?? node.id ?? node.attributes?.['id'];
      if (actualId !== expectedId) return false;
      continue;
    }
    if (ch === '.') {
      pos++;
      const start = pos;
      while (pos < len && !/[.#[\s>]/.test(compound[pos]!)) pos++;
      const expectedCls = compound.slice(start, pos);
      if (!node.classList?.contains(expectedCls)) return false;
      continue;
    }
    if (ch === '[') {
      const close = compound.indexOf(']', pos + 1);
      if (close === -1) return false;
      const expr = compound.slice(pos + 1, close).trim();
      const eq = expr.indexOf('=');
      if (eq === -1) {
        if (!node.hasAttribute?.(expr) && node.getAttribute?.(expr) === null) return false;
      } else {
        const attrName = expr.slice(0, eq).trim();
        let expectedVal = expr.slice(eq + 1).trim();
        if (
          (expectedVal.startsWith('"') && expectedVal.endsWith('"')) ||
          (expectedVal.startsWith("'") && expectedVal.endsWith("'"))
        ) {
          expectedVal = expectedVal.slice(1, -1);
        }
        if (node.getAttribute?.(attrName) !== expectedVal) return false;
      }
      pos = close + 1;
      continue;
    }

    const start = pos;
    while (pos < len && !/[.#[\s>]/.test(compound[pos]!)) pos++;
    const tag = compound.slice(start, pos);
    if (tag && node.tagName !== tag.toUpperCase()) return false;
  }

  return true;
}

function tokenizeComplexSelector(selector: string): string[] {
  const parts: string[] = [];
  let i = 0;
  const len = selector.length;
  while (i < len) {
    while (i < len && /\s/.test(selector[i]!)) i++;
    if (i >= len) break;
    if (selector[i] === '>') {
      parts.push('>');
      i++;
      continue;
    }
    const start = i;
    let inBracket = false;
    while (i < len) {
      const ch = selector[i]!;
      if (ch === '[') inBracket = true;
      else if (ch === ']') inBracket = false;
      else if (!inBracket && (/\s/.test(ch) || ch === '>')) break;
      i++;
    }
    parts.push(selector.slice(start, i));
  }
  return parts;
}

export function matchesHeadlessSelector(node: any, selector: string): boolean {
  if (!node || node.nodeType !== 1 || !selector) return false;
  const groups = selector.split(',');
  for (const rawGroup of groups) {
    const tokens = tokenizeComplexSelector(rawGroup.trim());
    if (tokens.length === 0) continue;
    const targetToken = tokens[tokens.length - 1]!;
    if (!matchesCompoundSelector(node, targetToken)) continue;

    let current: any = node;
    let tIdx = tokens.length - 2;
    let matched = true;

    while (tIdx >= 0) {
      const tok = tokens[tIdx]!;
      if (tok === '>') {
        tIdx--;
        const parentToken = tokens[tIdx];
        current = current?.parentNode;
        if (!parentToken || !current || !matchesCompoundSelector(current, parentToken)) {
          matched = false;
          break;
        }
        tIdx--;
        continue;
      }

      let ancestor = current?.parentNode;
      while (ancestor && !matchesCompoundSelector(ancestor, tok)) {
        ancestor = ancestor.parentNode;
      }
      if (!ancestor) {
        matched = false;
        break;
      }
      current = ancestor;
      tIdx--;
    }

    if (matched) return true;
  }
  return false;
}

function findMatchingNodes(rootChildren: any[], selector: string, firstOnly: boolean): any[] {
  const results: any[] = [];
  function visit(nodes: any[]): boolean {
    for (const child of nodes) {
      if (child && child.nodeType === 1) {
        if (matchesHeadlessSelector(child, selector)) {
          results.push(child);
          if (firstOnly) return true;
        }
        if (Array.isArray(child.childNodes) && visit(child.childNodes)) {
          if (firstOnly) return true;
        }
      }
    }
    return false;
  }
  visit(rootChildren);
  return results;
}

export function createHeadlessElement(
  tagName: string,
  initialAttributes: Record<string, string> = {},
  initialEventListeners: Record<string, Function[]> = {}
): any {
  const upperTag = String(tagName).toUpperCase();
  const attributes: Record<string, string> = { ...initialAttributes };
  const eventListeners: Record<string, Function[]> = { ...initialEventListeners };
  const childNodes: any[] = [];
  const style: Record<string, string> = {};

  const mockElem: any = {
    nodeType: 1,
    nodeName: upperTag,
    tagName: upperTag,
    attributes,
    childNodes,
    style,
    value: getAttrInsensitive(attributes, 'value') ?? '',
    checked: getAttrInsensitive(attributes, 'checked') !== null,
    parentNode: null,
    nextSibling: null,
    previousSibling: null,
    get firstChild() { return childNodes[0] ?? null; },
    get lastChild() { return childNodes.length > 0 ? childNodes[childNodes.length - 1] : null; },
    get id() { return getAttrInsensitive(attributes, 'id') ?? ''; },
    set id(val: string) { attributes['id'] = String(val ?? ''); },
    get className() { return getAttrInsensitive(attributes, 'class') ?? attributes['className'] ?? ''; },
    set className(val: string) { attributes['class'] = String(val ?? ''); },
    setAttribute(k: string, v: string) {
      const safeV = sanitizeStaticAttribute(k, v);
      if (safeV !== null) {
        attributes[k] = safeV;
        const lk = k.toLowerCase();
        if (lk === 'value') mockElem.value = safeV;
        if (lk === 'checked') mockElem.checked = true;
      }
    },
    getAttribute(k: string) {
      return getAttrInsensitive(attributes, k);
    },
    hasAttribute(k: string) {
      return getAttrInsensitive(attributes, k) !== null;
    },
    removeAttribute(k: string) {
      delete attributes[k];
      const lower = k.toLowerCase();
      for (const existing of Object.keys(attributes)) {
        if (existing.toLowerCase() === lower) {
          delete attributes[existing];
        }
      }
      if (lower === 'checked') mockElem.checked = false;
    },
    classList: {
      add: (...cls: string[]) => {
        const current = (attributes['class'] || attributes['className'] || '').split(/\s+/).filter(Boolean);
        attributes['class'] = [...new Set([...current, ...cls])].join(' ');
      },
      remove: (...cls: string[]) => {
        const current = (attributes['class'] || attributes['className'] || '').split(/\s+/).filter(Boolean);
        attributes['class'] = current.filter(c => !cls.includes(c)).join(' ');
      },
      toggle: (cls: string, force?: boolean) => {
        const current = (attributes['class'] || attributes['className'] || '').split(/\s+/).filter(Boolean);
        const has = current.includes(cls);
        const nextHas = force !== undefined ? force : !has;
        if (nextHas && !has) {
          attributes['class'] = [...current, cls].join(' ');
        } else if (!nextHas && has) {
          attributes['class'] = current.filter(c => c !== cls).join(' ');
        }
        return nextHas;
      },
      contains: (cls: string) =>
        (attributes['class'] || attributes['className'] || '').split(/\s+/).filter(Boolean).includes(cls)
    },
    matches: (selector: string) => matchesHeadlessSelector(mockElem, selector),
    querySelector: (selector: string) => findMatchingNodes(childNodes, selector, true)[0] ?? null,
    querySelectorAll: (selector: string) => findMatchingNodes(childNodes, selector, false),
    addEventListener: (type: string, fn: Function) => {
      const evt = type.toLowerCase();
      eventListeners[evt] = eventListeners[evt] || [];
      eventListeners[evt].push(fn);
    },
    removeEventListener: (type: string, fn: Function) => {
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
      return serializeHeadlessInnerHTML(childNodes);
    },
    set innerHTML(val: string) {
      const safeHtml = TrustedTypesPolicy.createHTML(String(val ?? ''));
      detachHeadlessNodes(childNodes, mockElem);
      childNodes.length = 0;
      const textNode = {
        nodeType: 3,
        nodeName: '#text',
        textContent: safeHtml,
        outerHTML: safeHtml,
        parentNode: mockElem,
        previousSibling: null,
        nextSibling: null,
        cloneNode() {
          return { ...this, parentNode: null, previousSibling: null, nextSibling: null };
        }
      };
      childNodes.push(textNode);
    },
    get outerHTML() {
      const tag = upperTag.toLowerCase();
      let attrStr = '';
      for (const [k, v] of Object.entries(attributes)) {
        attrStr += ` ${k}="${escapeHtmlAttribute(v)}"`;
      }
      if (HTML_VOID_TAGS.has(tag)) {
        return `<${tag}${attrStr}>`;
      }
      return `<${tag}${attrStr}>${this.innerHTML}</${tag}>`;
    },
    get textContent() {
      return serializeHeadlessTextContent(childNodes);
    },
    set textContent(val: string) {
      setHeadlessTextContent(mockElem, childNodes, val);
    },
    cloneNode(deep = false) {
      const cloned = createHeadlessElement(tagName, attributes);
      Object.assign(cloned.style, style);
      cloned.value = mockElem.value;
      cloned.checked = mockElem.checked;
      if (deep) {
        for (const ch of childNodes) {
          const chClone = typeof ch.cloneNode === 'function' ? ch.cloneNode(true) : { ...ch, parentNode: null };
          cloned.appendChild(chClone);
        }
      }
      return cloned;
    }
  };

  Object.assign(mockElem, createHeadlessContainerMethods(mockElem, childNodes, true));
  return mockElem;
}

export function createHeadlessFragment(): any {
  const childNodes: any[] = [];
  const mockFrag: any = {
    nodeType: 11,
    nodeName: '#document-fragment',
    childNodes,
    get firstChild() { return childNodes[0] ?? null; },
    get lastChild() { return childNodes.length > 0 ? childNodes[childNodes.length - 1] : null; },
    querySelector: (selector: string) => findMatchingNodes(childNodes, selector, true)[0] ?? null,
    querySelectorAll: (selector: string) => findMatchingNodes(childNodes, selector, false),
    get innerHTML() {
      return serializeHeadlessInnerHTML(childNodes);
    },
    get outerHTML() {
      return this.innerHTML;
    },
    get textContent() {
      return serializeHeadlessTextContent(childNodes);
    },
    set textContent(val: string) {
      setHeadlessTextContent(mockFrag, childNodes, val);
    },
    cloneNode(deep = false) {
      const cloned = createHeadlessFragment();
      if (deep) {
        for (const ch of childNodes) {
          const chClone = typeof ch.cloneNode === 'function' ? ch.cloneNode(true) : { ...ch, parentNode: null };
          cloned.appendChild(chClone);
        }
      }
      return cloned;
    }
  };
  Object.assign(mockFrag, createHeadlessContainerMethods(mockFrag, childNodes, true));
  return mockFrag;
}

/**
 * Parses an HTML template string into a connected headless DocumentFragment tree.
 * Handles HTML comments, declarations, void tags, foreign SVG/MathML self-closing elements,
 * textarea RCDATA, quoted/unquoted/boolean attributes, and HTML entities.
 */
export function parseHtmlToHeadlessFragment(html: string): any {
  const fragment = createHeadlessFragment();
  const stack: Array<{ node: any; tag: string; isForeign: boolean }> = [
    { node: fragment, tag: '#fragment', isForeign: false }
  ];
  const len = html.length;
  let i = 0;

  while (i < len) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      const txt = decodeHtmlEntities(html.slice(i));
      if (txt.length > 0) {
        stack[stack.length - 1]!.node.appendChild(createHeadlessTextNode(txt));
      }
      break;
    }

    if (lt > i) {
      const txt = decodeHtmlEntities(html.slice(i, lt));
      if (txt.length > 0) {
        stack[stack.length - 1]!.node.appendChild(createHeadlessTextNode(txt));
      }
    }

    if (html.startsWith('<!--', lt)) {
      const closeIdx = html.indexOf('-->', lt + 4);
      const commentEnd = closeIdx === -1 ? len : closeIdx;
      const commentBody = html.slice(lt + 4, commentEnd);
      stack[stack.length - 1]!.node.appendChild(createHeadlessCommentNode(commentBody));
      i = closeIdx === -1 ? len : closeIdx + 3;
      continue;
    }

    if (html.startsWith('</', lt)) {
      const gt = html.indexOf('>', lt + 2);
      const closeTag = html.slice(lt + 2, gt === -1 ? len : gt).trim().toLowerCase();
      if (closeTag) {
        for (let s = stack.length - 1; s >= 1; s--) {
          if (stack[s]!.tag === closeTag) {
            stack.length = s;
            break;
          }
        }
      }
      i = gt === -1 ? len : gt + 1;
      continue;
    }

    if (html[lt + 1] === '!' || html[lt + 1] === '?') {
      const gt = html.indexOf('>', lt + 2);
      i = gt === -1 ? len : gt + 1;
      continue;
    }

    const firstTagCh = html[lt + 1];
    if (!firstTagCh || !/[a-zA-Z]/.test(firstTagCh)) {
      stack[stack.length - 1]!.node.appendChild(createHeadlessTextNode('<'));
      i = lt + 1;
      continue;
    }

    let j = lt + 2;
    while (j < len && /[a-zA-Z0-9-]/.test(html[j]!)) j++;
    const lowerTag = html.slice(lt + 1, j).toLowerCase();
    const elem = createHeadlessElement(lowerTag);
    let selfClosing = false;

    while (j < len) {
      while (j < len && /\s/.test(html[j]!)) j++;
      if (j >= len) break;

      if (html[j] === '/' && html[j + 1] === '>') {
        selfClosing = true;
        j += 2;
        break;
      }
      if (html[j] === '>') {
        j++;
        break;
      }

      const attrStart = j;
      while (j < len && !/[\s=/>]/.test(html[j]!)) j++;
      const attrName = html.slice(attrStart, j);
      if (!attrName) {
        j++;
        continue;
      }

      while (j < len && /\s/.test(html[j]!)) j++;
      let attrVal = '';
      if (html[j] === '=') {
        j++;
        while (j < len && /\s/.test(html[j]!)) j++;
        const q = html[j];
        if (q === '"' || q === "'") {
          j++;
          const valStart = j;
          while (j < len && html[j] !== q) j++;
          attrVal = decodeHtmlEntities(html.slice(valStart, j));
          if (html[j] === q) j++;
        } else {
          const valStart = j;
          while (j < len && !/[\s>]/.test(html[j]!) && !(html[j] === '/' && html[j + 1] === '>')) {
            j++;
          }
          attrVal = decodeHtmlEntities(html.slice(valStart, j));
        }
      }

      elem.setAttribute(attrName.toLowerCase(), attrVal);
    }

    stack[stack.length - 1]!.node.appendChild(elem);

    const parentForeign = stack[stack.length - 1]!.isForeign;
    const isForeignElem = parentForeign || FOREIGN_ROOT_TAGS.has(lowerTag);

    if (lowerTag === 'textarea' && !selfClosing) {
      const rest = html.slice(j);
      const closeMatch = /<\/textarea\s*>/i.exec(rest);
      if (closeMatch) {
        const rawText = decodeHtmlEntities(rest.slice(0, closeMatch.index));
        if (rawText.length > 0) {
          elem.appendChild(createHeadlessTextNode(rawText));
        }
        j += closeMatch.index + closeMatch[0].length;
        i = j;
        continue;
      }
    }

    if (!HTML_VOID_TAGS.has(lowerTag) && !(isForeignElem && selfClosing)) {
      stack.push({ node: elem, tag: lowerTag, isForeign: isForeignElem });
    }
    i = j;
  }

  return fragment;
}

