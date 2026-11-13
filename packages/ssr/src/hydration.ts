/**
 * @license Apache-2.0
 * @samrey/ssr - Resumable Micro-Hydration & In-Place DOM Binding
 */

import {
  createRoot,
  createOwner,
  runWithOwner,
  runWithHydrationCapture,
  HydrationCaptureRegistry
} from '@samrey/reactivity';
import { escapeForScriptPayload, escapeHtmlAttribute } from '@samrey/security';
import { escapeCssIdentifier } from './css-escape.js';

declare global {
  interface Window {
    __SAMREY_EVENTS__?: Event[];
    __SAMREY_EVENTS_CLEANUP__?: () => void;
  }
}

export interface HydrateOptions {
  /**
   * Callback invoked if a DOM structure mismatch is detected between SSR HTML and client component.
   */
  onMismatch?: (expectedType: string, actualType: string, element: Node) => void;
  /**
   * If true, recovers from mismatch by replacing the mismatched container children. Defaults to true.
   */
  repairMismatch?: boolean;
}

export interface HydrationResult {
  dispose: () => void;
  replayedEventsCount: number;
}

/**
 * Returns the ultra-lightweight inline event listener script for zero-overhead initial interaction capture.
 * Captures user interactions during the gap between initial HTML paint and client JS initialization.
 */
export function getDelegatedEventScript(events = ['click', 'input', 'submit', 'keydown'], nonce?: string): string {
  const eventsList = escapeForScriptPayload(JSON.stringify(events));
  const nonceAttr = nonce ? ` nonce="${escapeHtmlAttribute(nonce)}"` : '';
  return `<script${nonceAttr}>!function(){Array.isArray(window.__SAMREY_EVENTS__)||(window.__SAMREY_EVENTS__=[]);var a=window.__SAMREY_ACTIVE_EVENTS__=window.__SAMREY_ACTIVE_EVENTS__&&typeof window.__SAMREY_ACTIVE_EVENTS__==="object"?window.__SAMREY_ACTIVE_EVENTS__:{},r=window.__SAMREY_EVENT_REGS__=Array.isArray(window.__SAMREY_EVENT_REGS__)?window.__SAMREY_EVENT_REGS__:[],e=${eventsList},h=function(t){Array.isArray(window.__SAMREY_EVENTS__)&&window.__SAMREY_EVENTS__.push(t)};e.forEach(function(t){if(!Object.prototype.hasOwnProperty.call(a,t)){a[t]=1;document.addEventListener(t,h,{capture:!0});r.push([t,h])}});var c=function(){r.forEach(function(x){document.removeEventListener(x[0],x[1],{capture:!0});delete a[x[0]]});r.length=0;if(window.__SAMREY_EVENTS_CLEANUP__===c)delete window.__SAMREY_EVENTS_CLEANUP__;delete window.__SAMREY_ACTIVE_EVENTS__;delete window.__SAMREY_EVENT_REGS__};window.__SAMREY_EVENTS_CLEANUP__=c}();</script>`;
}

function getSafeProtoValue(node: unknown, prop: string, ctors: Array<unknown>): { found: boolean; value: unknown } {
  if (!node || typeof node !== 'object') return { found: false, value: undefined };
  for (const ctor of ctors) {
    if (typeof ctor === 'function' && node instanceof (ctor as any)) {
      const desc = Object.getOwnPropertyDescriptor((ctor as any).prototype, prop);
      if (desc && typeof desc.get === 'function') {
        try {
          return { found: true, value: desc.get.call(node) };
        } catch {
          // continue to fallback
        }
      }
    }
  }
  return { found: false, value: undefined };
}

function getSafeNodeType(node: unknown): number | null {
  if (!node || typeof node !== 'object') return null;
  const protoRes = getSafeProtoValue(node, 'nodeType', [
    typeof Node !== 'undefined' ? Node : undefined
  ]);
  if (protoRes.found) {
    return typeof protoRes.value === 'number' ? protoRes.value : null;
  }
  const raw = (node as { nodeType?: unknown }).nodeType;
  return typeof raw === 'number' ? raw : null;
}

