/**
 * @license Apache-2.0
 * @samrey/monorepo - Phase 24 Version Final Gate
 * Validates version consistency across all 11 package.json files, root manifest, and CLI constants.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { validateVersionConsistency } from '../../scripts/release/validate-version.js';

describe('Phase 24 — Version Final Gate', () => {
  const PACKAGES = [
    'reactivity', 'runtime', 'security', 'compiler', 'router',
    'http', 'forms', 'ssr', 'testing', 'devtools', 'cli'
  ];

  it('1. Verifies root package.json is pinned to 1.0.0', () => {
    const rootManifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    assert.strictEqual(rootManifest.version, '1.0.0');
  });

  it('2. Verifies all 11 packages are pinned to 1.0.0', () => {
    const result = validateVersionConsistency('1.0.0');
    assert.strictEqual(result.allMatch, true, `Version mismatches: ${result.mismatches.join(', ')}`);
    assert.strictEqual(result.expectedVersion, '1.0.0');
    assert.strictEqual(result.rootVersion, '1.0.0');

    for (const pkg of PACKAGES) {
      assert.strictEqual(result.packageVersions[`@samrey/${pkg}`], '1.0.0');
    }
  });

  it('3. Verifies all internal @samrey/* dependencies specify ^1.0.0', () => {
    for (const pkg of PACKAGES) {
      const manifestPath = path.join(process.cwd(), 'packages', pkg, 'package.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const deps = manifest.dependencies || {};

      for (const [depName, depVer] of Object.entries(deps)) {
        if (depName.startsWith('@samrey/')) {
          assert.strictEqual(
            depVer,
            '^1.0.0',
            `${manifest.name} specifies ${depName}: ${depVer}, expected ^1.0.0`
          );
        }
      }
    }
  });
});
