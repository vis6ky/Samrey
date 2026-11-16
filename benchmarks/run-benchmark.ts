/**
 * @license Apache-2.0
 * @samrey/monorepo - Multi-Model Benchmark Suite Runner
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { BENCHMARK_MODELS } from './models/model-registry.js';
import { createAdapter } from './adapters/index.js';
import { BENCHMARK_CHALLENGES } from './challenges/index.js';
import { MultiDimensionalEvaluator } from './evaluators/multi-dimensional-evaluator.js';
import { generateBenchmarkReport, ModelBenchmarkSummary } from './reports/report-generator.js';

export async function runBenchmark(options: {
  models?: string[];
  challengeIds?: number[];
  selfTest?: boolean;
} = {}): Promise<void> {
  const targetModels = options.models && options.models.length > 0
    ? options.models
    : Object.keys(BENCHMARK_MODELS);

  const targetChallenges = options.challengeIds && options.challengeIds.length > 0
    ? BENCHMARK_CHALLENGES.filter(c => options.challengeIds!.includes(c.id))
    : BENCHMARK_CHALLENGES;

  console.log(`\n======================================================`);
  console.log(`🚀 SAMREY MULTI-MODEL AI CODING AGENT BENCHMARK SUITE`);
  console.log(`   Framework Version: 2.1.0`);
  console.log(`   Challenges: ${targetChallenges.length}`);
  console.log(`   Models: ${targetModels.join(', ')}`);
  console.log(`======================================================\n`);

  const evaluator = new MultiDimensionalEvaluator();
  const summaries: ModelBenchmarkSummary[] = [];

  // If selfTest mode is requested, run golden reference implementations
  if (options.selfTest) {
    console.log(`▲ Running Evaluator Baseline Self-Test on 20 Golden References...\n`);
    const selfTestReports: any[] = [];
    let totalScore = 0;
    let passedCount = 0;

    for (const challenge of targetChallenges) {
      const generated = challenge.referenceCode || {};
      const evalReport = evaluator.evaluateSolution(challenge, generated, 'Self-test reference run', true);
      totalScore += evalReport.totalScore;
      if (evalReport.passed) passedCount++;

      selfTestReports.push({
        challengeId: challenge.id,
        challengeName: challenge.name,
        generation: {
          status: 'SUCCESS',
          modelId: 'golden-reference',
          generatedFiles: generated,
          executionTimeMs: 1
        },
        evaluation: evalReport
      });
      console.log(`  [Challenge ${challenge.id.toString().padStart(2, ' ')}] ${challenge.name.padEnd(40, ' ')}: ${evalReport.passed ? '✅ PASS' : '❌ FAIL'} (${evalReport.totalScore}/100)`);
    }

    const avgScore = targetChallenges.length > 0 ? totalScore / targetChallenges.length : 0;
    summaries.push({
      modelId: 'golden-reference-baseline',
      status: 'COMPLETED',
      totalChallenges: targetChallenges.length,
      passedChallenges: passedCount,
      averageScore: avgScore,
      totalExecutionTimeMs: 50,
      totalEstimatedCostUsd: 0,
      challengeReports: selfTestReports
    });
  }

  // Iterate over registered AI models
  for (const modelId of targetModels) {
    console.log(`\n▲ Evaluating Agent Model: ${modelId}...`);
    const adapter = createAdapter(modelId);

    if (!adapter.isConfigured()) {
      const reason = adapter.getUnconfiguredReason();
      console.log(`  ⚠️ Model ${modelId} is NOT RUN: ${reason}`);
      summaries.push({
        modelId,
        status: 'NOT_RUN',
        notRunReason: reason,
        totalChallenges: targetChallenges.length,
        passedChallenges: 0,
        averageScore: 0,
        totalExecutionTimeMs: 0,
        totalEstimatedCostUsd: 0,
        challengeReports: targetChallenges.map(c => ({
          challengeId: c.id,
          challengeName: c.name,
          generation: {
            status: 'NOT_RUN',
            modelId,
            notRunReason: reason,
            generatedFiles: {},
            executionTimeMs: 0
          }
        }))
      });
      continue;
    }

    // Execute configured model
    const challengeReports: any[] = [];
    let totalScore = 0;
    let passedCount = 0;
    let totalTime = 0;
    let totalCost = 0;

    for (const challenge of targetChallenges) {
      console.log(`  ➜ Executing Challenge [${challenge.id}]: ${challenge.name}...`);
      const fixtureDir = path.resolve('benchmarks/fixtures/temp-run');
      if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });

      const genResult = await adapter.executeChallenge(challenge, fixtureDir);
      totalTime += genResult.executionTimeMs;
      if (genResult.estimatedCostUsd) totalCost += genResult.estimatedCostUsd;

      let evalReport;
      if (genResult.status === 'SUCCESS') {
        evalReport = evaluator.evaluateSolution(challenge, genResult.generatedFiles, genResult.rawResponse, false);
        totalScore += evalReport.totalScore;
        if (evalReport.passed) passedCount++;
        console.log(`    Status: ${evalReport.passed ? '✅ PASS' : '❌ FAIL'} (${evalReport.totalScore}/100)`);
      } else {
        console.log(`    Status: ❌ ${genResult.status} (${genResult.error || 'Failed'})`);
      }

      challengeReports.push({
        challengeId: challenge.id,
        challengeName: challenge.name,
        generation: genResult,
        evaluation: evalReport
      });
    }

    const avgScore = targetChallenges.length > 0 ? totalScore / targetChallenges.length : 0;
    summaries.push({
      modelId,
      status: 'COMPLETED',
      totalChallenges: targetChallenges.length,
      passedChallenges: passedCount,
      averageScore: avgScore,
      totalExecutionTimeMs: totalTime,
      totalEstimatedCostUsd: totalCost,
      challengeReports
    });
  }

  // Generate Reports
  const { jsonReportPath, markdownReportPath } = generateBenchmarkReport(summaries);
  console.log(`\n======================================================`);
  console.log(`📊 BENCHMARK COMPLETE`);
  console.log(`   JSON Report: file://${jsonReportPath}`);
  console.log(`   Markdown:    file://${markdownReportPath}`);
  console.log(`======================================================\n`);
}

// Direct CLI invocation
if (process.argv[1]?.endsWith('run-benchmark.ts') || process.argv[1]?.endsWith('run-benchmark.js')) {
  const args = process.argv.slice(2);
  const selfTest = args.includes('--self-test') || args.includes('--baseline');
  const modelArg = args.find(a => a.startsWith('--model='));
  const models = modelArg ? [modelArg.split('=')[1]] : undefined;

  runBenchmark({ selfTest, models }).catch(err => {
    console.error('Benchmark error:', err);
    process.exit(1);
  });
}
