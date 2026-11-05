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
  computeRobustStat,
  runRegressionGate,
  runBenchmarkWorkerProcess
} from '../benchmarks/check-regression.js';
import { REGRESSION_THRESHOLDS } from '../benchmarks/regression-thresholds.js';

describe('Item 5: benchmark:gate --compare <ref>', () => {
  it('parses --compare <ref>, --runs <n>, and category from CLI args', () => {
    const parsed1 = parseBenchmarkGateArgs(['--compare', 'HEAD~1', 'reactivity']);
    assert.equal(parsed1.compareRef, 'HEAD~1');
    assert.equal(parsed1.targetCategory, 'reactivity');
    assert.equal(parsed1.runs, 9); // default >= 9 runs for robust sub-ms statistics

    const parsed2 = parseBenchmarkGateArgs(['--compare=origin/main', '--runs=7', 'compiler']);
    assert.equal(parsed2.compareRef, 'origin/main');
    assert.equal(parsed2.runs, 7);
    assert.equal(parsed2.targetCategory, 'compiler');
  });

  it('throws an error if --compare has missing, empty, or whitespace value', () => {
    assert.throws(() => parseBenchmarkGateArgs(['--compare']), /requires a non-empty git ref/);
    assert.throws(() => parseBenchmarkGateArgs(['--compare', '']), /requires a non-empty git ref/);
    assert.throws(() => parseBenchmarkGateArgs(['--compare', '   ']), /requires a non-empty git ref/);
    assert.throws(() => parseBenchmarkGateArgs(['--compare=']), /requires a non-empty git ref/);
    assert.throws(() => parseBenchmarkGateArgs(['--compare=   ']), /requires a non-empty git ref/);
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

  it('uses robust statistic (trimmed median with N >= 9) for rows with base < 1 ms instead of plain median or min', () => {
    // A sample distribution with outliers on both sides (e.g. lucky fast run and a GC/JIT cold-start spike):
    const subMsSamples = [0.220, 0.255, 0.258, 0.260, 0.261, 0.262, 0.263, 0.265, 0.450];
    // Trimmed median drops the extreme low (0.220) and high (0.450), taking median of middle 7
    const robustSubMs = computeRobustStat(subMsSamples, true);
    assert.equal(robustSubMs, 0.261, 'Sub-ms rows must use robust trimmed median');

    // For rows with base >= 1 ms, plain median is used
    const normalSamples = [10.5, 12.0, 11.2, 11.0, 15.0];
    const normalStat = computeRobustStat(normalSamples, false);
    assert.equal(normalStat, 11.2, 'Rows with base >= 1 ms must use plain median');
  });

  it('for sub-ms rows, requires BOTH median and min to exceed threshold to flag regression', () => {
    const threshold = {
      category: 'SSR & Serialization',
      name: 'SSR: Secret Scrubbing (500 items deep scan)',
      maxRegressionPercent: 40,
      minOpsPerSec: 450,
      rationale: 'Secret scrub'
    };

    // Case 1: Base side had an unusually fast min (0.275 ms), current min is 0.354 ms (+28.7%),
    // but current median (0.362 ms) is identical to base median (0.362 ms, 0% delta).
    // Under compound rule, this MUST NOT flag a false regression!
    const rowIdenticalMedians = evaluateBenchmarkRow({
      name: threshold.name,
      category: threshold.category,
      baselineAvgMs: 0.362,
      currentAvgMs: 0.362, // 0% median delta
      baselineMinMs: 0.275,
      currentMinMs: 0.354, // +28.7% min delta
      baselineOps: 2750,
      currentOps: 2750,
      threshold,
      isMatchingMachine: false,
      isSubMs: true
    });
    assert.equal(rowIdenticalMedians.passed, true, 'Identical medians must pass even if base min had a lucky low run');

    // Case 2: Only median exceeds limit (+45% > 40%), but min does not exceed limit (+10% <= 40%).
    // Must pass because both did not exceed.
    const rowOnlyMedExceeds = evaluateBenchmarkRow({
      name: threshold.name,
      category: threshold.category,
      baselineAvgMs: 0.360,
      currentAvgMs: 0.522, // +45% (exceeds 40%)
      baselineMinMs: 0.300,
      currentMinMs: 0.330, // +10% (within 40%)
      baselineOps: 2750,
      currentOps: 1900,
      threshold,
      isMatchingMachine: false,
      isSubMs: true
    });
    assert.equal(rowOnlyMedExceeds.passed, true, 'When only median exceeds limit, row must not fail');

    // Case 3: Only min exceeds limit (+50% > 40%), but median does not exceed limit (+15% <= 40%).
    // Must pass because both did not exceed.
    const rowOnlyMinExceeds = evaluateBenchmarkRow({
      name: threshold.name,
      category: threshold.category,
      baselineAvgMs: 0.360,
      currentAvgMs: 0.414, // +15% (within 40%)
      baselineMinMs: 0.250,
      currentMinMs: 0.375, // +50% (exceeds 40%)
      baselineOps: 2750,
      currentOps: 2400,
      threshold,
      isMatchingMachine: false,
      isSubMs: true
    });
    assert.equal(rowOnlyMinExceeds.passed, true, 'When only min exceeds limit, row must not fail');

    // Case 4: Milder +60% slowdown on a row with a 40% limit -> BOTH median and min exceed +40% -> FAILS!
    const row60Slowdown = evaluateBenchmarkRow({
      name: threshold.name,
      category: threshold.category,
      baselineAvgMs: 0.360,
      currentAvgMs: 0.576, // +60% (exceeds 40%)
      baselineMinMs: 0.300,
      currentMinMs: 0.480, // +60% (exceeds 40%)
      baselineOps: 2750,
      currentOps: 1700,
      threshold,
      isMatchingMachine: false,
      isSubMs: true
    });
    assert.equal(row60Slowdown.passed, false, '+60% slowdown on 40% threshold must FAIL');
    assert.equal(row60Slowdown.deltaPercent, 60.0);
  });

  it('deliberately injected 2x slowdown in signal.write must still FAIL', () => {
    const threshold = {
      category: 'Reactivity',
      name: 'Single Signal Update (10,000 mutations)',
      maxRegressionPercent: 35,
      minOpsPerSec: 75,
      rationale: 'Core reactive mutator'
    };

    const row2x = evaluateBenchmarkRow({
      name: threshold.name,
      category: threshold.category,
      baselineAvgMs: 2.10,
      currentAvgMs: 4.20, // 2x slowdown (+100%)
      baselineMinMs: 1.95,
      currentMinMs: 3.90, // 2x min slowdown (+100%)
      baselineOps: 470,
      currentOps: 235,
      threshold,
      isMatchingMachine: false,
      isSubMs: false
    });
    assert.equal(row2x.passed, false, '2x slowdown in signal.write must FAIL');
    assert.equal(row2x.deltaPercent, 100.0);
  });

  it('for every display category name used in the report, a re-run finds its row', async () => {
    const displayCategories = Array.from(new Set(REGRESSION_THRESHOLDS.map((t) => t.category)));
    assert.ok(displayCategories.length >= 7, 'Must have at least 7 display categories');

    for (const cat of displayCategories) {
      const row = REGRESSION_THRESHOLDS.find((t) => t.category === cat)!;
      // Re-run worker targets only the exact benchmark name without --category
      const res = await runBenchmarkWorkerProcess(process.cwd(), undefined, row.name);
      assert.equal(res.length, 1, `Re-run for category "${cat}" must return exactly 1 row`);
      assert.equal(res[0].name, row.name);
      assert.equal(res[0].category, cat);
    }
  });

  it('a worker that returns 0 rows fails the gate with "re-run produced no results", not "confirmed"', async () => {
    let reRunAttempted = false;
    const mockWorkerRunner = async (dir: string, category?: string, benchmark?: string) => {
      if (benchmark) {
        reRunAttempted = true;
        // Simulate worker returning 0 rows on re-run
        return [];
      }
      const isBase = dir.includes('samrey-bench-wt');
      return [
        {
          name: 'Single Signal Update (10,000 mutations)',
          category: 'Reactivity',
          iterations: 10,
          warmupIterations: 2,
          minMs: isBase ? 1.0 : 2.0,
          medianMs: isBase ? 1.0 : 2.0,
          avgMs: isBase ? 1.0 : 2.0,
          p95Ms: isBase ? 1.0 : 2.0,
          opsPerSec: isBase ? 1000 : 500,
          heapDeltaKb: 0
        }
      ];
    };

    await assert.rejects(
      async () => {
        await runRegressionGate({
          compareRef: 'HEAD',
          runs: 5,
          targetCategory: 'reactivity',
          workerRunner: mockWorkerRunner
        });
      },
      (err: any) => {
        assert.ok(reRunAttempted, 'Re-run must have been attempted');
        assert.match(
          err.message,
          /re-run produced no results/i,
          `Error must state "re-run produced no results", got: ${err.message}`
        );
        assert.doesNotMatch(
          err.message,
          /confirmed/i,
          'Must not mark or report confirmed when worker returned 0 rows'
        );
        return true;
      }
    );
  });
});
