/**
 * @license Apache-2.0
 * @aether/devtools - DevTools Bridge & Event Emitter
 */

export interface DevToolsEvent {
  type: 'node:created' | 'node:updated' | 'transaction:batch' | 'graph:snapshot';
  payload: unknown;
  timestamp: number;
}

export class DevToolsBridge {
  private listeners: ((event: DevToolsEvent) => void)[] = [];

  emit(type: DevToolsEvent['type'], payload: unknown): void {
    const event: DevToolsEvent = {
      type,
      payload,
      timestamp: Date.now()
    };

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[Aether DevTools] Listener error:', err);
      }
    }

    if (typeof window !== 'undefined' && typeof window.postMessage === 'function') {
      window.postMessage({ source: 'aether-devtools-bridge', ...event }, '*');
    }
  }

  subscribe(listener: (event: DevToolsEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }
}

export const aetherDevToolsBridge = new DevToolsBridge();
