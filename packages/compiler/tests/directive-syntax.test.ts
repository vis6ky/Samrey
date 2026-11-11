/**
 * @license Apache-2.0
 * @samrey/compiler - Directive Syntax Acceptance Tests (class:name and .property)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compileTemplate, SamreyCompilerError } from '../src/index.js';
import { signal } from '@samrey/reactivity';
import { bindClass, bindProperty } from '@samrey/runtime';

describe('Item 6: Directive Syntax Support (class:name={x} and .property={x})', () => {
  describe('a. Compiler code generation for class:name={x}', () => {
    it('compiles class:active={x} to bindClass and does not emit class:active into static template', () => {
      const source = '<button class="btn" class:active={isActive.value}>Click me</button>';
      const result = compileTemplate(source);

      // 1. Static HTML must not contain "class:active"
      assert.ok(
        !result.templates[0].staticHtml.includes('class:active'),
        `Static HTML should not contain literal "class:active", got: ${result.templates[0].staticHtml}`
      );
      assert.ok(
        result.templates[0].staticHtml.includes('class="btn"'),
        'Static HTML should preserve regular static class attribute'
      );

      // 2. Generated code must call bindClass
      assert.ok(
        result.generatedCode.includes('bindClass(root, "active", () => (isActive.value))'),
        `Generated code must call bindClass, got:\n${result.generatedCode}`
      );

      // 3. Runtime imports must include bindClass
      assert.ok(
        /import\s+\{[^}]*bindClass[^}]*\}\s+from\s+['"]@samrey\/runtime['"]/.test(result.generatedCode),
        `Imports must include bindClass, got:\n${result.generatedCode}`
      );
    });

    it('compiles multiple class: directives on a single element', () => {
      const source = '<div class="card" class:selected={isSelected.value} class:is-loading={loading.value}>Content</div>';
      const result = compileTemplate(source);

      assert.ok(!result.templates[0].staticHtml.includes('class:selected'));
      assert.ok(!result.templates[0].staticHtml.includes('class:is-loading'));
      assert.ok(result.templates[0].staticHtml.includes('class="card"'));

      assert.ok(result.generatedCode.includes('bindClass(root, "selected", () => (isSelected.value))'));
      assert.ok(result.generatedCode.includes('bindClass(root, "is-loading", () => (loading.value))'));
    });

    it('compiles static quoted and boolean class: directives without emitting raw class: attribute', () => {
      const source = '<button class="btn" class:active="true" class:disabled></button>';
      const result = compileTemplate(source);

      assert.ok(!result.templates[0].staticHtml.includes('class:active'));
      assert.ok(!result.templates[0].staticHtml.includes('class:disabled'));
      assert.ok(result.generatedCode.includes('bindClass(root, "active", () => (true))'));
      assert.ok(result.generatedCode.includes('bindClass(root, "disabled", () => (true))'));
    });
  });

  describe('b. Compiler code generation for .property={x}', () => {
    it('compiles .value={x} to bindProperty and does not emit .value into static template', () => {
      const source = '<input type="text" .value={inputValue.value} />';
      const result = compileTemplate(source);

      // 1. Static HTML must not contain ".value"
      assert.ok(
        !result.templates[0].staticHtml.includes('.value'),
        `Static HTML should not contain literal ".value", got: ${result.templates[0].staticHtml}`
      );
      assert.ok(
        result.templates[0].staticHtml.includes('type="text"'),
        'Static HTML should preserve standard static attributes'
      );

      // 2. Generated code must call bindProperty
      assert.ok(
        result.generatedCode.includes('bindProperty(root, "value", () => (inputValue.value))'),
        `Generated code must call bindProperty, got:\n${result.generatedCode}`
      );

      // 3. Runtime imports must include bindProperty
      assert.ok(
        /import\s+\{[^}]*bindProperty[^}]*\}\s+from\s+['"]@samrey\/runtime['"]/.test(result.generatedCode),
        `Imports must include bindProperty, got:\n${result.generatedCode}`
      );
    });

    it('compiles multiple property directives on elements', () => {
      const source = '<input type="checkbox" .checked={isChecked.value} .disabled={isDisabled.value} />';
      const result = compileTemplate(source);

      assert.ok(!result.templates[0].staticHtml.includes('.checked'));
      assert.ok(!result.templates[0].staticHtml.includes('.disabled'));

      assert.ok(result.generatedCode.includes('bindProperty(root, "checked", () => (isChecked.value))'));
      assert.ok(result.generatedCode.includes('bindProperty(root, "disabled", () => (isDisabled.value))'));
    });

    it('compiles static quoted .property directives without emitting raw .property attribute', () => {
      const source = '<input type="text" .value="fixed text" />';
      const result = compileTemplate(source);

      assert.ok(!result.templates[0].staticHtml.includes('.value'));
      assert.ok(result.generatedCode.includes('bindProperty(root, "value", () => ("fixed text"))'));
    });
  });

  describe('c. Runtime execution with reactive signals', () => {
    it('bindClass toggles CSS class when reactive signal changes', () => {
      const classes = new Set<string>(['btn']);
      const el = {
        classList: {
          add: (cls: string) => classes.add(cls),
          remove: (cls: string) => classes.delete(cls),
          contains: (cls: string) => classes.has(cls)
        }
      } as any;

      const isActive = signal(false);
      bindClass(el, 'active', () => isActive.value);

      assert.strictEqual(el.classList.contains('active'), false);

      isActive.value = true;
      assert.strictEqual(el.classList.contains('active'), true);

      isActive.value = false;
      assert.strictEqual(el.classList.contains('active'), false);
    });

    it('bindProperty updates element property when reactive signal changes', () => {
      const input = { value: '' } as any;

      const text = signal('initial');
      bindProperty(input, 'value', () => text.value);

      assert.strictEqual(input.value, 'initial');

      text.value = 'updated';
      assert.strictEqual(input.value, 'updated');
    });

    it('bindProperty refuses to set dangerous properties like innerHTML, outerHTML, srcdoc, or prototype pollution', () => {
      const el = { innerHTML: 'safe', outerHTML: 'safe', srcdoc: 'safe' } as any;

      const payload = signal('<img src=x onerror=alert(1)>');
      bindProperty(el, 'innerHTML', () => payload.value);
      bindProperty(el, 'outerHTML', () => payload.value);
      bindProperty(el, 'srcdoc', () => payload.value);
      bindProperty(el, '__proto__', () => ({}));
      bindProperty(el, 'onclick', () => () => {});

      assert.strictEqual(el.innerHTML, 'safe', 'innerHTML must not be modified by bindProperty');
      assert.strictEqual(el.outerHTML, 'safe', 'outerHTML must not be modified by bindProperty');
      assert.strictEqual(el.srcdoc, 'safe', 'srcdoc must not be modified by bindProperty');
    });
  });

  describe('d. Malformed directive validation and compiler errors', () => {
    it('throws SamreyCompilerError with line and column for empty class: directive', () => {
      assert.throws(
        () => compileTemplate('<div class:={isActive}></div>'),
        (err: any) => {
          assert.ok(err instanceof SamreyCompilerError);
          assert.strictEqual(err.code, 'SAMREY-105');
          assert.strictEqual(typeof err.line, 'number');
          assert.strictEqual(typeof err.column, 'number');
          assert.ok(err.line > 0);
          assert.ok(err.column > 0);
          assert.ok(err.message.includes('class:'));
          return true;
        }
      );
    });

    it('throws SamreyCompilerError with line and column for empty . directive', () => {
      assert.throws(
        () => compileTemplate('<input .={inputValue} />'),
        (err: any) => {
          assert.ok(err instanceof SamreyCompilerError);
          assert.strictEqual(err.code, 'SAMREY-105');
          assert.strictEqual(typeof err.line, 'number');
          assert.strictEqual(typeof err.column, 'number');
          assert.ok(err.line > 0);
          assert.ok(err.column > 0);
          assert.ok(err.message.includes('.'));
          return true;
        }
      );
    });
  });
});
