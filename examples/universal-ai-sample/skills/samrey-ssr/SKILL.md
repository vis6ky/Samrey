---
name: samrey-ssr
description: Implement Server-Side Rendering (SSR), streaming responses, hydration, and static site generation (SSG).
---

# Server-Side Rendering & Hydration (@samrey/ssr)

## Purpose
Explains how to render Samrey components on Node.js HTTP servers and hydrate them in the browser without hydration mismatches.

## Relevant APIs
- `renderToString(rootFn: () => Node | Promise<Node>): Promise<string>`
- `renderToStream(rootFn: () => Node): ReadableStream`
- `hydrate(rootFn: () => Node, container: Element): void`

## Server Implementation Example
```ts
import http from 'node:http';
import { renderToString } from '@samrey/ssr';
import { App } from './src/App.js';

const server = http.createServer(async (req, res) => {
  if (req.url === '/') {
    const htmlBody = await renderToString(() => App());
    
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Samrey App</title>
  </head>
  <body>
    <div id="app">${htmlBody}</div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`);
  }
});

server.listen(3000);
```

## Client Hydration Example
```ts
// src/main.ts
import { hydrate } from '@samrey/ssr';
import { App } from './App.js';

const container = document.getElementById('app')!;
hydrate(() => App(), container);
```
