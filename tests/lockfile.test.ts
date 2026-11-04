import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();

describe('Item 3: Lockfile Consistency & Single Package Manager Gate', () => {
  it('1. Exactly one lockfile (package-lock.json) is tracked, bun.lock is removed', () => {
    // package-lock.json must exist
    assert.ok(
      fs.existsSync(path.join(rootDir, 'package-lock.json')),
      'package-lock.json must exist'
    );

    // bun.lock / bun.lockb must NOT exist in repo
    assert.ok(
      !fs.existsSync(path.join(rootDir, 'bun.lock')),
      'bun.lock must NOT exist in repository'
    );
    assert.ok(
      !fs.existsSync(path.join(rootDir, 'bun.lockb')),
      'bun.lockb must NOT exist in repository'
    );

    // git tracked files must NOT contain bun.lock or other alternative lockfiles
    const gitTracked = execSync('git ls-files', { cwd: rootDir, encoding: 'utf8' }).split('\n');
    assert.ok(
      !gitTracked.includes('bun.lock'),
      'bun.lock must NOT be tracked in git'
    );
    assert.ok(
      !gitTracked.includes('bun.lockb'),
      'bun.lockb must NOT be tracked in git'
    );
    assert.ok(
      !gitTracked.includes('yarn.lock'),
      'yarn.lock must NOT be tracked in git'
    );
    assert.ok(
      !gitTracked.includes('pnpm-lock.yaml'),
      'pnpm-lock.yaml must NOT be tracked in git'
    );
    assert.ok(
      gitTracked.includes('package-lock.json'),
      'package-lock.json MUST be tracked in git'
    );
  });

  it('2. CI workflow uses npm (matching scripts) and runs npm ci', () => {
    const ciPath = path.join(rootDir, '.github/workflows/ci.yml');
    assert.ok(fs.existsSync(ciPath), '.github/workflows/ci.yml must exist');
    const ciContent = fs.readFileSync(ciPath, 'utf8');

    // Must NOT setup bun or run bun install
    assert.ok(
      !ciContent.includes('setup-bun'),
      'CI workflow must not use setup-bun'
    );
    assert.ok(
      !ciContent.includes('bun install'),
      'CI workflow must not use bun install'
    );

    // Must use npm ci
    assert.ok(
      ciContent.includes('npm ci'),
      'CI workflow must use `npm ci` for deterministic, clean lockfile installs'
    );
  });

  it('3. Check script detects if package-lock.json is out of date', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.ok(
      pkg.scripts['check:lockfile'],
      'package.json must declare "check:lockfile" script'
    );

    // Run the check script and ensure it exits 0 when lockfile is in sync
    const checkOut = execSync('npm run check:lockfile', { cwd: rootDir, encoding: 'utf8' });
    assert.ok(
      checkOut.includes('in sync') || checkOut.includes('valid') || checkOut.includes('PASSED'),
      'check:lockfile should confirm lockfile is in sync'
    );
  });
});
