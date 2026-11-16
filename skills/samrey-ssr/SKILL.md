---
name: samrey-ssr
description: Server-side rendering, streaming HTML, pre-hydration script, state serialization, and client hydration in @samrey/ssr.
---

# Samrey Server-Side Rendering & Hydration (`samrey-ssr`)

## 1. Skill Description & Activation Criteria
- **Purpose**: Teaches how to build full-stack SSR applications, stream HTML from Node.js, serialize state safely, and hydrate on the client.
- **Activation Criteria**: Trigger when configuring Node.js server scripts, implementing `renderToString` or `renderToStream`, setting up hydration, or resolving hydration mismatches.

## 2. Framework Concepts
- **`renderToString(rootFn)`**: Executes components asynchronously on the server to produce complete static HTML.
- **`renderToStream(rootFn)`**: Streams HTML progressively using Web Streams.
- **`generatePreHydrationScript()`**: Injects an inline snippet that buffers user interactions before client bundles load.
- **`serializeStateForHydration(state)`**: Securely serializes state, escaping `</script>` tags and prototype pollution keys.
- **`hydrate(rootFn, container)`**: Attaches event listeners and signals to server-rendered DOM nodes without rebuilding.

## 3. Correct API Usage
```ts
// Server
import { renderToString, generatePreHydrationScript, serializeStateForHydration } from '@samrey/ssr';
const html = await renderToString(() => App());
const preHydrate = generatePreHydrationScript();
const stateScript = serializeStateForHydration({ initial: 42 });

// Client
import { hydrate } from '@samrey/ssr';
hydrate(() => App(), document.getElementById('app')!);
```

## 4. Verified Code Example
```ts
// server.ts
import http from 'node:http';
import { renderToString, generatePreHydrationScript } from '@samrey/ssr';
import { App } from './src/App.js';

const server = http.createServer(async (req, res) => {
  const body = await renderToString(() => App());
  const preScript = generatePreHydrationScript();

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Samrey App</title>
    ${preScript}
  </head>
  <body>
    <div id="app">${body}</div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`);
});

server.listen(3000);
```

## 5. Common Mistakes
- **Mistake**: Using browser globals (`window`, `localStorage`) during server execution.
  - *Correction*: Defer browser-only logic to `onMount(() => ...)`, which only runs in the client.
- **Mistake**: Using `mount()` on the client instead of `hydrate()`, wiping out server HTML.
  - *Correction*: Call `hydrate(() => App(), container)`.

## 6. Forbidden Patterns
- ❌ Do NOT serialize secrets or auth tokens into SSR hydration state payloads.
- ❌ Do NOT use client-specific timers in the server component execution pass.

## 7. Validation Procedures
1. Run `npm run build` and `node server.js` to verify server render output.
2. Verify hydration matches without console warnings.

## 8. Authoritative Documentation
- [ai/SSR_RULES.md](../../SSR_RULES.md)
- [ai/API_CONTRACTS.md](../../API_CONTRACTS.md#7-samreyssr)
