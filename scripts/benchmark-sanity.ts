import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

export interface FailingBenchmarkRow {
  run: number;
  category: string;
  name: string;
  delta: string;
}

export function parseSanityFailures(runIndex: number, output: string): FailingBenchmarkRow[] {
  const rows: FailingBenchmarkRow[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Match table row: | ❌ FAIL ... | <category> | <name> | ... | <delta> |
    const tableMatch = line.match(/\|\s*❌\s*FAIL[^\s|]*\s*\|\s*([^|]+)\|\s*([^|]+)\|[^|]+\|[^|]+\|\s*([^|]+)\|/);
    if (tableMatch) {
      const category = tableMatch[1].trim();
      const name = tableMatch[2].trim();
      const delta = tableMatch[3].trim();
      if (!rows.some((r) => r.name === name)) {
        rows.push({ run: runIndex, category, name, delta });
      }
      continue;
    }

    // Match log: ⚠️ Benchmark "<name>" (<category>) failed ... (<delta> vs ...)
    const logMatch = line.match(/⚠️ Benchmark "([^"]+)" \(([^)]+)\) failed [^(]*\(([^ ]+)/);
    if (logMatch) {
      const name = logMatch[1].trim();
      const category = logMatch[2].trim();
      const delta = logMatch[3].trim();
      if (!rows.some((r) => r.name === name)) {
        rows.push({ run: runIndex, category, name, delta });
      }
    }
  }

  return rows;
}

export function evaluateSanityCriterion(
  targetRuns: number,
  failedRuns: number,
  failingRows: FailingBenchmarkRow[]
): { passed: boolean; message: string; maxAllowedFailures: number; failingRows: FailingBenchmarkRow[] } {
  // Criterion: pass if at most 1 of 20 self-compares fails
  const maxAllowedFailures = Math.max(1, Math.floor(targetRuns * 0.05));
  const passed = failedRuns <= maxAllowedFailures;

  let message = '';
  if (passed) {
    if (failedRuns === 0) {
      message = `✅ Sanity check passed: 0 failures across all ${targetRuns} self-comparison runs.`;
    } else {
      message = `⚠️ Sanity check passed: ${failedRuns} of ${targetRuns} runs had false regressions (within allowable threshold of <= ${maxAllowedFailures}).`;
    }
  } else {
    message = `❌ Sanity check failed: ${failedRuns} of ${targetRuns} runs reported false regressions (exceeds allowable threshold of <= ${maxAllowedFailures}).`;
  }

  return { passed, message, maxAllowedFailures, failingRows };
}

async function main() {
  const targetRuns = parseInt(process.argv[2] || '20', 10);
  const scriptPath = path.resolve(process.cwd(), 'benchmarks', 'check-regression.ts');

  console.log('=====================================================');
  console.log(`🧪 Benchmark Gate Sanity Check (--compare HEAD x ${targetRuns})`);
  console.log('=====================================================\n');

  let passedRuns = 0;
  let failedRuns = 0;
  const failureDetails: { run: number; output: string }[] = [];
  const allFailingRows: FailingBenchmarkRow[] = [];

  const overallStart = performance.now();

  for (let i = 1; i <= targetRuns; i++) {
    const start = performance.now();
    process.stdout.write(`▶ [Run ${i}/${targetRuns}] Executing benchmark:gate --compare HEAD... `);

    const result = spawnSync(process.execPath, [
      '--import', 'tsx',
      scriptPath,
      '--compare', 'HEAD'
    ], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const duration = ((performance.now() - start) / 1000).toFixed(1);

    if (result.status === 0) {
      passedRuns++;
      console.log(`✅ PASS (${duration}s)`);
    } else {
      failedRuns++;
      console.log(`❌ FAIL (${duration}s)`);
      const combinedOutput = (result.stdout || '') + (result.stderr || '');
      failureDetails.push({ run: i, output: combinedOutput });
      const rows = parseSanityFailures(i, combinedOutput);
      allFailingRows.push(...rows);
    }
  }

  const totalDuration = ((performance.now() - overallStart) / 1000).toFixed(1);
  const criterion = evaluateSanityCriterion(targetRuns, failedRuns, allFailingRows);

  console.log('\n=====================================================');
  console.log('📊 Benchmark Gate Sanity Check Results');
  console.log('=====================================================');
  console.log(`Total Runs:    ${targetRuns}`);
  console.log(`Passed:        ${passedRuns} (${((passedRuns / targetRuns) * 100).toFixed(1)}%)`);
  console.log(`Failed:        ${failedRuns} (${((failedRuns / targetRuns) * 100).toFixed(1)}%)`);
  console.log(`Allowed:       <= ${criterion.maxAllowedFailures} failure(s)`);
  console.log(`Duration:      ${totalDuration}s`);
  console.log(`Status:        ${criterion.passed ? 'PASS ✅' : 'FAIL ❌'}`);

  if (allFailingRows.length > 0) {
    console.log('\n⚠️ Reported Failing Rows Across Sanity Runs:');
    for (const r of allFailingRows) {
      console.log(` - Run ${r.run}: [${r.category}] "${r.name}" (${r.delta})`);
    }
  }

  console.log(`\n${criterion.message}\n`);

  if (!criterion.passed) {
    for (const fail of failureDetails) {
      console.error(`--- Failure Detail: Run ${fail.run} ---`);
      console.error(fail.output.slice(-2000));
    }
    process.exit(1);
  }

  process.exit(0);
}

// Only invoke main when run directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('benchmark-sanity')) {
  main().catch((err) => {
    console.error('Fatal error in sanity check:', err);
    process.exit(1);
  });
}
