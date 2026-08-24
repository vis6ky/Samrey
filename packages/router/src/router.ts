/**
 * @license Apache-2.0
 * @gati/router - Router State Manager
 */

import { signal, computed } from '@gati/reactivity';
import { sanitizeRedirectUri } from '@gati/security';
import { RouteRecord, RouterInstance, RouteMatch } from './types.js';
import { matchRoutes } from './matcher.js';

export function createRouter(routes: RouteRecord[], initialPath = '/'): RouterInstance {
  const safeInitial = sanitizeRedirectUri(initialPath, '/');
  const pathSignal = signal(safeInitial);

  const activeMatch = computed(() => {
    return matchRoutes(routes, pathSignal.value);
  });

  const activeParams = computed(() => {
    return activeMatch.value ? activeMatch.value.params : {};
  });

  function navigate(to: string): void {
    const safeTo = sanitizeRedirectUri(to, pathSignal.value);
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
  const searchSignal = signal(typeof window !== 'undefined' ? window.location.search : '');
  const setSearch = (s: string) => {
    searchSignal.value = s;
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
        const handler = () => fn(window.location.pathname);
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

export function Router(props: { routes?: RouteRecord[]; children?: any }) {
  const routes = props.routes || [];
  activeRouterInstance = createRouter(routes);
  return typeof props.children === 'function' ? props.children() : props.children;
}

export function Link(props: { href: string; class?: string; activeClass?: string; children?: any }) {
  const router = useRouter();
  const safeTo = sanitizeRedirectUri(props.href, '/');
  const handleClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.navigate(safeTo);
  };
  return {
    tagName: 'A',
    attrs: {
      href: safeTo,
      class: props.class || ''
    },
    onClick: handleClick,
    children: props.children
  };
}
