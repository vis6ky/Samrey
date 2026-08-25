import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString, createSSRContext } from '../src/index.js';

describe('@samrey/ssr - Server Side Rendering', () => {
  it('renders safe static HTML document with title, head metadata, and hydration scripts', async () => {
    const ctx = createSSRContext();
    ctx.setTitle('Samrey Dashboard');
    ctx.addMeta({ name: 'description', content: 'Ultra-fast reactive framework' });

    const html = await renderToString(
      () => '<main><h1 class="heading">Dashboard</h1><p>Active Users: 42</p></main>',
      {
        context: ctx,
        clientScript: '/client.js'
      }
    );

    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('<title>Samrey Dashboard</title>'));
    assert.ok(html.includes('<meta name="description" content="Ultra-fast reactive framework">'));
    assert.ok(html.includes('<main><h1 class="heading">Dashboard</h1><p>Active Users: 42</p></main>'));
    assert.ok(html.includes('__AETHER_EVENTS__'));
    assert.ok(html.includes('<script type="module" src="/client.js"></script>'));
    assert.ok(html.includes('<script id="__AETHER_STATE__" type="application/json">{}</script>'));
  });

  it('handles server-side rendering error boundaries and emits fallback', async () => {
    const failingApp = () => {
      throw new Error('Database connection failed on server');
    };

    const html = await renderToString(failingApp, {
      title: 'Error Test',
      errorBoundary: (err) => `<div class="custom-error">Recovered: ${err.message}</div>`
    });

    assert.ok(html.includes('<div class="custom-error">Recovered: Database connection failed on server</div>'));
    assert.ok(html.includes('<title>Error Test</title>'));
  });

  it('renders default error message when no error boundary is provided', async () => {
    const failingApp = () => {
      throw new Error('Unexpected render crash');
    };

    const html = await renderToString(failingApp);
    assert.ok(html.includes('samrey-ssr-error'));
    assert.ok(html.includes('Unexpected render crash'));
  });
});
