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
import { renderToString, renderToStream, serializeState } from '@samrey/ssr';
import { el } from '@samrey/runtime';

function App() {
  return el('div', { class: 'server-app' },
    el('h1', null, 'Hello from Server!'),
    el('p', null, 'Pre-rendered content for fast initial paint.')
  );
}

// 1. String rendering
const html = await renderToString(App);

// 2. State Serialization
const scriptTag = serializeState('__SAMREY_STATE__', { user: 'Alice', theme: 'dark' });
```

## API

- `renderToString(component: () => HTMLElement | Promise<HTMLElement>, options?: SsrOptions): Promise<string>` — Renders an Samrey component tree into an HTML string.
- `renderToStream(component: () => HTMLElement, options?: StreamOptions): ReadableStream` — Streams HTML chunks with suspense boundary support.
- `serializeState(key: string, data: unknown): string` — Serializes JavaScript state into a safe `<script>` tag preventing XSS breakout.
- `generateHydrationScript(): string` — Generates client bootstrap hydration script for event replay.
- `createStaticCollector()` — Collects static assets (head meta, links, styles) during server rendering.

## Environment

Server environments: Node.js (>= 18.0.0), Cloudflare Workers, Deno, Bun, Edge runtimes.

## Security

Zero-injection guarantee: Serializes strings and state payloads using strict Unicode escaping (`\u003c/script\u003e`), eliminating `<script>` tag injection attacks completely.

## Related Packages

- `@samrey/runtime` — Client hydration counter-part.
- `@samrey/security` — Security primitives for serialization.
- `@samrey/router` — Universal routing on server and client.

