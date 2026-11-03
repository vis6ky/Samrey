/**
 * @license Apache-2.0
 * @samrey/doc - Samrey Developer Assistant Blind Challenge Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runBlindDeveloperBenchmark } from './benchmark-runner.js';
import { CHALLENGES } from './challenges.js';

describe('Samrey Developer Assistant — Blind Challenge Benchmark', () => {
  it('should define exactly 20 diverse, frozen developer challenges', () => {
    assert.equal(CHALLENGES.length, 20, 'Expected exactly 20 developer challenges');

    const ids = new Set(CHALLENGES.map(c => c.id));
    assert.equal(ids.size, 20, 'All challenge IDs must be unique');

    for (const challenge of CHALLENGES) {
      assert.ok(challenge.category, `Challenge ${challenge.id} missing category`);
      assert.ok(challenge.prompt, `Challenge ${challenge.id} missing prompt`);
      assert.ok(challenge.expectedCapabilities.length > 0, `Challenge ${challenge.id} missing expected capabilities`);
      assert.ok(challenge.relevantPackages.length > 0, `Challenge ${challenge.id} missing relevant packages`);
    }
  });

  it('should execute all 20 challenges with fresh context and meet strict benchmark thresholds', async () => {
    const report = await runBlindDeveloperBenchmark();

    console.log('\n==================================================');
    console.log('SAMREY DEVELOPER ASSISTANT — BLIND BENCHMARK REPORT');
    console.log('==================================================');
    console.log(`Total Score:              ${report.totalScore} / ${report.maxPossibleScore} (${report.scorePercentage}%)`);
    console.log(`Average Score:            ${report.averageScore} / 30`);
    console.log(`API Accuracy Rate:        ${report.apiAccuracyRate}% (Threshold >= 98%)`);
    console.log(`Code Compilation Rate:    ${report.compilationRate}% (Threshold >= 95%)`);
    console.log(`Task Completion Rate:     ${report.taskCompletionRate}% (Threshold >= 90%)`);
    console.log(`Hallucinated APIs:        ${report.hallucinationRate}% (Threshold = 0%)`);
    console.log(`Foreign Framework Usage:  ${report.foreignFrameworkRate}% (Threshold = 0%)`);
    console.log(`Aether References:        ${report.aetherReferenceCount} (Threshold = 0)`);
    console.log('--------------------------------------------------');

    for (const result of report.results) {
      const statusIcon = result.passed ? '✓' : '✗';
      console.log(`${statusIcon} Challenge ${result.challenge.id.toString().padStart(2, ' ')} [${result.challenge.category.padEnd(26, ' ')}]: ${result.score.totalScore}/30 pts | Compiles: ${result.score.compiles}`);
      if (result.score.compileErrors.length > 0) {
        console.log(`    Errors: ${result.score.compileErrors.join('; ')}`);
      }
      if (result.score.hallucinatedApis.length > 0) {
        console.log(`    Hallucinations: ${result.score.hallucinatedApis.join('; ')}`);
      }
    }
    console.log('==================================================\n');

    // Strict Threshold Invariants
    assert.ok(
      report.scorePercentage >= 85.0,
      `Overall score percentage ${report.scorePercentage}% must be >= 85%`
    );

    assert.ok(
      report.apiAccuracyRate >= 98.0,
      `API accuracy rate ${report.apiAccuracyRate}% must be >= 98%`
    );

    assert.ok(
      report.compilationRate >= 95.0,
      `Code compilation rate ${report.compilationRate}% must be >= 95%`
    );

    assert.ok(
      report.taskCompletionRate >= 90.0,
      `Task completion rate ${report.taskCompletionRate}% must be >= 90%`
    );

    assert.equal(
      report.hallucinationRate,
      0,
      'Hallucination rate must be strictly 0%'
    );

    assert.equal(
      report.foreignFrameworkRate,
      0,
      'Foreign framework rate must be strictly 0%'
    );

    assert.equal(
      report.aetherReferenceCount,
      0,
      'Zero forbidden @aether/* references allowed'
    );
  });
});
