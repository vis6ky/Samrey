# `@aether/http`

Reactive data fetching primitive, automatic in-flight deduplication cache, and typed HTTP client for Aether.

## Key Primitives

- `createResource(source, fetcher)`: Reactive signal with `data`, `loading`, `error`, `status`, and auto-cancellation via `AbortController`.
- `RequestCache`: In-flight deduplication and cache tag store.
- `HttpClient`: Zero-dependency fetch abstraction.
