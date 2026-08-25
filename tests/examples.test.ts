/**
 * @license Apache-2.0
 * Samrey Framework — Examples Verification Test Suite
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

describe('Samrey Runnable Examples Suite', () => {
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

    form.fields.email.setValue('lead@samrey.dev');
    assert.equal(form.fields.email.value(), 'lead@samrey.dev');
  });

  it('runs HTTP async resource fetching example', async () => {
    const res = await runHttpExample();
    assert.equal(res.status, 'success');
    assert.ok(res.post);
    assert.equal(res.post.id, 1);
    assert.equal(res.post.title, 'Fine-Grained Reactivity in Samrey');
  });

  it('runs streaming SSR example with Unicode state escaping', async () => {
    const html = await runSsrExample();
    assert.ok(typeof html === 'string');
    assert.ok(html.includes('Samrey SSR App'));
    assert.ok(html.includes('Lead Architect'));
    assert.ok(html.includes('__SAMREY_STATE__'));
  });

  it('runs full SSR application example with metadata and context', async () => {
    const ctx = createSSRContext({ initialRole: 'admin' });
    ctx.setTitle('Samrey SSR Test');
    ctx.addMeta({ name: 'viewport', content: 'width=device-width' });

    const html = await renderToString(App, {
      context: ctx,
      clientScript: '/static/client.js'
    });

    assert.ok(html.includes('Samrey SSR Application'));
    assert.ok(html.includes('Interactive Counter'));
    assert.ok(html.includes('<title>Samrey SSR Test</title>'));
    assert.ok(html.includes('/static/client.js'));
  });

  it('runs SSG static site generation example across routes', async () => {
    const result = await generateStaticSite(routes, {
      outDir: './dist/test-ssg-output',
      writeFiles: false,
      generateSitemap: true,
      baseUrl: 'https://samrey.dev'
    });

    assert.equal(result.totalPages, 5);
    assert.equal(result.pages.length, 5);
    assert.ok(result.sitemapXml);
    assert.ok(result.sitemapXml.includes('https://samrey.dev/'));
    assert.ok(result.sitemapXml.includes('https://samrey.dev/docs'));
  });

  it('runs hydration and event replay example', () => {
    const res = runHydrationExample();
    assert.ok(res.preHydrationScript.includes('__SAMREY_EVENTS__'));
    assert.ok(res.serializedState.includes('usr_998'));
    assert.equal(res.deserializedState['userId'], 'usr_998');
    assert.equal(res.hydrationResult.success, true);
  });
});
