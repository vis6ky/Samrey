import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString, createSSRContext, createServerData } from '../src/index.js';
import { onCleanup } from '@samrey/reactivity';

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
    assert.ok(html.includes('__SAMREY_EVENTS__'));
    assert.ok(html.includes('<script type="module" src="/client.js"></script>'));
    assert.ok(html.includes('<script id="__SAMREY_STATE__" type="application/json">{}</script>'));
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

  it('renders root components returning arrays of elements or fragments cleanly without [object Object]', async () => {
    const arrayApp = () => [
      { outerHTML: '<header><h1>Navbar</h1></header>' },
      { outerHTML: '<main><p>Content Area</p></main>' },
      { outerHTML: '<footer>Footer</footer>' }
    ];

    const html = await renderToString(arrayApp);
    assert.ok(!html.includes('[object Object]'), 'Must not contain [object Object]');
    assert.ok(html.includes('<header><h1>Navbar</h1></header><main><p>Content Area</p></main><footer>Footer</footer>'));
  });

  it('renders root Show and For control flow components cleanly without [object Object]', async () => {
    const { Show, For, el } = await import('@samrey/runtime');
    const showApp = () => Show({
      when: true,
      children: () => el('p', { class: 'greeting' }, 'Hello SSR')
    });

    const htmlShow = await renderToString(showApp);
    assert.ok(!htmlShow.includes('[object Object]'), 'Show must not contain [object Object]');
    assert.ok(htmlShow.includes('<p class="greeting">Hello SSR</p>'));

    const forApp = () => For({
      each: ['alpha', 'beta', 'gamma'],
      children: (item) => el('li', null, item)
    });

    const htmlFor = await renderToString(forApp);
    assert.ok(!htmlFor.includes('[object Object]'), 'For must not contain [object Object]');
    assert.ok(htmlFor.includes('<li>alpha</li><li>beta</li><li>gamma</li>'));
  });

  it('deduplicates ctx.head.meta across 2-pass loader SSR, runs single pass without loaders, and disposes owners', async () => {
    const ctx = createSSRContext();
    ctx.addMeta({ name: 'existing', content: 'keep' });

    let passCount = 0;
    let disposedCount = 0;

    const htmlWithLoader = await renderToString(
      () => {
        passCount++;
        onCleanup(() => disposedCount++);
        ctx.addMeta({ name: 'description', content: 'Async page' });
        const [item] = createServerData('item', async () => 'loaded-ok');
        return `<main>${item() ?? 'pending'}</main>`;
      },
      { context: ctx }
    );

    assert.equal(passCount, 2);
    assert.equal(disposedCount, 2, 'Both Pass 1 and Pass 2 owners must dispose');
    assert.equal(htmlWithLoader.match(/name="description"/g)?.length, 1, 'Must emit description meta tag only once');
    assert.equal(htmlWithLoader.match(/name="existing"/g)?.length, 1, 'Pre-populated context meta must be preserved');
    assert.ok(htmlWithLoader.includes('<main>loaded-ok</main>'));

    let staticPassCount = 0;
    let staticDisposed = 0;
    await renderToString(() => {
      staticPassCount++;
      onCleanup(() => staticDisposed++);
      return '<p>Static</p>';
    });
    assert.equal(staticPassCount, 1, 'Static SSR without loaders must only execute app() once');
    assert.equal(staticDisposed, 1, 'Single-pass SSR owner must dispose after serialization');
  });
});
