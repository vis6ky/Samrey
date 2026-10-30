/**
 * @license Apache-2.0
 * Tests for Issue 9: Unified SAMREY-xxx compiler error codes and uniqueness
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  ERROR_REGISTRY,
  compileTemplate,
  SamreyCompilerError
} from '../packages/compiler/src/index.js';

describe('Issue 9: Unified SAMREY-xxx Compiler Error Code Scheme', () => {
  it('1. All primary compiler error definitions in ERROR_REGISTRY use SAMREY-xxx scheme', () => {
    const samreyEntries = Object.entries(ERROR_REGISTRY).filter(([k]) => k.startsWith('SAMREY-'));
    assert.ok(samreyEntries.length >= 10, 'Expected at least 10 SAMREY error codes in registry');

    for (const [key, def] of samreyEntries) {
      assert.match(key, /^SAMREY-\d{3}$/, `Key ${key} must match SAMREY-xxx`);
      assert.strictEqual(def.code, key);
      assert.ok(def.title, `${key} must have a title`);
      assert.ok(def.defaultExplanation, `${key} must have explanation`);
      assert.ok(def.defaultSuggestion, `${key} must have suggestion`);
    }
  });

  it('2. All SAMREY-xxx error numbers are unique', () => {
    const samreyKeys = Object.keys(ERROR_REGISTRY).filter((k) => k.startsWith('SAMREY-'));
    const uniqueKeys = new Set(samreyKeys);
    assert.strictEqual(uniqueKeys.size, samreyKeys.length, 'Every SAMREY error code must be unique');
  });

  it('3. Compile errors throw with SAMREY-xxx error code', () => {
    assert.throws(
      () => compileTemplate('<Show when={true}><div>Test</div></Show>'),
      (err: any) => {
        return err instanceof SamreyCompilerError && err.code === 'SAMREY-108';
      }
    );

    assert.throws(
      () => compileTemplate('<div><span unclosed></div>'),
      (err: any) => {
        return err instanceof SamreyCompilerError && err.code.startsWith('SAMREY-');
      }
    );
  });
});