function getSafeChildNodes(node: unknown): any[] {
  if (!node || typeof node !== 'object') return [];
  const protoRes = getSafeProtoValue(node, 'childNodes', [
    typeof Node !== 'undefined' ? Node : undefined
  ]);
  const rawList = protoRes.found ? protoRes.value : (node as { childNodes?: unknown }).childNodes;
  if (!rawList || typeof rawList !== 'object') return [];
  if (Array.isArray(rawList)) return rawList.slice();
  // Reject clobbered DOM elements (e.g. <select name="childNodes"> is iterable over <option>s!)
  if (getSafeNodeType(rawList) !== null) return [];
  if (typeof (rawList as { length?: unknown }).length === 'number' || Symbol.iterator in rawList) {
    try {
      return Array.from(rawList as ArrayLike<any>);
    } catch {
      return [];
    }
  }
  return [];
}

function getSafeTextContent(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const protoRes = getSafeProtoValue(node, 'textContent', [
    typeof Node !== 'undefined' ? Node : undefined
  ]);
  const raw = protoRes.found ? protoRes.value : (node as { textContent?: unknown }).textContent;
  return typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
}

function setSafeTextContent(node: unknown, value: string): void {
  if (!node || typeof node !== 'object') return;
  if (typeof Node !== 'undefined' && node instanceof Node) {
    const desc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    if (desc && typeof desc.set === 'function') {
      try {
        desc.set.call(node, value);
        return;
      } catch {
        // fallback below
      }
    }
  }
  (node as { textContent: string }).textContent = value;
}

function getSafeParentNode(node: unknown): any {
  if (!node || typeof node !== 'object') return null;
  const protoRes = getSafeProtoValue(node, 'parentNode', [
    typeof Node !== 'undefined' ? Node : undefined
  ]);
  return protoRes.found ? protoRes.value : ((node as { parentNode?: unknown }).parentNode ?? null);
}

function getSafeNextSibling(node: unknown): any {
  if (!node || typeof node !== 'object') return null;
  const protoRes = getSafeProtoValue(node, 'nextSibling', [
    typeof Node !== 'undefined' ? Node : undefined
  ]);
  return protoRes.found ? protoRes.value : ((node as { nextSibling?: unknown }).nextSibling ?? null);
}

function safeQuerySelector(container: unknown, selector: string): Element | null {
  if (!container || typeof container !== 'object') return null;
  if (
    typeof Element !== 'undefined' &&
    container instanceof Element &&
    typeof Element.prototype.querySelector === 'function'
  ) {
    return Element.prototype.querySelector.call(container, selector);
  }
  const fn = (container as { querySelector?: unknown }).querySelector;
  return typeof fn === 'function' ? fn.call(container, selector) : null;
}

function safeInsertBefore(parent: unknown, newNode: unknown, refNode: unknown): void {
  if (!parent || typeof parent !== 'object') return;
  if (
    typeof Node !== 'undefined' &&
    parent instanceof Node &&
    typeof Node.prototype.insertBefore === 'function'
  ) {
    Node.prototype.insertBefore.call(parent, newNode as Node, (refNode as Node | null) ?? null);
    return;
  }
  const fn = (parent as { insertBefore?: unknown }).insertBefore;
  if (typeof fn === 'function') {
    fn.call(parent, newNode, refNode ?? null);
  }
}

function safeReplaceChildren(container: unknown, ...nodes: unknown[]): void {
  if (!container || typeof container !== 'object') return;
  if (
    typeof Element !== 'undefined' &&
    container instanceof Element &&
    typeof Element.prototype.replaceChildren === 'function'
  ) {
    Element.prototype.replaceChildren.call(container, ...(nodes as Array<Node | string>));
    return;
  }
  if (
    typeof DocumentFragment !== 'undefined' &&
    container instanceof DocumentFragment &&
    typeof DocumentFragment.prototype.replaceChildren === 'function'
  ) {
    DocumentFragment.prototype.replaceChildren.call(container, ...(nodes as Array<Node | string>));
    return;
  }
  const fn = (container as { replaceChildren?: unknown }).replaceChildren;
  if (typeof fn === 'function') {
    fn.call(container, ...nodes);
    return;
  }
  // Fallback if replaceChildren was shadowed without native prototype method
  const removeChildFn =
    typeof Node !== 'undefined' && container instanceof Node && typeof Node.prototype.removeChild === 'function'
      ? Node.prototype.removeChild
      : (container as { removeChild?: unknown }).removeChild;
  if (typeof removeChildFn === 'function') {
    for (const child of getSafeChildNodes(container)) {
      removeChildFn.call(container, child);
    }
  }
  for (const node of nodes) {
    safeInsertBefore(container, node, null);
  }
}

