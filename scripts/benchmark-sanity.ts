import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

async function main() {
  const targetRuns = parseInt(process.argv[2] || '20', 10);
  const scriptPath = path.resolve(process.cwd(), 'benchmarks', 'check-regression.ts');

  console.log('=====================================================');
  console.log(`🧪 Benchmark Gate Sanity Check (--compare HEAD x ${targetRuns})`);
  console.log('=====================================================\n');

  let passedRuns = 0;
  let failedRuns = 0;
  const failureDetails: { run: number; output: string }[] = [];

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
    }
  }

  const totalDuration = ((performance.now() - overallStart) / 1000).toFixed(1);

  console.log('\n=====================================================');
  console.log('📊 Benchmark Gate Sanity Check Results');
  console.log('=====================================================');
  console.log(`Total Runs:    ${targetRuns}`);
  console.log(`Passed:        ${passedRuns} (${((passedRuns / targetRuns) * 100).toFixed(1)}%)`);
  console.log(`Failed:        ${failedRuns} (${((failedRuns / targetRuns) * 100).toFixed(1)}%)`);
  console.log(`Duration:      ${totalDuration}s`);

  if (failedRuns > 0) {
    console.error(`\n❌ Sanity check failed: ${failedRuns} of ${targetRuns} runs reported false regressions.\n`);
    for (const fail of failureDetails) {
      console.error(`--- Failure in Run ${fail.run} ---`);
      console.error(fail.output.slice(-2000));
    }
    process.exit(1);
  }

  console.log('\n✅ Sanity check passed: 0 failures across all 20 self-comparison runs.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error in sanity check:', err);
  process.exit(1);
});

