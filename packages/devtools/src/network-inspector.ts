/**
 * @license Apache-2.0
 * @samrey/devtools - HTTP & Resource Network Inspector
 */

import { samreyDevToolsBridge } from './bridge.js';
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
  private maxRequests = 200;

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

    let safeUrl = url;
    try {
      const qIdx = url.indexOf('?');
      if (qIdx !== -1) {
        const base = url.slice(0, qIdx);
        const search = url.slice(qIdx + 1);
        const hIdx = search.indexOf('#');
        const queryPart = hIdx === -1 ? search : search.slice(0, hIdx);
        const hashPart = hIdx === -1 ? '' : search.slice(hIdx);
        const sp = new URLSearchParams(queryPart);
        for (const [k] of Array.from(sp.entries())) {
          if (/auth|token|key|secret|password|credential|access_token|api_key/i.test(k)) {
            sp.set(k, '[REDACTED]');
          }
        }
        safeUrl = base + '?' + sp.toString() + hashPart;
      }
    } catch {
      safeUrl = url;
    }

    const req: InspectedHttpRequest = {
      id,
      method: method.toUpperCase(),
      url: safeUrl,
      headers: safeHeaders,
      body: sanitizePayload(body),
      startTime: Date.now()
    };

    if (this.requests.size >= this.maxRequests) {
      const oldestKey = this.requests.keys().next().value;
      if (oldestKey) this.requests.delete(oldestKey);
    }

    this.requests.set(id, req);
    samreyDevToolsBridge.emit('http:request', req);
  }

  recordResponse(id: string, status: number, statusText: string, responseBody?: unknown): void {
    const req = this.requests.get(id);
    if (!req) return;

    req.endTime = Date.now();
    req.durationMs = req.endTime - req.startTime;
    req.status = status;
    req.statusText = statusText;
    req.responseBody = sanitizePayload(responseBody);

    samreyDevToolsBridge.emit('http:response', req);
  }

  recordError(id: string, error: unknown): void {
    const req = this.requests.get(id);
    if (!req) return;

    req.endTime = Date.now();
    req.durationMs = req.endTime - req.startTime;
    req.error = error instanceof Error ? error.message : String(error);

    samreyDevToolsBridge.emit('http:response', req);
  }

  getRequests(): InspectedHttpRequest[] {
    return Array.from(this.requests.values());
  }

  clear(): void {
    this.requests.clear();
  }
}

export const defaultNetworkInspector = new NetworkInspector();
