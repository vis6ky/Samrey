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

import { DevToolsBridge, aetherDevToolsBridge } from './bridge.js';
import { GraphInspector } from './graph-inspector.js';
import { PerformanceInspector } from './perf-inspector.js';

export const SamreyDevToolsBridge = DevToolsBridge;
export const ReactiveGraphInspector = GraphInspector;
export const PerfInspector = PerformanceInspector;

export function initDevTools(options?: { targetOrigin?: string }) {
  if (options?.targetOrigin) {
    aetherDevToolsBridge.setTargetOrigin(options.targetOrigin);
  }
  return aetherDevToolsBridge;
}
