import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { compileTemplate, parseTemplate } from '../src/index.js';

describe('Samrey 2.1.0 — Compiler Template References & Diagnostics', () => {
  it('1. Compiles template with ref attributes into hoisted static template and module code', () => {
    const src = `
      <form ref="loginForm">
        <input ref="email" type="email" />
        <button ref="submitBtn">Login</button>
        <p ref="statusMsg">{status}</p>
      </form>
    `;

    const res = compileTemplate(src);
    assert.ok(res.generatedCode.includes('template('), 'Must generate template() call');
    assert.ok(res.templates[0].staticHtml.includes('ref="loginForm"'), 'Hoisted HTML must preserve ref attribute');
    assert.ok(res.templates[0].staticHtml.includes('ref="email"'), 'Hoisted HTML must preserve ref attribute');
    assert.ok(res.templates[0].staticHtml.includes('ref="submitBtn"'), 'Hoisted HTML must preserve ref attribute');
    assert.ok(res.templates[0].staticHtml.includes('ref="statusMsg"'), 'Hoisted HTML must preserve ref attribute');
    assert.ok(res.generatedCode.includes('bindText('), 'Dynamic text must be bound');
  });

  it('2. Emits SAMREY-109 diagnostic when duplicate ref identifier is used in a template', () => {
    const src = `
      <div>
        <input ref="username" />
        <input ref="username" />
      </div>
    `;

    const res = parseTemplate(src);
    assert.ok(
      res.diagnostics.some((d) => d.includes('SAMREY-109') && d.includes('username')),
      'Must emit SAMREY-109 for duplicate template ref "username"'
    );
  });

  it('3. Emits SAMREY-110 diagnostic when invalid ref identifier is used', () => {
    const src = `
      <div>
        <input ref="123-bad-id" />
        <button ref="invalid name">Click</button>
      </div>
    `;

    const res = parseTemplate(src);
    assert.ok(
      res.diagnostics.some((d) => d.includes('SAMREY-110') && d.includes('123-bad-id')),
      'Must emit SAMREY-110 for invalid ref identifier "123-bad-id"'
    );
    assert.ok(
      res.diagnostics.some((d) => d.includes('SAMREY-110') && d.includes('invalid name')),
      'Must emit SAMREY-110 for invalid ref identifier "invalid name"'
    );
  });

  it('4. Emits SAMREY-111 diagnostic when ref is placed on <Show> or <For> or Component tag', () => {
    const src = `
      <div>
        <Show ref="showRef" when={true}>
          <p>Inner</p>
        </Show>
        <For ref="forRef" each={[]}>
          <span>Row</span>
        </For>
        <CustomCard ref="cardRef" />
      </div>
    `;

    const res = parseTemplate(src);
    assert.ok(
      res.diagnostics.some((d) => d.includes('SAMREY-111') && d.includes('<Show>')),
      'Must emit SAMREY-111 for ref on <Show>'
    );
    assert.ok(
      res.diagnostics.some((d) => d.includes('SAMREY-111') && d.includes('<For>')),
      'Must emit SAMREY-111 for ref on <For>'
    );
    assert.ok(
      res.diagnostics.some((d) => d.includes('SAMREY-111') && d.includes('<CustomCard>')),
      'Must emit SAMREY-111 for ref on <CustomCard>'
    );
  });

  it('5. Full compileTemplate pipeline authoritatively enforces SAMREY-109, SAMREY-110, SAMREY-111', () => {
    // Pipeline test for SAMREY-109 (Duplicate)
    assert.throws(
      () => compileTemplate('<div><input ref="item" /><button ref="item">Action</button></div>'),
      (err: any) => err.code === 'SAMREY-109' && err.message.includes('item')
    );

    // Pipeline test for SAMREY-110 (Invalid Identifier)
    assert.throws(
      () => compileTemplate('<div><input ref="bad-ident-123" /></div>'),
      (err: any) => err.code === 'SAMREY-110' && err.message.includes('bad-ident-123')
    );

    // Pipeline test for SAMREY-111 (Unsupported Placement)
    assert.throws(
      () => compileTemplate('<div><MyWidget ref="widgetRef" /></div>'),
      (err: any) => err.code === 'SAMREY-111' && err.message.includes('MyWidget')
    );
  });

  it('6. Case-insensitive ref attribute detection in compiler (REF=, Ref=)', () => {
    const src = `
      <form REF="upperForm">
        <input Ref="camelInput" />
        <button ref="lowerBtn">Go</button>
      </form>
    `;

    const res = compileTemplate(src);
    assert.ok(res.templates[0].staticHtml.includes('REF="upperForm"'));
    assert.ok(res.templates[0].staticHtml.includes('Ref="camelInput"'));
    assert.ok(res.templates[0].staticHtml.includes('ref="lowerBtn"'));

    // Verify duplicate detection across casings
    const dupSrc = `<div><input ref="target" /><input REF="target" /></div>`;
    assert.throws(
      () => compileTemplate(dupSrc),
      (err: any) => err.code === 'SAMREY-109'
    );
  });
});
