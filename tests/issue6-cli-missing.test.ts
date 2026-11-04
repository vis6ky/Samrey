import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { spawnSync, execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Item 6: CLI Binary Bundle Missing & Build Instruction', () => {
  const cliDir = path.join(process.cwd(), 'packages', 'cli');
  const binScript = path.join(cliDir, 'bin', 'samrey.js');
  const bundleScript = path.join(cliDir, 'bin', 'samrey.bundle.js');
  const readmePath = path.join(cliDir, 'README.md');

  it('prints "Run `npm run build` in packages/cli" without a stack trace when bundle is missing', () => {
    // Ensure bundle is missing for this test
    const bundleBackup = bundleScript + '.bak';

    if (fs.existsSync(bundleScript)) {
      fs.renameSync(bundleScript, bundleBackup);
    }

    try {
      // Execute the bin script with node
      const child = spawnSync(process.execPath, [binScript], {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const output = (child.stderr || '') + (child.stdout || '');

      // Must print exact instruction
      assert.ok(
        output.includes('Run `npm run build` in packages/cli'),
        `Expected output to contain "Run \`npm run build\` in packages/cli", got:\n${output}`
      );

      // Must exit with non-zero exit code
      assert.notEqual(child.status, 0, 'Exit code must be non-zero');

      // Must NOT print a stack trace
      assert.ok(!output.includes('at Function._resolveFilename'), 'Output must not contain loader stack trace');
      assert.ok(!output.includes('node:internal'), 'Output must not contain internal node stack trace');
      assert.ok(!output.includes('MODULE_NOT_FOUND'), 'Output must not contain raw MODULE_NOT_FOUND error');
    } finally {
      if (fs.existsSync(bundleBackup)) {
        fs.renameSync(bundleBackup, bundleScript);
      }
    }
  });

  it('contains a note in README.md that the bundle is generated at build/pack time', () => {
    assert.ok(fs.existsSync(readmePath), 'packages/cli/README.md must exist');
    const content = fs.readFileSync(readmePath, 'utf-8');
    assert.ok(
      content.toLowerCase().includes('build/pack time') ||
      content.toLowerCase().includes('build time') ||
      content.toLowerCase().includes('generated at build'),
      'README.md must note that the bundle is generated at build/pack time'
    );
    assert.ok(
      content.includes('npm run build') && content.includes('packages/cli'),
      'README.md must mention `npm run build` in packages/cli'
    );
  });

  it('executes real CLI commands cleanly when bundle is built', () => {
    // Build bundle
    execSync('npm run build', { cwd: cliDir, stdio: 'pipe' });
    assert.ok(fs.existsSync(bundleScript), 'bundle must exist after build');

    const versionChild = spawnSync(process.execPath, [binScript, '--version'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert.equal(versionChild.status, 0);
    assert.ok((versionChild.stdout || '').includes('samrey v2.0.0'));

    const helpChild = spawnSync(process.execPath, [binScript, '--help'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert.equal(helpChild.status, 0);
    assert.ok((helpChild.stdout || '').includes('Samrey Framework CLI'));
  });
});
