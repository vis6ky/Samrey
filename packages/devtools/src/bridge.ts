/**
 * @license Apache-2.0
 * @aether/devtools - DevTools Bridge & Event Emitter
 */

import { sanitizePayload } from './sanitizer.js';

export type DevToolsEventType = 
  | 'node:created' 
  | 'node:updated' 
  | 'transaction:batch' 
  | 'graph:snapshot'
  | 'component:mount'
  | 'component:update'
  | 'component:unmount'
  | 'signal:create'
  | 'signal:update'
  | 'effect:run'
  | 'effect:cleanup'
  | 'owner:create'
  | 'owner:dispose'
  | 'router:navigate'
  | 'http:request'
  | 'http:response'
  | 'form:change'
  | 'form:submit'
  | 'perf:measure'
  | 'diagnostic'
  | 'snapshot:full';

export interface DevToolsEvent<T = unknown> {
  type: DevToolsEventType;
  payload: T;
  timestamp: number;
}

export class DevToolsBridge {
  private listeners: ((event: DevToolsEvent) => void)[] = [];
  private eventLog: DevToolsEvent[] = [];
  private maxLogLength = 200;

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).__AETHER_DEVTOOLS_BRIDGE__ = this;
    }
  }

  emit(type: DevToolsEventType, rawPayload: unknown): void {
    // Strictly sanitize payload to prevent leaking passwords, tokens, auth headers
    const payload = sanitizePayload(rawPayload);

    const event: DevToolsEvent = {
      type,
      payload,
      timestamp: Date.now()
    };

    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogLength) {
      this.eventLog.shift();
    }

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[Aether DevTools] Listener error:', err);
      }
    }

    if (typeof window !== 'undefined' && typeof window.postMessage === 'function') {
      try {
        window.postMessage({ source: 'aether-devtools-bridge', ...event }, '*');
      } catch {
        // Ignore iframe postMessage failures
      }
    }
  }

  subscribe(listener: (event: DevToolsEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }

  getEventHistory(): readonly DevToolsEvent[] {
    return this.eventLog;
  }

  clearHistory(): void {
    this.eventLog.length = 0;
  }
}

export const aetherDevToolsBridge = new DevToolsBridge();
