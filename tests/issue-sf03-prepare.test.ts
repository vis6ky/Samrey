/**
 * @license Apache-2.0
 * @samrey/monorepo - SF-03 Git Monorepo Prepare Script Acceptance Test
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_PKG_PATH = path.resolve(__dirname, '..', 'package.json');

describe('SF-03: Git Direct Installation & Monorepo Prepare Script', () => {
  it('defines a prepare script in root package.json for Git-based dependency builds', () => {
    const pkg = JSON.parse(fs.readFileSync(ROOT_PKG_PATH, 'utf8'));
    assert.ok(
      pkg.scripts && typeof pkg.scripts.prepare === 'string',
      'Root package.json must contain a "prepare" script so npm/pnpm builds dist artifacts on Git install'
    );
    assert.match(
      pkg.scripts.prepare,
      /build:packages|scripts\/build-packages\.ts/,
      'prepare script must invoke build:packages to compile all subpackage dist/ artifacts'
    );
  });
});
