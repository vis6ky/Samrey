/**
 * @license Apache-2.0
 * @aether/http - Fetch Client Wrapper
 */

import { sanitizeUri } from '@aether/security';

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

export class HttpClient {
  constructor(private baseUrl = '') {}

  private resolveUrl(path: string): string {
    const raw = this.baseUrl ? `${this.baseUrl}${path}` : path;
    const safe = sanitizeUri(raw);
    if (safe === 'about:blank' && raw !== 'about:blank') {
      throw new Error(`[Aether HTTP] Blocked insecure request URL: "${raw}"`);
    }
    return raw;
  }

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.resolveUrl(path);
    const res = await fetch(url, {
      ...options,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...options.headers
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    const url = this.resolveUrl(path);
    const res = await fetch(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  async put<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    const url = this.resolveUrl(path);
    const res = await fetch(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  async patch<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    const url = this.resolveUrl(path);
    const res = await fetch(url, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  async delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.resolveUrl(path);
    const res = await fetch(url, {
      ...options,
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        ...options.headers
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }
}

export function createHttpClient(baseUrl?: string): HttpClient {
  return new HttpClient(baseUrl);
}

export const httpClient = new HttpClient();
