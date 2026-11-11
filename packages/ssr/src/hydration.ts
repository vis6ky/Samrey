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
import { escapeHtmlAttribute } from '@samrey/security';
import { escapeCssIdentifier } from './css-escape.js';

declare global {
  interface Window {
    __SAMREY_EVENTS__?: Event[];
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
  const eventsList = JSON.stringify(events);
  const nonceAttr = nonce ? ` nonce="${escapeHtmlAttribute(nonce)}"` : '';
  return `<script${nonceAttr}>!function(){window.__SAMREY_EVENTS__=[];var e=${eventsList};e.forEach(function(t){document.addEventListener(t,function(e){window.__SAMREY_EVENTS__.push(e)},{capture:!0})})}();</script>`;
}

/**
 * Replays any user interactions captured by the inline delegator prior to client JS hydration.
 */
export function replayCapturedEvents(container?: HTMLElement): number {
  if (typeof window === 'undefined' || !window.__SAMREY_EVENTS__) {
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

function matchNodeTrees(
  serverList: any[],
  clientList: any[],
  parentForError: Node,
  capture: HydrationCaptureRegistry,
  onMismatch?: HydrateOptions['onMismatch']
): boolean {
  let sIdx = 0;
  let cIdx = 0;

  while (cIdx < clientList.length) {
    const cNode = clientList[cIdx];
    if (!cNode || cNode.nodeType === 8) {
      cIdx++;
      continue;
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

    if (sNode.nodeType === 8) {
      sIdx++;
      continue;
    }

    if (cNode.nodeType !== sNode.nodeType) {
      onMismatch?.(
        cNode.tagName?.toUpperCase() || `NodeType: ${cNode.nodeType}`,
        sNode.tagName?.toUpperCase() || `NodeType: ${sNode.nodeType}`,
        sNode
      );
      return false;
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

function adoptNodeTrees(
  serverParent: any,
  serverList: any[],
  clientList: any[],
  capture: HydrationCaptureRegistry
): void {
  let sIdx = 0;
  let cIdx = 0;

  while (cIdx < clientList.length) {
    const cNode = clientList[cIdx];
    const sNode = serverList[sIdx];

    if (!cNode) {
      cIdx++;
      continue;
    }

    if (cNode.nodeType === 8) {
      if (serverParent && typeof serverParent.insertBefore === 'function') {
        serverParent.insertBefore(cNode, sNode ?? null);
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
      const boundTextNode = typeof document !== 'undefined' && typeof document.createTextNode === 'function'
        ? document.createTextNode('')
        : cNode;
      if (serverParent && typeof serverParent.insertBefore === 'function') {
        serverParent.insertBefore(boundTextNode, sNode ?? null);
      }
      retargetNode(cNode, boundTextNode, capture);
      cIdx++;
      continue;
    }

    while (sIdx < serverList.length && serverList[sIdx]?.nodeType === 8) {
      sIdx++;
    }
    const matchedServerNode = serverList[sIdx];
    if (!matchedServerNode) break;

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
      const clientNodes = Array.isArray(clientNodeOrNodes) ? clientNodeOrNodes : [clientNodeOrNodes];

      if (isSsrPresent) {
        const matches = matchNodeTrees(existingChildren, clientNodes, container, capture, options.onMismatch);

        if (!matches) {
          if (repairMismatch) {
            console.warn('[Samrey Hydration Mismatch] Server HTML does not match client tree. Gracefully repairing DOM in-place.');
            container.replaceChildren(...clientNodes);
          }
        } else {
          // Non-destructive in-place hydration: keep SSR DOM nodes alive and migrate reactivity & events onto them
          adoptNodeTrees(container, existingChildren, clientNodes, capture);
        }
      } else {
        // Direct mount if server HTML was empty
        container.replaceChildren(...clientNodes);
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
