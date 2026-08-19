/**
 * @license Apache-2.0
 * @aether/router - Router State Manager
 */

import { signal, computed } from '@aether/reactivity';
import { RouteRecord, RouterInstance, RouteMatch } from './types.js';
import { matchRoutes } from './matcher.js';

export function createRouter(routes: RouteRecord[], initialPath = '/'): RouterInstance {
  const pathSignal = signal(initialPath);

  const activeMatch = computed(() => {
    return matchRoutes(routes, pathSignal.value);
  });

  const activeParams = computed(() => {
    return activeMatch.value ? activeMatch.value.params : {};
  });

  function navigate(to: string): void {
    if (pathSignal.value !== to) {
      pathSignal.value = to;
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState(null, '', to);
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
