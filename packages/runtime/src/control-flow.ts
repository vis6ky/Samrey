/**
 * @license Apache-2.0
 * @samrey/runtime - Reactive Control Flow Primitives (<Show>, <For>)
 */

import { effect, createOwner, getOwner, onCleanup, onError, Owner, runWithOwner, signal, Signal, untrack, isStore } from '@samrey/reactivity';
import { reportDuplicateKey, reportStaleItemWarning, isDev } from './diagnostics.js';
import { el, text } from './dom.js';
import { escapeHtmlText } from '@samrey/security';
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
  if (typeof document !== 'undefined' && typeof document.createComment === 'function') {
    return document.createComment(name);
  }

  // Mock node for headless testing
  const marker: any = {
    nodeType: 8, // COMMENT_NODE
    nodeName: '#comment',
    nodeValue: name,
    parentNode: null,
    nextSibling: null,
    previousSibling: null
  };

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
  const outerOwner = getOwner();
  let currentOwner: Owner | null = null;
  let currentNodes: Node[] = [];
  let prevTruthy: boolean | null = null;

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
    }
  }

  effect(() => {
    const whenProp = props.when;
    const condition = typeof whenProp === 'function' ? (whenProp as () => unknown)() : (whenProp && typeof whenProp === 'object' && 'value' in whenProp) ? (whenProp as { value: unknown }).value : whenProp;
    const isTruthy = Boolean(condition);

    if (isTruthy === prevTruthy) {
      return;
    }
    prevTruthy = isTruthy;

    // Clean up previous branch
    if (currentOwner) {
      currentOwner.dispose();
      currentOwner = null;
    }
    removeNodes();

    if (isTruthy) {
      currentOwner = createOwner(outerOwner);
      const condVal = condition as NonNullable<T>;
      let rendered: unknown = null;

      untrack(() => {
        runWithOwner(currentOwner, () => {
          if (typeof props.children === 'function') {
            rendered = (props.children as any)(condVal);
          } else {
            rendered = props.children;
          }
        });
      });

      const nodes = normalizeNodes(rendered);
      currentNodes = nodes;
      insertNodes(nodes);
    } else if (props.fallback) {
      currentOwner = createOwner(outerOwner);
      let fallbackRendered: unknown = null;

      untrack(() => {
        runWithOwner(currentOwner, () => {
          if (props.fallback) {
            fallbackRendered = props.fallback();
          }
        });
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

  if (typeof document === 'undefined') {
    Object.defineProperty(marker, 'outerHTML', {
      get() {
        return currentNodes
          .map((n: any) => n.outerHTML ?? (n.textContent ? escapeHtmlText(n.textContent) : ''))
          .join('');
      },
      configurable: true
    });
  }

  if (!marker.parentNode && currentNodes.length > 0 && typeof document !== 'undefined' && typeof document.createDocumentFragment === 'function') {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(marker);
    for (const node of currentNodes) {
      fragment.appendChild(node);
    }
    return fragment;
  }

  return marker;
}

export interface ForProps<T, K = unknown> {
  each: (() => readonly T[] | null | undefined) | Signal<readonly T[] | null | undefined> | readonly T[] | null | undefined;
  key?: (item: T, index: number) => K;
  fallback?: () => Node | Node[] | null | undefined;
  children: (item: T, index: () => number) => Node | Node[] | null | undefined;
}

function getSequence(arr: number[]): number[] {
  const p = arr.slice();
  const result: number[] = [0];
  let i: number, j: number, u: number, v: number, c: number;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== -1) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}

interface KeyedEntry<T> {
  key: unknown;
  item: T;
  nodes: Node[];
  owner: Owner;
  indexSignal?: Signal<number>;
}

/**
 * <For> Reactive Keyed List Reconciliation Primitive
 *
 * Reconciles keyed lists with LIS-optimized DOM node reuse, index & item signal updates, and owner disposals.
 */
export function For<T, K = unknown>(props: ForProps<T, K>): Node {
  const outerOwner = getOwner();
  let cache = new Map<unknown, KeyedEntry<T>>();
  let currentEntries: KeyedEntry<T>[] = [];
  let fallbackOwner: Owner | null = null;
  let fallbackNodes: Node[] = [];
  const warnedKeys = isDev ? new Set<unknown>() : undefined;
  let duplicateKeyTokens: Map<unknown, Map<number, unknown>> | undefined;

  function getDuplicateKey(key: unknown, occurrence: number): unknown {
    if (!duplicateKeyTokens) {
      duplicateKeyTokens = new Map();
    }
    let occMap = duplicateKeyTokens.get(key);
    if (!occMap) {
      occMap = new Map();
      duplicateKeyTokens.set(key, occMap);
    }
    let token = occMap.get(occurrence);
    if (!token) {
      token = { key, occurrence };
      occMap.set(occurrence, token);
    }
    return token;
  }

  const marker = createControlFlowMarker('samrey:for', (parent) => {
    if (fallbackNodes.length > 0) {
      for (const node of fallbackNodes) {
        if (node.parentNode !== parent) {
          parent.insertBefore(node, marker.nextSibling);
        }
      }
    } else if (currentEntries.length > 0) {
      const frag = typeof document !== 'undefined' && typeof document.createDocumentFragment === 'function'
        ? document.createDocumentFragment()
        : null;

      if (frag) {
        for (const entry of currentEntries) {
          for (const node of entry.nodes) {
            if (node.parentNode !== parent) {
              frag.appendChild(node);
            }
          }
        }
        if (frag.childNodes.length > 0) {
          parent.insertBefore(frag, marker.nextSibling);
        }
      } else {
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

    fallbackOwner = createOwner(outerOwner);
    let rendered: unknown = null;
    untrack(() => {
      runWithOwner(fallbackOwner, () => {
        if (props.fallback) {
          rendered = props.fallback();
        }
      });
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
      // Empty list: dispose and remove rows in reverse order (last row first, and each row's nodes last to first)
      for (let i = currentEntries.length - 1; i >= 0; i--) {
        const entry = currentEntries[i];
        entry.owner.dispose();
        for (let n = entry.nodes.length - 1; n >= 0; n--) {
          const node = entry.nodes[n];
          if (node.parentNode) {
            node.parentNode.removeChild(node);
          }
        }
      }
      if (warnedKeys) {
        warnedKeys.clear();
      }
      if (duplicateKeyTokens) {
        duplicateKeyTokens.clear();
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
    let duplicateCounts: Map<unknown, number> | undefined;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rawKey = props.key ? props.key(item, i) : item;
      let rowKey: unknown = rawKey;

      if (seenKeys.has(rawKey)) {
        reportDuplicateKey(rawKey);
        if (!duplicateCounts) duplicateCounts = new Map();
        const occ = (duplicateCounts.get(rawKey) || 0) + 1;
        duplicateCounts.set(rawKey, occ);
        rowKey = getDuplicateKey(rawKey, occ);
      } else {
        seenKeys.add(rawKey);
      }

      let entry = cache.get(rowKey);
      if (entry) {
        if (entry.indexSignal) {
          entry.indexSignal.value = i;
        }
        if (isDev && props.key && entry.item !== item && !warnedKeys!.has(rowKey) && !isStore(item)) {
          warnedKeys!.add(rowKey);
          reportStaleItemWarning(rowKey);
        }
        entry.item = item;
      } else {
        const owner = createOwner(outerOwner);
        let idxSig: Signal<number> | undefined;
        const getIndex = () => {
          if (!idxSig) {
            idxSig = signal(i);
            if (entry) entry.indexSignal = idxSig;
          }
          return idxSig.value;
        };

        let rendered: unknown = null;

        untrack(() => {
          runWithOwner(owner, () => {
            rendered = props.children(item, getIndex);
          });
        });

        const nodes = normalizeNodes(rendered);
        entry = {
          key: rowKey,
          item,
          nodes,
          owner,
          indexSignal: idxSig
        };
      }

      newCache.set(rowKey, entry);
      newEntries.push(entry);
    }

    // Clean up removed items in reverse order
    for (let i = currentEntries.length - 1; i >= 0; i--) {
      const oldEntry = currentEntries[i];
      if (!newCache.has(oldEntry.key)) {
        if (warnedKeys) {
          warnedKeys.delete(oldEntry.key);
        }
        oldEntry.owner.dispose();
        for (let n = oldEntry.nodes.length - 1; n >= 0; n--) {
          const node = oldEntry.nodes[n];
          if (node.parentNode) {
            node.parentNode.removeChild(node);
          }
        }
      }
    }

    // Reconcile DOM positions
    const parent = marker.parentNode;
    if (parent) {
      if (currentEntries.length === 0) {
        // Initial mount optimization: skip key map and LIS work, build rows into DocumentFragment and append once
        const frag = typeof document !== 'undefined' && typeof document.createDocumentFragment === 'function'
          ? document.createDocumentFragment()
          : null;

        if (frag) {
          for (let i = 0; i < newEntries.length; i++) {
            const entry = newEntries[i];
            for (let n = 0; n < entry.nodes.length; n++) {
              frag.appendChild(entry.nodes[n]);
            }
          }
          parent.insertBefore(frag, marker.nextSibling);
        } else {
          let nextSibling: Node | null = marker.nextSibling;
          for (let i = newEntries.length - 1; i >= 0; i--) {
            const entry = newEntries[i];
            for (let n = entry.nodes.length - 1; n >= 0; n--) {
              parent.insertBefore(entry.nodes[n], nextSibling);
            }
            if (entry.nodes.length > 0) {
              nextSibling = entry.nodes[0];
            }
          }
        }
      } else {
        // Subsequent reconciliation: LIS-Optimized Reconcile DOM positions
        const oldKeyToIdx = new Map<unknown, number>();
        for (let i = 0; i < currentEntries.length; i++) {
          oldKeyToIdx.set(currentEntries[i].key, i);
        }

        const sources = new Array(newEntries.length).fill(-1);
        for (let i = 0; i < newEntries.length; i++) {
          const oldIdx = oldKeyToIdx.get(newEntries[i].key);
          if (oldIdx !== undefined) {
            sources[i] = oldIdx;
          }
        }

        const lis = sources.length > 0 ? getSequence(sources) : [];
        let lisIdx = lis.length - 1;

        let lastRemainingNode: Node | null = null;
        for (let i = currentEntries.length - 1; i >= 0; i--) {
          if (newCache.has(currentEntries[i].key)) {
            const nodes = currentEntries[i].nodes;
            if (nodes.length > 0) {
              lastRemainingNode = nodes[nodes.length - 1];
              break;
            }
          }
        }
        let nextSibling: Node | null = lastRemainingNode
          ? lastRemainingNode.nextSibling
          : marker.nextSibling;
        for (let i = newEntries.length - 1; i >= 0; i--) {
          const entry = newEntries[i];
          const shouldMove = lisIdx < 0 || lis[lisIdx] !== i;
          if (sources[i] === -1 || shouldMove) {
            for (let n = entry.nodes.length - 1; n >= 0; n--) {
              const node = entry.nodes[n];
              parent.insertBefore(node, nextSibling);
            }
          } else {
            lisIdx--;
          }
          if (entry.nodes.length > 0) {
            nextSibling = entry.nodes[0];
          }
        }
      }
    }

    cache = newCache;
    currentEntries = newEntries;
  });

  onCleanup(() => {
    removeFallback();
    // Dispose and remove rows in reverse order (last row first, and each row's nodes last to first)
    for (let i = currentEntries.length - 1; i >= 0; i--) {
      const entry = currentEntries[i];
      entry.owner.dispose();
      for (let n = entry.nodes.length - 1; n >= 0; n--) {
        const node = entry.nodes[n];
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
    }
    if (duplicateKeyTokens) {
      duplicateKeyTokens.clear();
    }
    cache.clear();
    currentEntries = [];
  });

  if (typeof document === 'undefined') {
    Object.defineProperty(marker, 'outerHTML', {
      get() {
        const nodes = fallbackNodes.length > 0
          ? fallbackNodes
          : currentEntries.flatMap((e) => e.nodes);
        return nodes
          .map((n: any) => n.outerHTML ?? (n.textContent ? escapeHtmlText(n.textContent) : ''))
          .join('');
      },
      configurable: true
    });
  }

  if (!marker.parentNode && typeof document !== 'undefined' && typeof document.createDocumentFragment === 'function') {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(marker);
    if (fallbackNodes.length > 0) {
      for (const node of fallbackNodes) fragment.appendChild(node);
    } else {
      for (const entry of currentEntries) {
        for (const node of entry.nodes) fragment.appendChild(node);
      }
    }
    return fragment;
  }

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
      onError((err: unknown) => {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        errorSignal.value = errorObj;
      });
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
  const { component, children, ...rest } = props;
  if (typeof component === 'string') {
    return (children ? [el(component as any, rest, children)] : [el(component as any, rest)]) as unknown as Node;
  }
  return createComponent(component, { ...rest, children });
}

export interface PortalProps {
  mount?: HTMLElement;
  children: () => Node | Node[] | null | undefined;
}

export function Portal(props: PortalProps): Node {
  const target = props.mount || (typeof document !== 'undefined' ? document.body : null);
  const rendered = props.children();
  const nodes = normalizeNodes(rendered);
  if (target) {
    for (const n of nodes) {
      target.appendChild(n);
    }
  }
  onCleanup(() => {
    if (target) {
      for (const n of nodes) {
        if (n.parentNode === target) {
          target.removeChild(n);
        }
      }
    }
  });
  return text('');
}

export interface SuspenseProps {
  fallback: () => Node | Node[] | null | undefined;
  children: () => Node | Node[] | null | undefined;
}

export function Suspense(props: SuspenseProps): Node {
  const isPending = signal(false);
  const content = signal<Node | Node[] | null>(null);

  try {
    const res = props.children();
    if (res instanceof Promise) {
      isPending.value = true;
      res.then((resolved) => {
        content.value = resolved as any;
        isPending.value = false;
      }).catch(() => {
        isPending.value = false;
      });
      return Show({
        when: () => !isPending.value,
        fallback: props.fallback,
        children: () => content.value || text('')
      });
    }
    return (res || text('')) as Node;
  } catch (e) {
    return (props.fallback() || text('')) as Node;
  }
}

