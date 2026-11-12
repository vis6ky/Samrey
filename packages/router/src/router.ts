/**
 * @license Apache-2.0
 * @samrey/router - Router State Manager
 */

import { signal, computed, effect, createOwner, getOwner, runWithOwner, onCleanup, createContext, useContext, Owner, ReadonlySignal } from '@samrey/reactivity';
import { sanitizeRedirectUri } from '@samrey/security';
import { el, text } from '@samrey/runtime';
import { RouteRecord, RouterInstance } from './types.js';
import { matchRoutes } from './matcher.js';
import { isPlainLeftClick, resolveLinkTarget } from './link-helpers.js';

function resolvePath(to: string, current: string): string {
  if (!to) return current;
  const trimmed = to.trim();
  if (!trimmed) return current;
  // Preserve explicit URI schemes, protocol-relative prefixes, and backslash tricks so sanitizeRedirectUri rejects them explicitly
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\/[\\/]|\\)/i.test(trimmed)) {
    return trimmed;
  }
  try {
    const base = 'http://localhost' + (current.startsWith('/') ? current : '/' + current);
    const resolved = new URL(trimmed, base);
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return trimmed.startsWith('/') ? trimmed : '/' + trimmed;
  }
}

export const RouterContext = createContext<RouterInstance | null>(null);

let activeRouterInstance: RouterInstance | null = null;

function attachRouterToOwner(owner: Owner | null, router: RouterInstance): void {
  if (!owner) return;
  let ctx = owner.context;
  if (!ctx) {
    ctx = Object.create(null) as Record<string | symbol, unknown>;
    owner.context = ctx;
  }
  ctx[RouterContext.id] = router;
}

export function createRouter(routes: RouteRecord[], initialPath?: string): RouterInstance {
  const browserPath = typeof window !== 'undefined' && window.location
    ? window.location.pathname + (window.location.search || '') + (window.location.hash || '')
    : '/';
  const rawInitial = initialPath !== undefined ? initialPath : browserPath;
  const safeInitial = sanitizeRedirectUri(rawInitial, '/');
  const pathSignal = signal(safeInitial);

  let cleanupPopState: (() => void) | undefined;
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const handlePopState = () => {
      const loc = window.location.pathname + (window.location.search || '') + (window.location.hash || '');
      pathSignal.value = sanitizeRedirectUri(loc, '/');
    };
    window.addEventListener('popstate', handlePopState);
    cleanupPopState = () => {
      window.removeEventListener('popstate', handlePopState);
    };
    onCleanup(cleanupPopState);
  }

  const activeMatch = computed(() => {
    return matchRoutes(routes, pathSignal.value);
  });

  const activeParams = computed(() => {
    return activeMatch.value ? activeMatch.value.params : {};
  });

  function navigate(to: string): void {
    const resolved = resolvePath(to, pathSignal.value);
    const safeTo = sanitizeRedirectUri(resolved, pathSignal.value);
    if (pathSignal.value !== safeTo) {
      pathSignal.value = safeTo;
      if (typeof window !== 'undefined' && window.history) {
        try {
          window.history.pushState(null, '', safeTo);
        } catch {
          // Ignored in sandboxed iframes or opaque origins (Google AI Studio preview)
        }
      }
    }
  }

  const owner = getOwner();
  const instance: RouterInstance = {
    currentPath: computed(() => pathSignal.value),
    currentParams: activeParams,
    navigate,
    match: (p: string) => matchRoutes(routes, p),
    destroy: () => {
      cleanupPopState?.();
      if (activeRouterInstance === instance) {
        activeRouterInstance = null;
      }
    }
  };

  attachRouterToOwner(owner, instance);
  if (!owner) {
    activeRouterInstance = instance;
  }

  return instance;
}

export function setRouterInstance(router: RouterInstance | null): void {
  activeRouterInstance = router;
}

function tryUseRouter(): RouterInstance | null {
  const contextual = useContext(RouterContext);
  if (contextual) {
    return contextual;
  }
  return activeRouterInstance ?? null;
}

