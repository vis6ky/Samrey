/**
 * @license Apache-2.0
 * @samrey/compiler - SF-01 Codegen Props and Scope Parameter Acceptance Test
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { compileTemplate, generateModuleCode } from '../src/index.js';

describe('SF-01: AOT Compiler Codegen Props & Scope Parameters', () => {
  it('emits props and scope parameters in Render function declaration', () => {
    const res = compileTemplate('<div><p>{{ props.user.name }}</p></div>');
    assert.ok(
      res.generatedCode.includes('export default function Render(props, scope) {'),
      `Expected Render(props, scope), but got:\n${res.generatedCode}`
    );
  });

  it('generateModuleCode generates Render with props and scope parameters', () => {
    const code = generateModuleCode([], '');
    assert.ok(
      code.includes('export default function Render(props, scope) {'),
      `Expected Render(props, scope), but got:\n${code}`
    );
  });

  it('generates valid JavaScript parseable by plain JS parser without TS compiler', () => {
    const res = compileTemplate('<div><p>{{ props.user.name }}</p></div>');
    // Strip import/export so new Function can parse the module statements as valid JS
    const jsBody = res.generatedCode
      .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
      .replace(/export\s+default\s+/, '');

    assert.doesNotThrow(() => {
      new Function(jsBody);
    }, 'Generated code must be valid JavaScript without TypeScript syntax errors');
  });
});

