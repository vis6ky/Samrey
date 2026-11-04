import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  parseBenchmarkGateArgs,
  isRecordedMachine,
  evaluateBenchmarkRow,
  computeMedian,
  runRegressionGate
} from '../benchmarks/check-regression.js';

describe('Item 5: benchmark:gate --compare <ref>', () => {
  it('parses --compare <ref>, --runs <n>, and category from CLI args', () => {
    const parsed1 = parseBenchmarkGateArgs(['--compare', 'HEAD~1', 'reactivity']);
    assert.equal(parsed1.compareRef, 'HEAD~1');
    assert.equal(parsed1.targetCategory, 'reactivity');
    assert.equal(parsed1.runs, 5); // default >= 5 runs

    const parsed2 = parseBenchmarkGateArgs(['--compare=origin/main', '--runs=7', 'compiler']);
    assert.equal(parsed2.compareRef, 'origin/main');
    assert.equal(parsed2.runs, 7);
    assert.equal(parsed2.targetCategory, 'compiler');
  });

  it('computes correct median for odd and even number of runs', () => {
    assert.equal(computeMedian([5, 1, 3, 2, 4]), 3);
    assert.equal(computeMedian([10, 20, 30, 40]), 25);
    assert.equal(computeMedian([42]), 42);
    assert.equal(computeMedian([]), 0);
  });

  it('identifies whether the current machine matches recorded baseline machine', () => {
    const matchingSystem = {
      platform: process.platform,
      arch: process.arch,
      cpuCount: os.cpus().length
    };
    assert.equal(isRecordedMachine(matchingSystem), true);

    const nonMatchingSystem = {
      platform: 'fake-os',
      arch: 'fake-arch',
      cpuCount: 999
    };
    assert.equal(isRecordedMachine(nonMatchingSystem), false);
    assert.equal(isRecordedMachine(null), false);
  });

  it('a row that is faster than its base NEVER fails, even if current ops < minOpsPerSec', () => {
    const row = evaluateBenchmarkRow({
      name: 'Test Fast Benchmark',
      category: 'Compiler',
      baselineAvgMs: 10.0,
      currentAvgMs: 8.0, // faster (-20%)
      baselineOps: 100,
      currentOps: 50, // below min ops floor
      threshold: {
        category: 'Compiler',
        name: 'Test Fast Benchmark',
        maxRegressionPercent: 35,
        minOpsPerSec: 200,
        rationale: 'Test'
      },
      isMatchingMachine: true // even on matching machine
    });

    assert.equal(row.isFasterThanBase, true);
    assert.equal(row.passed, true);
    assert.ok(row.deltaPercent < 0);
  });

  it('absolute minOpsPerSec floors are warnings unless recorded machine id matches', () => {
    // When machine does NOT match:
    const nonMatchingRow = evaluateBenchmarkRow({
      name: 'Test Slower Benchmark',
      category: 'Reactivity',
      baselineAvgMs: 10.0,
      currentAvgMs: 11.0, // +10% (within 40% threshold)
      baselineOps: 100,
      currentOps: 50, // below minOpsPerSec
      threshold: {
        category: 'Reactivity',
        name: 'Test Slower Benchmark',
        maxRegressionPercent: 40,
        minOpsPerSec: 150,
        rationale: 'Test'
      },
      isMatchingMachine: false
    });

    assert.equal(nonMatchingRow.passed, true);
    assert.equal(nonMatchingRow.floorWarning, true);

    // When machine DOES match:
    const matchingRow = evaluateBenchmarkRow({
      name: 'Test Slower Benchmark',
      category: 'Reactivity',
      baselineAvgMs: 10.0,
      currentAvgMs: 11.0, // +10%
      baselineOps: 100,
      currentOps: 50, // below minOpsPerSec
      threshold: {
        category: 'Reactivity',
        name: 'Test Slower Benchmark',
        maxRegressionPercent: 40,
        minOpsPerSec: 150,
        rationale: 'Test'
      },
      isMatchingMachine: true
    });

    assert.equal(matchingRow.passed, false); // fails due to minOpsPerSec on matching machine
  });

  it('fails if current is slower than base beyond maxRegressionPercent', () => {
    const row = evaluateBenchmarkRow({
      name: 'Regressed Benchmark',
      category: 'Reactivity',
      baselineAvgMs: 10.0,
      currentAvgMs: 16.0, // +60% (exceeds 35%)
      baselineOps: 100,
      currentOps: 80,
      threshold: {
        category: 'Reactivity',
        name: 'Regressed Benchmark',
        maxRegressionPercent: 35,
        minOpsPerSec: 50,
        rationale: 'Test'
      },
      isMatchingMachine: false
    });

    assert.equal(row.passed, false);
    assert.equal(row.deltaPercent, 60.0);
  });

  it('executes --compare HEAD~1 with >= 5 interleaved runs and cleans up worktree', async () => {
    const initialWorktrees = execSync('git worktree list', { encoding: 'utf-8' });

    const gateResult = await runRegressionGate({
      compareRef: 'HEAD~1',
      runs: 5,
      targetCategory: 'compiler'
    });

    assert.ok(gateResult.report.length > 0);
    assert.equal(gateResult.passed, true);

    const postWorktrees = execSync('git worktree list', { encoding: 'utf-8' });
    assert.equal(postWorktrees.trim(), initialWorktrees.trim(), 'Git worktree was cleaned up');
  });
});
