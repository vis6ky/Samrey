/**
 * @license Apache-2.0
 * @samrey/router - Router State Manager
 */

import { signal, computed, effect } from '@samrey/reactivity';
import { sanitizeRedirectUri } from '@samrey/security';
import { el, text } from '@samrey/runtime';
import { RouteRecord, RouterInstance, RouteMatch } from './types.js';
import { matchRoutes } from './matcher.js';

function resolvePath(to: string, current: string): string {
  if (!to) return current;
  if (/^(https?:|\/\/|mailto:|tel:)/i.test(to)) {
    return to;
  }
  try {
    const base = 'http://localhost' + (current.startsWith('/') ? current : '/' + current);
    const resolved = new URL(to, base);
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return to.startsWith('/') ? to : '/' + to;
  }
}

export function createRouter(routes: RouteRecord[], initialPath?: string): RouterInstance {
  const browserPath = typeof window !== 'undefined' && window.location
    ? window.location.pathname + (window.location.search || '') + (window.location.hash || '')
    : '/';
  const rawInitial = initialPath !== undefined ? initialPath : browserPath;
  const safeInitial = sanitizeRedirectUri(rawInitial, '/');
  const pathSignal = signal(safeInitial);

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const handlePopState = () => {
      const loc = window.location.pathname + (window.location.search || '') + (window.location.hash || '');
      pathSignal.value = loc;
    };
    window.addEventListener('popstate', handlePopState);
  }

  const activeMatch = computed(() => {
    return matchRoutes(routes, pathSignal.value);
  });

  const activeParams = computed(() => {
    return activeMatch.value ? activeMatch.value.params : {};
  });

  function navigate(to: string): void {
    const resolved = resolvePath(to, pathSignal.value);
    if (/^(https?:|\/\/|mailto:|tel:)/i.test(resolved)) {
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = resolved;
      }
      return;
    }
    const safeTo = sanitizeRedirectUri(resolved, pathSignal.value);
    if (pathSignal.value !== safeTo) {
      pathSignal.value = safeTo;
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState(null, '', safeTo);
      }
    }
  }

  return {
    currentPath: computed(() => pathSignal.value),
    currentParams: activeParams,
    navigate,
    match: (p: string) => matchRoutes(routes, p)
  };
}

let activeRouterInstance: RouterInstance | null = null;

export function setRouterInstance(router: RouterInstance | null): void {
  activeRouterInstance = router;
}

export function useRouter(): RouterInstance {
  if (!activeRouterInstance) {
    activeRouterInstance = createRouter([{ path: '/', component: () => ({}) }]);
  }
  return activeRouterInstance;
}

export function useParams<T extends Record<string, string> = Record<string, string>>() {
  const router = useRouter();
  return router.currentParams;
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
      if (typeof window !== 'undefined' && window.history) window.history.pushState(null, '', url);
    },
    replace: (url: string) => {
      if (typeof window !== 'undefined' && window.history) window.history.replaceState(null, '', url);
    },
    listen: (fn: (url: string) => void) => {
      if (typeof window !== 'undefined') {
        const handler = () => fn(window.location.pathname + (window.location.search || '') + (window.location.hash || ''));
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
  let currentChild: Node | null = null;

  effect(() => {
    const match = router.match(router.currentPath.value);
    if (currentChild && currentChild.parentNode === outletContainer) {
      outletContainer.removeChild(currentChild);
      currentChild = null;
    }
    if (match && typeof match.route.component === 'function') {
      const rendered = (match.route.component as any)({ params: match.params });
      if (rendered && typeof rendered === 'object' && 'nodeType' in rendered) {
        currentChild = rendered as Node;
        outletContainer.appendChild(currentChild);
      } else if (typeof rendered === 'string' || typeof rendered === 'number') {
        currentChild = text(String(rendered));
        outletContainer.appendChild(currentChild);
      }
    }
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
        component: child.component
      });
    }
  }

  if (childRoutes.length > 0 && routes.length === 0) {
    routes = childRoutes;
  }

  activeRouterInstance = createRouter(routes, props.initialPath);

  if (typeof props.children === 'function') {
    return props.children(activeRouterInstance);
  }

  if (childRoutes.length > 0 && childRoutes.length === childrenArr.length) {
    return RouterOutlet();
  }

  return props.children;
}

export function Link(props: { href: string; class?: string; activeClass?: string; children?: any }) {
  const router = useRouter();
  const isExternal = /^(https?:|\/\/|mailto:|tel:)/i.test(props.href);
  const safeTo = isExternal ? props.href : sanitizeRedirectUri(props.href, '/');

  const handleClick = (e: MouseEvent) => {
    if (e.defaultPrevented || (e.button !== undefined && e.button !== 0) || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    if (isExternal) return;
    e.preventDefault();
    router.navigate(safeTo);
  };

  const isActive = computed(() => {
    if (isExternal) return false;
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

  return el(
    'a',
    {
      href: safeTo,
      class: computedClass,
      onClick: handleClick
    },
    props.children
  );
}
