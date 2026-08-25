/**
 * @license Apache-2.0
 * @samrey/example-ssr - Node / Express SSR Server
 */

import express from 'express';
import { renderToString, createSSRContext } from '@samrey/ssr';
import { App } from './app.js';

const app = express();
const port = process.env.PORT || 4000;

// Serve client assets
app.use('/static', express.static('public'));

app.get('/', async (req, res) => {
  try {
    const ctx = createSSRContext({
      serverTimestamp: new Date().toISOString(),
      // The secretGuard in @samrey/ssr will automatically strip any accidentally passed secret:
      apiKey: 'sk_secret_should_not_leak_to_client'
    });

    ctx.setTitle('Samrey SSR Demo');
    ctx.addMeta({ name: 'description', content: 'Samrey SSR with state hydration' });

    const html = await renderToString(App, {
      context: ctx,
      clientScript: '/static/client.js',
      clientStyles: ['https://cdn.tailwindcss.com']
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(ctx.statusCode).send(html);
  } catch (err) {
    console.error('SSR Render Error:', err);
    res.status(500).send('<h1>500 - Internal Server Error</h1>');
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`[Samrey SSR Server] Running on http://localhost:${port}`);
  });
}

export { app };
