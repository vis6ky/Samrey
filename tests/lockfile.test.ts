import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { checkLockfile } from '../scripts/check-lockfile.js';

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

  it('4. Lockfile missing workspace link entry (node_modules/@samrey/<name>) fails checkLockfile', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-lockfile-test-'));
    try {
      // Create minimal package.json with workspaces
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(
          {
            name: '@samrey/monorepo',
            version: '2.0.0',
            workspaces: ['packages/*']
          },
          null,
          2
        )
      );

      // Create a workspace package
      const pkgDir = path.join(tempDir, 'packages', 'ai');
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(
        path.join(pkgDir, 'package.json'),
        JSON.stringify(
          {
            name: '@samrey/ai',
            version: '2.0.0'
          },
          null,
          2
        )
      );

      // Create package-lock.json with packages/ai entry but MISSING node_modules/@samrey/ai link entry
      fs.writeFileSync(
        path.join(tempDir, 'package-lock.json'),
        JSON.stringify(
          {
            name: '@samrey/monorepo',
            version: '2.0.0',
            lockfileVersion: 3,
            packages: {
              '': { name: '@samrey/monorepo', version: '2.0.0' },
              'packages/ai': { version: '2.0.0' }
              // missing: "node_modules/@samrey/ai": { "resolved": "packages/ai", "link": true }
            }
          },
          null,
          2
        )
      );

      const result = checkLockfile(tempDir);
      assert.equal(result.inSync, false, 'checkLockfile must fail when workspace link entry is missing');
      assert.ok(
        result.errors.some((e) => e.includes('node_modules/@samrey/ai') || e.includes('link entry')),
        `Errors must report missing workspace link entry, got: ${JSON.stringify(result.errors)}`
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

