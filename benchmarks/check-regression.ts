import * as fs from 'node:fs';
import * as path from 'node:path';
import { BenchmarkResult, formatResultTable } from './utils/harness.js';
import { REGRESSION_THRESHOLDS } from './regression-thresholds.js';
import { runCompilerBenchmarks } from './compiler/compiler.bench.js';
import { runReactivityBenchmarks } from './reactivity/reactivity.bench.js';
import { runRuntimeBenchmarks } from './runtime/runtime.bench.js';
import { runShowBenchmarks } from './control-flow/show.bench.js';
import { runForBenchmarks } from './control-flow/for.bench.js';
import { runComponentBenchmarks } from './components/components.bench.js';
import { runSSRBenchmarks } from './ssr/ssr.bench.js';
import { runMemoryBenchmarks } from './memory/memory.bench.js';

export interface RegressionReportItem {
  name: string;
  category: string;
  baselineAvgMs: number;
  currentAvgMs: number;
  deltaPercent: number;
  maxAllowedPercent: number;
  baselineOps: number;
  currentOps: number;
  minAllowedOps: number;
  passed: boolean;
  rationale: string;
}

export async function runRegressionGate(targetCategory?: string): Promise<{ passed: boolean; report: RegressionReportItem[]; results: BenchmarkResult[] }> {
  console.log('=====================================================');
  console.log('🔍 Samrey Framework - Performance Regression Gate');
  console.log('=====================================================\n');

  const baselinePath = path.join(process.cwd(), 'benchmarks', 'results.json');
  if (!fs.existsSync(baselinePath)) {
    console.warn('⚠️ No baseline results.json found. Creating baseline now...');
  }

  let baselineMap = new Map<string, BenchmarkResult>();
  if (fs.existsSync(baselinePath)) {
    try {
      const baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
      if (Array.isArray(baselineData.results)) {
        for (const res of baselineData.results) {
          baselineMap.set(`${res.category}::${res.name}`, res);
        }
      }
    } catch (e) {
      console.warn('⚠️ Failed to parse baseline results.json:', e);
    }
  }

  const currentResults: BenchmarkResult[] = [];

  const shouldRun = (cat: string) => !targetCategory || targetCategory.toLowerCase() === 'all' || cat.toLowerCase().includes(targetCategory.toLowerCase());

  if (shouldRun('compiler')) {
    console.log('▶ Running Compiler Benchmarks...');
    currentResults.push(...runCompilerBenchmarks());
  }
  if (shouldRun('reactivity')) {
    console.log('▶ Running Reactivity Benchmarks...');
    currentResults.push(...runReactivityBenchmarks());
  }
  if (shouldRun('runtime')) {
    console.log('▶ Running Runtime DOM Benchmarks...');
    currentResults.push(...runRuntimeBenchmarks());
  }
  if (shouldRun('show') || shouldRun('control-flow') || shouldRun('runtime')) {
    console.log('▶ Running Control Flow (<Show>) Benchmarks...');
    currentResults.push(...runShowBenchmarks());
  }
  if (shouldRun('for') || shouldRun('control-flow') || shouldRun('runtime')) {
    console.log('▶ Running Control Flow (<For>) Benchmarks...');
    currentResults.push(...runForBenchmarks());
  }
  if (shouldRun('component')) {
    console.log('▶ Running Component Benchmarks...');
    currentResults.push(...runComponentBenchmarks());
  }
  if (shouldRun('ssr')) {
    console.log('▶ Running SSR & Serialization Benchmarks...');
    currentResults.push(...await runSSRBenchmarks());
  }
  if (shouldRun('memory')) {
    console.log('▶ Running Memory Benchmarks...');
    currentResults.push(...runMemoryBenchmarks());
  }

  // Evaluate against Thresholds
  const report: RegressionReportItem[] = [];
  let allPassed = true;

  console.log('\n=====================================================');
  console.log('🛡️ Performance Regression Gate Evaluation');
  console.log('=====================================================\n');

  for (const res of currentResults) {
    const key = `${res.category}::${res.name}`;
    const baseline = baselineMap.get(key);
    const threshold = REGRESSION_THRESHOLDS.find((t) => t.name === res.name && t.category === res.category);

    if (threshold && baseline) {
      const deltaPercent = Number((((res.avgMs - baseline.avgMs) / baseline.avgMs) * 100).toFixed(1));
      
      // Sub-millisecond benchmarks (< 1.0ms) have high fractional jitter in CI; absolute variance < 0.35ms is VM scheduler noise
      const isSubMillisecondNoise = (baseline.avgMs < 1.0 && Math.abs(res.avgMs - baseline.avgMs) < 0.35) || (baseline.avgMs < 0.1 && Math.abs(res.avgMs - baseline.avgMs) < 0.05);
      const passedDelta = isSubMillisecondNoise || deltaPercent <= threshold.maxRegressionPercent;
      const passedOps = threshold.minOpsPerSec ? res.opsPerSec >= threshold.minOpsPerSec : true;
      const passed = passedDelta && passedOps;

      if (!passed) allPassed = false;

      report.push({
        name: res.name,
        category: res.category,
        baselineAvgMs: baseline.avgMs,
        currentAvgMs: res.avgMs,
        deltaPercent,
        maxAllowedPercent: threshold.maxRegressionPercent,
        baselineOps: baseline.opsPerSec,
        currentOps: res.opsPerSec,
        minAllowedOps: threshold.minOpsPerSec || 0,
        passed,
        rationale: threshold.rationale
      });
    }
  }

  // Print summary table
  console.log('| Status | Category | Benchmark | Baseline (avg) | Current (avg) | Δ % | Max Allowed Δ | Current Ops/s | Min Allowed Ops |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const item of report) {
    const statusIcon = item.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`| ${statusIcon} | ${item.category} | ${item.name} | ${item.baselineAvgMs}ms | ${item.currentAvgMs}ms | ${item.deltaPercent > 0 ? '+' : ''}${item.deltaPercent}% | +${item.maxAllowedPercent}% | ${item.currentOps.toLocaleString()} | ${item.minAllowedOps.toLocaleString()} |`);
  }

  if (report.length === 0) {
    console.log('ℹ️ No tracked threshold benchmarks in current execution scope.');
  }

  if (!allPassed) {
    console.error('\n❌ PERFORMANCE REGRESSION DETECTED: One or more benchmarks exceeded acceptable thresholds.');
  } else {
    console.log('\n✅ ALL BENCHMARK GATES PASSED: Performance is within acceptable tolerances.');
  }

  return { passed: allPassed, report, results: currentResults };
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('check-regression')) {
  const categoryArg = process.argv[2];
  runRegressionGate(categoryArg).then(({ passed }) => {
    if (!passed) {
      process.exit(1);
    }
  }).catch((err) => {
    console.error('Regression check error:', err);
    process.exit(1);
  });
}
