/**
 * @license Apache-2.0
 * Tests for Issue 2 & 4: CLI Audit command hygiene, default ignores, --ignore glob, and zero files scanned
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runCLI } from '../packages/cli/src/index.js';

describe('Issue 2 & 4: CLI Audit hygiene, ignores, and zero-file handling', () => {
  it('1. Default ignores ignore bin, dist, node_modules, *.min.js, test files, and fixtures', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-audit-ignores-'));

    // Create directories that should be ignored by default even if they contain violations
    const dirs = ['bin', 'dist', 'node_modules', 'test', 'tests', 'fixtures'];
    for (const d of dirs) {
      const dirPath = path.join(tmp, d);
      fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(path.join(dirPath, 'bad.tsx'), '<img src="bad.jpg">');
    }

    // Create a minified file with violations (should be ignored)
    fs.writeFileSync(path.join(tmp, 'bundle.min.js'), '<img src="bad.jpg">');

    // Create a clean source file
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src', 'App.tsx'), 'export const App = () => <div>Clean</div>;');

    const res = await runCLI(['audit', '--strict', tmp]);
    assert.strictEqual(res.success, true, 'Ignored files/directories with violations should not fail audit');
    assert.strictEqual(res.data?.filesScanned, 1, 'Only 1 clean file should have been scanned');

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('2. Custom --ignore glob skips matching files', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-audit-glob-'));

    fs.mkdirSync(path.join(tmp, 'generated'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'generated', 'output.tsx'), '<img src="bad.jpg">');

    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src', 'App.tsx'), 'export const App = () => <div>Clean</div>;');

    // Without ignore, it fails
    const failRes = await runCLI(['audit', '--strict', tmp]);
    assert.strictEqual(failRes.success, false);

    // With --ignore, it ignores generated/** and passes
    const passRes = await runCLI(['audit', '--strict', tmp, '--ignore', 'generated/**']);
    assert.strictEqual(passRes.success, true, 'Custom glob ignore must skip violating file');

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('3. Zero files scanned prints warning and exits 0 without --strict', async () => {
    const emptyTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-audit-empty-'));

    const res = await runCLI(['audit', emptyTmp]);
    assert.strictEqual(res.success, true, 'Zero files without --strict must exit 0 (success: true)');
    assert.ok(res.message.includes('0 files scanned'));

    fs.rmSync(emptyTmp, { recursive: true, force: true });
  });

  it('4. Zero files scanned exits 1 with --strict', async () => {
    const emptyTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-audit-empty-strict-'));

    const res = await runCLI(['audit', '--strict', emptyTmp]);
    assert.strictEqual(res.success, false, 'Zero files with --strict must exit 1 (success: false)');
    assert.ok(res.message.includes('0 files scanned'));

    fs.rmSync(emptyTmp, { recursive: true, force: true });
  });
});
