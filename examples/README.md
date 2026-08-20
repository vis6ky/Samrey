# Aether Framework — Runnable Examples

Working, runnable, verified examples demonstrating core framework capabilities:

1. **`basic-counter/`**: Fine-grained reactive signal state without Virtual DOM or component re-renders.
2. **`routing/`**: Declarative client & server routing with parameterized segments and open-redirect sanitization.
3. **`schema-form/`**: Standard Schema validated form state with reactive tracking and automatic ARIA accessibility bindings.
4. **`http/`**: Reactive async resource data fetching (`createResource`) with automatic request deduplication.
5. **`ssr/`**: Full isomorphic server rendering with head metadata management, streaming, and hydration.
6. **`ssg/`**: Static site generator producing pre-rendered HTML pages and XML sitemaps.
7. **`streaming-ssr/`**: Chunked HTML streaming via Web Streams API (`ReadableStream`).
8. **`hydration/`**: Pre-hydration micro-script event buffering and surgical client DOM reconnection.

## Running the Examples

All examples are tested automatically as part of the continuous integration suite:

```bash
npm run test
```
