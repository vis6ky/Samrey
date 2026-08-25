/**
 * @license Apache-2.0
 * @samrey/devtools - Router & Navigation Inspector
 */

import { aetherDevToolsBridge } from './bridge.js';
import { sanitizePayload } from './sanitizer.js';

export interface InspectedRoute {
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  title?: string;
  timestamp: number;
}

export class RouterInspector {
  private history: InspectedRoute[] = [];
  private currentRoute: InspectedRoute | null = null;

  recordNavigation(path: string, params?: Record<string, string>, query?: Record<string, string>, title?: string): void {
    const route: InspectedRoute = {
      path,
      params: sanitizePayload(params),
      query: sanitizePayload(query),
      title,
      timestamp: Date.now()
    };

    this.currentRoute = route;
    this.history.push(route);
    if (this.history.length > 50) {
      this.history.shift();
    }

    aetherDevToolsBridge.emit('router:navigate', route);
  }

  getCurrentRoute(): InspectedRoute | null {
    return this.currentRoute;
  }

  getNavigationHistory(): readonly InspectedRoute[] {
    return this.history;
  }

  clear(): void {
    this.history.length = 0;
    this.currentRoute = null;
  }
}

export const defaultRouterInspector = new RouterInspector();