function safeSplitText(node: unknown, offset: number): any {
  if (!node || typeof node !== 'object') return null;
  if (
    typeof Text !== 'undefined' &&
    node instanceof Text &&
    typeof Text.prototype.splitText === 'function'
  ) {
    return Text.prototype.splitText.call(node, offset);
  }
  const fn = (node as { splitText?: unknown }).splitText;
  return typeof fn === 'function' ? fn.call(node, offset) : null;
}

function getSafeElementAttribute(el: unknown, attrName: string): string | null {
  if (!el || typeof el !== 'object') return null;
  try {
    if (
      typeof Element !== 'undefined' &&
      el instanceof Element &&
      typeof Element.prototype.getAttribute === 'function'
    ) {
      return Element.prototype.getAttribute.call(el, attrName);
    }
    const rawFn = (el as { getAttribute?: unknown }).getAttribute;
    if (typeof rawFn === 'function') {
      return rawFn.call(el, attrName);
    }
  } catch {
    return null;
  }
  return null;
}

function getSafeElementTagName(el: unknown): string | null {
  if (!el || typeof el !== 'object') return null;
  const nt = getSafeNodeType(el);
  if (nt !== null && nt !== 1) return null;
  try {
    if (typeof Element !== 'undefined' && el instanceof Element) {
      const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'tagName');
      if (desc && typeof desc.get === 'function') {
        const tag = desc.get.call(el);
        if (typeof tag === 'string' && tag.length > 0) return tag;
      }
    }
    const rawTag = (el as { tagName?: unknown }).tagName;
    if (typeof rawTag === 'string' && rawTag.length > 0) return rawTag;
    if (typeof Node !== 'undefined' && el instanceof Node) {
      const nodeDesc = Object.getOwnPropertyDescriptor(Node.prototype, 'nodeName');
      if (nodeDesc && typeof nodeDesc.get === 'function') {
        const nodeName = nodeDesc.get.call(el);
        if (typeof nodeName === 'string' && nodeName.length > 0 && !nodeName.startsWith('#')) {
          return nodeName;
        }
      }
    }
    const rawNodeName = (el as { nodeName?: unknown }).nodeName;
    if (typeof rawNodeName === 'string' && rawNodeName.length > 0 && !rawNodeName.startsWith('#')) {
      return rawNodeName;
    }
  } catch {
    return null;
  }
  return null;
}

function getSafeElementClassName(el: unknown): string | null {
  if (!el || typeof el !== 'object') return null;
  const attrClass = getSafeElementAttribute(el, 'class');
  if (typeof attrClass === 'string') return attrClass;
  const protoCls = getSafeProtoValue(el, 'className', [
    typeof Element !== 'undefined' ? Element : undefined
  ]);
  const cls = protoCls.found ? protoCls.value : (el as { className?: unknown }).className;
  if (typeof cls === 'string') return cls;
  if (cls && typeof cls === 'object' && typeof (cls as { baseVal?: unknown }).baseVal === 'string') {
    return (cls as { baseVal: string }).baseVal;
  }
  return null;
}

/**
 * Replays any user interactions captured by the inline delegator prior to client JS hydration.
 */
