/**
 * @license Apache-2.0
 * @samrey/monorepo - Benchmark Report Generator
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ChallengeEvaluationReport } from '../evaluators/multi-dimensional-evaluator.js';
import { AdapterGenerationResult } from '../adapters/base-adapter.js';

export interface ModelBenchmarkSummary {
  modelId: string;
  status: 'COMPLETED' | 'PARTIAL' | 'NOT_RUN' | 'ERROR';
  notRunReason?: string;
  totalChallenges: number;
  passedChallenges: number;
  averageScore: number;
  totalExecutionTimeMs: number;
  totalEstimatedCostUsd: number;
  challengeReports: Array<{
    challengeId: number;
    challengeName: string;
    generation: AdapterGenerationResult;
    evaluation?: ChallengeEvaluationReport;
  }>;
}

export function generateBenchmarkReport(
  summaries: ModelBenchmarkSummary[],
  outputDir = path.resolve('benchmarks/reports')
): { jsonReportPath: string; markdownReportPath: string } {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const jsonReportPath = path.join(outputDir, 'results.json');
  const markdownReportPath = path.join(outputDir, 'BENCHMARK-RUN-REPORT.md');

  const fullData = {
    timestamp,
    version: '2.1.0',
    summaries
  };

  fs.writeFileSync(jsonReportPath, JSON.stringify(fullData, null, 2), 'utf8');

  // Generate Markdown
  let md = `# Samrey Framework — Multi-Model Coding Agent Benchmark Report

**Timestamp:** ${timestamp}  
**Framework Version:** 2.1.0  
**Methodology:** 20 Realistic Development Challenges executed against clean fixtures with weighted scoring:
- Functional Correctness (30%)
- Build & Type-Check (15%)
- Samrey Native API Usage (15%)
- Test Success (10%)
- Security (10%)
- Accessibility (5%)
- Maintainability (10%)
- Performance (5%)

---

## 1. Provider & Model Executive Summary

| Model | Status | Challenges Passed | Average Score | Cost (USD) | Latency (avg) |
| :--- | :--- | :--- | :--- | :--- | :--- |
`;

  for (const s of summaries) {
    const passedStr = s.status === 'NOT_RUN' ? 'N/A (NOT RUN)' : `${s.passedChallenges} / ${s.totalChallenges}`;
    const scoreStr = s.status === 'NOT_RUN' ? 'N/A' : `${s.averageScore.toFixed(1)} / 100`;
    const costStr = `$${s.totalEstimatedCostUsd.toFixed(4)}`;
    const latencyStr = s.totalChallenges > 0 ? `${(s.totalExecutionTimeMs / s.totalChallenges).toFixed(0)}ms` : '0ms';
    const statusLabel = s.status === 'NOT_RUN' ? `⚠️ NOT RUN (${s.notRunReason})` : s.status;

    md += `| **${s.modelId}** | ${statusLabel} | ${passedStr} | ${scoreStr} | ${costStr} | ${latencyStr} |\n`;
  }

  md += `\n---\n\n## 2. Detailed Challenge Results\n\n`;

  for (const s of summaries) {
    md += `### Model: ${s.modelId}\n\n`;
    if (s.status === 'NOT_RUN') {
      md += `> **Status**: NOT RUN  \n> **Reason**: ${s.notRunReason}\n\n`;
      continue;
    }

    md += `| # | Challenge | Status | Score | Functional (30) | API (15) | Build (15) | Sec (10) |\n`;
    md += `| -: | :--- | :--- | -: | -: | -: | -: | -: |\n`;

    for (const r of s.challengeReports) {
      const evalReport = r.evaluation;
      if (!evalReport) {
        md += `| ${r.challengeId} | ${r.challengeName} | ❌ ERROR | 0 | 0 | 0 | 0 | 0 |\n`;
        continue;
      }
      const passIcon = evalReport.passed ? '✅ PASS' : '❌ FAIL';
      const func = evalReport.dimensions.functionalCorrectness.score;
      const api = evalReport.dimensions.apiUsage.score;
      const bld = evalReport.dimensions.buildAndTypeCheck.score;
      const sec = evalReport.dimensions.security.score;
      md += `| ${r.challengeId} | ${r.challengeName} | ${passIcon} | **${evalReport.totalScore}** | ${func} | ${api} | ${bld} | ${sec} |\n`;
    }
    md += `\n`;
  }

  fs.writeFileSync(markdownReportPath, md, 'utf8');

  return { jsonReportPath, markdownReportPath };
}
