/**
 * @license Apache-2.0
 * Gati Framework — Examples Verification Test Suite
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

import { runCounterExample } from '../examples/basic-counter/index.js';
import { runRoutingExample } from '../examples/routing/index.js';
import { runFormExample } from '../examples/schema-form/index.js';
import { runHttpExample } from '../examples/http/index.js';
import { runSsrExample } from '../examples/streaming-ssr/index.js';
import { runHydrationExample } from '../examples/hydration/index.js';
import { renderToString, createSSRContext } from '../packages/ssr/src/index.js';
import { generateStaticSite } from '../packages/ssr/src/index.js';
import { App } from '../examples/ssr/src/app.js';
import { routes } from '../examples/ssg/src/pages.js';

describe('Gati Runnable Examples Suite', () => {
  it('runs basic counter example cleanly', () => {
    const res = runCounterExample();
    assert.ok(res.root);
    assert.equal(res.count.value, 5);
    assert.equal(res.double.value, 10);
  });

  it('runs routing example with parameterized matching and navigation', () => {
    const res = runRoutingExample();
    assert.equal(res.currentPath(), '/users/108');
    assert.deepEqual(res.currentParams(), { id: '108' });
    assert.equal(res.history.length, 3);
    assert.deepEqual(res.history, ['/users/42', '/settings', '/users/108']);
  });

  it('runs schema form example with validation', async () => {
    const form = runFormExample();
    assert.ok(form.fields.email);
    assert.ok(form.fields.password);
    assert.equal(form.fields.email.value(), '');

    form.fields.email.setValue('lead@gati.dev');
    assert.equal(form.fields.email.value(), 'lead@gati.dev');
  });

  it('runs HTTP async resource fetching example', async () => {
    const res = await runHttpExample();
    assert.equal(res.status, 'success');
    assert.ok(res.post);
    assert.equal(res.post.id, 1);
    assert.equal(res.post.title, 'Fine-Grained Reactivity in Gati');
  });

  it('runs streaming SSR example with Unicode state escaping', async () => {
    const html = await runSsrExample();
    assert.ok(typeof html === 'string');
    assert.ok(html.includes('Gati SSR App'));
    assert.ok(html.includes('Lead Architect'));
    assert.ok(html.includes('__AETHER_STATE__'));
  });

  it('runs full SSR application example with metadata and context', async () => {
    const ctx = createSSRContext({ initialRole: 'admin' });
    ctx.setTitle('Gati SSR Test');
    ctx.addMeta({ name: 'viewport', content: 'width=device-width' });

    const html = await renderToString(App, {
      context: ctx,
      clientScript: '/static/client.js'
    });

    assert.ok(html.includes('Gati SSR Application'));
    assert.ok(html.includes('Interactive Counter'));
    assert.ok(html.includes('<title>Gati SSR Test</title>'));
    assert.ok(html.includes('/static/client.js'));
  });

  it('runs SSG static site generation example across routes', async () => {
    const result = await generateStaticSite(routes, {
      outDir: './dist/test-ssg-output',
      writeFiles: false,
      generateSitemap: true,
      baseUrl: 'https://gati.dev'
    });

    assert.equal(result.totalPages, 5);
    assert.equal(result.pages.length, 5);
    assert.ok(result.sitemapXml);
    assert.ok(result.sitemapXml.includes('https://gati.dev/'));
    assert.ok(result.sitemapXml.includes('https://gati.dev/docs'));
  });

  it('runs hydration and event replay example', () => {
    const res = runHydrationExample();
    assert.ok(res.preHydrationScript.includes('__AETHER_EVENTS__'));
    assert.ok(res.serializedState.includes('usr_998'));
    assert.equal(res.deserializedState['userId'], 'usr_998');
    assert.equal(res.hydrationResult.success, true);
  });
});
