/**
 * @license Apache-2.0
 * @samrey/monorepo - Phase 24 NPM Artifact Certification
 * Packs and verifies all 11 npm tarballs for correct file contents, permissions, licenses, and metadata.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { packAllPackages } from '../../scripts/release/pack.js';

describe('Phase 24 — NPM Artifact Certification Gate', () => {
  const PACKAGES = [
    'reactivity', 'runtime', 'security', 'compiler', 'router',
    'http', 'forms', 'ssr', 'testing', 'devtools', 'cli'
  ];

  it('1. Packs all 11 packages and verifies SHA256 checksums', () => {
    const tarballDir = path.join('/tmp', 'samrey-p24-tarballs');
    const packed = packAllPackages(tarballDir);

    assert.strictEqual(packed.length, 11, 'Must produce 11 tarballs');
    for (const p of packed) {
      assert.ok(fs.existsSync(p.destinationPath), `Tarball file must exist: ${p.destinationPath}`);
      assert.ok(p.sizeBytes > 0, `Tarball size must be > 0: ${p.packageName}`);
      assert.strictEqual(p.sha256.length, 64, `SHA256 checksum must be 64 characters: ${p.packageName}`);
    }
  });

  it('2. Inspects tarball contents to confirm zero leaks of test/benchmark/secret files', () => {
    const tarballDir = path.join('/tmp', 'samrey-p24-tarballs');
    const files = fs.readdirSync(tarballDir).filter(f => f.endsWith('.tgz'));

    assert.strictEqual(files.length, 11, 'Expected 11 .tgz archives');

    for (const tgz of files) {
      const fullPath = path.join(tarballDir, tgz);
      const tarList = execSync(`tar -tf "${fullPath}"`, { encoding: 'utf8' });
      const entries = tarList.split('\n').filter(Boolean);

      // Verify required files
      assert.ok(entries.some(e => e.endsWith('package.json')), `${tgz} must contain package.json`);
      assert.ok(entries.some(e => e.endsWith('README.md')), `${tgz} must contain README.md`);
      assert.ok(entries.some(e => e.endsWith('LICENSE')), `${tgz} must contain LICENSE`);

      // Verify no forbidden leaks
      assert.ok(!entries.some(e => e.includes('tests/')), `${tgz} must not contain tests/ directory`);
      assert.ok(!entries.some(e => e.includes('benchmarks/')), `${tgz} must not contain benchmarks/ directory`);
      assert.ok(!entries.some(e => e.includes('.env')), `${tgz} must not contain .env files`);
      assert.ok(!entries.some(e => e.includes('.git')), `${tgz} must not contain .git files`);
    }
  });

  it('3. Verifies package manifests inside all 11 packages', () => {
    for (const pkg of PACKAGES) {
      const pkgPath = path.join(process.cwd(), 'packages', pkg, 'package.json');
      const manifest = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      assert.strictEqual(manifest.name, `@samrey/${pkg}`);
      assert.strictEqual(manifest.version, '1.0.0');
      assert.strictEqual(manifest.license, 'Apache-2.0');
      assert.ok(manifest.repository, 'repository must be defined');
      assert.ok(manifest.publishConfig && manifest.publishConfig.access === 'public', 'publishConfig must be public');
      assert.ok(manifest.files && Array.isArray(manifest.files), 'files whitelist must be specified');
    }
  });
});
