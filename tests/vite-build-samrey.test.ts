/**
 * @license Apache-2.0
 * @samrey/monorepo - Vite Build Integration Test for .samrey Files
 */

import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';
import { samreyVitePlugin } from '../packages/cli/src/vite-plugin.js';
import { signal } from '@samrey/reactivity';
import { ensureMockDom } from '../packages/ai/src/compatibility.js';

describe('Vite Build Integration for .samrey Templates', () => {
  let tmpDir: string;
  let outDir: string;

  before(async () => {
    // Ensure DOM environment exists for component instantiation
    try {
      const { JSDOM } = await import('jsdom');
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
      (globalThis as any).window = dom.window;
      (globalThis as any).document = dom.window.document;
      (globalThis as any).Node = dom.window.Node;
      (globalThis as any).HTMLElement = dom.window.HTMLElement;
      (globalThis as any).DocumentFragment = dom.window.DocumentFragment;
    } catch {
      ensureMockDom();
    }

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-vite-test-'));
    outDir = path.join(tmpDir, 'dist');

    // 1. Single-root template with reactive signal binding
    fs.writeFileSync(
      path.join(tmpDir, 'SingleRoot.samrey'),
      '<div id="counter"><span class="val">{{ props.count.value }}</span></div>'
    );

    // 2. Multi-root template
    fs.writeFileSync(
      path.join(tmpDir, 'MultiRoot.samrey'),
      '<header class="hdr">Header</header><main class="main">Main Content</main>'
    );

    // 3. SF-04 Shape 1: Comments inside elements
    fs.writeFileSync(
      path.join(tmpDir, 'Sf04CommentsInside.samrey'),
      `<div>
  <!-- Header section -->
  <h1>{{ props.title.value }}</h1>
  <span>{{ props.subtitle.value }}</span>
</div>`
    );

    // 4. SF-04 Shape 2: Comments between sibling elements
    fs.writeFileSync(
      path.join(tmpDir, 'Sf04CommentsBetween.samrey'),
      `<div class="container">
  <button id="btn1">{{ props.count.value }}</button>
  <!-- divider comment -->
  <button id="btn2">{{ props.text.value }}</button>
</div>`
    );

    // 5. SF-04 Shape 3: Mixed constant-folded expressions and comments
    fs.writeFileSync(
      path.join(tmpDir, 'Sf04MixedFolded.samrey'),
      `<section>
  <!-- section header -->
  <h2>{{ "Prefix: " }}{{ props.dynamicTitle.value }}</h2>
  <!-- section body -->
  <p class="body">{{ props.dynamicBody.value }}</p>
</section>`
    );

    // 6. SF-07 Shape: Multi-root template with classes
    fs.writeFileSync(
      path.join(tmpDir, 'Sf07MultiRoot.samrey'),
      '<header class="hdr">Header</header><main class="main">Main Content</main>'
    );

    // Entry file exporting all components and reactivity
    fs.writeFileSync(
      path.join(tmpDir, 'index.js'),
      `export { signal } from '@samrey/reactivity';
export { default as SingleRoot } from './SingleRoot.samrey';
export { default as MultiRoot } from './MultiRoot.samrey';
export { default as Sf04CommentsInside } from './Sf04CommentsInside.samrey';
export { default as Sf04CommentsBetween } from './Sf04CommentsBetween.samrey';
export { default as Sf04MixedFolded } from './Sf04MixedFolded.samrey';
export { default as Sf07MultiRoot } from './Sf07MultiRoot.samrey';
`
    );
  });

  after(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('runs vite build without "Expected \',\', got \'?\'" syntax errors and builds bundle', async () => {
    let buildSucceeded = false;
    let buildError: any = null;

    try {
      await build({
        root: tmpDir,
        plugins: [samreyVitePlugin()],
        resolve: {
          alias: {
            '@samrey/runtime': path.resolve(process.cwd(), 'packages/runtime/dist/index.js'),
            '@samrey/reactivity': path.resolve(process.cwd(), 'packages/reactivity/dist/index.js')
          }
        },
        build: {
          lib: {
            entry: path.join(tmpDir, 'index.js'),
            formats: ['es'],
            fileName: () => 'bundle.js'
          },
          outDir,
          emptyOutDir: true,
          minify: false
        },
        logLevel: 'silent'
      });
      buildSucceeded = true;
    } catch (err: any) {
      buildError = err;
    }

    assert.ok(
      buildSucceeded,
      `vite build failed on .samrey files: ${buildError?.message || buildError}`
    );

    const bundlePath = path.join(outDir, 'bundle.js');
    assert.ok(fs.existsSync(bundlePath), 'Output bundle.js must exist after vite build');

    // Dynamically import the bundled library
    const bundleUrl = pathToFileURL(bundlePath).href + `?t=${Date.now()}`;
    const bundle = await import(bundleUrl);

    // Use signal from bundle to ensure single reactive instance
    const bundleSignal = bundle.signal;

    // Test 1: Single-root rendering and signal reactivity
    const count = bundleSignal(0);
    const singleRootEl = bundle.SingleRoot({ count }) as HTMLElement;
    assert.ok(singleRootEl, 'SingleRoot must render an element');
    const valSpan = singleRootEl.querySelector('.val');
    assert.ok(valSpan, 'Must locate .val span');
    assert.strictEqual(valSpan.textContent, '0');

    // Signal update must reactively and surgically update the DOM
    count.value = 42;
    assert.strictEqual(valSpan.textContent, '42');

    // Test 2: Multi-root template rendering
    const multiRootEl = bundle.MultiRoot();
    assert.ok(multiRootEl, 'MultiRoot must render a root');
    const hdr = multiRootEl.querySelector('.hdr');
    const main = multiRootEl.querySelector('.main');
    assert.ok(hdr, 'Must find .hdr in MultiRoot');
    assert.ok(main, 'Must find .main in MultiRoot');
    assert.strictEqual(hdr.textContent, 'Header');
    assert.strictEqual(main.textContent, 'Main Content');

    // Test 3: SF-04 Shape 1 (comments inside elements)
    const title = bundleSignal('Hello Title');
    const subtitle = bundleSignal('Hello Subtitle');
    const sf04InsideEl = bundle.Sf04CommentsInside({ title, subtitle });
    assert.strictEqual(sf04InsideEl.querySelector('h1').textContent, 'Hello Title');
    assert.strictEqual(sf04InsideEl.querySelector('span').textContent, 'Hello Subtitle');
    title.value = 'New Title';
    assert.strictEqual(sf04InsideEl.querySelector('h1').textContent, 'New Title');

    // Test 4: SF-04 Shape 2 (comments between sibling elements)
    const count2 = bundleSignal(10);
    const text2 = bundleSignal('Action');
    const sf04BetweenEl = bundle.Sf04CommentsBetween({ count: count2, text: text2 });
    assert.strictEqual(sf04BetweenEl.querySelector('#btn1').textContent, '10');
    assert.strictEqual(sf04BetweenEl.querySelector('#btn2').textContent, 'Action');
    count2.value = 99;
    text2.value = 'Submitted';
    assert.strictEqual(sf04BetweenEl.querySelector('#btn1').textContent, '99');
    assert.strictEqual(sf04BetweenEl.querySelector('#btn2').textContent, 'Submitted');

    // Test 5: SF-04 Shape 3 (mixed constant-folded expressions and comments)
    const dynamicTitle = bundleSignal('Dynamic Title');
    const dynamicBody = bundleSignal('Dynamic Body');
    const sf04MixedEl = bundle.Sf04MixedFolded({ dynamicTitle, dynamicBody });
    assert.ok(sf04MixedEl.querySelector('h2').textContent.includes('Prefix: Dynamic Title'));
    assert.strictEqual(sf04MixedEl.querySelector('.body').textContent, 'Dynamic Body');
    dynamicTitle.value = 'Updated Title';
    assert.ok(sf04MixedEl.querySelector('h2').textContent.includes('Prefix: Updated Title'));

    // Test 6: SF-07 Shape (multi-root template)
    const sf07El = bundle.Sf07MultiRoot();
    assert.ok(sf07El.querySelector('.hdr'), 'Must find .hdr in SF-07 multi-root');
    assert.ok(sf07El.querySelector('.main'), 'Must find .main in SF-07 multi-root');
  });
});
