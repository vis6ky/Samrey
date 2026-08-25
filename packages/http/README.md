# @samrey/http

Reactive data fetching primitive, automatic in-flight deduplication cache, retry policies, and typed HTTP client.

## Purpose

`@samrey/http` provides seamless asynchronous resource fetching tightly integrated with Samrey signals. It handles abort signals, loading/error states, caching, and suspense integration out of the box.

## Installation

```bash
npm install @samrey/http @samrey/reactivity
```

## Quick Example

```ts
import { createResource, HttpClient } from '@samrey/http';
import { signal } from '@samrey/reactivity';

const userId = signal('1');

// 1. Reactive Resource fetching
const [user, { mutate, refetch }] = createResource(userId, async (id, { signal }) => {
  const res = await fetch(`https://api.example.com/users/${id}`, { signal });
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
});

console.log(user.loading.value); // true
console.log(user.data.value);    // undefined -> user object once resolved

// 2. Typed HTTP Client
const client = new HttpClient({ baseUrl: 'https://api.example.com' });
const data = await client.get('/items');
```

## API

- `createResource<T, S>(source, fetcher, options)` — Creates a reactive resource bound to source signals. Returns `[ResourceSignal<T>, ResourceActions<T>]`.
- `HttpClient` — Configurable HTTP client class with interceptors, timeouts, and JSON helpers.
- `RequestCache` — Request cache and deduplication store.
- `createHttpError(status, message, response)` — Structured HTTP error constructor with status codes.

## Environment

Universal: Node.js (>= 18.0.0 with native `fetch`), Bun, Deno, and all modern browsers.

## Security

Supports automatic CSRF header injection, origin validation, and timeout guarantees to prevent denial-of-service hangs.

## Related Packages

- `@samrey/reactivity` — Signal engine driving resource triggers.
- `@samrey/runtime` — Suspense and ErrorBoundary integration.

