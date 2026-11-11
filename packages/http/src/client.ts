/**
 * @license Apache-2.0
 * @samrey/http - Fetch Client Wrapper
 */

import { sanitizeUri, safeJsonParse, scrubPrototypePollution } from '@samrey/security';
import { HttpError } from './types.js';

async function readSafeResponsePayload<T>(res: Response): Promise<T | undefined> {
  if (typeof res.text === 'function') {
    const rawText = await res.text();
    if (!rawText || rawText.trim() === '') {
      return undefined;
    }
    try {
      return safeJsonParse<T>(rawText);
    } catch {
      return rawText as unknown as T;
    }
  }
  if (typeof res.json === 'function') {
    return scrubPrototypePollution(await res.json()) as T;
  }
  return undefined;
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  allowCrossOrigin?: boolean;
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

  private resolveUrl(path: string, allowCrossOrigin = false): string {
    const trimmedPath = path.trim();
    if (/^https?:(?!\/\/)/i.test(trimmedPath)) {
      throw new Error(`[Samrey HTTP] Blocked malformed HTTP URL: "${path}"`);
    }

    let raw: string;
    if (trimmedPath.startsWith('//')) {
      if (this.baseUrl && !allowCrossOrigin) {
        throw new Error(`[Samrey HTTP] Blocked protocol-relative URL "${path}" when baseUrl is configured`);
      }
      raw = trimmedPath;
    } else if (/^https?:\/\//i.test(trimmedPath)) {
      if (this.baseUrl && !allowCrossOrigin) {
        const sentinelBase = 'https://__samrey_http_base__.invalid';
        const baseUrlObj = new URL(this.baseUrl, sentinelBase);
        const targetUrlObj = new URL(trimmedPath);
        if (baseUrlObj.origin !== targetUrlObj.origin) {
          throw new Error(`[Samrey HTTP] Blocked cross-origin URL "${path}" when baseUrl is configured`);
        }
      }
      raw = trimmedPath;
    } else if (this.baseUrl) {
      const cleanBase = this.baseUrl.replace(/\/+$/, '');
      const cleanPath = trimmedPath.startsWith('/') ? trimmedPath : '/' + trimmedPath;
      raw = `${cleanBase}${cleanPath}`;
    } else {
      raw = trimmedPath;
    }
    const safe = sanitizeUri(raw);
    if (safe === 'about:blank' && raw !== 'about:blank') {
      throw new Error(`[Samrey HTTP] Blocked insecure request URL: "${raw}"`);
    }
    return safe;
  }

  private async request<T>(path: string, method: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    const url = this.resolveUrl(path, options.allowCrossOrigin);

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
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const externalSignal = options.signal;
    let abortListener: (() => void) | undefined;
    let signal = externalSignal;

    if (options.timeoutMs && options.timeoutMs > 0) {
      controller = new AbortController();
      if (externalSignal) {
        if (externalSignal.aborted) {
          controller.abort(externalSignal.reason);
        } else {
          abortListener = () => controller?.abort(externalSignal.reason);
          externalSignal.addEventListener('abort', abortListener, { once: true });
        }
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
        let errBody: unknown;
        try {
          errBody = await readSafeResponsePayload(res);
        } catch {
          errBody = undefined;
        }
        throw new HttpError(res.status, `HTTP Error ${res.status}: ${res.statusText}`, errBody);
      }

      if (res.status === 204 || res.status === 205) {
        return undefined as unknown as T;
      }

      return (await readSafeResponsePayload<T>(res)) as T;
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      if (externalSignal && abortListener) {
        externalSignal.removeEventListener('abort', abortListener);
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
