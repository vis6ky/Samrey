import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as zlib from 'node:zlib';
import { runCLI } from '../packages/cli/src/runner.js';
import { auditSource } from '../packages/cli/src/audit.js';

function createTempDir(prefix = 'samrey-test-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanupTempDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

describe('Phase 4 - 4.1: Real CLI Commands Implementation & Invariants', () => {
  it('empty directory: none of the five commands prints a success message and all exit 1', async () => {
    const emptyDir = createTempDir('samrey-empty-');
    try {
      // 1. build on empty dir (no vite, no files) -> exit 1
      const buildRes = await runCLI(['build'], { cwd: emptyDir });
      assert.equal(buildRes.exitCode, 1);
      assert.equal(buildRes.success, false);
      assert.ok(!buildRes.message.includes('Build finished successfully'));

      // 2. test on empty dir (no test files) -> exit 1 ("no tests found" must not be passed)
      const testRes = await runCLI(['test'], { cwd: emptyDir });
      assert.equal(testRes.exitCode, 1);
      assert.equal(testRes.success, false);
      assert.ok(!testRes.message.includes('passed cleanly'));
      assert.ok(testRes.message.toLowerCase().includes('no test'));

      // 3. analyze without build -> exit 1
      const analyzeRes = await runCLI(['analyze'], { cwd: emptyDir });
      assert.equal(analyzeRes.exitCode, 1);
      assert.equal(analyzeRes.success, false);
      assert.ok(analyzeRes.message.includes('samrey build first'));

      // 4. preview without build -> exit 1
      const previewRes = await runCLI(['preview'], { cwd: emptyDir });
      assert.equal(previewRes.exitCode, 1);
      assert.equal(previewRes.success, false);
      assert.ok(previewRes.message.includes('samrey build first') || previewRes.message.includes('No build output'));

      // 5. audit on empty dir -> 0 files scanned, 0 violations
      const auditRes = await runCLI(['audit'], { cwd: emptyDir });
      assert.ok(auditRes.message.includes('0 files scanned'));
      assert.ok(!auditRes.message.includes('0 critical security flaws'));
    } finally {
      cleanupTempDir(emptyDir);
    }
  });

  it('build fails when vite fails -> exit non-zero, no success text', async () => {
    const projectDir = createTempDir('samrey-broken-build-');
    try {
      // Create a mock vite executable that exits 1
      const viteBinDir = path.join(projectDir, 'node_modules', 'vite', 'bin');
      fs.mkdirSync(viteBinDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({ name: 'broken-app' }));
      fs.writeFileSync(path.join(viteBinDir, 'vite.js'), 'console.error("Vite syntax explosion"); process.exit(1);');

      const res = await runCLI(['build'], { cwd: projectDir });
      assert.notEqual(res.exitCode, 0, 'Must exit non-zero');
      assert.equal(res.success, false);
      assert.ok(!res.message.includes('Build finished successfully'));
      assert.ok(res.message.includes('Vite syntax explosion') || res.message.includes('Build failed'));
    } finally {
      cleanupTempDir(projectDir);
    }
  });

  it('build on a tiny project -> reports real files and sizes that exist on disk', async () => {
    const projectDir = createTempDir('samrey-real-build-');
    try {
      // Mock vite that produces dist/client.js and dist/style.css
      const viteBinDir = path.join(projectDir, 'node_modules', 'vite', 'bin');
      fs.mkdirSync(viteBinDir, { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({ name: 'real-app' }));

      const mockViteCode = `
        const fs = require('fs');
        const path = require('path');
        const out = path.join(process.cwd(), 'dist');
        fs.mkdirSync(out, { recursive: true });
        fs.writeFileSync(path.join(out, 'client.js'), 'console.log("samrey client code");');
        fs.writeFileSync(path.join(out, 'style.css'), 'body { margin: 0; }');
      `;
      fs.writeFileSync(path.join(viteBinDir, 'vite.js'), mockViteCode);

      const res = await runCLI(['build'], { cwd: projectDir });
      assert.equal(res.exitCode, 0);
      assert.equal(res.success, true);
      assert.ok(res.message.includes('client.js'));
      assert.ok(res.message.includes('style.css'));
      assert.ok(res.message.includes('gzip:'));

      const clientJsPath = path.join(projectDir, 'dist', 'client.js');
      assert.ok(fs.existsSync(clientJsPath), 'Built file must exist on disk');
      const realRaw = fs.statSync(clientJsPath).size;
      const realGzip = zlib.gzipSync(fs.readFileSync(clientJsPath)).length;

      const data = res.data as any;
      assert.ok(data.files.length >= 2);
      const clientEntry = data.files.find((f: any) => f.path.includes('client.js'));
      assert.ok(clientEntry);
      assert.equal(clientEntry.rawBytes, realRaw);
      assert.equal(clientEntry.gzipBytes, realGzip);
    } finally {
      cleanupTempDir(projectDir);
    }
  });

  it('test with failing test -> exit non-zero; with zero tests -> exit 1', async () => {
    const projectDir = createTempDir('samrey-test-fail-');
    try {
      fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({ name: 'failing-test-app' }));
      const testsDir = path.join(projectDir, 'tests');
      fs.mkdirSync(testsDir, { recursive: true });
      fs.writeFileSync(
        path.join(testsDir, 'broken.test.js'),
        'const { test } = require("node:test"); const assert = require("node:assert"); test("fails", () => { assert.fail("Intentional fail"); });'
      );

      const res = await runCLI(['test'], { cwd: projectDir });
      assert.notEqual(res.exitCode, 0, 'Failing test must exit non-zero');
      assert.equal(res.success, false);
      assert.ok(!res.message.includes('All test suites passed cleanly'));
    } finally {
      cleanupTempDir(projectDir);
    }
  });

  it('audit on a file with <img> without alt, javascript: href, and inline onclick -> exit 1 and lists file:line; clean file -> exit 0', async () => {
    const projectDir = createTempDir('samrey-audit-');
    try {
      const srcDir = path.join(projectDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      // File with violations
      const badContent = [
        '<div class="wrapper">',
        '  <img src="/photo.jpg">',
        '  <a href="javascript:alert(1)">Click</a>',
        '  <button onclick="doSomething()">Submit</button>',
        '</div>'
      ].join('\n');
      fs.writeFileSync(path.join(srcDir, 'Bad.tsx'), badContent);

      const res = await runCLI(['audit'], { cwd: projectDir });
      assert.equal(res.exitCode, 1, 'Audit with violations must exit 1');
      assert.equal(res.success, false);
      assert.ok(res.message.includes('Bad.tsx:2'), 'Must list file:line for <img> alt violation');
      assert.ok(res.message.includes('Bad.tsx:3'), 'Must list file:line for javascript: URI');
      assert.ok(res.message.includes('Bad.tsx:4'), 'Must list file:line for inline onclick');
      assert.ok(res.message.includes('checks: img alt, javascript: URIs, inline handlers, <script>'));
      assert.ok(!res.message.includes('0 critical security flaws'), 'Must not claim 0 critical flaws');

      // Test --warn-only flag
      const warnRes = await runCLI(['audit', '--warn-only'], { cwd: projectDir });
      assert.equal(warnRes.exitCode, 0, '--warn-only must report without failing');

      // Clean file
      fs.writeFileSync(path.join(srcDir, 'Bad.tsx'), '<div><img src="/p.jpg" alt="pic" /><a href="/about">Link</a></div>');
      const cleanRes = await runCLI(['audit'], { cwd: projectDir });
      assert.equal(cleanRes.exitCode, 0);
      assert.ok(cleanRes.message.includes('0 violations'));
    } finally {
      cleanupTempDir(projectDir);
    }
  });

  it('analyze without build -> exit 1; with build -> sizes match files', async () => {
    const projectDir = createTempDir('samrey-analyze-');
    try {
      // 1. Without build
      const failRes = await runCLI(['analyze'], { cwd: projectDir });
      assert.equal(failRes.exitCode, 1);
      assert.ok(failRes.message.includes('run samrey build first'));

      // 2. With build
      const distDir = path.join(projectDir, 'dist');
      fs.mkdirSync(distDir, { recursive: true });
      fs.writeFileSync(path.join(distDir, 'bundle.js'), 'const a = "Hello Real World";');
      const rawSize = fs.statSync(path.join(distDir, 'bundle.js')).size;
      const gzipSize = zlib.gzipSync(fs.readFileSync(path.join(distDir, 'bundle.js'))).length;

      const successRes = await runCLI(['analyze'], { cwd: projectDir });
      assert.equal(successRes.exitCode, 0);
      assert.equal(successRes.success, true);
      assert.ok(successRes.message.includes('bundle.js'));
      // No imaginary signal/effect counts
      assert.ok(!successRes.message.includes('signalsCount'));
      assert.ok(!successRes.message.includes('computedsCount'));

      // Test JSON mode
      const jsonRes = await runCLI(['analyze', '--json'], { cwd: projectDir });
      assert.equal(jsonRes.exitCode, 0);
      const parsed = JSON.parse(jsonRes.message);
      assert.equal(parsed.totalRawBytes, rawSize);
      assert.equal(parsed.totalGzipBytes, gzipSize);
    } finally {
      cleanupTempDir(projectDir);
    }
  });

  it('preview without build -> exit 1', async () => {
    const projectDir = createTempDir('samrey-preview-');
    try {
      const res = await runCLI(['preview'], { cwd: projectDir });
      assert.equal(res.exitCode, 1);
      assert.ok(res.message.includes('run samrey build first') || res.message.includes('No build output'));
    } finally {
      cleanupTempDir(projectDir);
    }
  });

  it('recursion prevention test for starter scripts', async () => {
    // Starter template has "build": "samrey build" and "test": "samrey test"
    // samrey build and samrey test must NOT invoke npm run build / npm test
    const projectDir = createTempDir('samrey-recursion-');
    try {
      fs.writeFileSync(
        path.join(projectDir, 'package.json'),
        JSON.stringify({
          name: 'recursive-check',
          scripts: {
            build: 'samrey build',
            test: 'samrey test'
          }
        })
      );
      // If samrey build called `npm run build`, it would recurse.
      // Calling samrey build directly looks for vite and fails cleanly without recursion:
      const buildRes = await runCLI(['build'], { cwd: projectDir });
      assert.equal(buildRes.exitCode, 1);
      assert.ok(buildRes.message.includes('Vite was not found') || buildRes.message.includes('npm install --save-dev vite'));

      // Calling samrey test directly looks for test files and fails cleanly without recursion:
      const testRes = await runCLI(['test'], { cwd: projectDir });
      assert.equal(testRes.exitCode, 1);
      assert.ok(testRes.message.includes('No test files found'));
    } finally {
      cleanupTempDir(projectDir);
    }
  });
});
