/**
 * @license Apache-2.0
 * @samrey/security - SF-02 Browser Crypto Compatibility Acceptance Test
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateCsrfToken, verifyCsrfToken } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSRF_SRC_PATH = path.resolve(__dirname, '..', 'src', 'csrf.ts');

describe('SF-02: Security Package Browser Crypto Compatibility', () => {
  it('does not statically import node:crypto at top level', () => {
    const src = fs.readFileSync(CSRF_SRC_PATH, 'utf8');
    assert.ok(
      !/import\s+[^;]+from\s+['"]node:crypto['"]/.test(src),
      'csrf.ts must not have static top-level import of "node:crypto" to ensure clean browser bundling'
    );
  });

  it('generates and verifies CSRF tokens using web-standard crypto', () => {
    const token = generateCsrfToken();
    assert.strictEqual(typeof token, 'string');
    assert.ok(token.length >= 32, 'Generated token must have sufficient length');

    // Verification
    assert.strictEqual(verifyCsrfToken(token, token), true);
    assert.strictEqual(verifyCsrfToken(token, 'invalid-token-value'), false);
  });
});
