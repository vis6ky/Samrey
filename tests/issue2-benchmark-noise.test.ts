import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { evaluateBenchmarkRow } from '../benchmarks/check-regression.js';

describe('Item 2: Benchmark Gate Noise Exemption Hardening', () => {
  it('0.215 -> 0.419 ms with a 40% limit must FAIL (not exempt under old < 0.35ms rule)', () => {
    const row = evaluateBenchmarkRow({
      name: 'Compiler Sub-Millisecond Parse',
      category: 'Compiler',
      baselineAvgMs: 0.215,
      currentAvgMs: 0.419, // +94.9% regression, delta = 0.204 ms
      baselineOps: 4650,
      currentOps: 2386,
      threshold: {
        category: 'Compiler',
        name: 'Compiler Sub-Millisecond Parse',
        maxRegressionPercent: 40,
        minOpsPerSec: 1000,
        rationale: 'Sub-millisecond parse benchmark'
      },
      isMatchingMachine: false
    });

    // 0.204 ms delta is NOT below 0.02 ms, so it must NOT pass as noise-exempt
    assert.equal(row.passed, false, '0.215 -> 0.419 ms with 40% limit must FAIL');
    assert.equal(row.isFasterThanBase, false);
    assert.equal((row as any).isNoiseExempt, false);
  });

  it('0.010 -> 0.012 ms with a 15% limit must PASS under narrow noise exemption', () => {
    const row = evaluateBenchmarkRow({
      name: 'Show Fast Transition',
      category: 'Control Flow - Show',
      baselineAvgMs: 0.010,
      currentAvgMs: 0.012, // +20.0% regression, delta = 0.002 ms (< 0.02 ms) and 20% < 3 * 15% (45%)
      baselineOps: 100000,
      currentOps: 83333,
      threshold: {
        category: 'Control Flow - Show',
        name: 'Show Fast Transition',
        maxRegressionPercent: 15,
        minOpsPerSec: 50000,
        rationale: 'Fast show transition'
      },
      isMatchingMachine: false
    });

    assert.equal(row.passed, true, '0.010 -> 0.012 ms must pass under narrow noise exemption');
    assert.equal((row as any).isNoiseExempt, true);
  });

  it('faster-than-base always passes', () => {
    const row = evaluateBenchmarkRow({
      name: 'Show Transition Faster',
      category: 'Control Flow - Show',
      baselineAvgMs: 0.015,
      currentAvgMs: 0.012, // faster (-20%)
      baselineOps: 66666,
      currentOps: 83333,
      threshold: {
        category: 'Control Flow - Show',
        name: 'Show Transition Faster',
        maxRegressionPercent: 15,
        minOpsPerSec: 50000,
        rationale: 'Fast show transition'
      },
      isMatchingMachine: false
    });

    assert.equal(row.passed, true);
    assert.equal(row.isFasterThanBase, true);
  });

  it('delta >= 0.02 ms even if < 3x maxRegressionPercent must FAIL', () => {
    const row = evaluateBenchmarkRow({
      name: 'Boundary Test',
      category: 'Reactivity',
      baselineAvgMs: 0.100,
      currentAvgMs: 0.125, // delta = 0.025 ms (>= 0.02 ms), +25% regression with 20% limit (25% < 3 * 20%)
      baselineOps: 10000,
      currentOps: 8000,
      threshold: {
        category: 'Reactivity',
        name: 'Boundary Test',
        maxRegressionPercent: 20,
        minOpsPerSec: 5000,
        rationale: 'Boundary test'
      },
      isMatchingMachine: false
    });

    assert.equal(row.passed, false, 'delta >= 0.02 ms must not be noise-exempt');
  });
});
