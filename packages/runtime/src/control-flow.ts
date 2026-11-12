/**
 * @license Apache-2.0
 * @samrey/runtime - Reactive Control Flow Primitives (<Show>, <For>)
 */

import {
  batch,
  effect,
  createOwner,
  getOwner,
  handleError,
  isHydrationCapturing,
  onCleanup,
  onError,
  Owner,
  recordHydrationRetarget,
  runWithOwner,
  signal,
  Signal,
  SuspenseTracker,
  SuspenseTrackerContext,
  untrack,
  isStore
} from '@samrey/reactivity';
import { reportDuplicateKey, reportStaleItemWarning, isDev } from './diagnostics.js';
import { el, text } from './dom.js';
import { DANGEROUS_TEMPLATE_TAGS, escapeHtmlText } from '@samrey/security';
import { createComponent } from './component.js';

export interface ShowProps<T> {
  when: (() => T) | Signal<T> | T;
  fallback?: () => Node | Node[] | null | undefined;
  children: ((item: NonNullable<T>) => Node | Node[] | null | undefined) | Node | Node[];
}

const HEADLESS_CHILDREN_SYMBOL = Symbol.for('samrey.headlessChildren');
const HYDRATING_MARKER_SYMBOL = Symbol.for('samrey.hydratingMarker');

/**
 * Inserts a list of nodes immediately after a control-flow comment marker while
 * preserving sibling order.
 */
function insertNodesAfterMarker(
  parent: any,
  marker: Node,
  nodes: Node[],
  skipExisting = false
): void {
  const next = marker.nextSibling;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (skipExisting && node.parentNode === parent) continue;
    parent.insertBefore(node, next);
  }
}

/**
 * Removes each attached node in a list from its current DOM parent.
 */
function detachNodes(nodes: Node[]): void {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }
}

/**
 * Registers hydration node retargeters for control-flow node arrays when
 * executing inside runWithHydrationCapture().
 */
function registerHydrationNodes(
  nodes: Node[],
  replaceAt: (index: number, adopted: Node) => void
): void {
  if (!isHydrationCapturing() || nodes.length === 0) return;
  for (let i = 0; i < nodes.length; i++) {
    const idx = i;
    recordHydrationRetarget(nodes[idx] as object, (adopted: Node) => {
      replaceAt(idx, adopted);
    });
  }
}

/**
 * Defines reactive headless outerHTML serialization and hydration child introspection
 * on a detached control-flow marker, and returns a DocumentFragment on initial browser mount.
 */
function finalizeControlFlowResult(
  marker: Node,
  getNodes: () => Node[]
): Node {
  if (typeof document === 'undefined') {
    Object.defineProperty(marker, 'outerHTML', {
      get() {
        return getNodes()
          .map((n: any) => n.outerHTML ?? (n.textContent ? escapeHtmlText(n.textContent) : ''))
          .join('');
      },
      configurable: true
    });
    return marker;
  }

  const nodes = getNodes();
  if (!marker.parentNode && nodes.length > 0 && typeof document.createDocumentFragment === 'function') {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(marker);
    for (const node of nodes) {
      fragment.appendChild(node);
    }
    return fragment;
  }

  return marker;
}

/**
 * Creates a comment marker safely in browser, JSDOM, or synthetic mock environments.
 * Intercepts parentNode assignment to ensure child DOM fragments mount synchronously.
 */
function createControlFlowMarker(
  name: string,
  onParentAttached?: (parent: any) => void,
  getHeadlessChildren?: () => Node[]
): Node {
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
  let _nextSibling: any = null;
  try {
    Object.defineProperty(marker, 'parentNode', {
      get() {
        return _parent;
      },
      set(newParent: any) {
        _parent = newParent;
        if (newParent && onParentAttached && !(marker as any)[HYDRATING_MARKER_SYMBOL]) {
          onParentAttached(newParent);
        }
      },
      configurable: true
    });
    Object.defineProperty(marker, 'nextSibling', {
      get() {
        if (_parent && Array.isArray(_parent.childNodes)) {
          const idx = _parent.childNodes.indexOf(marker);
          if (idx !== -1) {
            return idx + 1 < _parent.childNodes.length ? _parent.childNodes[idx + 1] : null;
          }
        }
        return _nextSibling;
      },
      set(next: any) {
        _nextSibling = next;
      },
      configurable: true
    });
    if (getHeadlessChildren) {
      Object.defineProperty(marker, HEADLESS_CHILDREN_SYMBOL, {
        get: getHeadlessChildren,
        configurable: true,
        enumerable: false
      });
    }
  } catch {
    // In environments where DOM comment properties cannot be redefined
  }

  return marker as Node;
}