export function replayCapturedEvents(container?: HTMLElement): number {
  if (typeof window === 'undefined') {
    return 0;
  }

  if (typeof window.__SAMREY_EVENTS_CLEANUP__ === 'function') {
    try {
      window.__SAMREY_EVENTS_CLEANUP__();
    } catch {
      // Ignore cleanup errors on mocked globals
    }
  }

  if (!Array.isArray(window.__SAMREY_EVENTS__)) {
    return 0;
  }

  // Snapshot and reset queue BEFORE dispatching to prevent re-entrant double replay
  const queue = window.__SAMREY_EVENTS__.slice();
  const count = queue.length;
  window.__SAMREY_EVENTS__ = [];

  if (count === 0) return 0;

  for (const event of queue) {
    if (!event || typeof event !== 'object') continue;
    let target = event.target as Element | null;
    if (
      target &&
      typeof document !== 'undefined' &&
      typeof document.contains === 'function' &&
      !document.contains(target) &&
      container
    ) {
      try {
        const safeId =
          getSafeElementAttribute(target, 'id') ??
          (typeof (target as { id?: unknown }).id === 'string' ? (target as { id: string }).id : null);
        const safeClass = getSafeElementClassName(target);
        const safeTag = getSafeElementTagName(target);
        if (safeId) {
          target = safeQuerySelector(container, `#${escapeCssIdentifier(safeId)}`) || target;
        } else if (safeClass && safeClass.trim()) {
          const classes = safeClass.trim().split(/\s+/).filter(Boolean);
          if (classes.length > 0) {
            const selector = classes.map((c) => `.${escapeCssIdentifier(c)}`).join('');
            target = safeQuerySelector(container, selector) || target;
          }
        } else if (safeTag) {
          target = safeQuerySelector(container, escapeCssIdentifier(safeTag.toLowerCase())) || target;
        }
      } catch {
        // Preserve original target if fallback selector cannot be queried
      }
    }
    const dispatchFn =
      typeof EventTarget !== 'undefined' &&
      target instanceof EventTarget &&
      typeof EventTarget.prototype.dispatchEvent === 'function'
        ? EventTarget.prototype.dispatchEvent
        : target && typeof (target as { dispatchEvent?: unknown }).dispatchEvent === 'function'
          ? (target as { dispatchEvent: (e: Event) => boolean }).dispatchEvent
          : null;
    if (target && dispatchFn) {
      try {
        dispatchFn.call(target, event);
      } catch (err) {
        console.warn('[Samrey Hydration] Failed to replay captured event:', err);
      }
    }
  }

  return count;
}

const HEADLESS_CHILDREN_SYMBOL = Symbol.for('samrey.headlessChildren');
const HYDRATING_MARKER_SYMBOL = Symbol.for('samrey.hydratingMarker');

function flattenClientNodes(input: unknown, expandHeadlessMarkers = true): any[] {
  const out: any[] = [];
  const seen = new Set<object>();
  function visit(node: unknown): void {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    const n = node as any;
    if (typeof n === 'object') {
      if (seen.has(n)) return;
      seen.add(n);
    }
    const nt = getSafeNodeType(n);
    if (nt === 11) {
      for (const child of getSafeChildNodes(n)) {
        visit(child);
      }
      return;
    }
    out.push(n);
    if (
      expandHeadlessMarkers &&
      nt === 8 &&
      !getSafeParentNode(n) &&
      Array.isArray(n[HEADLESS_CHILDREN_SYMBOL])
    ) {
      for (const hChild of n[HEADLESS_CHILDREN_SYMBOL]) {
        visit(hChild);
      }
    }
  }
  visit(input);
  return out;
}

