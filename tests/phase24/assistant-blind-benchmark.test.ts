/**
 * @license Apache-2.0
 * @samrey/doc - Phase 24 Developer Assistant Blind Challenge Integration Test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runBlindDeveloperBenchmark } from '../developer-assistant/benchmark-runner.js';
import { CHALLENGES } from '../developer-assistant/challenges.js';

describe('Phase 24 — Developer Assistant Blind Benchmark Integration', () => {
  it('should run the 20-challenge blind benchmark and verify all quality gates', async () => {
    assert.equal(CHALLENGES.length, 20);

    const report = await runBlindDeveloperBenchmark();

    assert.ok(report.totalScore >= 500, `Total score ${report.totalScore} should be >= 500/600`);
    assert.ok(report.compilationRate >= 95.0, `Compilation rate ${report.compilationRate}% should be >= 95%`);
    assert.ok(report.apiAccuracyRate >= 98.0, `API accuracy rate ${report.apiAccuracyRate}% should be >= 98%`);
    assert.equal(report.hallucinationRate, 0, 'Zero hallucinated APIs permitted');
    assert.equal(report.foreignFrameworkRate, 0, 'Zero foreign framework primitives permitted');
    assert.equal(report.aetherReferenceCount, 0, 'Zero @aether/* references permitted');
    assert.equal(report.allPassedThreshold, true, 'All quality gate thresholds must pass');
  });
});
