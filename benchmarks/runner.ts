import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { BenchmarkResult, formatResultTable } from './utils/harness.js';
import { runCompilerBenchmarks } from './compiler/compiler.bench.js';
import { runReactivityBenchmarks } from './reactivity/reactivity.bench.js';
import { runRuntimeBenchmarks } from './runtime/runtime.bench.js';
import { runShowBenchmarks } from './control-flow/show.bench.js';
import { runForBenchmarks } from './control-flow/for.bench.js';
import { runComponentBenchmarks } from './components/components.bench.js';
import { runSSRBenchmarks } from './ssr/ssr.bench.js';
import { runMemoryBenchmarks } from './memory/memory.bench.js';

export async function runAllBenchmarks(targetCategory?: string) {
  console.log('=====================================================');
  console.log('🚀 Samrey Framework - Performance Baseline & Benchmark');
  console.log('=====================================================');
  console.log(`Node: ${process.version}`);
  console.log(`Platform: ${process.platform} (${process.arch})`);
  console.log(`CPUs: ${os.cpus().length}x ${os.cpus()[0]?.model || 'Generic'}`);
  console.log(`Total Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log('-----------------------------------------------------\n');

  const allResults: BenchmarkResult[] = [];
  const shouldRun = (cat: string) => !targetCategory || targetCategory.toLowerCase() === 'all' || cat.toLowerCase().includes(targetCategory.toLowerCase());

  if (shouldRun('compiler')) {
    console.log('▶ Running Compiler Benchmarks...');
    const compilerResults = runCompilerBenchmarks();
    allResults.push(...compilerResults);
  }

  if (shouldRun('reactivity')) {
    console.log('▶ Running Reactivity Benchmarks...');
    const reactivityResults = runReactivityBenchmarks();
    allResults.push(...reactivityResults);
  }

  if (shouldRun('runtime')) {
    console.log('▶ Running Runtime DOM Benchmarks...');
    const runtimeResults = runRuntimeBenchmarks();
    allResults.push(...runtimeResults);
  }

  if (shouldRun('show') || shouldRun('control-flow') || shouldRun('runtime')) {
    console.log('▶ Running Control Flow (<Show>) Benchmarks...');
    const showResults = runShowBenchmarks();
    allResults.push(...showResults);
  }

  if (shouldRun('for') || shouldRun('control-flow') || shouldRun('runtime')) {
    console.log('▶ Running Control Flow (<For>) Benchmarks...');
    const forResults = runForBenchmarks();
    allResults.push(...forResults);
  }

  if (shouldRun('component')) {
    console.log('▶ Running Component Benchmarks...');
    const componentResults = runComponentBenchmarks();
    allResults.push(...componentResults);
  }

  if (shouldRun('ssr')) {
    console.log('▶ Running SSR & Serialization Benchmarks...');
    const ssrResults = await runSSRBenchmarks();
    allResults.push(...ssrResults);
  }

  if (shouldRun('memory')) {
    console.log('▶ Running Memory & Leak Profiling Benchmarks...');
    const memoryResults = runMemoryBenchmarks();
    allResults.push(...memoryResults);
  }

  console.log('\n=====================================================');
  console.log('📊 Benchmark Results Summary Table');
  console.log('=====================================================\n');
  console.log(formatResultTable(allResults));

  // If full benchmark run, update results.json
  if (!targetCategory || targetCategory === 'all') {
    const cpuCount = os.cpus().length;
    const cpuModel = os.cpus()[0]?.model || `${process.arch} CPU`;
    const totalMemoryBytes = os.totalmem();
    const totalMemoryGb = (totalMemoryBytes / 1024 / 1024 / 1024).toFixed(1);
    const platformName =
      process.platform === 'darwin'
        ? 'macOS'
        : process.platform === 'win32'
          ? 'Windows'
          : process.platform;
    const machineLabel = `${platformName} ${os.release()} ${process.arch} (${cpuCount} CPU, ${totalMemoryGb}GB RAM)`;

    const resultsPayload = {
      timestamp: new Date().toISOString(),
      system: {
        machine: machineLabel,
        node: process.version,
        platform: process.platform,
        release: os.release(),
        arch: process.arch,
        cpuCount,
        cpuModel,
        totalMemoryBytes,
        freeMemoryBytes: os.freemem()
      },
      totalBenchmarks: allResults.length,
      results: allResults
    };

    const resultsPath = path.join(process.cwd(), 'benchmarks', 'results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(resultsPayload, null, 2), 'utf-8');
    console.log(`\n💾 Saved machine-readable results to ${resultsPath}`);
  }

  return allResults;
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('runner')) {
  const catArg = process.argv[2];
  runAllBenchmarks(catArg).catch((err) => {
    console.error('Benchmark execution error:', err);
    process.exit(1);
  });
}
