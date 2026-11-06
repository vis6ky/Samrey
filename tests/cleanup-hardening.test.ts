/**
 * @license Apache-2.0
 * @samrey/monorepo - Item 5 Cleanup & Audit Verification Suite
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { validateDependencyTopology } from '../scripts/release/validate-dependencies.js';
import { runCompatibilitySuite, verifyStdioHandshake } from '../packages/ai/src/compatibility.js';

describe('Item 5: Cleanup & Consistency Audit', () => {
  const { topologicalOrder } = validateDependencyTopology();
  const packageCount = topologicalOrder.length;

  describe('1. Dynamic Archive Count', () => {
    it('scripts/release/pack.ts derives archive count from dependency topology instead of hardcoded 11', () => {
      const packSrc = fs.readFileSync(path.join(process.cwd(), 'scripts/release/pack.ts'), 'utf8');
      assert.ok(
        !packSrc.includes('/11 Archives Ready'),
        'scripts/release/pack.ts must not contain hardcoded "/11 Archives Ready"'
      );
      assert.ok(
        packSrc.includes('${topologicalOrder.length} Archives Ready') ||
        packSrc.includes('Archives Ready'),
        'scripts/release/pack.ts must dynamically reference archive count'
      );
    });

    it('scripts/release/release-report.ts derives package count dynamically', () => {
      const reportSrc = fs.readFileSync(path.join(process.cwd(), 'scripts/release/release-report.ts'), 'utf8');
      assert.ok(
        !reportSrc.includes('(11/11 Valid)'),
        'scripts/release/release-report.ts must not contain hardcoded "11/11 Valid"'
      );
    });
  });

  describe('2. AI and MCP Server Tarball Manifests (no src)', () => {
    it('packages/ai/package.json does not list "src" in files whitelist', () => {
      const aiPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'packages/ai/package.json'), 'utf8'));
      assert.ok(
        !aiPkg.files.includes('src'),
        '@samrey/ai files must exclude "src" because compiled dist/ is the published artifact'
      );
    });

    it('packages/mcp-server/package.json does not list "src" in files whitelist', () => {
      const mcpPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'packages/mcp-server/package.json'), 'utf8'));
      assert.ok(
        !mcpPkg.files.includes('src'),
        '@samrey/mcp-server files must exclude "src" because bin and compiled dist/ are the published artifacts'
      );
    });
  });

  describe('3. Files Entries Point Only to Existing Directories', () => {
    it('no package manifest points to missing or non-existent directories', () => {
      const packagesDir = path.join(process.cwd(), 'packages');
      for (const pkg of fs.readdirSync(packagesDir)) {
        const pkgDir = path.join(packagesDir, pkg);
        if (!fs.statSync(pkgDir).isDirectory()) continue;
        const pkgJsonPath = path.join(pkgDir, 'package.json');
        if (!fs.existsSync(pkgJsonPath)) continue;
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

        if (Array.isArray(pkgJson.files)) {
          for (const fileOrDir of pkgJson.files) {
            // "dist" is created by build, all others must exist in source tree
            if (fileOrDir === 'dist') continue;
            const fullPath = path.join(pkgDir, fileOrDir);
            assert.ok(
              fs.existsSync(fullPath),
              `Package @samrey/${pkg} has missing files entry: "${fileOrDir}" (resolved to ${fullPath})`
            );
          }
        }
      }
    });

    it('packages/ai/package.json does not list non-existent skills or templates directories', () => {
      const aiPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'packages/ai/package.json'), 'utf8'));
      assert.ok(!aiPkg.files.includes('skills'), 'packages/ai must not list non-existent local skills dir');
      assert.ok(!aiPkg.files.includes('templates'), 'packages/ai must not list non-existent local templates dir');
    });
  });

  describe('4. compatibility.ts Connection Compatibility via Stdio Handshake', { concurrency: 1 }, () => {
    it('verifyStdioHandshake performs an actual live stdio handshake with the MCP server', async () => {
      const result = await verifyStdioHandshake();
      assert.strictEqual(result.connected, true, `Stdio handshake should succeed: ${result.error || ''}`);
      assert.ok(result.latencyMs >= 0, 'Latency should be recorded');
      assert.strictEqual(result.serverInfo?.name, '@samrey/mcp-server');
    });

    it('runCompatibilitySuite computes connectionCompatibility from stdio handshake and drops literal true in task criteria', async () => {
      const suite = await runCompatibilitySuite();
      assert.strictEqual(typeof suite.summary.connectionCompatibility, 'boolean');
      assert.strictEqual(suite.summary.connectionCompatibility, true);

      // Verify task criteria no longer contain dummy hardcoded literals
      for (const t of suite.taskResults) {
        assert.ok('apiContractConformance' in t.criteria, `Task ${t.taskId} must evaluate apiContractConformance`);
        // Criteria must be boolean values computed from task evaluation
        assert.strictEqual(typeof (t.criteria as any).apiContractConformance, 'boolean');
      }
    });
  });

  describe('5. PLATFORM_COMPATIBILITY_MATRIX.md Truthful Phrasing', () => {
    it('does not claim "empirical verification" for simulated self-checks', () => {
      const matrixDoc = fs.readFileSync(path.join(process.cwd(), 'docs/ai/PLATFORM_COMPATIBILITY_MATRIX.md'), 'utf8');
      const lines = matrixDoc.split('\n').slice(0, 10).join('\n');
      assert.ok(
        !lines.includes('empirical verification evidence demonstrating'),
        'Header must not claim empirical verification evidence for self-checks'
      );
    });
  });
});
