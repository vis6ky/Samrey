/**
 * @license Apache-2.0
 * @samrey/compiler - SF-05 Codegen bindClass Tree-Shaking Acceptance Test
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { generateModuleCode } from '../src/index.js';

describe('SF-05: Codegen Tree-Shaker Imports bindClass', () => {
  it('includes bindClass in @samrey/runtime imports when componentBody uses bindClass', () => {
    const componentBody = 'bindClass(root, "active", () => isActive.value);';
    const code = generateModuleCode([], componentBody);

    assert.ok(
      code.includes('bindClass'),
      `Expected import list to include bindClass, but got:\n${code}`
    );
    assert.match(
      code,
      /import\s+\{[^}]*bindClass[^}]*\}\s+from\s+['"]@samrey\/runtime['"]/
    );
  });
});

