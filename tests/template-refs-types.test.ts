import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { template } from '../packages/runtime/src/index.js';

describe('Samrey 2.1.0 — TypeScript Static Reference Inference', () => {
  it('verifies static element inference for template references', () => {
    const root = template(`
      <form ref="form">
        <input ref="email" />
        <button ref="submit">Login</button>
        <p ref="message"></p>
      </form>
    `).clone();

    // Type inference assertions (STRICT - no "as any")
    const _form: HTMLFormElement = root.refs.form;
    const _email: HTMLInputElement = root.refs.email;
    const _submit: HTMLButtonElement = root.refs.submit;
    const _message: HTMLParagraphElement = root.refs.message;

    assert.ok(root.refs.form);
    assert.ok(root.refs.email);
    assert.ok(root.refs.submit);
    assert.ok(root.refs.message);

    // Compile-time negative verification: invalid static reference name is rejected
    // @ts-expect-error - Property 'nonexistent' does not exist on type
    const _invalid = root.refs.nonexistent;

    // Dynamic ref access documented return type: HTMLElement | undefined
    const dynEmail: HTMLInputElement = root.ref('email');
    const dynLookup: HTMLElement | undefined = root.ref('anything');
    const dynGeneric: HTMLInputElement | undefined = root.ref<HTMLInputElement>('email');
    const dynUnknown = root.ref('unknown');

    assert.strictEqual(dynEmail, root.refs.email);
    assert.strictEqual(dynGeneric, root.refs.email);
    assert.strictEqual(dynUnknown, undefined);
  });

  it('verifies inference with whitespace and casing variations in HTML attributes', () => {
    const root = template(`
      <form ref = "authForm">
        <input ref = "user" />
        <button REF="submitBtn">Submit</button>
        <p Ref="disclaimer">Terms</p>
      </form>
    `).clone();

    const _form: HTMLFormElement = root.refs.authForm;
    const _user: HTMLInputElement = root.refs.user;
    const _btn: HTMLButtonElement = root.refs.submitBtn;
    const _p: HTMLParagraphElement = root.refs.disclaimer;

    assert.ok(root.refs.authForm);
    assert.ok(root.refs.user);
    assert.ok(root.refs.submitBtn);
    assert.ok(root.refs.disclaimer);
  });

  it('infers SVG element subtypes from SVGElementTagNameMap cleanly (F-13)', () => {
    const root = template(`
      <svg ref="icon" viewBox="0 0 24 24">
        <path ref="line" d="M0 0L24 24" />
        <circle ref="dot" cx="12" cy="12" r="4" />
      </svg>
    `).clone();

    const _svg: SVGSVGElement = root.refs.icon;
    const _path: SVGPathElement = root.refs.line;
    const _circle: SVGCircleElement = root.refs.dot;
    const _byMethod = root.ref<SVGPathElement>('line');

    assert.ok(_svg);
    assert.ok(_path);
    assert.ok(_circle);
    assert.strictEqual(_byMethod, _path);
  });
});

