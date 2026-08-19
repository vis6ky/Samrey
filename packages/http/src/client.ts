/**
 * @license Apache-2.0
 * @aether/http - Fetch Client Wrapper
 */

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

export class HttpClient {
  constructor(private baseUrl = '') {}

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = this.baseUrl ? `${this.baseUrl}${path}` : path;
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
    const url = this.baseUrl ? `${this.baseUrl}${path}` : path;
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
}
