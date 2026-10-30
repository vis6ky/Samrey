/**
 * @license Apache-2.0
 * @samrey/monorepo - Phase 24 CLI Tooling Final Gate
 * Tests samrey CLI commands (create, dev, build, preview, test, audit, analyze, generate)
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { runCLI, generateStarterProject, CLI_VERSION } from '../../packages/cli/src/index.js';

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

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
    assert.ok(helpRes.message?.includes('Samrey Framework CLI'));
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
      assert.strictEqual(manifest.dependencies['@samrey/reactivity'], '^1.0.0');
      assert.strictEqual(manifest.dependencies['@samrey/runtime'], '^1.0.0');
    }
  });

  it('4. Simulates CLI build and dev dry-run executions and isolated audit checks', async () => {
    const buildRes = await runCLI(['build', '--dry-run']);
    assert.strictEqual(buildRes.success, true);

    const devRes = await runCLI(['dev', '--dry-run', '--port', '3000']);
    assert.strictEqual(devRes.success, true);

    // Clean temp fixture for audit --strict pass case
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-cli-audit-'));
    const cleanDir = path.join(tmpBase, 'clean');
    fs.mkdirSync(cleanDir, { recursive: true });
    fs.writeFileSync(path.join(cleanDir, 'app.ts'), 'export const title = "Samrey Clean App";\n');

    const cleanAuditRes = await runCLI(['audit', '--strict', cleanDir]);
    assert.strictEqual(cleanAuditRes.success, true, 'Clean fixture must pass audit --strict');

    // Violating fixture for audit --strict fail case
    const badDir = path.join(tmpBase, 'violating');
    fs.mkdirSync(badDir, { recursive: true });
    fs.writeFileSync(path.join(badDir, 'bad.tsx'), 'export const Bad = () => <img src="test.jpg" />;\n');

    const badAuditRes = await runCLI(['audit', '--strict', badDir]);
    assert.strictEqual(badAuditRes.success, false, 'Violating fixture must fail audit --strict');

    // Cleanup
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });
});