function matchNodeTrees(
  serverList: any[],
  clientRawList: any[],
  parentForError: Node,
  capture: HydrationCaptureRegistry,
  onMismatch?: HydrateOptions['onMismatch']
): boolean {
  const clientList = flattenClientNodes(clientRawList, true);
  let sIdx = 0;
  let cIdx = 0;

  while (cIdx < clientList.length) {
    const cNode = clientList[cIdx];
    const cType = getSafeNodeType(cNode);
    if (!cNode || cType === 8) {
      cIdx++;
      continue;
    }

    while (sIdx < serverList.length && getSafeNodeType(serverList[sIdx]) === 8) {
      sIdx++;
    }

    const sNode = serverList[sIdx];
    const sType = getSafeNodeType(sNode);
    if (
      cType === 3 &&
      getSafeTextContent(cNode) === '' &&
      capture.retargeters.has(cNode) &&
      (!sNode || sType !== 3)
    ) {
      cIdx++;
      continue;
    }

    if (!sNode) {
      onMismatch?.(getSafeElementTagName(cNode)?.toUpperCase() || `NodeType: ${cType}`, 'missing', parentForError);
      return false;
    }

    if (cType !== sType) {
      onMismatch?.(
        getSafeElementTagName(cNode)?.toUpperCase() || `NodeType: ${cType}`,
        getSafeElementTagName(sNode)?.toUpperCase() || `NodeType: ${sType}`,
        sNode
      );
      return false;
    }

    if (cType === 3) {
      cIdx++;
      while (cIdx < clientList.length) {
        const nextC = clientList[cIdx];
        const nextCType = getSafeNodeType(nextC);
        if (!nextC || nextCType === 8 || nextCType === 3) {
          cIdx++;
        } else {
          break;
        }
      }
      sIdx++;
      while (sIdx < serverList.length) {
        const nextS = serverList[sIdx];
        const nextSType = getSafeNodeType(nextS);
        if (!nextS || nextSType === 8 || nextSType === 3) {
          sIdx++;
        } else {
          break;
        }
      }
      continue;
    }

    if (cType === 1) {
      const cTag = getSafeElementTagName(cNode)?.toUpperCase();
      const sTag = getSafeElementTagName(sNode)?.toUpperCase();
      if (!cTag || !sTag || cTag !== sTag) {
        onMismatch?.(cTag || `NodeType: ${cType}`, sTag || `NodeType: ${sType}`, sNode);
        return false;
      }

      const sChildren = getSafeChildNodes(sNode);
      const cChildren = getSafeChildNodes(cNode);
      if (sChildren.length > 0 || cChildren.length > 0) {
        if (!matchNodeTrees(sChildren, cChildren, sNode, capture, onMismatch)) {
          return false;
        }
      }
    }

    sIdx++;
    cIdx++;
  }

  while (sIdx < serverList.length) {
    const sRem = serverList[sIdx];
    const sRemType = getSafeNodeType(sRem);
    if (sRem && sRemType !== 8) {
      onMismatch?.('missing', getSafeElementTagName(sRem)?.toUpperCase() || `NodeType: ${sRemType}`, sRem);
      return false;
    }
    sIdx++;
  }

  return true;
}

function retargetNode(clientNode: object, serverNode: unknown, capture: HydrationCaptureRegistry): void {
  const retargets = capture.retargeters.get(clientNode);
  if (!retargets) return;
  for (const fn of retargets) {
    fn(serverNode);
  }
}

function createHydrationTextNode(content: string, templateNode?: any): any {
  if (typeof document !== 'undefined' && typeof document.createTextNode === 'function') {
    return document.createTextNode(content);
  }
  if (templateNode?.ownerDocument && typeof templateNode.ownerDocument.createTextNode === 'function') {
    return templateNode.ownerDocument.createTextNode(content);
  }
  if (templateNode && getSafeNodeType(templateNode) === 3 && typeof templateNode.cloneNode === 'function') {
    const cloned = templateNode.cloneNode(false);
    setSafeTextContent(cloned, content);
    cloned.parentNode = null;
    return cloned;
  }
  return {
    nodeType: 3,
    nodeName: '#text',
    textContent: content,
    parentNode: null,
    nextSibling: null,
    previousSibling: null,
    cloneNode() {
      return createHydrationTextNode(this.textContent);
    }
  };
}

function hasMoreClientTextInRun(clientList: any[], fromIdx: number): boolean {
  for (let k = fromIdx; k < clientList.length; k++) {
    const n = clientList[k];
    const nt = getSafeNodeType(n);
    if (!n || nt === 8) continue;
    return nt === 3;
  }
  return false;
}

