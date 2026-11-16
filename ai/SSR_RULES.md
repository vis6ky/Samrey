# Samrey Framework — Server-Side Rendering & Hydration Rules (SSR_RULES.md)

**Package:** `@samrey/ssr`  
**Version:** 2.1.0  
**Authority:** Mandatory SSR & Hydration Guidelines for AI Agents

---

## 1. Asynchronous & Streaming SSR

Samrey provides two primary server rendering methods:
- **`renderToString(rootFn: () => Node | Promise<Node>)`**: Asynchronously renders a full HTML string representation of the component tree.
- **`renderToStream(rootFn: () => Node)`**: Streams HTML chunks progressively using Web standard `ReadableStream`.

```ts
import http from 'node:http';
import { renderToString, generatePreHydrationScript, serializeStateForHydration } from '@samrey/ssr';
import { App } from './src/App.js';

const server = http.createServer(async (req, res) => {
  if (req.url === '/') {
    // 1. Render App to HTML string
    const htmlBody = await renderToString(() => App());

    // 2. Prepare pre-hydration event snippet and serialized state
    const preHydrate = generatePreHydrationScript();
    const serializedState = serializeStateForHydration({ timestamp: Date.now() });

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Samrey SSR Application</title>
    ${preHydrate}
  </head>
  <body>
    <div id="app">${htmlBody}</div>
    ${serializedState}
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`);
  }
});

server.listen(3000);
```

---

## 2. Client Hydration (`hydrate`)

On the client, use `hydrate()` instead of `mount()`. `hydrate()` attaches event listeners and reactive subscriptions to existing server-rendered DOM nodes without tearing down and recreating the elements.

```ts
// src/main.ts
import { hydrate } from '@samrey/ssr';
import { App } from './App.js';

const container = document.getElementById('app')!;
hydrate(() => App(), container);
```

---

## 3. Hydration Mismatch Defense

- **Determinism**: The client and server must agree on initial state. Ensure dynamic dates or client-only APIs (`window`, `localStorage`, `navigator`) are wrapped in `onMount()` callbacks, which only run in the browser.
- **Secret Scrubbing**: Never serialize private credentials or session tokens into hydration state. Use `stripSecrets()` from `@samrey/ssr`.
