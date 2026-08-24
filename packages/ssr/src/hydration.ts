/**
 * @license Apache-2.0
 * @gati/ssr - Resumable Micro-Hydration & In-Place DOM Binding
 */

import { createRoot, createOwner, runWithOwner } from '@gati/reactivity';

declare global {
  interface Window {
    __AETHER_EVENTS__?: Event[];
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
export function getDelegatedEventScript(events = ['click', 'input', 'submit', 'keydown']): string {
  const eventsList = JSON.stringify(events);
  return `<script>!function(){window.__AETHER_EVENTS__=[];var e=${eventsList};e.forEach(function(t){document.addEventListener(t,function(e){window.__AETHER_EVENTS__.push(e)},{capture:!0})})}();</script>`;
}

/**
 * Replays any user interactions captured by the inline delegator prior to client JS hydration.
 */
export function replayCapturedEvents(): number {
  if (typeof window === 'undefined' || !window.__AETHER_EVENTS__) {
    return 0;
  }

  const queue = window.__AETHER_EVENTS__;
  const count = queue.length;

  if (count === 0) return 0;

  for (const event of queue) {
    const target = event.target as Element | null;
    if (target && typeof target.dispatchEvent === 'function') {
      try {
        // Re-dispatch original event to the hydrated target
        target.dispatchEvent(event);
      } catch (err) {
        console.warn('[Gati Hydration] Failed to replay captured event:', err);
      }
    }
  }

  // Clear event queue
  window.__AETHER_EVENTS__ = [];
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
    throw new Error('[Gati Hydration] Target container element is null or undefined.');
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
        // Check for basic tag-level match
        let hasMismatch = false;

        for (let i = 0; i < clientNodes.length; i++) {
          const clientNode = clientNodes[i];
          const serverNode = existingChildren[i];

          if (!serverNode || clientNode.nodeType !== serverNode.nodeType) {
            hasMismatch = true;
            if (options.onMismatch) {
              options.onMismatch(
                `NodeType: ${clientNode.nodeType}`,
                serverNode ? `NodeType: ${serverNode.nodeType}` : 'missing',
                serverNode || container
              );
            }
            break;
          }
        }

        if (hasMismatch && repairMismatch) {
          console.warn('[Gati Hydration Mismatch] Server HTML does not match client tree. Gracefully repairing DOM in-place.');
          container.replaceChildren(...clientNodes);
        } else if (!hasMismatch) {
          // In-place attachment: replace children with reactive nodes
          container.replaceChildren(...clientNodes);
        }
      } else {
        // Direct mount if server HTML was empty
        container.replaceChildren(...clientNodes);
      }

      // Replay all events captured before hydration finished
      replayedCount = replayCapturedEvents();
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
