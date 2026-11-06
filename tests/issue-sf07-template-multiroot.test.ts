/**
 * @license Apache-2.0
 * @samrey/monorepo - SF-07 Static Template Hoisting Return Type Ambiguity
 */

import { describe, it, before } from 'node:test';
import * as assert from 'node:assert/strict';
import { compileTemplate } from '../packages/compiler/src/index.js';
import { template } from '../packages/runtime/src/index.js';
import { ensureMockDom } from '../packages/ai/src/index.js';

describe('SF-07: Static Template Hoisting Multi-Root Return Ambiguity', () => {
  before(() => {
    ensureMockDom();
  });

  it('supports HTMLElement properties on multi-root templates without TypeError', () => {
    const multiRootHtml = '<header class="hdr">Header</header><main class="main">Main Content</main>';
    const rootFactory = template(multiRootHtml);
    const root = rootFactory() as any;

    // Must have querySelector
    assert.ok(typeof root.querySelector === 'function', 'root.querySelector must be a function');
    const header = root.querySelector('.hdr');
    assert.ok(header, 'Must find .hdr in multi-root fragment');

    // Must not crash on classList operations
    assert.doesNotThrow(() => {
      root.classList.add('theme-dark');
    }, 'classList.add must not throw on multi-root template');

    // Must not crash on setAttribute
    assert.doesNotThrow(() => {
      root.setAttribute('data-theme', 'dark');
    }, 'setAttribute must not throw on multi-root template');

    // Must not crash on style assignment
    assert.doesNotThrow(() => {
      root.style.opacity = '1';
    }, 'style manipulation must not throw on multi-root template');
  });

  it('records a diagnostic recommendation when compiler encounters multi-root template', () => {
    const src = '<header>Header</header><main>Content</main>';
    const result = compileTemplate(src);
    assert.ok(
      result.diagnostics.some((d) => d.toLowerCase().includes('multi-root') || d.toLowerCase().includes('root')),
      'Compiler must emit diagnostic recommendation for multi-root templates'
    );
  });
});
