# Aether Server-Side Rendering (SSR) & Client Hydration Architecture

## Overview

Aether provides a first-class, high-performance isomorphic rendering architecture. It supports Server-Side Rendering (SSR), Static Site Generation (SSG), fine-grained client hydration, streaming HTML, and robust security guardrails against XSS and secret credential leakage.

```
Server (Node / Edge)
      ↓
Application Root (Single-execution setup + Async loaders)
      ↓
HTML Document (Pre-rendered DOM Shell + <template> tags)
      ↓
Serialized State (<script id="__AETHER_STATE__" type="application/json">)
      ↓
Browser (Immediate First Contentful Paint + Inline Event Delegator)
      ↓
Hydration (Non-destructive fine-grained signal attachment + Event replay)
      ↓
Interactive Application
```

---

## 1. Architectural Principles

### Direct Template Hoisting & Zero VDOM
Unlike traditional Virtual DOM frameworks that reconstruct an entire synthetic tree on both server and client, Aether renders semantic HTML directly on the server and attaches fine-grained reactive subscriptions (`effect`, `signal`) in-place during client hydration.

### Zero-Waterfall Server Data Hydration
When components use `createServerData(key, loader)`, data is fetched concurrently during the server render pass. The resolved values are embedded into a secure, Unicode-escaped `<script id="__AETHER_STATE__">` tag. On boot, client signals synchronously read the cached state with **zero additional client-side network roundtrips**.

### Zero-Overhead Inline Event Delegator
To eliminate the "uncanny valley" (where the page is visible but unresponsive before JavaScript bundles finish downloading), Aether injects a ~200-byte capture delegator in `<head>`. Any clicks, form submissions, or inputs prior to bundle completion are captured in `window.__AETHER_EVENTS__` and immediately replayed to the hydrated DOM nodes upon `hydrate()`.

---

## 2. Server-Side Rendering (SSR)

### `renderToString`
Renders an application component tree to a full, valid HTML document:

```typescript
import { renderToString, createSSRContext } from '@aether/ssr';
import { App } from './app.js';

const html = await renderToString(App, {
  title: 'My Dashboard',
  clientScript: '/static/client.js',
  clientStyles: ['/static/styles.css']
});
```

### `renderToStream`
Streams HTML chunks incrementally using web-standard `ReadableStream<Uint8Array>`:

```typescript
import { renderToStream } from '@aether/ssr';

const stream = renderToStream(App, {
  title: 'Real-time Streaming Page'
});

// Pass stream directly to Express, Fastify, Cloudflare Workers, or Deno response
return new Response(stream, {
  headers: { 'Content-Type': 'text/html; charset=utf-8' }
});
```

---

## 3. Static Site Generation (SSG)

Aether's `generateStaticSite` engine compiles route manifests into pre-rendered static `.html` files, dynamic parameterized paths, and automated XML sitemaps:

```typescript
import { generateStaticSite, StaticRouteConfig } from '@aether/ssr';

const routes: StaticRouteConfig[] = [
  { path: '/', component: () => '<h1>Home</h1>' },
  { path: '/about', component: () => '<h1>About</h1>' },
  {
    path: '/blog/:slug',
    component: () => '<article>Blog Post</article>',
    getStaticPaths: async () => [
      { params: { slug: 'launching-aether' } },
      { params: { slug: 'signals-deep-dive' } }
    ]
  }
];

const result = await generateStaticSite(routes, {
  outDir: 'dist/static',
  generateSitemap: true,
  baseUrl: 'https://aether.dev'
});
```

---

## 4. Security Model & Secret Leakage Prevention

### Automated Secret Stripping (`SecretGuard`)
Server state frequently contains sensitive environment variables or database objects. To prevent accidental credential exposure, Aether's `stripSecrets` engine scans state payloads recursively and strips keys matching sensitive patterns:
- Passwords (`password`, `passwordHash`, `salt`)
- Secret keys and API keys (`apiKey`, `clientSecret`, `secretKey`, `serviceRole`)
- Authentication tokens (`bearer`, `jwt`, `token`, `session`, `cookie`)
- Database connection strings (`database_url`, `connection_string`)
- Environment prefixes (`env.*`, `process.env.*`, `_secret*`)

In strict mode (`strict: true`), any attempt to serialize sensitive fields will immediately abort serialization and throw a `SecurityViolation` error.

### Script Breakout XSS Defenses
The state serializer prevents HTML parser breakouts (`</script>`, `<!--`, CDATA, line separators) by replacing `<` with `\u003c`, `>` with `\u003e`, `&` with `\u0026`, and Unicode paragraph/line separators `\u2028` and `\u2029`.

### Prototype Pollution Defense & State Validation
During client hydration, `safeJsonParse` revives data while scrubbing `__proto__`, `constructor`, and `prototype` vectors. Schema validators verify structure before mounting.

---

## 5. Client Hydration Engine

```typescript
import { hydrate, deserializeHydrationState } from '@aether/ssr';
import { App } from './app.js';

const state = deserializeHydrationState();
const container = document.getElementById('app');

const { dispose, replayedEventsCount } = hydrate(App, container, {
  repairMismatch: true,
  onMismatch: (expected, actual) => {
    console.warn(`Hydration mismatch: expected ${expected}, got ${actual}`);
  }
});
```

---

## 6. Performance Benchmarks

| Metric | Result |
| :--- | :--- |
| **Server Render Time** | **0.140 ms / render** (~7,159 ops/sec) |
| **Minimal HTML Document** | **541 bytes** (~0.53 KB) |
| **Full Document with State** | **1,831 bytes** (~1.79 KB) |
| **Inline Event Delegator** | **215 bytes** |
| **Client Hydration Runtime** | **~4.71 KB** uncompressed (~1.9 KB Brotli) |
| **DOM Hydration Latency** | **20.47 µs / cycle** (~48,847 hydrations/sec) |
