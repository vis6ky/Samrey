/**
 * @license Apache-2.0
 * @samrey/runtime - Reactive Control Flow Primitives (<Show>, <For>)
 */

import { effect, createOwner, onCleanup, Owner, runWithOwner, signal, Signal } from '@samrey/reactivity';
import { reportDuplicateKey } from './diagnostics.js';
import { el, text } from './dom.js';
import { createComponent } from './component.js';

export interface ShowProps<T> {
  when: (() => T) | Signal<T> | T;
  fallback?: () => Node | Node[] | null | undefined;
  children: ((item: NonNullable<T>) => Node | Node[] | null | undefined) | Node | Node[];
}

/**
 * Creates a comment marker safely in browser, JSDOM, or synthetic mock environments.
 * Intercepts parentNode assignment to ensure child DOM fragments mount synchronously.
 */
function createControlFlowMarker(name: string, onParentAttached?: (parent: any) => void): Node {
  let marker: any;
  if (typeof document !== 'undefined' && typeof document.createComment === 'function') {
    marker = document.createComment(name);
  } else {
    // Mock node for headless testing
    marker = {
      nodeType: 8, // COMMENT_NODE
      nodeName: '#comment',
      nodeValue: name,
      parentNode: null,
      nextSibling: null,
      previousSibling: null
    };
  }

  let _parent: any = null;
  try {
    Object.defineProperty(marker, 'parentNode', {
      get() {
        return _parent;
      },
      set(newParent: any) {
        _parent = newParent;
        if (newParent && onParentAttached) {
          onParentAttached(newParent);
        }
      },
      configurable: true
    });
  } catch {
    // In environments where DOM comment properties cannot be redefined
  }

  return marker as Node;
}

/**
 * Normalizes a return value (single Node, Node array, or primitive) into Node[].
 */
function normalizeNodes(val: unknown): Node[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    const res: Node[] = [];
    for (let i = 0; i < val.length; i++) {
      const v = val[i];
      if (Array.isArray(v)) {
        res.push(...normalizeNodes(v));
      } else if (v && typeof v === 'object' && 'nodeType' in v) {
        res.push(v as Node);
      } else if (typeof v === 'string' || typeof v === 'number') {
        if (typeof document !== 'undefined' && typeof document.createTextNode === 'function') {
          res.push(document.createTextNode(String(v)));
        } else {
          res.push({ nodeType: 3, nodeName: '#text', textContent: String(v) } as unknown as Node);
        }
      }
    }
    return res;
  }
  if (typeof val === 'object' && val !== null && 'nodeType' in (val as any)) {
    return [val as Node];
  }
  if (typeof val === 'string' || typeof val === 'number') {
    if (typeof document !== 'undefined' && typeof document.createTextNode === 'function') {
      return [document.createTextNode(String(val))];
    }
    return [{ nodeType: 3, nodeName: '#text', textContent: String(val) } as unknown as Node];
  }
  return [];
}

/**
 * <Show> Reactive Conditional Rendering Primitive
 *
 * Conditionally mounts and unmounts DOM subtrees and nested owners based on a reactive condition.
 */
export function Show<T>(props: ShowProps<T>): Node {
  let currentOwner: Owner | null = null;
  let currentNodes: Node[] = [];

  const marker = createControlFlowMarker('samrey:show', (parent) => {
    if (currentNodes.length > 0) {
      const next = marker.nextSibling;
      for (const node of currentNodes) {
        if (node.parentNode !== parent) {
          parent.insertBefore(node, next);
        }
      }
    }
  });

  function removeNodes(): void {
    for (const node of currentNodes) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
    currentNodes = [];
  }

  function insertNodes(nodes: Node[]): void {
    const parent = marker.parentNode;
    if (parent) {
      const nextSibling = marker.nextSibling;
      for (const node of nodes) {
        parent.insertBefore(node, nextSibling);
      }
    } else if (typeof queueMicrotask === 'function') {
      // Fallback microtask for asynchronous mounting
      queueMicrotask(() => {
        if (marker.parentNode && currentNodes === nodes) {
          const p = marker.parentNode;
          const next = marker.nextSibling;
          for (const node of nodes) {
            if (node.parentNode !== p) {
              p.insertBefore(node, next);
            }
          }
        }
      });
    }
  }

  effect(() => {
    const whenProp = props.when;
    const condition = typeof whenProp === 'function' ? (whenProp as () => unknown)() : (whenProp && typeof whenProp === 'object' && 'value' in whenProp) ? (whenProp as { value: unknown }).value : whenProp;
    const isTruthy = Boolean(condition);

    // Clean up previous branch
    if (currentOwner) {
      currentOwner.dispose();
      currentOwner = null;
    }
    removeNodes();

    if (isTruthy) {
      currentOwner = createOwner();
      let rendered: unknown = null;

      runWithOwner(currentOwner, () => {
        if (typeof props.children === 'function') {
          rendered = (props.children as (item: NonNullable<T>) => unknown)(condition as NonNullable<T>);
        } else {
          rendered = props.children;
        }
      });

      const nodes = normalizeNodes(rendered);
      currentNodes = nodes;
      insertNodes(nodes);
    } else if (props.fallback) {
      currentOwner = createOwner();
      let fallbackRendered: unknown = null;

      runWithOwner(currentOwner, () => {
        if (props.fallback) {
          fallbackRendered = props.fallback();
        }
      });

      const nodes = normalizeNodes(fallbackRendered);
      currentNodes = nodes;
      insertNodes(nodes);
    }
  });

  onCleanup(() => {
    if (currentOwner) {
      currentOwner.dispose();
      currentOwner = null;
    }
    removeNodes();
  });

  return marker;
}

