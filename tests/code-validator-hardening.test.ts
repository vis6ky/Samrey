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
import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import {
  validateSamreyCode,
  OFFICIAL_PACKAGE_EXPORTS,
  KNOWN_TYPE_EXPORTS
} from '../packages/ai/src/code-validator.js';
import * as webCodeValidator from '../src/lib/codeValidator.js';

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
        import type { RouteRecord } from '@samrey/router';
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

  describe('(e) Batch 4: Validator Root-Cause Sync & Import Parity (@samrey/ai + src/lib/codeValidator)', () => {
    const PACKAGES = [
      'reactivity', 'runtime', 'compiler', 'router', 'forms',
      'http', 'ssr', 'testing', 'devtools', 'security', 'cli', 'ai', 'mcp-server'
    ];

    async function collectRealPackageExports() {
      const repoRoot = process.cwd();
      const entryFiles = PACKAGES.map(p => path.join(repoRoot, 'packages', p, 'src', 'index.ts'));
      const tsconfigPath = ts.findConfigFile(repoRoot, ts.sys.fileExists, 'tsconfig.json');
      assert.ok(tsconfigPath, 'tsconfig.json must exist');
      const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
      const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, repoRoot);
      const program = ts.createProgram(entryFiles, { ...parsed.options, noEmit: true });
      const checker = program.getTypeChecker();

      const valueMap: Record<string, Set<string>> = {};
      const typeOnlyMap: Record<string, Set<string>> = {};

      for (const p of PACKAGES) {
        const pkgName = `@samrey/${p}`;
        const entry = path.join(repoRoot, 'packages', p, 'src', 'index.ts');
        const mod = await import(entry);
        const valueSet = new Set(Object.keys(mod).filter(k => k !== '__esModule'));
        const sf = program.getSourceFile(entry);
        assert.ok(sf, `Missing source file for ${pkgName}`);
        const modSym = checker.getSymbolAtLocation(sf);
        assert.ok(modSym, `Missing module symbol for ${pkgName}`);
        const tsExports = checker.getExportsOfModule(modSym).map(s => s.getName());
        const typeOnlySet = new Set(
          tsExports.filter(name => name !== 'default' && !valueSet.has(name))
        );
        valueMap[pkgName] = valueSet;
        typeOnlyMap[pkgName] = typeOnlySet;
      }

      return { valueMap, typeOnlyMap };
    }

    it('rejects phantom type imports (RouteConfig, Store, FieldConfig, ValidationResult, RenderResult) in both validators', () => {
      const validateWebCode = webCodeValidator.validateSamreyCode;
      const phantomCases = [
        { code: `import type { RouteConfig } from '@samrey/router';`, symbol: 'RouteConfig' },
        { code: `import { signal, type Store } from '@samrey/reactivity';`, symbol: 'Store' },
        { code: `import type { FieldConfig, ValidationResult } from '@samrey/forms';`, symbol: 'FieldConfig' },
        { code: `import type { RenderResult } from '@samrey/testing';`, symbol: 'RenderResult' }
      ];

      for (const tc of phantomCases) {
        const aiRes = validateSamreyCode(tc.code);
        assert.strictEqual(aiRes.valid, false, `@samrey/ai must reject phantom type ${tc.symbol}`);
        assert.ok(
          aiRes.errors.some(e => e.message.includes(tc.symbol)),
          `@samrey/ai error must mention ${tc.symbol}, got: ${JSON.stringify(aiRes.errors)}`
        );

        const webRes = validateWebCode(tc.code);
        assert.strictEqual(webRes.isValid, false, `web validator must reject phantom type ${tc.symbol}`);
        assert.ok(
          webRes.errors.some(e => e.includes(tc.symbol)),
          `web validator error must mention ${tc.symbol}, got: ${JSON.stringify(webRes.errors)}`
        );
      }
    });

    it('supports value, type-only, inline type, and multi-statement imports without semicolon bleed in both validators', () => {
      const validateWebCode = webCodeValidator.validateSamreyCode;
      const multiStmtTest = `
        import { describe, it } from 'node:test';
        import * as assert from 'node:assert/strict';
        import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
      `;
      const inlineAndMixedTypes = `
        import { signal, type Signal, createStore } from '@samrey/reactivity';
        import type { RouteRecord } from '@samrey/router';
        import { getSSRLoaderError, type StaticRouteConfig } from '@samrey/ssr';
        import type { SamreyErrorCode } from '@samrey/compiler';
        export function Example() {
          const count: Signal<number> = signal(0);
          const store = createStore({ items: [] as string[] });
          return { count, store };
        }
      `;

      for (const sample of [multiStmtTest, inlineAndMixedTypes]) {
        const aiRes = validateSamreyCode(sample);
        assert.strictEqual(aiRes.errors.length, 0, `@samrey/ai unexpected errors: ${JSON.stringify(aiRes.errors)}`);
        assert.strictEqual(aiRes.valid, true);

        const webRes = validateWebCode(sample);
        assert.strictEqual(webRes.errors.length, 0, `web validator unexpected errors: ${JSON.stringify(webRes.errors)}`);
        assert.strictEqual(webRes.foreignApis.length, 0, `web validator unexpected foreignApis: ${JSON.stringify(webRes.foreignApis)}`);
        assert.strictEqual(webRes.isValid, true);
      }
    });

    it('allows @samrey/reactivity useContext() and createStore(), and ignores foreign API names in comments/strings in web validator', () => {
      const validateWebCode = webCodeValidator.validateSamreyCode;
      const samreyContextAndStore = `
        import { createContext, useContext, createStore } from '@samrey/reactivity';
        const ThemeCtx = createContext<'light' | 'dark'>('light');
        export function Widget() {
          const theme = useContext(ThemeCtx);
          const state = createStore({ count: 0 });
          return { theme, state };
        }
      `;

      const aiRes = validateSamreyCode(samreyContextAndStore);
      assert.strictEqual(aiRes.errors.length, 0, `@samrey/ai flagged valid @samrey/reactivity useContext/createStore: ${JSON.stringify(aiRes.errors)}`);
      assert.strictEqual(aiRes.valid, true);

      const webRes = validateWebCode(samreyContextAndStore);
      assert.strictEqual(webRes.errors.length, 0, `web validator errors: ${JSON.stringify(webRes.errors)}`);
      assert.strictEqual(webRes.foreignApis.length, 0, `web validator flagged @samrey/reactivity createStore/useContext: ${JSON.stringify(webRes.foreignApis)}`);
      assert.strictEqual(webRes.isValid, true);

      const commentsAndStrings = `
        import { signal } from '@samrey/reactivity';
        // Never use useState, createStore, createSignal, or v-if here
        export const docNote = "Avoid useEffect, BehaviorSubject, and $state";
        export const ok = signal(1);
      `;
      const webCommentRes = validateWebCode(commentsAndStrings);
      assert.strictEqual(webCommentRes.foreignApis.length, 0, `comments/strings triggered foreignApis: ${JSON.stringify(webCommentRes.foreignApis)}`);
      assert.strictEqual(webCommentRes.isValid, true);
    });

    it('accepts conditional accessor expressions returning functions in bind* helpers', () => {
      const code = `
        import { bindText, bindAttr } from '@samrey/runtime';
        export function Label(props: { title: string | (() => string); disabled?: boolean | (() => boolean) }, span: HTMLElement, btn: HTMLButtonElement) {
          bindText(span, typeof props.title === 'function' ? props.title : () => props.title);
          bindAttr(btn, 'disabled', typeof props.disabled === 'function' ? props.disabled : () => Boolean(props.disabled));
          return span;
        }
      `;
      const res = validateSamreyCode(code);
      assert.strictEqual(res.errors.length, 0, `Conditional function accessors failed: ${JSON.stringify(res.errors)}`);
      assert.strictEqual(res.valid, true);
    });

    it('synchronizes @samrey/ai and web validator export/type registries with TypeScript compiler truth across all 13 packages', async () => {
      const { valueMap, typeOnlyMap } = await collectRealPackageExports();
      const webExports = webCodeValidator.OFFICIAL_SAMREY_EXPORTS;
      const webTypes = (webCodeValidator as Record<string, unknown>).OFFICIAL_SAMREY_TYPES as Record<string, string[]> | undefined;
      assert.ok(webTypes && typeof webTypes === 'object', 'src/lib/codeValidator.ts must export OFFICIAL_SAMREY_TYPES separate from runtime exports');

      for (const p of PACKAGES) {
        const pkg = `@samrey/${p}`;
        const realValues = valueMap[pkg];
        const realTypes = typeOnlyMap[pkg];

        const aiValues = OFFICIAL_PACKAGE_EXPORTS[pkg];
        const aiTypes = KNOWN_TYPE_EXPORTS[pkg] ?? new Set<string>();
        assert.ok(aiValues, `Missing OFFICIAL_PACKAGE_EXPORTS entry for ${pkg}`);

        assert.deepStrictEqual(
          [...aiValues].sort(),
          [...realValues].sort(),
          `Mismatch in OFFICIAL_PACKAGE_EXPORTS for ${pkg}`
        );
        assert.deepStrictEqual(
          [...aiTypes].sort(),
          [...realTypes].sort(),
          `Mismatch in KNOWN_TYPE_EXPORTS for ${pkg}`
        );

        assert.ok(webExports[pkg], `Missing OFFICIAL_SAMREY_EXPORTS entry for ${pkg}`);
        assert.deepStrictEqual(
          [...webExports[pkg]].sort(),
          [...realValues].sort(),
          `Mismatch in OFFICIAL_SAMREY_EXPORTS (runtime values) for ${pkg}`
        );
        assert.ok(webTypes[pkg], `Missing OFFICIAL_SAMREY_TYPES entry for ${pkg}`);
        assert.deepStrictEqual(
          [...webTypes[pkg]].sort(),
          [...realTypes].sort(),
          `Mismatch in OFFICIAL_SAMREY_TYPES for ${pkg}`
        );
      }
    });

    it('Item 9 regression: rejects value-form type imports in @samrey/ai and detects foreign hooks inside template ${...} interpolations', () => {
      const { validateSamreyCode: validateWebCode } = webCodeValidator;

      // 1. Value-form import of TypeScript type-only export must fail in BOTH validators
      const missingTypeKw = `import { Signal, signal } from '@samrey/reactivity';`;
      const aiTypeRes = validateSamreyCode(missingTypeKw);
      const webTypeRes = validateWebCode(missingTypeKw);
      assert.strictEqual(aiTypeRes.valid, false, '@samrey/ai validator must reject value-form import of type Signal');
      assert.ok(
        aiTypeRes.errors.some((e) => e.message.includes('Signal') && e.message.toLowerCase().includes('type')),
        `Expected type-only error for Signal in @samrey/ai, got: ${JSON.stringify(aiTypeRes.errors)}`
      );
      assert.strictEqual(webTypeRes.isValid, false);
      assert.ok(webTypeRes.errors.some((e) => e.includes('Signal')));

      // 2. Template literal ${...} interpolation must NOT hide foreign APIs in web validator or @samrey/ai
      const tmplInterp = `
        import { signal } from '@samrey/reactivity';
        export const s = \`count: \${useState(0)}\`;
        export const nested = \`a \${\`b \${useEffect(() => {})}\`}\`;
        export const ok = signal(1);
      `;
      const webTmplRes = validateWebCode(tmplInterp);
      assert.ok(
        webTmplRes.foreignApis.some((f) => f.name === 'useState'),
        `Web validator must catch useState inside template \${...}, got: ${JSON.stringify(webTmplRes.foreignApis)}`
      );
      assert.ok(
        webTmplRes.foreignApis.some((f) => f.name === 'useEffect'),
        `Web validator must catch nested useEffect inside template \${...}, got: ${JSON.stringify(webTmplRes.foreignApis)}`
      );

      const aiTmplRes = validateSamreyCode(tmplInterp);
      assert.strictEqual(aiTmplRes.valid, false);
      assert.ok(aiTmplRes.errors.some((e) => e.message.includes('useState')));
      assert.ok(aiTmplRes.errors.some((e) => e.message.includes('useEffect')));

      // 3. Plain template literal prose without ${...} remains ignored
      const plainTmpl = `
        import { signal } from '@samrey/reactivity';
        export const note = \`Do not use useState() or useEffect() here\`;
        export const ok = signal(1);
      `;
      assert.strictEqual(validateWebCode(plainTmpl).foreignApis.length, 0);
      assert.strictEqual(validateSamreyCode(plainTmpl).errors.length, 0);
    });
  });
});