function adoptNodeTrees(
  serverParent: any,
  serverList: any[],
  clientRawList: any[],
  capture: HydrationCaptureRegistry
): void {
  const clientList = flattenClientNodes(clientRawList, true);
  let sIdx = 0;
  let cIdx = 0;

  while (cIdx < clientList.length) {
    const cNode = clientList[cIdx];
    if (!cNode) {
      cIdx++;
      continue;
    }

    while (sIdx < serverList.length && getSafeNodeType(serverList[sIdx]) === 8) {
      sIdx++;
    }
    const sNode = serverList[sIdx];
    const cType = getSafeNodeType(cNode);
    const sType = getSafeNodeType(sNode);

    if (cType === 8) {
      if (serverParent) {
        (cNode as any)[HYDRATING_MARKER_SYMBOL] = true;
        try {
          safeInsertBefore(serverParent, cNode, sNode ?? null);
        } finally {
          delete (cNode as any)[HYDRATING_MARKER_SYMBOL];
        }
      }
      cIdx++;
      continue;
    }

    if (
      cType === 3 &&
      getSafeTextContent(cNode) === '' &&
      capture.retargeters.has(cNode) &&
      (!sNode || sType !== 3)
    ) {
      const boundTextNode = createHydrationTextNode('', sNode);
      if (serverParent) {
        safeInsertBefore(serverParent, boundTextNode, sNode ?? null);
      }
      retargetNode(cNode, boundTextNode, capture);
      cIdx++;
      continue;
    }

    const matchedServerNode = sNode;
    if (!matchedServerNode) break;
    const matchedServerType = getSafeNodeType(matchedServerNode);

    if (
      cType === 3 &&
      matchedServerType === 3 &&
      hasMoreClientTextInRun(clientList, cIdx + 1)
    ) {
      let nextNonCommentServer: any = null;
      for (let k = sIdx + 1; k < serverList.length; k++) {
        if (getSafeNodeType(serverList[k]) !== 8) {
          nextNonCommentServer = serverList[k];
          break;
        }
      }
      const fullText = getSafeTextContent(matchedServerNode);
      const splitOffset = Math.min(getSafeTextContent(cNode).length, fullText.length);
      if (splitOffset < fullText.length || !nextNonCommentServer || getSafeNodeType(nextNonCommentServer) !== 3) {
        let remainderNode = safeSplitText(matchedServerNode, splitOffset);
        if (!remainderNode) {
          setSafeTextContent(matchedServerNode, fullText.slice(0, splitOffset));
          remainderNode = createHydrationTextNode(fullText.slice(splitOffset), matchedServerNode);
          if (serverParent) {
            const nextRef = (sIdx + 1 < serverList.length ? serverList[sIdx + 1] : null) ?? getSafeNextSibling(matchedServerNode) ?? null;
            safeInsertBefore(serverParent, remainderNode, nextRef);
          }
        }
        serverList.splice(sIdx + 1, 0, remainderNode);
      }
    }

    retargetNode(cNode, matchedServerNode, capture);

    if (cType === 1) {
      const sChildren = getSafeChildNodes(matchedServerNode);
      const cChildren = getSafeChildNodes(cNode);
      if (cChildren.length > 0) {
        adoptNodeTrees(matchedServerNode, sChildren, cChildren, capture);
      }
    }

    sIdx++;
    cIdx++;
  }
}

/**
 * Hydrates an existing server-rendered HTML container in-place with reactive client signals and event listeners.
 * Preserves matching server DOM nodes without destructive replacement, repairs structural mismatches when enabled,
 * and replays pre-hydration captured user events.
 */
export function hydrate(
  componentFn: () => Node | Node[],
  container: HTMLElement,
  options: HydrateOptions = {}
): HydrationResult {
  if (!container) {
    throw new Error('[Samrey Hydration] Target container element is null or undefined.');
  }

  const repairMismatch = options.repairMismatch ?? true;
  let disposeRoot: (() => void) | null = null;
  let replayedCount = 0;

  createRoot((dispose) => {
    disposeRoot = dispose;
    const owner = createOwner();

    runWithOwner(owner, () => {
      const existingChildren = getSafeChildNodes(container);
      const isSsrPresent = existingChildren.length > 0;

      // Instantiate component tree while recording retargetable runtime bindings & events
      const { result: clientNodeOrNodes, capture } = runWithHydrationCapture(() => componentFn());
      const clientNodes = flattenClientNodes(clientNodeOrNodes, true);
      const mountNodes = flattenClientNodes(clientNodeOrNodes, false);

      if (isSsrPresent) {
        const matches = matchNodeTrees(existingChildren, clientNodes, container, capture, options.onMismatch);

        if (!matches) {
          if (repairMismatch) {
            console.warn('[Samrey Hydration Mismatch] Server HTML does not match client tree. Gracefully repairing DOM in-place.');
            safeReplaceChildren(container, ...mountNodes);
          }
        } else {
          // Non-destructive in-place hydration: keep SSR DOM nodes alive and migrate reactivity & events onto them
          adoptNodeTrees(container, existingChildren, clientNodes, capture);
        }
      } else {
        // Direct mount if server HTML was empty
        safeReplaceChildren(container, ...mountNodes);
      }

      // Replay all events captured before hydration finished, targeting container elements
      replayedCount = replayCapturedEvents(container);
    });
  });

  return {
    dispose: () => {
      if (disposeRoot) disposeRoot();
      safeReplaceChildren(container);
    },
    replayedEventsCount: replayedCount
  };
}
