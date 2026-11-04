import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { pathToFileURL } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import { BenchmarkResult, formatResultTable } from './utils/harness.js';
import { REGRESSION_THRESHOLDS, BenchmarkThreshold, getBaselineData } from './regression-thresholds.js';
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
  isFasterThanBase: boolean;
  isNoiseExempt: boolean;
  floorWarning?: boolean;
  rationale: string;
}

export interface GateOptions {
  targetCategory?: string;
  compareRef?: string;
  runs?: number;
}

export function parseBenchmarkGateArgs(argv: string[]): {
  compareRef?: string;
  runs: number;
  targetCategory?: string;
  isWorker: boolean;
  workerDir?: string;
  outputFile?: string;
} {
  let compareRef: string | undefined;
  let runs = 5;
  let targetCategory: string | undefined;
  let isWorker = false;
  let workerDir: string | undefined;
  let outputFile: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--compare') {
      compareRef = argv[++i];
    } else if (arg.startsWith('--compare=')) {
      compareRef = arg.slice('--compare='.length);
    } else if (arg === '--runs') {
      const parsedRuns = parseInt(argv[++i], 10);
      if (!isNaN(parsedRuns) && parsedRuns > 0) runs = parsedRuns;
    } else if (arg.startsWith('--runs=')) {
      const parsedRuns = parseInt(arg.slice('--runs='.length), 10);
      if (!isNaN(parsedRuns) && parsedRuns > 0) runs = parsedRuns;
    } else if (arg === '--worker') {
      isWorker = true;
    } else if (arg === '--dir') {
      workerDir = argv[++i];
    } else if (arg.startsWith('--dir=')) {
      workerDir = arg.slice('--dir='.length);
    } else if (arg === '--output') {
      outputFile = argv[++i];
    } else if (arg.startsWith('--output=')) {
      outputFile = arg.slice('--output='.length);
    } else if (!arg.startsWith('-')) {
      targetCategory = arg;
    }
  }

  return { compareRef, runs, targetCategory, isWorker, workerDir, outputFile };
}

export function computeMedian(arr: number[]): number {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(3));
  }
  return Number(sorted[mid].toFixed(3));
}

export function isRecordedMachine(baselineSystem: any): boolean {
  if (!baselineSystem || typeof baselineSystem !== 'object') return false;
  const currentPlatform = process.platform;
  const currentArch = process.arch;
  const currentCpuCount = os.cpus().length;
  return (
    baselineSystem.platform === currentPlatform &&
    baselineSystem.arch === currentArch &&
    baselineSystem.cpuCount === currentCpuCount
  );
}

export function evaluateBenchmarkRow(params: {
  name: string;
  category: string;
  baselineAvgMs: number;
  currentAvgMs: number;
  baselineOps: number;
  currentOps: number;
  threshold: BenchmarkThreshold;
  isMatchingMachine: boolean;
}): RegressionReportItem {
  const { name, category, baselineAvgMs, currentAvgMs, baselineOps, currentOps, threshold, isMatchingMachine } = params;

  const deltaPercent = baselineAvgMs > 0
    ? Number((((currentAvgMs - baselineAvgMs) / baselineAvgMs) * 100).toFixed(1))
    : 0;
  const isFasterThanBase = currentAvgMs <= baselineAvgMs;

  // Narrow, proportional noise exemption:
  // Only applies when absolute difference is below 0.02 ms AND relative change is below 3x declared maxRegressionPercent.
  const absDeltaMs = Number(Math.abs(currentAvgMs - baselineAvgMs).toFixed(4));
  const isNoiseExempt =
    !isFasterThanBase &&
    deltaPercent > threshold.maxRegressionPercent &&
    absDeltaMs < 0.02 &&
    deltaPercent < 3 * threshold.maxRegressionPercent;

  let floorWarning = false;
  let passed = false;

  if (isFasterThanBase) {
    // "A row that is faster than its base never fails."
    passed = true;
  } else {
    const passedDelta = deltaPercent <= threshold.maxRegressionPercent || isNoiseExempt;
    let passedOps = true;

    if (threshold.minOpsPerSec && currentOps < threshold.minOpsPerSec) {
      if (isMatchingMachine) {
        passedOps = false;
      } else {
        // "Absolute minOpsPerSec floors are warnings unless the recorded machine id matches."
        floorWarning = true;
        passedOps = true;
      }
    }

    passed = passedDelta && passedOps;
  }

  return {
    name,
    category,
    baselineAvgMs,
    currentAvgMs,
    deltaPercent,
    maxAllowedPercent: threshold.maxRegressionPercent,
    baselineOps,
    currentOps,
    minAllowedOps: threshold.minOpsPerSec || 0,
    passed,
    isFasterThanBase,
    isNoiseExempt,
    floorWarning,
    rationale: threshold.rationale
  };
}

