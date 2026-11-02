import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runCLI } from '../packages/cli/src/runner.js';

describe('Issue 12: "samrey create" Directory Resolution & Target Directory Isolation', () => {
  it('creates project inside a subfolder matching the project name and leaves cwd untouched', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-create-test-'));
    try {
      const result = await runCLI(['create', 'my-app', '--template', 'spa'], { cwd: tempDir });
      assert.equal(result.exitCode, 0, `Expected exit code 0, got: ${result.message}`);

      // my-app/package.json must exist
      const projectPkg = path.join(tempDir, 'my-app', 'package.json');
      assert.ok(fs.existsSync(projectPkg), `Expected ${projectPkg} to exist`);

      // cwd itself must NOT contain package.json or any files directly
      const cwdPkg = path.join(tempDir, 'package.json');
      assert.ok(!fs.existsSync(cwdPkg), `Expected cwd ${tempDir} NOT to contain package.json directly`);

      const rootEntries = fs.readdirSync(tempDir);
      assert.deepEqual(rootEntries, ['my-app'], 'Temp cwd should only contain the newly created project folder');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('honors --targetDir flag when explicitly specified', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-targetdir-test-'));
    try {
      const customSub = path.join(tempDir, 'custom-subfolder');
      const result = await runCLI(['create', 'my-app', '--template', 'spa', '--targetDir', customSub], { cwd: tempDir });
      assert.equal(result.exitCode, 0, `Expected exit code 0, got: ${result.message}`);

      const projectPkg = path.join(customSub, 'package.json');
      assert.ok(fs.existsSync(projectPkg), `Expected ${projectPkg} to exist`);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
