/**
 * @license Apache-2.0
 * @aether/monorepo - Phase 24 CLI Tooling Final Gate
 * Tests aether CLI commands (create, dev, build, preview, test, audit, analyze, generate)
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { runCLI, generateStarterProject, CLI_VERSION } from '../../packages/cli/src/index.js';

describe('Phase 24 — CLI Tooling Final Gate', () => {
  it('1. Verifies CLI version matches v1.0.0', async () => {
    assert.strictEqual(CLI_VERSION, '1.0.0');
    const versionRes = await runCLI(['--version']);
    assert.strictEqual(versionRes.success, true);
    assert.ok(versionRes.message?.includes('1.0.0'));
  });

  it('2. Verifies CLI help command output', async () => {
    const helpRes = await runCLI(['--help']);
    assert.strictEqual(helpRes.success, true);
    assert.ok(helpRes.message?.includes('Aether Framework CLI'));
    assert.ok(helpRes.message?.includes('create'));
    assert.ok(helpRes.message?.includes('dev'));
    assert.ok(helpRes.message?.includes('build'));
  });

  it('3. Verifies generateStarterProject creates valid files for all 4 templates', () => {
    const templates = ['ssr', 'spa', 'minimal', 'ssg'] as const;
    for (const tmpl of templates) {
      const files = generateStarterProject(`test-${tmpl}-app`, { template: tmpl });
      assert.ok(files['package.json'], `Template ${tmpl} missing package.json`);
      assert.ok(files['README.md'], `Template ${tmpl} missing README.md`);
      assert.ok(files['src/App.tsx'] || files['src/entry-client.tsx'], `Template ${tmpl} missing App component`);

      const manifest = JSON.parse(files['package.json']);
      assert.strictEqual(manifest.version, '1.0.0');
      assert.strictEqual(manifest.dependencies['@aether/reactivity'], '^1.0.0');
      assert.strictEqual(manifest.dependencies['@aether/runtime'], '^1.0.0');
    }
  });

  it('4. Simulates CLI build and dev dry-run executions', async () => {
    const buildRes = await runCLI(['build', '--dry-run']);
    assert.strictEqual(buildRes.success, true);

    const devRes = await runCLI(['dev', '--dry-run', '--port', '3000']);
    assert.strictEqual(devRes.success, true);

    const auditRes = await runCLI(['audit', '--strict']);
    assert.strictEqual(auditRes.success, true);
  });
});
