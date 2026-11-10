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

    // Type inference assertions
    const _form: HTMLFormElement = root.refs.form as any;
    const _email: HTMLInputElement = root.refs.email as any;
    const _submit: HTMLButtonElement = root.refs.submit as any;
    const _message: HTMLParagraphElement = root.refs.message as any;

    assert.ok(root.refs.form);
    assert.ok(root.refs.email);
    assert.ok(root.refs.submit);
    assert.ok(root.refs.message);

    // Dynamic ref access return type
    const dynEmail = root.ref('email');
    const dynUnknown = root.ref('unknown');
    assert.strictEqual(dynEmail, root.refs.email);
    assert.strictEqual(dynUnknown, undefined);
  });
});