export function useRouter(): RouterInstance {
  const router = tryUseRouter();
  if (!router) {
    throw new Error('[Samrey Router] useRouter() must be called inside a Router context or after createRouter().');
  }
  return router;
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): ReadonlySignal<T> {
  const router = useRouter();
  return router.currentParams as ReadonlySignal<T>;
}

export function useLocation() {
  const router = useRouter();
  return router.currentPath;
}

export function useSearchParams() {
  const router = useRouter();
  const searchSignal = computed(() => {
    const p = router.currentPath.value;
    const qIdx = p.indexOf('?');
    if (qIdx === -1) return new URLSearchParams();
    const hIdx = p.indexOf('#', qIdx);
    const searchStr = hIdx === -1 ? p.slice(qIdx) : p.slice(qIdx, hIdx);
    return new URLSearchParams(searchStr);
  });

  const setSearch = (nextParams: Record<string, string> | URLSearchParams | string) => {
    let nextQuery = '';
    if (typeof nextParams === 'string') {
      nextQuery = nextParams ? (nextParams.startsWith('?') ? nextParams : '?' + nextParams) : '';
    } else if (nextParams instanceof URLSearchParams) {
      const qs = nextParams.toString();
      nextQuery = qs ? '?' + qs : '';
    } else if (typeof nextParams === 'object' && nextParams !== null) {
      const sp = new URLSearchParams(nextParams);
      const qs = sp.toString();
      nextQuery = qs ? '?' + qs : '';
    }
    const current = router.currentPath.value;
    const [pathWithoutQueryAndHash] = current.split(/[?#]/);
    const hashIdx = current.indexOf('#');
    const hashPart = hashIdx !== -1 ? current.slice(hashIdx) : '';
    router.navigate(pathWithoutQueryAndHash + nextQuery + hashPart);
  };

  return [searchSignal, setSearch] as const;
}

export function createBrowserHistory() {
  return {
    push: (url: string) => {
      const safeUrl = sanitizeRedirectUri(url, '/');
      if (typeof window !== 'undefined' && window.history) {
        try {
          window.history.pushState(null, '', safeUrl);
        } catch {
          // Ignored in sandboxed iframes
        }
      }
    },
    replace: (url: string) => {
      const safeUrl = sanitizeRedirectUri(url, '/');
      if (typeof window !== 'undefined' && window.history) {
        try {
          window.history.replaceState(null, '', safeUrl);
        } catch {
          // Ignored in sandboxed iframes
        }
      }
    },
    listen: (fn: (url: string) => void) => {
      if (typeof window !== 'undefined') {
        const handler = () => {
          const rawUrl = window.location.pathname + (window.location.search || '') + (window.location.hash || '');
          fn(sanitizeRedirectUri(rawUrl, '/'));
        };
        window.addEventListener('popstate', handler);
        return () => window.removeEventListener('popstate', handler);
      }
      return () => {};
    }
  };
}

export function createMemoryHistory(initialPath = '/') {
  const history = [initialPath];
  let index = 0;
  return {
    push: (url: string) => {
      history.push(url);
      index++;
    },
    replace: (url: string) => {
      history[index] = url;
    },
    get current() {
      return history[index];
    }
  };
}

export function Route(props: { path: string; component: (props: any) => any; guard?: () => boolean }) {
  return props;
}

export function RouterOutlet(): Node {
  const router = useRouter();
  const outletContainer = el('div', { class: 'samrey-router-outlet' });
  let currentNodes: Node[] = [];
  let currentRouteOwner: Owner | null = null;

  function removeNodes(): void {
    if (currentRouteOwner) {
      currentRouteOwner.dispose();
      currentRouteOwner = null;
    }
    for (const node of currentNodes) {
      if (node.parentNode === outletContainer) {
        outletContainer.removeChild(node);
      }
    }
    currentNodes = [];
  }

  effect(() => {
    const match = router.match(router.currentPath.value);
    removeNodes();

    if (match && typeof match.route.component === 'function') {
      currentRouteOwner = createOwner();
      let rendered: unknown = null;
      runWithOwner(currentRouteOwner, () => {
        rendered = (match.route.component as any)({ params: match.params });
      });

      const appendRouteNode = (item: unknown) => {
        if (Array.isArray(item)) {
          for (const sub of item) appendRouteNode(sub);
          return;
        }
        if (item && typeof item === 'object' && 'nodeType' in item) {
          const n = item as Node;
          if (n.nodeType === 11 && 'childNodes' in n) {
            const fragChildren = Array.from((n as DocumentFragment).childNodes);
            outletContainer.appendChild(n);
            for (const fc of fragChildren) {
              currentNodes.push(fc);
            }
          } else {
            currentNodes.push(n);
            outletContainer.appendChild(n);
          }
        } else if (item !== null && item !== undefined && item !== false) {
          const t = text(String(item));
          currentNodes.push(t);
          outletContainer.appendChild(t);
        }
      };

      appendRouteNode(rendered);
    }
  });

  onCleanup(() => {
    removeNodes();
  });

  return outletContainer as unknown as Node;
}

export function useNavigate(): (to: string) => void {
  const router = useRouter();
  return (to: string) => router.navigate(to);
}

export function Router(props: { routes?: RouteRecord[]; children?: any; initialPath?: string }) {
  let routes = props.routes || [];
  const childrenArr = Array.isArray(props.children)
    ? props.children
    : props.children ? [props.children] : [];

  const childRoutes: RouteRecord[] = [];
  for (const child of childrenArr) {
    if (child && typeof child === 'object' && typeof child.path === 'string' && typeof child.component === 'function') {
      childRoutes.push({
        path: child.path,
        component: child.component,
        guard: child.guard,
        loader: child.loader
      });
    }
  }

  if (childRoutes.length > 0 && routes.length === 0) {
    routes = childRoutes;
  }

  const parentOwner = getOwner();
  const routerOwner = parentOwner ? createOwner(parentOwner) : null;
  const routerInstance = routerOwner
    ? runWithOwner(routerOwner, () => createRouter(routes, props.initialPath))
    : createRouter(routes, props.initialPath);

  if (!parentOwner) {
    activeRouterInstance = routerInstance;
  }

  const runScoped = <T>(fn: () => T): T => (routerOwner ? runWithOwner(routerOwner, fn) : fn());

  if (typeof props.children === 'function') {
    return runScoped(() => props.children(routerInstance));
  }

  if (childRoutes.length > 0 && childRoutes.length === childrenArr.length) {
    return runScoped(() => RouterOutlet());
  }

  if (props.children !== undefined) {
    return props.children;
  }

  return runScoped(() => RouterOutlet());
}

export interface LinkProps {
  href: string;
  class?: string;
  activeClass?: string;
  target?: string;
  rel?: string;
  download?: string | boolean;
  children?: any;
  [key: string]: any;
}

export function Link(props: LinkProps) {
  const router = tryUseRouter();
  const { isExternal, safeHref: safeTo } = resolveLinkTarget(props.href);

  const handleClick = (e: MouseEvent) => {
    if (!isPlainLeftClick(e) || isExternal || (props.target && props.target !== '_self') || !router) {
      return;
    }
    e.preventDefault();
    router.navigate(safeTo);
  };

  const isActive = computed(() => {
    if (isExternal || !router) return false;
    const current = router.currentPath.value.split(/[?#]/)[0];
    const target = safeTo.split(/[?#]/)[0];
    return current === target;
  });

  const computedClass = computed(() => {
    const base = props.class || '';
    if (props.activeClass && isActive.value) {
      return base ? `${base} ${props.activeClass}` : props.activeClass;
    }
    return base;
  });

  const { class: _cls, activeClass: _ac, href: _h, children: _ch, ...restAttrs } = props;
  if (props.target === '_blank' && !restAttrs.rel) {
    restAttrs.rel = 'noopener noreferrer';
  }

  return el(
    'a',
    {
      ...restAttrs,
      href: safeTo,
      class: computedClass,
      onClick: handleClick
    },
    props.children
  );
}