async function executeBenchmarksInDir(targetDir: string, targetCategory?: string): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  const shouldRun = (cat: string) =>
    !targetCategory ||
    targetCategory.toLowerCase() === 'all' ||
    cat.toLowerCase().includes(targetCategory.toLowerCase());

  async function loadBench(subpath: string) {
    const tsPath = path.join(targetDir, 'benchmarks', `${subpath}.ts`);
    const jsPath = path.join(targetDir, 'benchmarks', `${subpath}.js`);
    const filePath = fs.existsSync(tsPath) ? tsPath : jsPath;
    if (!fs.existsSync(filePath)) return null;
    return import(pathToFileURL(filePath).href);
  }

  if (shouldRun('compiler')) {
    const mod = await loadBench('compiler/compiler.bench');
    if (mod?.runCompilerBenchmarks) results.push(...mod.runCompilerBenchmarks());
  }
  if (shouldRun('reactivity')) {
    const mod = await loadBench('reactivity/reactivity.bench');
    if (mod?.runReactivityBenchmarks) results.push(...mod.runReactivityBenchmarks());
  }
  if (shouldRun('runtime')) {
    const mod = await loadBench('runtime/runtime.bench');
    if (mod?.runRuntimeBenchmarks) results.push(...mod.runRuntimeBenchmarks());
  }
  if (shouldRun('show') || shouldRun('control-flow') || shouldRun('runtime')) {
    const mod = await loadBench('control-flow/show.bench');
    if (mod?.runShowBenchmarks) results.push(...mod.runShowBenchmarks());
  }
  if (shouldRun('for') || shouldRun('control-flow') || shouldRun('runtime')) {
    const mod = await loadBench('control-flow/for.bench');
    if (mod?.runForBenchmarks) results.push(...mod.runForBenchmarks());
  }
  if (shouldRun('component')) {
    const mod = await loadBench('components/components.bench');
    if (mod?.runComponentBenchmarks) results.push(...mod.runComponentBenchmarks());
  }
  if (shouldRun('ssr')) {
    const mod = await loadBench('ssr/ssr.bench');
    if (mod?.runSSRBenchmarks) results.push(...await mod.runSSRBenchmarks());
  }
  if (shouldRun('memory')) {
    const mod = await loadBench('memory/memory.bench');
    if (mod?.runMemoryBenchmarks) results.push(...mod.runMemoryBenchmarks());
  }

  return results;
}