/**
 * Normalizes a return value (single Node, DocumentFragment, Node array, or primitive) into Node[].
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
        const node = v as any;
        if (node.nodeType === 11 && node.childNodes) {
          res.push(...Array.from(node.childNodes as Node[]));
        } else {
          res.push(node as Node);
        }
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
    const node = val as any;
    if (node.nodeType === 11 && node.childNodes) {
      return Array.from(node.childNodes as Node[]);
    }
    return [node as Node];
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
 * When `children` takes no parameter (children.length === 0 or is a static Node/array), Show operates
 * as an unkeyed boolean truthiness gate and does NOT re-render on value identity changes.
 * When `children` declares a parameter (children.length > 0), Show is keyed by the value when children
 * use it, re-rendering whenever the truthy value changes by Object.is comparison.
 */
export function Show<T>(props: ShowProps<T>): Node {
  const outerOwner = getOwner();
  let currentOwner: Owner | null = null;
  let currentNodes: Node[] = [];
  let prevCondition: unknown = undefined;
  let prevTruthy: boolean | null = null;

  if (
    isDev &&
    typeof props.children === 'object' &&
    props.children !== null
  ) {
    console.warn(
      '[Samrey Runtime Warning] <Show> received a pre-instantiated DOM Node/Array instead of a factory function `children: () => ...`. Passing pre-rendered nodes executes children eagerly even when `when` is false. Prefer lazy factory functions: `children: () => MyComponent()`.'
    );
  }

  const isKeyed = typeof props.children === 'function' && props.children.length > 0;

  const marker = createControlFlowMarker(
    'samrey:show',
    (parent) => insertNodesAfterMarker(parent, marker, currentNodes, true),
    () => currentNodes
  );

  function removeNodes(): void {
    detachNodes(currentNodes);
    currentNodes = [];
  }

  function insertNodes(nodes: Node[]): void {
    const parent = marker.parentNode;
    if (parent) {
      insertNodesAfterMarker(parent, marker, nodes);
    }
  }

  effect(() => {
    const whenProp = props.when;
    const condition = typeof whenProp === 'function' ? (whenProp as () => unknown)() : (whenProp && typeof whenProp === 'object' && 'value' in whenProp) ? (whenProp as { value: unknown }).value : whenProp;
    const isTruthy = Boolean(condition);

    if (prevTruthy !== null) {
      if (isKeyed) {
        if (isTruthy === prevTruthy) {
          if (!isTruthy) {
            return;
          }
          if (Object.is(condition, prevCondition)) {
            return;
          }
        }
      } else {
        if (isTruthy === prevTruthy) {
          return;
        }
      }
    }

    prevTruthy = isTruthy;
    prevCondition = condition;

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
      registerHydrationNodes(currentNodes, (idx, adopted) => {
        if (idx < currentNodes.length) {
          currentNodes[idx] = adopted;
        }
      });
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
      registerHydrationNodes(currentNodes, (idx, adopted) => {
        if (idx < currentNodes.length) {
          currentNodes[idx] = adopted;
        }
      });
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

  return finalizeControlFlowResult(marker, () => currentNodes);
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
  currentIndex: number;
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

  const marker = createControlFlowMarker(
    'samrey:for',
    (parent) => {
      if (fallbackNodes.length > 0) {
        insertNodesAfterMarker(parent, marker, fallbackNodes, true);
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
    },
    () => fallbackNodes.length > 0 ? fallbackNodes : currentEntries.flatMap((e) => e.nodes)
  );

  Object.defineProperty(marker, '_duplicateKeyTokensCount', {
    get: () => (duplicateKeyTokens ? duplicateKeyTokens.size : 0),
    configurable: true,
    enumerable: false
  });

  function removeFallback(): void {
    if (fallbackOwner) {
      fallbackOwner.dispose();
      fallbackOwner = null;
    }
    detachNodes(fallbackNodes);
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
    registerHydrationNodes(fallbackNodes, (idx, adopted) => {
      if (idx < fallbackNodes.length) {
        fallbackNodes[idx] = adopted;
      }
    });
    const parent = marker.parentNode;
    if (parent) {
      insertNodesAfterMarker(parent, marker, fallbackNodes);
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
        entry.currentIndex = i;
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
        let createdEntry: KeyedEntry<T> | undefined;
        const getIndex = () => {
          if (!idxSig) {
            idxSig = signal(createdEntry ? createdEntry.currentIndex : i);
            if (createdEntry) createdEntry.indexSignal = idxSig;
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
        createdEntry = {
          key: rowKey,
          item,
          nodes,
          owner,
          currentIndex: i,
          indexSignal: idxSig
        };
        const resolvedEntry = createdEntry;
        registerHydrationNodes(resolvedEntry.nodes, (nodeIdx, adopted) => {
          if (nodeIdx < resolvedEntry.nodes.length) {
            resolvedEntry.nodes[nodeIdx] = adopted;
          }
        });
        entry = resolvedEntry;
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
              const node = entry.nodes[n];
              parent.insertBefore(node, nextSibling);
              nextSibling = node;
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
              nextSibling = node;
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

    // Drop tokens for duplicate keys no longer present after each reconcile (or bound its size)
    if (duplicateKeyTokens) {
      if (!duplicateCounts || duplicateCounts.size === 0) {
        duplicateKeyTokens.clear();
      } else {
        for (const [key, occMap] of duplicateKeyTokens.entries()) {
          const maxOcc = duplicateCounts.get(key);
          if (maxOcc === undefined) {
            duplicateKeyTokens.delete(key);
          } else {
            for (const occ of occMap.keys()) {
              if (occ > maxOcc) {
                occMap.delete(occ);
              }
            }
          }
        }
      }

      // Bound size to prevent runaway memory if list has huge duplicate churn
      const MAX_DUPLICATE_KEY_TOKENS = 10000;
      if (duplicateKeyTokens.size > MAX_DUPLICATE_KEY_TOKENS) {
        const excess = duplicateKeyTokens.size - MAX_DUPLICATE_KEY_TOKENS;
        let dropped = 0;
        for (const key of duplicateKeyTokens.keys()) {
          duplicateKeyTokens.delete(key);
          if (++dropped >= excess) break;
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
    Object.defineProperty(fragment, '_duplicateKeyTokensCount', {
      get: () => (duplicateKeyTokens ? duplicateKeyTokens.size : 0),
      configurable: true,
      enumerable: false
    });
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
  when: (() => T) | Signal<T> | T;
  children: ((item: NonNullable<T>) => Node | Node[] | null | undefined) | Node | Node[];
}

export interface SwitchProps {
  fallback?: () => Node | Node[] | null | undefined;
  children: unknown;
}

export function Match<T>(props: MatchProps<T>): MatchProps<T> {
  return props;
}

/**
 * <Switch> and <Match> Reactive Multi-Branch Control Flow Primitives
 *
 * Selects the first matching <Match> branch whose `when` condition evaluates to truthy.
 * Switch re-renders when the active match changes (comparing the matched Match object, then its value),
 * falling back to `props.fallback` when no Match conditions evaluate to truthy.
 */
export function Switch(props: SwitchProps): Node {
  const outerOwner = getOwner();
  let currentOwner: Owner | null = null;
  let currentNodes: Node[] = [];
  let prevMatch: MatchProps<unknown> | null = null;
  let prevVal: unknown = undefined;
  let prevMatched: boolean | null = null;

  const marker = createControlFlowMarker(
    'samrey:switch',
    (parent) => insertNodesAfterMarker(parent, marker, currentNodes, true),
    () => currentNodes
  );

  function removeNodes(): void {
    detachNodes(currentNodes);
    currentNodes = [];
  }

  function insertNodes(nodes: Node[]): void {
    const parent = marker.parentNode;
    if (parent) {
      insertNodesAfterMarker(parent, marker, nodes);
    }
  }

  const rawChildren = typeof props.children === 'function' ? (props.children as () => unknown)() : props.children;
  const cases = Array.isArray(rawChildren) ? rawChildren : [rawChildren];
  const matchCases = cases.filter((c): c is MatchProps<unknown> => !!c && typeof c === 'object' && 'when' in (c as any));

  effect(() => {
    let matchedCase: MatchProps<unknown> | null = null;
    let matchedVal: unknown = undefined;

    for (const match of matchCases) {
      const whenProp = match.when;
      const val = typeof whenProp === 'function'
        ? (whenProp as () => unknown)()
        : (whenProp && typeof whenProp === 'object' && 'value' in whenProp)
          ? (whenProp as { value: unknown }).value
          : whenProp;
      if (val) {
        matchedCase = match;
        matchedVal = val;
        break;
      }
    }

    const hasMatch = matchedCase !== null;

    if (prevMatched !== null) {
      if (hasMatch && matchedCase) {
        if (prevMatched && prevMatch === matchedCase) {
          const isKeyedCase = typeof matchedCase.children === 'function' && matchedCase.children.length > 0;
          if (!isKeyedCase || Object.is(prevVal, matchedVal)) {
            return;
          }
        }
      } else if (!hasMatch && !prevMatched) {
        return;
      }
    }

    prevMatched = hasMatch;
    prevMatch = matchedCase;
    prevVal = matchedVal;

    if (currentOwner) {
      currentOwner.dispose();
      currentOwner = null;
    }
    removeNodes();

    if (hasMatch && matchedCase) {
      currentOwner = createOwner(outerOwner);
      const child = matchedCase.children;
      let rendered: unknown = null;

      untrack(() => {
        runWithOwner(currentOwner, () => {
          if (typeof child === 'function') {
            rendered = (child as (item: unknown) => unknown)(matchedVal);
          } else {
            rendered = child;
          }
        });
      });

      const nodes = normalizeNodes(rendered);
      currentNodes = nodes;
      registerHydrationNodes(currentNodes, (idx, adopted) => {
        if (idx < currentNodes.length) {
          currentNodes[idx] = adopted;
        }
      });
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
      registerHydrationNodes(currentNodes, (idx, adopted) => {
        if (idx < currentNodes.length) {
          currentNodes[idx] = adopted;
        }
      });
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

  return finalizeControlFlowResult(marker, () => currentNodes);
}

export interface ErrorBoundaryProps {
  fallback: (error: Error, reset: () => void) => Node | Node[] | null | undefined;
  children: () => Node | Node[] | null | undefined;
}

export function ErrorBoundary(props: ErrorBoundaryProps): Node {
  const outerOwner = getOwner();
  const errorSignal = signal<Error | null>(null);
  const retryTick = signal(0);
  let currentOwner: Owner | null = null;
  let currentNodes: Node[] = [];

  const toError = (err: unknown): Error =>
    err instanceof Error ? err : new Error(String(err));

  const reset = () => {
    batch(() => {
      errorSignal.value = null;
      retryTick.update((n) => n + 1);
    });
  };

  const marker = createControlFlowMarker(
    'samrey:error-boundary',
    (parent) => insertNodesAfterMarker(parent, marker, currentNodes, true),
    () => currentNodes
  );

  function removeNodes(): void {
    detachNodes(currentNodes);
    currentNodes = [];
  }

  function insertNodes(nodes: Node[]): void {
    const parent = marker.parentNode;
    if (parent) {
      insertNodesAfterMarker(parent, marker, nodes);
    }
  }

  effect(() => {
    const err = errorSignal.value;
    void retryTick.value;

    if (currentOwner) {
      currentOwner.dispose();
      currentOwner = null;
    }
    removeNodes();

    if (err !== null) {
      currentOwner = createOwner(outerOwner);
      let rendered: unknown = null;
      untrack(() => {
        runWithOwner(currentOwner!, () => {
          rendered = props.fallback(err, reset);
        });
      });
      currentNodes = normalizeNodes(rendered);
      registerHydrationNodes(currentNodes, (idx, adopted) => {
        if (idx < currentNodes.length) {
          currentNodes[idx] = adopted;
        }
      });
      insertNodes(currentNodes);
      return;
    }

    currentOwner = createOwner(outerOwner);
    let syncErr: Error | null = null;
    let isRendering = true;
    let rendered: unknown = null;

    untrack(() => {
      runWithOwner(currentOwner!, () => {
        onError((caught: unknown) => {
          const errorObj = toError(caught);
          if (isRendering) {
            syncErr = errorObj;
          } else {
            errorSignal.value = errorObj;
          }
        });
        try {
          rendered = props.children();
        } catch (caught) {
          syncErr = toError(caught);
        } finally {
          isRendering = false;
        }
      });
    });

    if (syncErr !== null) {
      currentOwner.dispose();
      currentOwner = createOwner(outerOwner);
      let fallbackRendered: unknown = null;
      const errForFallback = syncErr;
      untrack(() => {
        runWithOwner(currentOwner!, () => {
          fallbackRendered = props.fallback(errForFallback, reset);
        });
      });
      currentNodes = normalizeNodes(fallbackRendered);
      registerHydrationNodes(currentNodes, (idx, adopted) => {
        if (idx < currentNodes.length) {
          currentNodes[idx] = adopted;
        }
      });
      insertNodes(currentNodes);
      return;
    }

    currentNodes = normalizeNodes(rendered);
    registerHydrationNodes(currentNodes, (idx, adopted) => {
      if (idx < currentNodes.length) {
        currentNodes[idx] = adopted;
      }
    });
    insertNodes(currentNodes);
  });

  onCleanup(() => {
    if (currentOwner) {
      currentOwner.dispose();
      currentOwner = null;
    }
    removeNodes();
  });

  return finalizeControlFlowResult(marker, () => currentNodes);
}

export interface DynamicProps {
  component: string | ((props: any) => Node | Node[]);
  [key: string]: any;
}

export function Dynamic(props: DynamicProps): Node | Node[] {
  const { component, children, ...rest } = props;
  if (typeof component === 'string') {
    const trimmedTag = component.trim();
    const lowerTag = trimmedTag.toLowerCase();
    if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(trimmedTag) || DANGEROUS_TEMPLATE_TAGS.has(lowerTag)) {
      if (isDev) {
        console.warn(`[Samrey Security Warning] Refusing to dynamically render dangerous or invalid HTML tag "${component}".`);
      }
      return text('');
    }
    return children !== undefined ? el(trimmedTag as any, rest, children) : el(trimmedTag as any, rest);
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
  children: () => Node | Node[] | Promise<Node | Node[] | null | undefined> | null | undefined;
}

export function Suspense(props: SuspenseProps): Node {
  const outerOwner = getOwner();
  const suspenseOwner = createOwner(outerOwner);
  const pendingCount = signal(0);
  let resolvedNodes: Node[] = [];

  const tracker: SuspenseTracker = {
    track(promise: Promise<unknown>): void {
      pendingCount.update((c) => c + 1);
      promise.then(
        () => {
          pendingCount.update((c) => Math.max(0, c - 1));
        },
        (err) => {
          pendingCount.update((c) => Math.max(0, c - 1));
          handleError(err, suspenseOwner);
        }
      );
    }
  };

  onCleanup(() => {
    suspenseOwner.dispose();
  });

  runWithOwner(suspenseOwner, () => {
    SuspenseTrackerContext.Provider({
      value: tracker,
      children: () => {
        const res = props.children();
        if (res instanceof Promise) {
          tracker.track(
            res.then((resolved) => {
              resolvedNodes = normalizeNodes(resolved);
            })
          );
        } else {
          resolvedNodes = normalizeNodes(res);
        }
      }
    });
  });

  return Show({
    when: () => pendingCount.value === 0,
    fallback: props.fallback,
    children: () => resolvedNodes
  });
}

