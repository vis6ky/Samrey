/**
 * @license Apache-2.0
 * @samrey/ssr - Resumable Micro-Hydration & In-Place DOM Binding
 */

import { createRoot, createOwner, runWithOwner } from '@samrey/reactivity';

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

import { escapeHtmlAttribute } from '@samrey/security';

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
    if (target && typeof document !== 'undefined' && typeof document.contains === 'function' && !document.contains(target) && container && typeof container.querySelector === 'function') {
      if (target.id) {
        target = container.querySelector(`#${target.id}`) || target;
      } else if (target.className && typeof target.className === 'string') {
        const cls = target.className.trim().split(/\s+/).join('.');
        target = container.querySelector(`.${cls}`) || target;
      } else if (target.tagName) {
        target = container.querySelector(target.tagName.toLowerCase()) || target;
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

/**
 * Hydrates an existing server-rendered HTML container in-place with reactive client signals and event listeners.
 * Defends against hydration mismatches and replays pre-hydration user events.
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

      // Instantiate component tree
      const clientNodeOrNodes = componentFn();
      const clientNodes = Array.isArray(clientNodeOrNodes) ? clientNodeOrNodes : [clientNodeOrNodes];

      if (isSsrPresent) {
        // Check for tag-level and node-type match
        let hasMismatch = false;

        if (clientNodes.length !== existingChildren.length) {
          hasMismatch = true;
        } else {
          for (let i = 0; i < clientNodes.length; i++) {
            const clientNode = clientNodes[i];
            const serverNode = existingChildren[i];

            const clientTag = (clientNode as Element).tagName?.toUpperCase();
            const serverTag = (serverNode as Element).tagName?.toUpperCase();

            if (!serverNode || clientNode.nodeType !== serverNode.nodeType || (clientTag && serverTag && clientTag !== serverTag)) {
              hasMismatch = true;
              if (options.onMismatch) {
                options.onMismatch(
                  clientTag || `NodeType: ${clientNode.nodeType}`,
                  serverTag || (serverNode ? `NodeType: ${serverNode.nodeType}` : 'missing'),
                  serverNode || container
                );
              }
              break;
            }
          }
        }

        if (hasMismatch && repairMismatch) {
          console.warn('[Samrey Hydration Mismatch] Server HTML does not match client tree. Gracefully repairing DOM in-place.');
          container.replaceChildren(...clientNodes);
        } else if (!hasMismatch) {
          // In-place attachment: replace children with reactive nodes
          container.replaceChildren(...clientNodes);
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
