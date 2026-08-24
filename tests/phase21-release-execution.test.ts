/**
 * @license Apache-2.0
 * @aether/monorepo - Phase 21 Public Release Execution & npm Publication Validation Suite
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { runPreflight } from '../scripts/release/preflight.js';
import { validateAllPackages } from '../scripts/release/validate-packages.js';
import { validateDependencyTopology } from '../scripts/release/validate-dependencies.js';
import { validatePublicAPIExports } from '../scripts/release/validate-exports.js';
import { validateVersionConsistency } from '../scripts/release/validate-version.js';
import { validateLicense } from '../scripts/release/validate-license.js';
import { inspectPublishedFiles } from '../scripts/release/validate-files.js';
import { packAllPackages } from '../scripts/release/pack.js';
import { runPublish } from '../scripts/release/publish.js';
import { verifyRegistryPackages } from '../scripts/release/verify-registry.js';
import { runSmokeTest } from '../scripts/release/smoke-test.js';
import { generateAllReleaseReports } from '../scripts/release/release-report.js';

describe('Aether Phase 21 — Public Release Execution & Registry Verification', () => {
  it('1. Preflight Pipeline Verification', () => {
    const preflight = runPreflight();
    assert.ok(preflight.toolsReady, 'Tooling must be ready');
    assert.strictEqual(preflight.packagesFound, 11, 'All 11 @aether/* packages must be present');
    assert.ok(preflight.success, 'Preflight check must succeed');
  });

  it('2. Package Manifest Hardening Verification', () => {
    const { packages, allValid } = validateAllPackages();
    assert.strictEqual(packages.length, 11, 'Must audit 11 packages');
    assert.ok(allValid, 'All 11 packages must have hardened manifests');
    for (const p of packages) {
      assert.strictEqual(p.version, '1.0.0', `${p.packageName} version must be 1.0.0`);
      assert.strictEqual(p.license, 'Apache-2.0', `${p.packageName} license must be Apache-2.0`);
      assert.ok(p.hasPublishConfig, `${p.packageName} must specify public publishConfig`);
      assert.ok(p.hasFilesWhitelist, `${p.packageName} must have clean files whitelist`);
    }
  });

  it('3. Dependency Topology & Topological Sort Verification', () => {
    const topology = validateDependencyTopology();
    assert.ok(!topology.hasCycles, 'Dependency graph must have 0 cycles');
    assert.strictEqual(topology.topologicalOrder.length, 11, 'Topological order must include all 11 packages');
    assert.strictEqual(topology.foreignFrameworkViolations.length, 0, 'Zero foreign framework dependencies allowed');
    assert.strictEqual(topology.invalidWorkspaceRefs.length, 0, 'Zero invalid workspace refs allowed');
    assert.ok(topology.isValid, 'Topology validation must be valid');
  });

  it('4. Public API Parity with Authoritative Contract', async () => {
    const { results, allValid } = await validatePublicAPIExports();
    assert.strictEqual(results.length, 11, 'Must audit 11 packages for export parity');
    assert.ok(allValid, 'All 11 packages must match docs/PUBLIC_API.md exports 100%');
  });

  it('5. Release Version Synchronization', () => {
    const versionResult = validateVersionConsistency('1.0.0');
    assert.strictEqual(versionResult.rootVersion, '1.0.0', 'Root version must match 1.0.0');
    assert.ok(versionResult.allMatch, 'All package versions must match 1.0.0');
  });

  it('6. Legal & License Header Audit', () => {
    const licResult = validateLicense();
    assert.ok(licResult.rootLicenseExists, 'Root LICENSE file must exist');
    assert.ok(licResult.isValid, 'All source files must contain Apache-2.0 license headers');
  });

  it('7. Published File Whitelist & Blacklist Audit', () => {
    const fileResult = inspectPublishedFiles();
    assert.strictEqual(fileResult.packages.length, 11, 'Must inspect 11 packages');
    assert.ok(fileResult.allValid, 'No blacklisted files (tests, secrets, .env) in tarballs');
  });

  it('8. Release Packaging Pipeline', () => {
    const tarballs = packAllPackages();
    assert.strictEqual(tarballs.length, 11, 'Must package 11 tarballs');
    for (const t of tarballs) {
      assert.ok(t.sizeBytes > 0, `Tarball ${t.filename} size must be > 0`);
      assert.ok(t.sha256.length === 64, `Tarball ${t.filename} SHA256 must be valid hex hash`);
      assert.ok(fs.existsSync(t.destinationPath), `Tarball file must exist at ${t.destinationPath}`);
    }
  });

  it('9. Release Channel Safety & Publication Runner', () => {
    // A. Dry-run simulation with rc tag
    const dryRunRes = runPublish({ tag: 'rc', dryRun: true });
    assert.ok(dryRunRes.success, 'Dry run publish simulation must succeed');
    assert.strictEqual(dryRunRes.tag, 'rc', 'Channel tag must be rc');
    assert.strictEqual(dryRunRes.publishedPackages.length, 11, 'Must cover all 11 packages');

    // B. Safety violation on direct "latest" tag without force
    const safetyRes = runPublish({ tag: 'latest', dryRun: false, forceLatest: false });
    assert.ok(!safetyRes.success, 'Direct publish to "latest" without force flag must be blocked');
    assert.ok(safetyRes.blockedReason?.includes('SAFETY VIOLATION'), 'Must specify safety violation');
  });

  it('10. Clean-Room Consumer & Starter Templates Smoke Test', async () => {
    const smoke = await runSmokeTest();
    assert.ok(smoke.cleanRoomSuccess, 'Clean-room consumer execution must succeed');
    assert.strictEqual(smoke.templatesTested.length, 4, 'Must test all 4 starter templates');
    assert.ok(smoke.templatesTested.every(t => t.success), 'All 4 starter templates must pass');
    assert.ok(smoke.projectManagerSuccess, 'Project manager integration must pass');
    assert.ok(smoke.zeroForeignFrameworks, 'Framework purity must pass');
  });

  it('11. Release Documentation Reports Generation', async () => {
    const reportsSuccess = await generateAllReleaseReports();
    assert.ok(reportsSuccess, 'All 10 release documentation reports must be generated');

    const expectedReports = [
      'RELEASE_PREFLIGHT.md',
      'PACKAGE_VERIFICATION.md',
      'FRAMEWORK_PURITY_REPORT.md',
      'PUBLIC_API_RELEASE_VERIFICATION.md',
      'NPM_CONSUMER_REPORT.md',
      'STARTER_TEMPLATE_REPORT.md',
      'PRODUCTION_SMOKE_TEST.md',
      'RELEASE_SIGNOFF.md',
      'ROLLBACK.md',
      'PHASE_21_RELEASE_HEALTH_REPORT.md',
      'PHASE_21_FINAL_CERTIFICATION.md'
    ];

    for (const rep of expectedReports) {
      const p = path.join(process.cwd(), 'docs', 'release', rep);
      assert.ok(fs.existsSync(p), `Report ${rep} must exist at docs/release/${rep}`);
      const content = fs.readFileSync(p, 'utf8');
      assert.ok(content.length > 50, `Report ${rep} must not be empty`);
    }
  });
});