export interface ForProps<T, K = unknown> {
  each: (() => readonly T[] | null | undefined) | Signal<readonly T[] | null | undefined> | readonly T[] | null | undefined;
  key?: (item: T, index: number) => K;
  fallback?: () => Node | Node[] | null | undefined;
  children: (item: T, index: () => number) => Node | Node[] | null | undefined;
}

interface KeyedEntry<T> {
  key: unknown;
  item: T;
  nodes: Node[];
  owner: Owner;
  indexSignal: Signal<number>;
}

/**
 * <For> Reactive Keyed List Reconciliation Primitive
 *
 * Reconciles keyed lists with fine-grained DOM node reuse, index signal updates, and owner disposals.
 */
export function For<T, K = unknown>(props: ForProps<T, K>): Node {
  let cache = new Map<unknown, KeyedEntry<T>>();
  let currentEntries: KeyedEntry<T>[] = [];
  let fallbackOwner: Owner | null = null;
  let fallbackNodes: Node[] = [];

  const marker = createControlFlowMarker('samrey:for', (parent) => {
    if (fallbackNodes.length > 0) {
      for (const node of fallbackNodes) {
        if (node.parentNode !== parent) {
          parent.insertBefore(node, marker.nextSibling);
        }
      }
    } else if (currentEntries.length > 0) {
      let next = marker.nextSibling;
      for (const entry of currentEntries) {
        for (const node of entry.nodes) {
          if (node.parentNode !== parent) {
            parent.insertBefore(node, next);
          } else {
            next = node.nextSibling;
          }
        }
      }
    }
  });

  function removeFallback(): void {
    if (fallbackOwner) {
      fallbackOwner.dispose();
      fallbackOwner = null;
    }
    for (const node of fallbackNodes) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
    fallbackNodes = [];
  }

  function renderFallback(): void {
    if (!props.fallback) return;
    removeFallback();

    fallbackOwner = createOwner();
    let rendered: unknown = null;
    runWithOwner(fallbackOwner, () => {
      if (props.fallback) {
        rendered = props.fallback();
      }
    });

    fallbackNodes = normalizeNodes(rendered);
    const parent = marker.parentNode;
    if (parent) {
      for (const node of fallbackNodes) {
        parent.insertBefore(node, marker.nextSibling);
      }
    }
  }

  effect(() => {
    const rawVal = typeof props.each === 'function' ? props.each() : (props.each as any)?.value !== undefined ? (props.each as any).value : props.each;
    const rawItems = rawVal;
    const items = rawItems ? Array.from(rawItems as Iterable<T>) : [];

    if (items.length === 0) {
      // Empty list
      for (const entry of cache.values()) {
        entry.owner.dispose();
        for (const node of entry.nodes) {
          if (node.parentNode) {
            node.parentNode.removeChild(node);
          }
        }
      }
      cache.clear();
      currentEntries = [];
      renderFallback();
      return;
    }

    // Non-empty: remove fallback if present
    removeFallback();

    const newCache = new Map<unknown, KeyedEntry<T>>();
    const newEntries: KeyedEntry<T>[] = [];
    const seenKeys = new Set<unknown>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const key = props.key ? props.key(item, i) : item;

      if (seenKeys.has(key)) {
        reportDuplicateKey(key);
      }
      seenKeys.add(key);

      let entry = cache.get(key);
      if (entry) {
        // Reuse existing entry & update index signal
        entry.indexSignal.value = i;
        entry.item = item;
      } else {
        // Create new entry
        const owner = createOwner();
        const indexSignal = signal(i);
        let rendered: unknown = null;

        runWithOwner(owner, () => {
          rendered = props.children(item, () => indexSignal.value);
        });

        const nodes = normalizeNodes(rendered);
        entry = {
          key,
          item,
          nodes,
          owner,
          indexSignal
        };
      }

      newCache.set(key, entry);
      newEntries.push(entry);
    }

    // Clean up removed items
    for (const [key, oldEntry] of cache.entries()) {
      if (!newCache.has(key)) {
        oldEntry.owner.dispose();
        for (const node of oldEntry.nodes) {
          if (node.parentNode) {
            node.parentNode.removeChild(node);
          }
        }
      }
    }

    // Reconcile DOM positions
    const parent = marker.parentNode;
    if (parent) {
      let currentDomSibling = marker.nextSibling;
      for (let i = 0; i < newEntries.length; i++) {
        const entry = newEntries[i];
        for (const node of entry.nodes) {
          if (node !== currentDomSibling) {
            parent.insertBefore(node, currentDomSibling);
          } else {
            currentDomSibling = currentDomSibling.nextSibling;
          }
        }
      }
    } else if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => {
        if (marker.parentNode) {
          const p = marker.parentNode;
          let currentDomSibling = marker.nextSibling;
          for (let i = 0; i < newEntries.length; i++) {
            const entry = newEntries[i];
            for (const node of entry.nodes) {
              if (node !== currentDomSibling) {
                p.insertBefore(node, currentDomSibling);
              } else {
                currentDomSibling = currentDomSibling.nextSibling;
              }
            }
          }
        }
      });
    }

    cache = newCache;
    currentEntries = newEntries;
  });

  onCleanup(() => {
    removeFallback();
    for (const entry of cache.values()) {
      entry.owner.dispose();
      for (const node of entry.nodes) {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
    }
    cache.clear();
    currentEntries = [];
  });

  return marker;
}

