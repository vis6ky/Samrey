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
  return `<script${nonceAttr}>!function(){window.__SAMREY_EVENTS__=[];var e=${eventsList},h=function(t){window.__SAMREY_EVENTS__&&window.__SAMREY_EVENTS__.push(t)};e.forEach(function(t){document.addEventListener(t,h,{capture:!0})});window.__SAMREY_EVENTS_CLEANUP__=function(){e.forEach(function(t){document.removeEventListener(t,h,{capture:!0})});delete window.__SAMREY_EVENTS_CLEANUP__}}();</script>`;
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

  if (!window.__SAMREY_EVENTS__) {
    return 0;
  }

  const queue = window.__SAMREY_EVENTS__;
  const count = queue.length;

  if (count === 0) return 0;

  for (const event of queue) {
    let target = event.target as Element | null;
    if (
      target &&
      typeof document !== 'undefined' &&
      typeof document.contains === 'function' &&
      !document.contains(target) &&
      container &&
      typeof container.querySelector === 'function'
    ) {
      try {
        if (target.id) {
          target = container.querySelector(`#${escapeCssIdentifier(target.id)}`) || target;
        } else if (target.className && typeof target.className === 'string') {
          const classes = target.className.trim().split(/\s+/).filter(Boolean);
          if (classes.length > 0) {
            const selector = classes.map((c) => `.${escapeCssIdentifier(c)}`).join('');
            target = container.querySelector(selector) || target;
          }
        } else if (target.tagName) {
          target = container.querySelector(target.tagName.toLowerCase()) || target;
        }
      } catch {
        // Preserve original target if fallback selector cannot be queried
      }
    }
    if (target && typeof target.dispatchEvent === 'function') {
      try {
        target.dispatchEvent(event);
      } catch (err) {
        console.warn('[Samrey Hydration] Failed to replay captured event:', err);
      }
    }
  }

  // Clear event queue
  window.__SAMREY_EVENTS__ = [];
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
    if (n.nodeType === 11 && n.childNodes) {
      for (const child of Array.from(n.childNodes)) {
        visit(child);
      }
      return;
    }
    out.push(n);
    if (
      expandHeadlessMarkers &&
      n.nodeType === 8 &&
      !n.parentNode &&
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
    if (!cNode || cNode.nodeType === 8) {
      cIdx++;
      continue;
    }

    while (sIdx < serverList.length && serverList[sIdx]?.nodeType === 8) {
      sIdx++;
    }

    const sNode = serverList[sIdx];
    if (
      cNode.nodeType === 3 &&
      (!cNode.textContent || cNode.textContent === '') &&
      capture.retargeters.has(cNode) &&
      (!sNode || sNode.nodeType !== 3)
    ) {
      cIdx++;
      continue;
    }

    if (!sNode) {
      onMismatch?.(cNode.tagName?.toUpperCase() || `NodeType: ${cNode.nodeType}`, 'missing', parentForError);
      return false;
    }

    if (cNode.nodeType !== sNode.nodeType) {
      onMismatch?.(
        cNode.tagName?.toUpperCase() || `NodeType: ${cNode.nodeType}`,
        sNode.tagName?.toUpperCase() || `NodeType: ${sNode.nodeType}`,
        sNode
      );
      return false;
    }

    if (cNode.nodeType === 3) {
      cIdx++;
      while (cIdx < clientList.length) {
        const nextC = clientList[cIdx];
        if (!nextC || nextC.nodeType === 8 || nextC.nodeType === 3) {
          cIdx++;
        } else {
          break;
        }
      }
      sIdx++;
      while (sIdx < serverList.length) {
        const nextS = serverList[sIdx];
        if (!nextS || nextS.nodeType === 8 || nextS.nodeType === 3) {
          sIdx++;
        } else {
          break;
        }
      }
      continue;
    }

    if (cNode.nodeType === 1) {
      const cTag = cNode.tagName?.toUpperCase();
      const sTag = sNode.tagName?.toUpperCase();
      if (cTag && sTag && cTag !== sTag) {
        onMismatch?.(cTag, sTag, sNode);
        return false;
      }

      const sChildren = sNode.childNodes ? Array.from(sNode.childNodes) : [];
      const cChildren = cNode.childNodes ? Array.from(cNode.childNodes) : [];
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
    if (sRem && sRem.nodeType !== 8) {
      onMismatch?.('missing', sRem.tagName?.toUpperCase() || `NodeType: ${sRem.nodeType}`, sRem);
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
  if (templateNode && typeof templateNode.cloneNode === 'function') {
    const cloned = templateNode.cloneNode(false);
    cloned.textContent = content;
    cloned.parentNode = null;
    return cloned;
  }
  return { nodeType: 3, nodeName: '#text', textContent: content, parentNode: null, nextSibling: null, previousSibling: null };
}

function hasMoreClientTextInRun(clientList: any[], fromIdx: number): boolean {
  for (let k = fromIdx; k < clientList.length; k++) {
    const n = clientList[k];
    if (!n || n.nodeType === 8) continue;
    return n.nodeType === 3;
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

    while (sIdx < serverList.length && serverList[sIdx]?.nodeType === 8) {
      sIdx++;
    }
    const sNode = serverList[sIdx];

    if (cNode.nodeType === 8) {
      if (serverParent && typeof serverParent.insertBefore === 'function') {
        (cNode as any)[HYDRATING_MARKER_SYMBOL] = true;
        try {
          serverParent.insertBefore(cNode, sNode ?? null);
        } finally {
          delete (cNode as any)[HYDRATING_MARKER_SYMBOL];
        }
      }
      cIdx++;
      continue;
    }

    if (
      cNode.nodeType === 3 &&
      (!cNode.textContent || cNode.textContent === '') &&
      capture.retargeters.has(cNode) &&
      (!sNode || sNode.nodeType !== 3)
    ) {
      const boundTextNode = createHydrationTextNode('', sNode);
      if (serverParent && typeof serverParent.insertBefore === 'function') {
        serverParent.insertBefore(boundTextNode, sNode ?? null);
      }
      retargetNode(cNode, boundTextNode, capture);
      cIdx++;
      continue;
    }

    const matchedServerNode = sNode;
    if (!matchedServerNode) break;

    if (
      cNode.nodeType === 3 &&
      matchedServerNode.nodeType === 3 &&
      hasMoreClientTextInRun(clientList, cIdx + 1)
    ) {
      let nextNonCommentServer: any = null;
      for (let k = sIdx + 1; k < serverList.length; k++) {
        if (serverList[k]?.nodeType !== 8) {
          nextNonCommentServer = serverList[k];
          break;
        }
      }
      const fullText = String(matchedServerNode.textContent ?? '');
      const splitOffset = Math.min(String(cNode.textContent ?? '').length, fullText.length);
      if (splitOffset < fullText.length || !nextNonCommentServer || nextNonCommentServer.nodeType !== 3) {
        let remainderNode: any;
        if (typeof matchedServerNode.splitText === 'function') {
          remainderNode = matchedServerNode.splitText(splitOffset);
        } else {
          matchedServerNode.textContent = fullText.slice(0, splitOffset);
          remainderNode = createHydrationTextNode(fullText.slice(splitOffset), matchedServerNode);
          if (serverParent && typeof serverParent.insertBefore === 'function') {
            serverParent.insertBefore(remainderNode, matchedServerNode.nextSibling ?? serverList[sIdx + 1] ?? null);
          }
        }
        serverList.splice(sIdx + 1, 0, remainderNode);
      }
    }

    retargetNode(cNode, matchedServerNode, capture);

    if (cNode.nodeType === 1) {
      const sChildren = matchedServerNode.childNodes ? Array.from(matchedServerNode.childNodes) : [];
      const cChildren = cNode.childNodes ? Array.from(cNode.childNodes) : [];
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
      const existingChildren = Array.from(container.childNodes);
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
            container.replaceChildren(...mountNodes);
          }
        } else {
          // Non-destructive in-place hydration: keep SSR DOM nodes alive and migrate reactivity & events onto them
          adoptNodeTrees(container, existingChildren, clientNodes, capture);
        }
      } else {
        // Direct mount if server HTML was empty
        container.replaceChildren(...mountNodes);
      }

      // Replay all events captured before hydration finished, targeting container elements
      replayedCount = replayCapturedEvents(container);
    });
  });

  return {
    dispose: () => {
      if (disposeRoot) disposeRoot();
      container.replaceChildren();
    },
    replayedEventsCount: replayedCount
  };
}
