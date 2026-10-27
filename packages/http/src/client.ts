/**
 * @license Apache-2.0
 * @samrey/http - Fetch Client Wrapper
 */

import { sanitizeUri } from '@samrey/security';
import { HttpError } from './types.js';

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

function mergeHeaders(defaults: Record<string, string>, userHeaders?: HeadersInit): Headers {
  const headers = new Headers();
  for (const [k, v] of Object.entries(defaults)) {
    headers.set(k, v);
  }
  if (userHeaders) {
    if (userHeaders instanceof Headers) {
      userHeaders.forEach((v, k) => headers.set(k, v));
    } else if (Array.isArray(userHeaders)) {
      for (const [k, v] of userHeaders) {
        headers.set(k, v);
      }
    } else if (typeof userHeaders === 'object') {
      for (const [k, v] of Object.entries(userHeaders)) {
        if (v !== undefined) headers.set(k, String(v));
      }
    }
  }
  return headers;
}

export class HttpClient {
  constructor(private baseUrl = '') {}

  private resolveUrl(path: string): string {
    const raw = this.baseUrl ? `${this.baseUrl}${path}` : path;
    const safe = sanitizeUri(raw);
    if (safe === 'about:blank' && raw !== 'about:blank') {
      throw new Error(`[Samrey HTTP] Blocked insecure request URL: "${raw}"`);
    }
    return raw;
  }

  private async request<T>(path: string, method: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    const url = this.resolveUrl(path);

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const isBlobOrBuffer = (typeof Blob !== 'undefined' && body instanceof Blob) ||
      (typeof ArrayBuffer !== 'undefined' && (body instanceof ArrayBuffer || ArrayBuffer.isView(body)));
    const isSearchParams = typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams;

    const defaultHeaders: Record<string, string> = {
      'Accept': 'application/json'
    };

    if (body !== undefined && !isFormData && !isBlobOrBuffer && !isSearchParams) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    const headers = mergeHeaders(defaultHeaders, options.headers);

    let requestBody: any = undefined;
    if (body !== undefined) {
      if (isFormData || isBlobOrBuffer || isSearchParams || typeof body === 'string') {
        requestBody = body;
      } else {
        requestBody = JSON.stringify(body);
      }
    }

    let controller: AbortController | undefined;
    let timeoutId: any;
    let signal = options.signal;

    if (options.timeoutMs && options.timeoutMs > 0) {
      controller = new AbortController();
      if (signal) {
        signal.addEventListener('abort', () => controller?.abort(signal?.reason));
      }
      timeoutId = setTimeout(() => {
        controller?.abort(new Error(`[Samrey HTTP] Request timed out after ${options.timeoutMs}ms`));
      }, options.timeoutMs);
      signal = controller.signal;
    }

    try {
      const res = await fetch(url, {
        ...options,
        method,
        headers,
        body: requestBody,
        signal
      });

      if (!res.ok) {
        let errBody: any;
        try {
          errBody = await res.json();
        } catch {
          try {
            errBody = await res.text();
          } catch {
            errBody = undefined;
          }
        }
        throw new HttpError(res.status, `HTTP Error ${res.status}: ${res.statusText}`, errBody);
      }

      if (res.status === 204 || res.status === 205) {
        return undefined as unknown as T;
      }

      const text = await res.text();
      if (!text || text.trim() === '') {
        return undefined as unknown as T;
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        return text as unknown as T;
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, 'GET', undefined, options);
  }

  async post<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, 'POST', body, options);
  }

  async put<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, 'PUT', body, options);
  }

  async patch<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, 'PATCH', body, options);
  }

  async delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, 'DELETE', undefined, options);
  }
}

export function createHttpClient(baseUrl?: string): HttpClient {
  return new HttpClient(baseUrl);
}

export const httpClient = new HttpClient();
