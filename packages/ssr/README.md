# @samrey/ssr

Universal streaming HTML renderer, Unicode-escaped state serializer, and hydration system.

## Purpose

`@samrey/ssr` enables fast server-rendered HTML delivery with asynchronous streaming and progressive hydration. It generates pure HTML on Node.js/Edge servers and safely embeds serializable state with zero XSS vulnerabilities.

## Installation

```bash
npm install @samrey/ssr @samrey/runtime @samrey/reactivity
```

## Quick Example

```ts
import { renderToString, renderToStream, serializeStateForHydration } from '@samrey/ssr';
import { el } from '@samrey/runtime';

function App() {
  return el('div', { class: 'server-app' },
    el('h1', null, 'Hello from Server!'),
    el('p', null, 'Pre-rendered content for fast initial paint.')
  );
}

// 1. String rendering
const html = await renderToString(App);

// 2. State Serialization (id defaults to '__SAMREY_STATE__')
const scriptTag = serializeStateForHydration({ user: 'Alice', theme: 'dark' }, { id: '__SAMREY_STATE__' });
```

### State Serializability (`Map`, `Set`, and non-JSON structures)

Hydration state serialized via `serializeStateForHydration` (also aliased as `serializeState`) must be RFC 8259 JSON-serializable (plain objects, arrays, strings, numbers, booleans, and `Date`).

Non-JSON collections like `Map` and `Set` serialize to empty objects `{}` in standard JSON. Always convert them to plain arrays or entries before serialization:

```ts
const userPreferences = new Map([['notifications', true], ['compactView', false]]);
const activeTags = new Set(['announcements', 'updates']);

// Convert Map and Set to plain JSON-serializable structures before passing to SSR state:
const serializableState = {
  preferences: Array.from(userPreferences.entries()), // [["notifications", true], ...]
  tags: Array.from(activeTags)                         // ["announcements", "updates"]
};

const stateTag = serializeStateForHydration(serializableState, { id: '__SAMREY_STATE__' });
```

In development (`NODE_ENV !== 'production'`), passing unconverted `Map` or `Set` triggers a diagnostic warning detailing the exact property path. Passing `{ strict: true }` throws an error to catch non-serializable state early.


## API

- `renderToString(app: (() => unknown) | string, options?: RenderToStringOptions): Promise<string>` — Renders a Samrey component tree or HTML string into an HTML document string.
- `renderToStream(app: (() => unknown) | string, options?: RenderToStreamOptions): ReadableStream<Uint8Array>` — Streams HTML chunks with async data loader and suspense support.
- `serializeStateForHydration(state: unknown, options?: SerializeOptions): string` — Serializes JavaScript state into a safe `<script>` tag preventing XSS breakout (aliased as `serializeState`).
- `deserializeHydrationState(options?: DeserializeOptions): T | null` — Safely parses and optionally schema-validates serialized client hydration state.
- `getDelegatedEventScript(events?: string[], nonce?: string): string` — Generates pre-hydration delegated event capture script.
- `createSSRContext(initialState?: Record<string, unknown>): SSRContext` — Creates an isolated request-scoped SSR context with head metadata and async data loaders.

## Environment

Server environments: Node.js (>= 18.0.0), Cloudflare Workers, Deno, Bun, Edge runtimes.

## Security

Zero-injection guarantee: Serializes strings and state payloads using strict Unicode escaping (`\u003c/script\u003e`), eliminating `<script>` tag injection attacks completely.

## Related Packages

- `@samrey/runtime` — Client hydration counter-part.
- `@samrey/security` — Security primitives for serialization.
- `@samrey/router` — Universal routing on server and client.