function runBenchmarkWorkerProcess(targetDir: string, targetCategory?: string): BenchmarkResult[] {
  const tempOutputFile = path.join(os.tmpdir(), `samrey-bench-out-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  const scriptPath = path.resolve(import.meta.dirname, 'check-regression.ts');
  const args = [
    '--import', 'tsx',
    scriptPath,
    '--worker',
    '--dir', targetDir,
    '--output', tempOutputFile
  ];
  if (targetCategory) {
    args.push(targetCategory);
  }

  const child = spawnSync(process.execPath, args, {
    cwd: targetDir,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (child.status !== 0) {
    if (fs.existsSync(tempOutputFile)) {
      try { fs.unlinkSync(tempOutputFile); } catch {}
    }
    throw new Error(`Benchmark worker failed in ${targetDir} with exit code ${child.status}:\n${child.stderr || child.stdout}`);
  }

  if (!fs.existsSync(tempOutputFile)) {
    throw new Error(`Benchmark worker did not produce output file: ${tempOutputFile}`);
  }

  try {
    const content = fs.readFileSync(tempOutputFile, 'utf-8');
    fs.unlinkSync(tempOutputFile);
    return JSON.parse(content);
  } catch (e) {
    if (fs.existsSync(tempOutputFile)) {
      try { fs.unlinkSync(tempOutputFile); } catch {}
    }
    throw e;
  }
}

export async function runRegressionGate(
  optionsOrCategory?: string | GateOptions
): Promise<{ passed: boolean; report: RegressionReportItem[]; results: BenchmarkResult[] }> {
  const options: GateOptions =
    typeof optionsOrCategory === 'string'
      ? { targetCategory: optionsOrCategory }
      : (optionsOrCategory || {});

  console.log('=====================================================');
  console.log('🔍 Samrey Framework - Performance Regression Gate');
  console.log('=====================================================\n');

  if (options.compareRef) {
    return runRegressionGateCompare(options);
  }

  return runRegressionGateBaseline(options.targetCategory);
}

async function runRegressionGateCompare(
  options: GateOptions
): Promise<{ passed: boolean; report: RegressionReportItem[]; results: BenchmarkResult[] }> {
  const compareRef = options.compareRef!;
  let resolvedRef: string;
  try {
    resolvedRef = execSync(`git rev-parse --verify "${compareRef}^{commit}"`, { encoding: 'utf-8' }).trim();
  } catch (e) {
    console.warn(`⚠️ Git ref '${compareRef}' could not be resolved to a commit; falling back to baseline results.json.`);
    return runRegressionGateBaseline(options.targetCategory);
  }

  const runs = Math.max(5, options.runs ?? 5);
  const tempWorktree = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-bench-wt-'));

  try {
    console.log(`📦 Setting up git worktree for base ref '${compareRef}' (${resolvedRef.slice(0, 8)})...`);
    execSync(`git worktree add --detach "${tempWorktree}" "${resolvedRef}"`, { stdio: 'pipe' });

    const hostNodeModules = path.join(process.cwd(), 'node_modules');
    const wtNodeModules = path.join(tempWorktree, 'node_modules');
    if (fs.existsSync(hostNodeModules) && !fs.existsSync(wtNodeModules)) {
      try {
        fs.symlinkSync(hostNodeModules, wtNodeModules, 'junction');
      } catch {}
    }

    console.log(`⚡ Running comparative benchmark gate: ${runs} interleaved runs on the SAME machine...\n`);

    const baseRuns: BenchmarkResult[][] = [];
    const currentRuns: BenchmarkResult[][] = [];

    for (let r = 0; r < runs; r++) {
      console.log(`▶ [Run ${r + 1}/${runs}] Executing base ref (${compareRef})...`);
      const baseResult = runBenchmarkWorkerProcess(tempWorktree, options.targetCategory);
      baseRuns.push(baseResult);

      console.log(`▶ [Run ${r + 1}/${runs}] Executing current working tree...`);
      const currentResult = runBenchmarkWorkerProcess(process.cwd(), options.targetCategory);
      currentRuns.push(currentResult);
    }

    // Determine machine identity against recorded baseline
    const baselineData = getBaselineData();
    const isMatchingMachine = isRecordedMachine(baselineData?.system);
    if (!isMatchingMachine) {
      console.log(`ℹ️ Machine profile differs from recorded baseline; absolute minOpsPerSec floors will trigger warnings only.`);
    }

    // Aggregate medians
    const allKeys = new Set<string>();
    for (const run of currentRuns) {
      for (const item of run) allKeys.add(`${item.category}::${item.name}`);
    }
    for (const run of baseRuns) {
      for (const item of run) allKeys.add(`${item.category}::${item.name}`);
    }

    const report: RegressionReportItem[] = [];
    let allPassed = true;

    for (const key of allKeys) {
      const [category, name] = key.split('::');
      const threshold = REGRESSION_THRESHOLDS.find((t) => t.name === name && t.category === category);
      if (!threshold) continue;

      const baseAvgMsValues = baseRuns
        .map((run) => run.find((r) => r.category === category && r.name === name)?.avgMs)
        .filter((v): v is number => typeof v === 'number');
      const baseOpsValues = baseRuns
        .map((run) => run.find((r) => r.category === category && r.name === name)?.opsPerSec)
        .filter((v): v is number => typeof v === 'number');

      const currentAvgMsValues = currentRuns
        .map((run) => run.find((r) => r.category === category && r.name === name)?.avgMs)
        .filter((v): v is number => typeof v === 'number');
      const currentOpsValues = currentRuns
        .map((run) => run.find((r) => r.category === category && r.name === name)?.opsPerSec)
        .filter((v): v is number => typeof v === 'number');

      const baseMedianAvgMs = computeMedian(baseAvgMsValues);
      const baseMedianOps = Math.round(computeMedian(baseOpsValues));
      const currentMedianAvgMs = computeMedian(currentAvgMsValues);
      const currentMedianOps = Math.round(computeMedian(currentOpsValues));

      const item = evaluateBenchmarkRow({
        name,
        category,
        baselineAvgMs: baseMedianAvgMs,
        currentAvgMs: currentMedianAvgMs,
        baselineOps: baseMedianOps,
        currentOps: currentMedianOps,
        threshold,
        isMatchingMachine
      });

      report.push(item);
      if (!item.passed) allPassed = false;
    }

    // Print summary table
    console.log('\n=====================================================');
    console.log(`🛡️ Comparative Regression Gate (${runs} interleaved runs, median comparison)`);
    console.log('=====================================================\n');
    console.log('| Status | Category | Benchmark | Base Ref (median) | Current (median) | Δ % | Max Allowed Δ | Current Ops/s | Min Allowed Ops |');
    console.log('|---|---|---|---|---|---|---|---|---|');

    for (const item of report) {
      let statusIcon = item.passed ? '✅ PASS' : '❌ FAIL';
      if (item.isFasterThanBase) statusIcon = '🚀 PASS';
      else if (item.isNoiseExempt) statusIcon = '🛡️ PASS (noise-exempt)';
      else if (item.floorWarning) statusIcon = '⚠️ WARN';

      const deltaStr = `${item.deltaPercent > 0 ? '+' : ''}${item.deltaPercent}%`;
      console.log(`| ${statusIcon} | ${item.category} | ${item.name} | ${item.baselineAvgMs}ms | ${item.currentAvgMs}ms | ${deltaStr} | +${item.maxAllowedPercent}% | ${item.currentOps.toLocaleString()} | ${item.minAllowedOps.toLocaleString()} |`);
    }

    if (report.length === 0) {
      console.log('ℹ️ No tracked threshold benchmarks in current execution scope.');
    }

    if (!allPassed) {
      console.error('\n❌ PERFORMANCE REGRESSION DETECTED: One or more benchmarks exceeded acceptable thresholds.');
    } else {
      console.log('\n✅ ALL COMPARATIVE BENCHMARK GATES PASSED: Performance is within acceptable tolerances.');
    }

    // Return the latest current results
    return { passed: allPassed, report, results: currentRuns[currentRuns.length - 1] || [] };
  } finally {
    console.log('🧹 Cleaning up temporary git worktree...');
    try {
      execSync(`git worktree remove --force "${tempWorktree}"`, { stdio: 'pipe' });
    } catch {}
    try {
      if (fs.existsSync(tempWorktree)) {
        fs.rmSync(tempWorktree, { recursive: true, force: true });
      }
    } catch {}
    try {
      execSync('git worktree prune', { stdio: 'pipe' });
    } catch {}
  }
}

async function runRegressionGateBaseline(
  targetCategory?: string
): Promise<{ passed: boolean; report: RegressionReportItem[]; results: BenchmarkResult[] }> {
  const baselinePath = path.join(process.cwd(), 'benchmarks', 'results.json');
  if (!fs.existsSync(baselinePath)) {
    console.warn('⚠️ No baseline results.json found.');
  }

  let baselineMap = new Map<string, BenchmarkResult>();
  let baselineSystem: any = null;
  if (fs.existsSync(baselinePath)) {
    try {
      const baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
      baselineSystem = baselineData.system;
      if (Array.isArray(baselineData.results)) {
        for (const res of baselineData.results) {
          baselineMap.set(`${res.category}::${res.name}`, res);
        }
      }
    } catch (e) {
      console.warn('⚠️ Failed to parse baseline results.json:', e);
    }
  }

  const isMatchingMachine = isRecordedMachine(baselineSystem);
  const currentResults = await executeBenchmarksInDir(process.cwd(), targetCategory);

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
      const item = evaluateBenchmarkRow({
        name: res.name,
        category: res.category,
        baselineAvgMs: baseline.avgMs,
        currentAvgMs: res.avgMs,
        baselineOps: baseline.opsPerSec,
        currentOps: res.opsPerSec,
        threshold,
        isMatchingMachine
      });

      if (!item.passed) allPassed = false;
      report.push(item);
    }
  }

  // Print summary table
  console.log('| Status | Category | Benchmark | Baseline (avg) | Current (avg) | Δ % | Max Allowed Δ | Current Ops/s | Min Allowed Ops |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const item of report) {
    let statusIcon = item.passed ? '✅ PASS' : '❌ FAIL';
    if (item.isFasterThanBase) statusIcon = '🚀 PASS';
    else if (item.isNoiseExempt) statusIcon = '🛡️ PASS (noise-exempt)';
    else if (item.floorWarning) statusIcon = '⚠️ WARN';
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

// Worker / CLI dispatch
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('check-regression')) {
  const parsed = parseBenchmarkGateArgs(process.argv.slice(2));

  if (parsed.isWorker) {
    const dir = parsed.workerDir || process.cwd();
    const outputFile = parsed.outputFile;
    executeBenchmarksInDir(dir, parsed.targetCategory).then((results) => {
      if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(results), 'utf-8');
      } else {
        console.log(JSON.stringify(results));
      }
      process.exit(0);
    }).catch((err) => {
      console.error('Worker error:', err);
      process.exit(1);
    });
  } else {
    runRegressionGate({
      compareRef: parsed.compareRef,
      runs: parsed.runs,
      targetCategory: parsed.targetCategory
    }).then(({ passed }) => {
      if (!passed) process.exit(1);
    }).catch((err) => {
      console.error('Regression check error:', err);
      process.exit(1);
    });
  }
}
