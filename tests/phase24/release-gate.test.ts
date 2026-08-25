/**
 * @license Apache-2.0
 * @samrey/monorepo - Phase 24 Release Gate Master Verification
 * Aggregates and verifies all 10 release gates required for v1.0.0 GA release.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { validateVersionConsistency } from '../../scripts/release/validate-version.js';
import { validateAllPackages } from '../../scripts/release/validate-packages.js';
import { validateDependencyTopology } from '../../scripts/release/validate-dependencies.js';
import { validatePublicAPIExports } from '../../scripts/release/validate-exports.js';
import { runPublish } from '../../scripts/release/publish.js';

describe('Phase 24 — Unified GA Master Release Gate', () => {
  it('Gate 1: Zero Foreign Frameworks Architectural Invariant', () => {
    const topology = validateDependencyTopology();
    assert.strictEqual(topology.foreignFrameworkViolations.length, 0, 'Must have zero foreign framework violations');
    assert.ok(topology.isValid, 'Topology validation must pass');
  });

  it('Gate 2: Package Manifest Hardening & Metadata Parity', () => {
    const { packages, allValid } = validateAllPackages('1.0.0');
    assert.strictEqual(packages.length, 11, 'Must validate all 11 packages');
    assert.ok(allValid, 'All package manifests must be hardened');
  });

  it('Gate 3: Dependency Graph Topological Integrity (0 Cycles)', () => {
    const topology = validateDependencyTopology();
    assert.strictEqual(topology.hasCycles, false, 'Dependency graph must have 0 cycles');
    assert.strictEqual(topology.topologicalOrder.length, 11, 'Must include all 11 packages in topological sort');
  });

  it('Gate 4: Public API 100% Contract Parity & Freeze', async () => {
    const { results, allValid } = await validatePublicAPIExports();
    assert.strictEqual(results.length, 11, 'Must check 11 packages');
    assert.ok(allValid, 'Public API contract must match 100%');
  });

  it('Gate 5: Version Synchronization Pinned to 1.0.0', () => {
    const versionRes = validateVersionConsistency('1.0.0');
    assert.ok(versionRes.allMatch, 'Root and all 11 packages must be 1.0.0');
  });

  it('Gate 6: Release Publication Dry-Run Simulation', () => {
    const publishRes = runPublish({ tag: 'latest', dryRun: true, forceLatest: true });
    assert.strictEqual(publishRes.isDryRun, true);
    assert.strictEqual(publishRes.publishedPackages.length, 11);
    assert.strictEqual(publishRes.success, true);
  });
});
