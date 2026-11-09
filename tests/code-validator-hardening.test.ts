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
        import { template, on, bindText, bindStyle, Show, For } from '@samrey/runtime';
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

    it('flags bindAttr, bindClass, bindProperty, and bindStyle when passed a direct .value read', () => {
      const code = `
        import { bindAttr, bindClass, bindStyle } from '@samrey/runtime';
        bindAttr(button, 'disabled', isSubmitting.value);
        bindClass(item, 'active', isActive.value);
        bindStyle(panel, 'color', themeColor.value);
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.message.includes('bindAttr') && e.message.includes('isSubmitting.value')));
      assert.ok(res.errors.some(e => e.message.includes('bindClass') && e.message.includes('isActive.value')));
      assert.ok(res.errors.some(e => e.message.includes('bindStyle') && e.message.includes('themeColor.value')));
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

  describe('(d) Dangerous execution patterns (document.write, eval, new Function, javascript: URIs)', () => {
    it('flags document.write() and document.writeln() calls with clear message and fix suggestion', () => {
      const code = `
        export function Comp() {
          document.write('<div>Injected</div>');
        }
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.valid, false);
      const err = res.errors.find(e => e.message.includes('document.write'));
      assert.ok(err, 'Must flag document.write');
      assert.ok(err?.suggestion, 'Must provide fix suggestion for document.write');
    });

    it('flags eval() calls with clear message and fix suggestion', () => {
      const code = `
        export function Run(input) {
          const val = eval(input);
          return val;
        }
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.valid, false);
      const err = res.errors.find(e => e.message.includes('eval('));
      assert.ok(err, 'Must flag eval');
      assert.ok(err?.suggestion, 'Must provide fix suggestion for eval');
    });

    it('flags new Function() constructors with clear message and fix suggestion', () => {
      const code = `
        export function DynamicCode(body) {
          const fn = new Function('a', 'b', body);
          return fn(1, 2);
        }
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.valid, false);
      const err = res.errors.find(e => e.message.includes('new Function'));
      assert.ok(err, 'Must flag new Function');
      assert.ok(err?.suggestion, 'Must provide fix suggestion for new Function');
    });

    it('flags javascript: URIs in attributes with clear message and fix suggestion', () => {
      const code = `
        import { template } from '@samrey/runtime';
        const _tmpl = template('<a href="javascript:alert(1)">Click Me</a>');
        export function XssLink() {
          return _tmpl();
        }
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.valid, false);
      const err = res.errors.find(e => e.message.includes('javascript:'));
      assert.ok(err, 'Must flag javascript: URI in attribute');
      assert.ok(err?.suggestion, 'Must provide fix suggestion for javascript: URI');
    });

    it('flags javascript: URIs in el() and attribute objects', () => {
      const code = `
        import { el } from '@samrey/runtime';
        export function XssElement() {
          return el('a', { href: 'javascript:void(0)', title: 'Link' }, 'Click');
        }
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.valid, false, 'Must flag javascript: URI in el() attribute object');
      const err = res.errors.find(e => e.message.includes('javascript:'));
      assert.ok(err, 'Must report javascript: error');
      assert.ok(err?.suggestion, 'Must provide suggestion for el() javascript: URI');
    });

    it('flags setTimeout and setInterval with string arguments', () => {
      const code1 = `
        export function BadTimer() {
          setTimeout("alert('pwned')", 1000);
        }
      `;
      const res1 = validateSamreyCode(code1);
      assert.strictEqual(res1.valid, false, 'Must flag setTimeout with string argument');
      assert.ok(
        res1.errors.some(e => e.message.includes('setTimeout') || e.message.includes('string argument')),
        'Must report error for setTimeout with string'
      );

      const code2 = `
        export function BadInterval() {
          setInterval('doPoll()', 500);
        }
      `;
      const res2 = validateSamreyCode(code2);
      assert.strictEqual(res2.valid, false, 'Must flag setInterval with string argument');
      assert.ok(
        res2.errors.some(e => e.message.includes('setInterval') || e.message.includes('string argument')),
        'Must report error for setInterval with string'
      );
    });

    it('flags outerHTML and insertAdjacentHTML with non-literal dynamic expressions', () => {
      const code1 = `
        export function InjectOuter(element, userContent) {
          element.outerHTML = userContent;
        }
      `;
      const res1 = validateSamreyCode(code1);
      assert.strictEqual(res1.valid, false, 'Must flag dynamic outerHTML assignment');
      assert.ok(
        res1.errors.some(e => e.message.includes('outerHTML')),
        'Must report error for dynamic outerHTML'
      );

      const code2 = `
        export function InjectAdjacent(element, untrustedMarkup) {
          element.insertAdjacentHTML('beforeend', untrustedMarkup);
        }
      `;
      const res2 = validateSamreyCode(code2);
      assert.strictEqual(res2.valid, false, 'Must flag dynamic insertAdjacentHTML call');
      assert.ok(
        res2.errors.some(e => e.message.includes('insertAdjacentHTML')),
        'Must report error for dynamic insertAdjacentHTML'
      );
    });

    it('does not flag obj.eval(...) member method calls', () => {
      const code = `
        export function MathCalculator(calc, formula) {
          return calc.eval(formula);
        }
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.errors.length, 0, `obj.eval() must not be flagged as global eval, got errors: ${JSON.stringify(res.errors)}`);
      assert.strictEqual(res.valid, true);
    });

    it('does not flag dangerous pattern keywords when present in comments or string literals', () => {
      const code = `
        // Note: Do not use eval() or document.write() in your code.
        /* Avoid new Function(), innerHTML, outerHTML, insertAdjacentHTML, and javascript: links */
        // Also avoid setTimeout('code', 1000) with string arguments.
        export function SafeHelpDoc() {
          const warningMessage = "Never use eval(), new Function(), or document.write()";
          const uriNote = "The javascript: URI scheme is blocked by modern CSP";
          const timerNote = "Avoid setTimeout('string', delay) and outerHTML = userInput";
          return { warningMessage, uriNote, timerNote };
        }
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.errors.length, 0, `Comments and strings must not trigger false positives, got errors: ${JSON.stringify(res.errors)}`);
      assert.strictEqual(res.valid, true);
    });

    it('allows safe setTimeout/setInterval callbacks and safe literal HTML sinks', () => {
      const code = `
        export function SafeTimers(el) {
          setTimeout(() => { console.log('safe'); }, 1000);
          setInterval(function() { console.log('tick'); }, 500);
          el.outerHTML = '<div class="static"></div>';
          el.insertAdjacentHTML('beforeend', '<p>Static HTML</p>');
        }
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.errors.length, 0, `Safe callbacks and static literals must pass, got: ${JSON.stringify(res.errors)}`);
      assert.strictEqual(res.valid, true);
    });

    it('allows clean, idiomatic Samrey samples without false positives', () => {
      const cleanSamples = [
        `
          import { signal, computed } from '@samrey/reactivity';
          import { template, on, bindText } from '@samrey/runtime';

          const _tmpl = template('<button class="btn"><span class="txt"></span></button>');

          export function CleanCounter(props: { initial?: number }) {
            const count = signal(props.initial ?? 0);
            const double = computed(() => count.value * 2);
            const root = _tmpl() as HTMLButtonElement;
            bindText(root.querySelector('.txt')!, () => count.value.toString());
            on(root, 'click', () => count.update(n => n + 1));
            return root;
          }
        `,
        `
          import { template } from '@samrey/runtime';
          const _tmpl = template('<a href="/dashboard" class="nav-link">Dashboard</a>');
          export function NavItem() {
            return _tmpl();
          }
        `
      ];

      for (const sample of cleanSamples) {
        const res = validateSamreyCode(sample);
        assert.strictEqual(res.errors.length, 0, `Expected 0 errors for clean sample, got: ${JSON.stringify(res.errors)}`);
        assert.strictEqual(res.valid, true);
      }
    });
  });
});

