/**
 * @license Apache-2.0
 * @samrey/monorepo - Code Validator Hardening & Bug Detection Acceptance Test
 *
 * Verifies that validateSamreyCode:
 * (a) Flags imports of names NOT exported by target @samrey/* package.
 * (b) Flags passing a signal read directly into bind* helpers (e.g. bindText(el, count.value)).
 * (c) Flags raw innerHTML assignments with non-literal or dynamic expressions.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { validateSamreyCode } from '../packages/ai/src/code-validator.js';

describe('Item 5: validateSamreyCode Hardening', () => {
  describe('(a) Non-existent @samrey/* package imports', () => {
    it('flags imports of names not exported by @samrey/runtime', () => {
      const code = `
        import { nonExistent, template } from '@samrey/runtime';
        export function Comp() { return template('<div></div>')(); }
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.valid, false, 'Must be invalid when importing non-existent symbols');
      assert.ok(
        res.errors.some(e => e.message.includes('nonExistent') && e.message.includes('@samrey/runtime')),
        'Must report error mentioning nonExistent from @samrey/runtime'
      );
    });

    it('flags hallucinated imports from @samrey/router (RouterView, useRoute)', () => {
      const code = `
        import { createRouter, RouterView, useRoute } from '@samrey/router';
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.valid, false, 'Must fail for RouterView and useRoute');
      assert.ok(
        res.errors.some(e => e.message.includes('RouterView')),
        'Must flag RouterView'
      );
      assert.ok(
        res.errors.some(e => e.message.includes('useRoute')),
        'Must flag useRoute'
      );
    });

    it('flags hallucinated import store from @samrey/reactivity', () => {
      const code = `
        import { signal, store } from '@samrey/reactivity';
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.valid, false, 'Must fail for store import from @samrey/reactivity');
      assert.ok(
        res.errors.some(e => e.message.includes('store') && e.message.includes('@samrey/reactivity')),
        'Must flag store and suggest createStore'
      );
    });

    it('allows valid imports from official packages', () => {
      const code = `
        import { signal, computed, effect, createStore } from '@samrey/reactivity';
        import { template, on, bindText, Show, For } from '@samrey/runtime';
        import { createRouter, RouterOutlet, Link, useParams } from '@samrey/router';
        import { createForm } from '@samrey/forms';
        import { renderTest, flushReactivity } from '@samrey/testing';
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.errors.length, 0, `Expected 0 errors for valid imports, got: ${JSON.stringify(res.errors)}`);
      assert.strictEqual(res.valid, true);
    });

    it('allows TypeScript type-only imports for exported interfaces', () => {
      const code = `
        import { signal, type Signal } from '@samrey/reactivity';
        import type { RouteConfig } from '@samrey/router';
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.errors.length, 0, 'Must allow type imports for known types');
    });
  });

  describe('(b) Direct signal read passed into bind* helpers', () => {
    it('flags bindText(el, count.value) where signal is read directly instead of via function', () => {
      const code = `
        import { signal } from '@samrey/reactivity';
        import { template, bindText } from '@samrey/runtime';

        export function Counter() {
          const count = signal(0);
          const el = document.createElement('span');
          bindText(el, count.value);
          return el;
        }
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.valid, false, 'Must be invalid when passing count.value to bindText');
      assert.ok(
        res.errors.some(e => e.message.includes('bindText') && e.message.includes('count.value')),
        'Must report error for direct count.value in bindText'
      );
    });

    it('flags bindAttr, bindClass, and bindProperty when passed a direct .value read', () => {
      const code = `
        import { bindAttr, bindClass } from '@samrey/runtime';
        bindAttr(button, 'disabled', isSubmitting.value);
        bindClass(item, 'active', isActive.value);
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.message.includes('bindAttr') && e.message.includes('isSubmitting.value')));
      assert.ok(res.errors.some(e => e.message.includes('bindClass') && e.message.includes('isActive.value')));
    });

    it('flags bindText when passed a raw signal instance or non-function primitive', () => {
      const code = `
        import { signal } from '@samrey/reactivity';
        import { bindText } from '@samrey/runtime';
        const count = signal(0);
        bindText(span, count);
        bindText(span, "static text");
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.message.includes('bindText')));
    });

    it('accepts correct function accessor bindings', () => {
      const code = `
        import { signal } from '@samrey/reactivity';
        import { bindText, bindAttr, bindClass } from '@samrey/runtime';

        const count = signal(0);
        const active = signal(false);
        bindText(span, () => count.value.toString());
        bindAttr(btn, 'disabled', () => count.value > 10);
        bindClass(btn, 'btn-active', () => active.value);
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.errors.length, 0, 'Accessor functions (() => ...) must be accepted');
      assert.strictEqual(res.valid, true);
    });
  });

  describe('(c) Raw innerHTML assignments with non-literal expressions', () => {
    it('flags raw innerHTML assignments with variables or dynamic concatenation', () => {
      const code = `
        export function Profile(userData) {
          const div = document.createElement('div');
          div.innerHTML = userData.bio;
          return div;
        }
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.valid, false, 'Must flag dynamic innerHTML assignment');
      assert.ok(
        res.errors.some(e => e.message.toLowerCase().includes('innerhtml') && e.message.includes('userData.bio')),
        'Must report innerHTML vulnerability error'
      );
    });

    it('flags template literal with expressions assigned to innerHTML', () => {
      const code = `
        const header = document.querySelector('h1');
        header.innerHTML = \`Welcome <span>\${username}</span>\`;
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.message.toLowerCase().includes('innerhtml')));
    });

    it('allows static string literal assignments to innerHTML', () => {
      const code = `
        const spinner = document.createElement('div');
        spinner.innerHTML = '<span class="spin"></span>';
      `;
      const res = validateSamreyCode(code);
      assert.ok(!res.errors.some(e => e.message.toLowerCase().includes('innerhtml')), 'Safe static literal should not be flagged as error');
    });
  });
});

