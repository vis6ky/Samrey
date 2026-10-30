/**
 * @license Apache-2.0
 * @samrey/devtools - Main Entry Point
 */

export * from './bridge.js';
export * from './sanitizer.js';
export * from './graph-inspector.js';
export * from './component-inspector.js';
export * from './owner-inspector.js';
export * from './router-inspector.js';
export * from './network-inspector.js';
export * from './form-inspector.js';
export * from './perf-inspector.js';

import { DevToolsBridge, samreyDevToolsBridge } from './bridge.js';
import { GraphInspector } from './graph-inspector.js';
import { PerformanceInspector } from './perf-inspector.js';

export const SamreyDevToolsBridge = DevToolsBridge;
export const ReactiveGraphInspector = GraphInspector;
export const PerfInspector = PerformanceInspector;

export function initDevTools(options?: { targetOrigin?: string }) {
  if (process.env.NODE_ENV === 'production') {
    return samreyDevToolsBridge;
  }
  if (typeof window !== 'undefined') {
    (window as any).__SAMREY_DEVTOOLS_BRIDGE__ = samreyDevToolsBridge;
    if (window.location && window.location.origin && window.location.origin !== 'null') {
      samreyDevToolsBridge.addAllowedOrigin(window.location.origin);
      if (!options?.targetOrigin) {
        samreyDevToolsBridge.setTargetOrigin(window.location.origin);
      }
    }
  }
  if (options?.targetOrigin) {
    samreyDevToolsBridge.setTargetOrigin(options.targetOrigin);
  }
  return samreyDevToolsBridge;
}

export const initDevtools = initDevTools;

export function getGraphSnapshot() {
  const inspector = new GraphInspector();
  return inspector.getSnapshot();
}
