/**
 * @license Apache-2.0
 * @aether/runtime - Development-Only Runtime Diagnostics System
 * Tree-shakable in production builds.
 */

export interface DevDiagnostic {
  type: 'reactive-graph' | 'unnecessary-update' | 'duplicate-key' | 'hydration-mismatch' | 'router-error' | 'resource-error';
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

type DiagnosticListener = (diagnostic: DevDiagnostic) => void;

const listeners = new Set<DiagnosticListener>();
const diagnosticHistory: DevDiagnostic[] = [];
const MAX_HISTORY = 100;

export const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

export function onDevDiagnostic(listener: DiagnosticListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDevDiagnosticHistory(): readonly DevDiagnostic[] {
  return diagnosticHistory;
}

export function clearDevDiagnosticHistory(): void {
  diagnosticHistory.length = 0;
}

export function emitDevDiagnostic(diagnostic: Omit<DevDiagnostic, 'timestamp'>): void {
  if (!isDev) return;

  const fullDiag: DevDiagnostic = {
    ...diagnostic,
    timestamp: Date.now()
  };

  diagnosticHistory.push(fullDiag);
  if (diagnosticHistory.length > MAX_HISTORY) {
    diagnosticHistory.shift();
  }

  for (const listener of listeners) {
    try {
      listener(fullDiag);
    } catch {
      // Isolate listener failures
    }
  }

  // Also broadcast to DevTools bridge if active in browser
  if (typeof window !== 'undefined' && (window as any).__AETHER_DEVTOOLS_BRIDGE__) {
    try {
      (window as any).__AETHER_DEVTOOLS_BRIDGE__.emit('diagnostic', fullDiag);
    } catch {
      // Ignore bridge errors
    }
  }
}

/**
 * Reports duplicate keys in list reconciliation (<For>).
 */
export function reportDuplicateKey(key: unknown, componentName?: string): void {
  if (!isDev) return;

  const msg = `[AETH-501] Duplicate key "${String(key)}" detected in list reconciliation${componentName ? ` inside <${componentName}>` : ''}. Duplicate keys cause unpredictable DOM node reuse and state corruption.`;
  
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(msg);
  }

  emitDevDiagnostic({
    type: 'duplicate-key',
    code: 'AETH-501',
    message: msg,
    details: { key, componentName }
  });
}

/**
 * Reports SSR-to-Client hydration mismatch.
 */
export function reportHydrationMismatch(expected: string, actual: string, selectorOrTag?: string): void {
  if (!isDev) return;

  const msg = `[AETH-401] Hydration Mismatch: Client expected "${expected}" but DOM server rendered "${actual}"${selectorOrTag ? ` at <${selectorOrTag}>` : ''}. The DOM was re-rendered from scratch, discarding SSR benefits.`;

  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(msg);
  }

  emitDevDiagnostic({
    type: 'hydration-mismatch',
    code: 'AETH-401',
    message: msg,
    details: { expected, actual, selectorOrTag }
  });
}

/**
 * Reports reactive cycles or potential infinite effect loops.
 */
export function reportReactiveGraphWarning(message: string, details?: Record<string, unknown>): void {
  if (!isDev) return;

  const msg = `[AETH-301] Reactive Graph Warning: ${message}`;
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(msg);
  }

  emitDevDiagnostic({
    type: 'reactive-graph',
    code: 'AETH-301',
    message: msg,
    details
  });
}

/**
 * Reports redundant or unnecessary signal writes that trigger effect runs with identical shallow values.
 */
export function reportUnnecessaryUpdate(signalName: string, value: unknown): void {
  if (!isDev) return;

  const msg = `[Aether Dev] Signal "${signalName}" was updated with an identical value: ${JSON.stringify(value)}. Consider using strict equality checking or untrack().`;
  if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug(msg);
  }

  emitDevDiagnostic({
    type: 'unnecessary-update',
    code: 'AETH-302',
    message: msg,
    details: { signalName, value }
  });
}

/**
 * Reports router match or navigation errors.
 */
export function reportRouterError(path: string, reason: string): void {
  if (!isDev) return;

  const msg = `[Aether Router] Navigation error at "${path}": ${reason}`;
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(msg);
  }

  emitDevDiagnostic({
    type: 'router-error',
    code: 'AETH-ROUTER-404',
    message: msg,
    details: { path, reason }
  });
}

/**
 * Reports async resource fetching or parsing errors.
 */
export function reportResourceError(resourceName: string, error: unknown): void {
  if (!isDev) return;

  const msg = `[Aether Resource] Resource "${resourceName}" failed: ${error instanceof Error ? error.message : String(error)}`;
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(msg);
  }

  emitDevDiagnostic({
    type: 'resource-error',
    code: 'AETH-RES-ERR',
    message: msg,
    details: { resourceName, error: String(error) }
  });
}
