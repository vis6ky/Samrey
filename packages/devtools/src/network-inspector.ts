/**
 * @license Apache-2.0
 * @samrey/devtools - HTTP & Resource Network Inspector
 */

import { aetherDevToolsBridge } from './bridge.js';
import { sanitizePayload } from './sanitizer.js';

export interface InspectedHttpRequest {
  id: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status?: number;
  statusText?: string;
  responseBody?: unknown;
  error?: string;
}

export class NetworkInspector {
  private requests = new Map<string, InspectedHttpRequest>();

  recordRequest(id: string, method: string, url: string, headers?: Record<string, string>, body?: unknown): void {
    const safeHeaders: Record<string, string> = {};
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (/auth|cookie|token|key|secret/i.test(k)) {
          safeHeaders[k] = '[REDACTED]';
        } else {
          safeHeaders[k] = v;
        }
      }
    }

    const req: InspectedHttpRequest = {
      id,
      method: method.toUpperCase(),
      url,
      headers: safeHeaders,
      body: sanitizePayload(body),
      startTime: Date.now()
    };

    this.requests.set(id, req);
    aetherDevToolsBridge.emit('http:request', req);
  }

  recordResponse(id: string, status: number, statusText: string, responseBody?: unknown): void {
    const req = this.requests.get(id);
    if (!req) return;

    req.endTime = Date.now();
    req.durationMs = req.endTime - req.startTime;
    req.status = status;
    req.statusText = statusText;
    req.responseBody = sanitizePayload(responseBody);

    aetherDevToolsBridge.emit('http:response', req);
  }

  recordError(id: string, error: unknown): void {
    const req = this.requests.get(id);
    if (!req) return;

    req.endTime = Date.now();
    req.durationMs = req.endTime - req.startTime;
    req.error = error instanceof Error ? error.message : String(error);

    aetherDevToolsBridge.emit('http:response', req);
  }

  getRequests(): InspectedHttpRequest[] {
    return Array.from(this.requests.values());
  }

  clear(): void {
    this.requests.clear();
  }
}

export const defaultNetworkInspector = new NetworkInspector();
