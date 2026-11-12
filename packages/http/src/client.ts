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

function safeDecodeLeadingRedirectCheck(val: string): string {
  try {
    return decodeURIComponent(val);
  } catch {
    return val.replace(/%([0-9a-fA-F]{2})/g, (full, hex: string) => {
      const code = parseInt(hex, 16);
      return code <= 0x7f ? String.fromCharCode(code) : full;
    });
  }
}

function isProtocolRelativeUrl(raw: string): boolean {
  const candidates = [raw, safeDecodeLeadingRedirectCheck(raw)];
  return candidates.some((candidate) => {
    const slashed = candidate.replace(/\\/g, '/').trim();
    return slashed.startsWith('//') || raw.trim().startsWith('\\');
  });
}

export class HttpClient {
  constructor(private baseUrl = '') {}

  private getExpectedOrigin(): string | null {
    if (this.baseUrl && /^https?:\/\//i.test(this.baseUrl)) {
      return new URL(this.baseUrl).origin;
    }
    if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null') {
      return window.location.origin;
    }
    return null;
  }

  private assertOriginAllowed(targetUrl: string, allowCrossOrigin: boolean, label = 'URL'): void {
    if (allowCrossOrigin) return;
    const expectedOrigin = this.getExpectedOrigin();
    let parsedTarget: URL;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      throw new Error(`[Samrey HTTP] Blocked cross-origin ${label} "${targetUrl}"`);
    }
    if (!expectedOrigin || parsedTarget.origin !== expectedOrigin) {
      throw new Error(
        `[Samrey HTTP] Blocked cross-origin ${label} "${targetUrl}" (allowCrossOrigin is false)`
      );
    }
  }

  private resolveUrl(path: string, allowCrossOrigin = false): string {
    const trimmedPath = path.trim();
    if (/^[a-z][a-z0-9+.-]*:(?!\/\/)/i.test(trimmedPath) && /^https?:/i.test(trimmedPath)) {
      throw new Error(`[Samrey HTTP] Blocked malformed HTTP URL: "${path}"`);
    }

    if (!allowCrossOrigin && isProtocolRelativeUrl(trimmedPath)) {
      throw new Error(`[Samrey HTTP] Blocked protocol-relative URL "${path}"`);
    }

    let raw: string;
    if (trimmedPath.startsWith('//') || isProtocolRelativeUrl(trimmedPath)) {
      raw = trimmedPath;
    } else if (/^https?:\/\//i.test(trimmedPath)) {
      this.assertOriginAllowed(trimmedPath, allowCrossOrigin, 'URL');
      raw = trimmedPath;
    } else if (this.baseUrl) {
      const cleanBase = this.baseUrl.replace(/\/+$/, '');
      const cleanPath = trimmedPath.startsWith('/') ? trimmedPath : '/' + trimmedPath;
      raw = `${cleanBase}${cleanPath}`;
    } else {
      raw = trimmedPath;
    }

    if (!allowCrossOrigin && isProtocolRelativeUrl(raw)) {
      throw new Error(`[Samrey HTTP] Blocked protocol-relative URL "${path}"`);
    }

    const safe = sanitizeUri(raw);
    if (safe === 'about:blank' && raw !== 'about:blank') {
      throw new Error(`[Samrey HTTP] Blocked insecure request URL: "${raw}"`);
    }
    if (!allowCrossOrigin && isProtocolRelativeUrl(safe)) {
      throw new Error(`[Samrey HTTP] Blocked protocol-relative URL "${path}"`);
    }
    return safe;
  }

  private async request<T>(path: string, method: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    const allowCrossOrigin = Boolean(options.allowCrossOrigin);
    let currentUrl = this.resolveUrl(path, allowCrossOrigin);

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

    let currentMethod = method;
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

    const maxRedirects = 5;

    try {
      let res!: Response;
      for (let hop = 0; hop <= maxRedirects; hop++) {
        const effectiveRedirect: RequestRedirect = !allowCrossOrigin
          ? (options.redirect === 'error' ? 'error' : 'manual')
          : (options.redirect ?? 'manual');
        res = await fetch(currentUrl, {
          ...options,
          redirect: effectiveRedirect,
          method: currentMethod,
          headers,
          body: requestBody,
          signal
        });

        if (!allowCrossOrigin) {
          if ((res as any).type === 'opaqueredirect') {
            throw new Error('[Samrey HTTP] Blocked unverified opaque cross-origin redirect');
          }
          if (res.url) {
            if (/^https?:\/\//i.test(res.url)) {
              this.assertOriginAllowed(res.url, false, 'redirect URL');
            } else if (isProtocolRelativeUrl(res.url)) {
              throw new Error(`[Samrey HTTP] Blocked protocol-relative redirect URL "${res.url}"`);
            }
          }
        }

        const isRedirectStatus = res.status >= 300 && res.status < 400;
        const locationHeader = isRedirectStatus ? res.headers?.get?.('location') : null;
        if (!isRedirectStatus || !locationHeader || (options.redirect && options.redirect !== 'follow')) {
          break;
        }
        if (hop === maxRedirects) {
          throw new Error(`[Samrey HTTP] Exceeded maximum redirect limit (${maxRedirects})`);
        }

        const trimmedLoc = locationHeader.trim();
        if (!allowCrossOrigin && isProtocolRelativeUrl(trimmedLoc)) {
          throw new Error(`[Samrey HTTP] Blocked protocol-relative redirect "${locationHeader}"`);
        }

        const prevOrigin = /^https?:\/\//i.test(currentUrl)
          ? new URL(currentUrl).origin
          : this.getExpectedOrigin();

        let nextTarget: string;
        if (/^https?:\/\//i.test(trimmedLoc)) {
          this.assertOriginAllowed(trimmedLoc, allowCrossOrigin, 'redirect');
          const safe = sanitizeUri(trimmedLoc);
          if (safe === 'about:blank') {
            throw new Error(`[Samrey HTTP] Blocked insecure redirect URL: "${trimmedLoc}"`);
          }
          nextTarget = safe;
        } else if (/^https?:\/\//i.test(currentUrl)) {
          const resolvedLoc = new URL(trimmedLoc, currentUrl).href;
          this.assertOriginAllowed(resolvedLoc, allowCrossOrigin, 'redirect');
          const safe = sanitizeUri(resolvedLoc);
          if (safe === 'about:blank') {
            throw new Error(`[Samrey HTTP] Blocked insecure redirect URL: "${resolvedLoc}"`);
          }
          nextTarget = safe;
        } else {
          const sentinelBase = 'https://__samrey_self__.invalid';
          const resolved = new URL(trimmedLoc, new URL(currentUrl || '/', sentinelBase));
          if (resolved.origin !== sentinelBase) {
            if (!allowCrossOrigin) {
              throw new Error(`[Samrey HTTP] Blocked cross-origin redirect "${locationHeader}" (allowCrossOrigin is false)`);
            }
            const proto = (typeof window !== 'undefined' && /^https?:$/i.test(window.location?.protocol || ''))
              ? window.location.protocol
              : 'https:';
            const externalUrl = trimmedLoc.startsWith('//')
              ? `${proto}//${resolved.host}${resolved.pathname}${resolved.search}${resolved.hash}`
              : resolved.href;
            const safe = sanitizeUri(externalUrl);
            if (safe === 'about:blank' || isProtocolRelativeUrl(safe)) {
              throw new Error(`[Samrey HTTP] Blocked insecure redirect URL: "${locationHeader}"`);
            }
            nextTarget = safe;
          } else {
            const relTarget = `${resolved.pathname}${resolved.search}${resolved.hash}`;
            const safe = sanitizeUri(relTarget);
            if (safe === 'about:blank' || (!allowCrossOrigin && isProtocolRelativeUrl(safe))) {
              throw new Error(`[Samrey HTTP] Blocked insecure redirect URL: "${locationHeader}"`);
            }
            nextTarget = safe;
          }
        }

        if (/^https?:\/\//i.test(nextTarget)) {
          const nextOrigin = new URL(nextTarget).origin;
          if (!prevOrigin || nextOrigin !== prevOrigin) {
            headers.delete('authorization');
            headers.delete('cookie');
          }
        }

        if (res.status === 303 || ((res.status === 301 || res.status === 302) && currentMethod === 'POST')) {
          currentMethod = 'GET';
          requestBody = undefined;
        }
        currentUrl = nextTarget;
      }

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
