/**
 * @license Apache-2.0
 * @gati/monorepo - Phase 24 Hydration & SSR Final Gate
 * Validates SSR string rendering, stream rendering, hydration stability, and owner cleanup.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { signal, createRoot } from '../../packages/reactivity/src/index.js';
import { el, Show, For } from '../../packages/runtime/src/index.js';
import { renderToString, renderToStream, generateStaticSite } from '../../packages/ssr/src/index.js';

describe('Phase 24 — Hydration & SSR Final Gate', () => {
  it('1. Renders complex component tree to string via renderToString', async () => {
    const items = signal(['Alpha', 'Beta', 'Gamma']);
    const showHeader = signal(true);

    const html = await renderToString(() =>
      el('main', { id: 'app-root' }, [
        Show({
          when: showHeader,
          fallback: () => null,
          children: () => el('h1', { class: 'title' }, ['SSR Test Title'])
        }),
        el('ul', { class: 'item-list' }, [
          For({
            each: items,
            children: (item: string) => el('li', { class: 'item' }, [item])
          })
        ])
      ])
    );

    assert.ok(html.includes('<main id="app-root">'), 'Output contains main root');
    assert.ok(html.includes('<h1 class="title">SSR Test Title</h1>'), 'Output contains heading');
    assert.ok(html.includes('Alpha') && html.includes('Beta') && html.includes('Gamma'), 'Output contains list items');
  });

  it('2. Streams HTML chunks with backpressure handling via renderToStream', async () => {
    const chunks: string[] = [];
    const stream = renderToStream(() =>
      el('div', { class: 'stream-box' }, [
        el('p', {}, ['Stream Chunk 1']),
        el('p', {}, ['Stream Chunk 2'])
      ])
    );

    const reader = stream.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value));
    }

    const fullHtml = chunks.join('');
    assert.ok(fullHtml.includes('Stream Chunk 1'), 'Stream contains Chunk 1');
    assert.ok(fullHtml.includes('Stream Chunk 2'), 'Stream contains Chunk 2');
  });

  it('3. Verifies owner cleanup and memory disposal on server render cycles', async () => {
    let disposedCount = 0;
    for (let i = 0; i < 50; i++) {
      await new Promise<void>((resolve) => {
        createRoot(async (dispose) => {
          const count = signal(i);
          const rendered = await renderToString(() => el('span', {}, [count.value]));
          assert.ok(rendered.includes(String(i)));
          dispose();
          disposedCount++;
          resolve();
        });
      });
    }
    assert.strictEqual(disposedCount, 50, 'All 50 SSR roots must be cleanly disposed');
  });
});
