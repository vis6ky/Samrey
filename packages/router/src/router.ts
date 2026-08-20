/**
 * @license Apache-2.0
 * @aether/router - Router State Manager
 */

import { signal, computed } from '@aether/reactivity';
import { sanitizeRedirectUri } from '@aether/security';
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