export interface MatchProps<T = unknown> {
  when: () => T;
  children: ((item: NonNullable<T>) => Node | Node[] | null | undefined) | Node | Node[];
}

export interface SwitchProps {
  fallback?: () => Node | Node[] | null | undefined;
  children: unknown;
}

export function Match<T>(props: MatchProps<T>): MatchProps<T> {
  return props;
}

export function Switch(props: SwitchProps): Node {
  const cases = Array.isArray(props.children) ? props.children : [props.children];
  const matchCases = cases.filter((c): c is MatchProps<unknown> => !!c && typeof c === 'object' && 'when' in (c as any));

  return Show({
    when: () => {
      for (const match of matchCases) {
        const val = match.when();
        if (val) return { match, val };
      }
      return null;
    },
    fallback: props.fallback,
    children: (active: { match: MatchProps<unknown>; val: unknown }) => {
      const child = active.match.children;
      return typeof child === 'function' ? (child as (item: unknown) => Node)(active.val) : child;
    }
  });
}

export interface ErrorBoundaryProps {
  fallback: (error: Error, reset: () => void) => Node | Node[] | null | undefined;
  children: () => Node | Node[] | null | undefined;
}

export function ErrorBoundary(props: ErrorBoundaryProps): Node {
  const errorSignal = signal<Error | null>(null);

  const reset = () => {
    errorSignal.value = null;
  };

  return Show({
    when: () => errorSignal.value,
    fallback: () => {
      try {
        return props.children();
      } catch (err: any) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        errorSignal.value = errorObj;
        return props.fallback(errorObj, reset);
      }
    },
    children: (err: Error) => {
      return props.fallback(err, reset);
    }
  });
}

export interface DynamicProps {
  component: string | ((props: any) => Node | Node[]);
  [key: string]: any;
}

export function Dynamic(props: DynamicProps): Node | Node[] {
  const { component, ...rest } = props;
  if (typeof component === 'string') {
    return (props.children ? [el(component as any, rest, props.children)] : [el(component as any, rest)]) as unknown as Node;
  }
  return createComponent(component, rest);
}

export interface PortalProps {
  mount?: HTMLElement;
  children: () => Node | Node[] | null | undefined;
}

export function Portal(props: PortalProps): Node {
  const target = props.mount || (typeof document !== 'undefined' ? document.body : null);
  const rendered = props.children();
  if (target && rendered) {
    if (Array.isArray(rendered)) {
      rendered.forEach((n) => target.appendChild(n));
    } else {
      target.appendChild(rendered);
    }
  }
  return text('');
}

export interface SuspenseProps {
  fallback: () => Node | Node[] | null | undefined;
  children: () => Node | Node[] | null | undefined;
}

export function Suspense(props: SuspenseProps): Node {
  try {
    const res = props.children();
    return (res || text('')) as Node;
  } catch (e) {
    return (props.fallback() || text('')) as Node;
  }
}
