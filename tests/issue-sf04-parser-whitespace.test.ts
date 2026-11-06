/**
 * @license Apache-2.0
 * @samrey/monorepo - SF-04 Slot Path Indexing & Comment/Whitespace Robustness
 */

import { describe, it, before } from 'node:test';
import * as assert from 'node:assert/strict';
import { compileTemplate } from '../packages/compiler/src/index.js';
import { template } from '../packages/runtime/src/index.js';
import { ensureMockDom } from '../packages/ai/src/index.js';

describe('SF-04: DOM Slot Path Indexing Fragility to Comments and Whitespace', () => {
  before(() => {
    ensureMockDom();
  });
  it('correctly indexes elements and dynamic slots when HTML comments are present', () => {
    const src = `<div>
  <!-- Header section -->
  <h1>{{ title }}</h1>
  <span>{{ subtitle }}</span>
</div>`;

    const compiled = compileTemplate(src);
    assert.strictEqual(compiled.templates.length, 1);
    const tmplUnit = compiled.templates[0];

    // Instantiate DOM from staticHtml
    const root = template(tmplUnit.staticHtml)() as HTMLElement;

    // Evaluate slot paths against the real DOM
    for (const slot of tmplUnit.dynamicSlots) {
      let target: any = root;
      for (const idx of slot.path) {
        assert.ok(target, `Target at path [${slot.path.join(',')}] must be defined`);
        target = target.childNodes[idx];
      }
      assert.ok(target, `Target childNode at path [${slot.path.join(',')}] must exist in instantiated DOM`);

      if (slot.expression === 'title') {
        // Must point inside <h1> (which has the dynamic text comment or is h1)
        assert.strictEqual(
          target.parentNode?.nodeName?.toLowerCase(),
          'h1',
          'Slot for "title" must be child of <h1>, not comment or wrong node'
        );
      } else if (slot.expression === 'subtitle') {
        assert.strictEqual(
          target.parentNode?.nodeName?.toLowerCase(),
          'span',
          'Slot for "subtitle" must be child of <span>, not undefined or wrong node'
        );
      }
    }
  });

  it('correctly indexes slots with comments between sibling elements', () => {
    const src = `<div class="container">
  <button id="btn1">{{ count }}</button>
  <!-- divider comment -->
  <button id="btn2">{{ text }}</button>
</div>`;

    const compiled = compileTemplate(src);
    const tmplUnit = compiled.templates[0];
    const root = template(tmplUnit.staticHtml)() as HTMLElement;

    for (const slot of tmplUnit.dynamicSlots) {
      let target: any = root;
      for (const idx of slot.path) {
        assert.ok(target, `Target at path [${slot.path.join(',')}] must be defined`);
        target = target.childNodes[idx];
      }
      assert.ok(target, `Child at path [${slot.path.join(',')}] must exist`);

      if (slot.expression === 'count') {
        assert.strictEqual(target.parentNode?.nodeName?.toLowerCase(), 'button');
        assert.strictEqual((target.parentNode as HTMLElement).id, 'btn1');
      } else if (slot.expression === 'text') {
        assert.strictEqual(target.parentNode?.nodeName?.toLowerCase(), 'button');
        assert.strictEqual((target.parentNode as HTMLElement).id, 'btn2');
      }
    }
  });

  it('correctly indexes slots when constant-folded expressions and comments are mixed', () => {
    const src = `<section>
      <!-- section header -->
      <h2>{{ "Prefix: " }}{{ dynamicTitle }}</h2>
      <!-- section body -->
      <p class="body">{{ dynamicBody }}</p>
    </section>`;

    const compiled = compileTemplate(src);
    const tmplUnit = compiled.templates[0];
    const root = template(tmplUnit.staticHtml)() as HTMLElement;

    for (const slot of tmplUnit.dynamicSlots) {
      let target: any = root;
      for (const idx of slot.path) {
        assert.ok(target, `Target at path [${slot.path.join(',')}] must be defined`);
        target = target.childNodes[idx];
      }
      assert.ok(target, `Child at path [${slot.path.join(',')}] must exist`);

      if (slot.expression === 'dynamicTitle') {
        assert.strictEqual(target.parentNode?.nodeName?.toLowerCase(), 'h2');
      } else if (slot.expression === 'dynamicBody') {
        assert.strictEqual(target.parentNode?.nodeName?.toLowerCase(), 'p');
      }
    }
  });
});
