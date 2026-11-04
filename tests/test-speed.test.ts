import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

const rootDir = process.cwd();

describe('Item 4: Test Suite Speed & Shared Tarball Fixture Gate', () => {
  it('1. Shared tarball fixture exists and is used by packaging and starter acceptance suites', () => {
    // Check that scripts/release/pack.ts exports getSharedTarballs
    const packSource = fs.readFileSync(path.join(rootDir, 'scripts/release/pack.ts'), 'utf8');
    assert.ok(
      packSource.includes('getSharedTarballs'),
      'scripts/release/pack.ts must export getSharedTarballs to share packed-tarball fixtures'
    );

    // Check that issue13 and issue14 use the shared fixture or shared tarballs
    const issue13 = fs.readFileSync(path.join(rootDir, 'tests/issue13-packaging-consumer.test.ts'), 'utf8');
    const issue14 = fs.readFileSync(path.join(rootDir, 'tests/issue14-starter-acceptance.test.ts'), 'utf8');

    assert.ok(
      issue13.includes('getSharedTarballs') || issue13.includes('sharedTarballs') || issue13.includes('shared'),
      'issue13 must use shared tarball fixture'
    );
    assert.ok(
      issue14.includes('getSharedTarballs') || issue14.includes('sharedTarballs') || issue14.includes('shared'),
      'issue14 must use shared tarball fixture'
    );
  });

  it('2. package.json defines "test:slow" and CI runs it', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['test:slow'], 'package.json must define "test:slow" script');

    const ciContent = fs.readFileSync(path.join(rootDir, '.github/workflows/ci.yml'), 'utf8');
    assert.ok(
      ciContent.includes('npm run test:slow') || ciContent.includes('test:slow'),
      '.github/workflows/ci.yml must run test:slow'
    );
  });
});
