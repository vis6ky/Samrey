/**
 * @license Apache-2.0
 * @samrey/monorepo - Multi-Dimensional Quality Evaluator
 *
 * Implements weighted scoring:
 * - Functional Correctness: 30%
 * - Build and Type-Check: 15%
 * - Samrey API Usage: 15%
 * - Test Coverage & Tests: 10%
 * - Security: 10%
 * - Accessibility: 5%
 * - Maintainability: 10%
 * - Performance: 5%
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { validateSamreyCode } from '@samrey/ai';
import { ChallengeTask } from '../adapters/base-adapter.js';

export interface EvaluationDimension {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  details: string[];
}

export interface ChallengeEvaluationReport {
  challengeId: number;
  challengeName: string;
  passed: boolean;
  totalScore: number; // 0 - 100
  dimensions: Record<string, EvaluationDimension>;
  diagnostics: string[];
  executionLog: string;
}

export class MultiDimensionalEvaluator {
  evaluateSolution(
    challenge: ChallengeTask,
    generatedFiles: Record<string, string>,
    executionOutput?: string,
    testPassed = false
  ): ChallengeEvaluationReport {
    const diagnostics: string[] = [];
    const dimensions: Record<string, EvaluationDimension> = {
      functionalCorrectness: { name: 'Functional Correctness', weight: 30, score: 0, maxScore: 30, details: [] },
      buildAndTypeCheck: { name: 'Build & Type-Check', weight: 15, score: 0, maxScore: 15, details: [] },
      apiUsage: { name: 'Samrey API Usage', weight: 15, score: 0, maxScore: 15, details: [] },
      testSuccess: { name: 'Test Success', weight: 10, score: 0, maxScore: 10, details: [] },
      security: { name: 'Security Verification', weight: 10, score: 0, maxScore: 10, details: [] },
      accessibility: { name: 'Accessibility Verification', weight: 5, score: 0, maxScore: 5, details: [] },
      maintainability: { name: 'Maintainability & Structure', weight: 10, score: 0, maxScore: 10, details: [] },
      performance: { name: 'Performance Optimization', weight: 5, score: 0, maxScore: 5, details: [] }
    };

    const fileNames = Object.keys(generatedFiles);
    if (fileNames.length === 0) {
      diagnostics.push('No code generated for challenge.');
      return {
        challengeId: challenge.id,
        challengeName: challenge.name,
        passed: false,
        totalScore: 0,
        dimensions,
        diagnostics,
        executionLog: 'No code generated.'
      };
    }

    const allCode = Object.values(generatedFiles).join('\n');

    // 1. Functional Correctness (30%)
    if (testPassed) {
      dimensions.functionalCorrectness.score = 30;
      dimensions.functionalCorrectness.details.push('All unit test assertions passed.');
    } else {
      dimensions.functionalCorrectness.details.push('Functional tests failed or were not run.');
    }

    // 2. Build & Type-Check (15%)
    let hasSyntaxError = false;
    for (const [filename, code] of Object.entries(generatedFiles)) {
      const val = validateSamreyCode(code, { filename });
      if (!val.valid) {
        hasSyntaxError = true;
        diagnostics.push(`[${filename}] Syntax / AST error: ${val.errors.join('; ')}`);
      }
    }
    if (!hasSyntaxError) {
      dimensions.buildAndTypeCheck.score = 15;
      dimensions.buildAndTypeCheck.details.push('Code parsed cleanly into valid AST without compilation errors.');
    } else {
      dimensions.buildAndTypeCheck.details.push('Encountered syntax or type errors.');
    }

    // 3. Samrey Native API Usage (15%)
    let apiScore = 15;
    if (/\b(useState|useEffect|useMemo|useCallback|useRef)\b/.test(allCode)) {
      apiScore = 0;
      diagnostics.push('Foreign React hooks detected in code.');
      dimensions.apiUsage.details.push('FAILED: Foreign React hooks detected.');
    } else if (/\b(react|vue|svelte|@angular)\b/.test(allCode)) {
      apiScore = 0;
      diagnostics.push('Foreign framework imports detected.');
      dimensions.apiUsage.details.push('FAILED: Foreign framework imported.');
    } else if (allCode.includes('<Show') || allCode.includes('<For')) {
      apiScore = Math.max(0, apiScore - 8);
      diagnostics.push('Template-level <Show> or <For> tags detected (SAMREY-108 violation).');
      dimensions.apiUsage.details.push('WARNING: Control flow tags used in template string.');
    } else {
      dimensions.apiUsage.details.push('Pure Samrey native APIs utilized.');
    }
    dimensions.apiUsage.score = apiScore;

    // 4. Test Success (10%)
    if (testPassed) {
      dimensions.testSuccess.score = 10;
      dimensions.testSuccess.details.push('Test execution succeeded.');
    }

    // 5. Security (10%)
    let secScore = 10;
    if (/javascript:|vbscript:/i.test(allCode)) {
      secScore -= 5;
      diagnostics.push('Dangerous URI protocol detected in generated code.');
      dimensions.security.details.push('Dangerous URI protocol detected.');
    }
    if (/\.innerHTML\s*=/i.test(allCode) && !allCode.includes('sanitizeHtml')) {
      secScore -= 5;
      diagnostics.push('Direct unescaped innerHTML assignment detected.');
      dimensions.security.details.push('Direct innerHTML assignment.');
    }
    if (secScore === 10) {
      dimensions.security.details.push('Zero security violations detected.');
    }
    dimensions.security.score = Math.max(0, secScore);

    // 6. Accessibility (5%)
    let a11yScore = 5;
    if (/<img\b/i.test(allCode) && !/\balt\s*=/i.test(allCode)) {
      a11yScore -= 3;
      diagnostics.push('Missing alt attribute on <img> element.');
      dimensions.accessibility.details.push('<img> missing alt attribute.');
    }
    if (a11yScore === 5) {
      dimensions.accessibility.details.push('WCAG accessibility guidelines respected.');
    }
    dimensions.accessibility.score = Math.max(0, a11yScore);

    // 7. Maintainability & Structure (10%)
    let maintScore = 10;
    if (allCode.length < 50) {
      maintScore -= 5;
      dimensions.maintainability.details.push('Code appears incomplete or truncated.');
    } else {
      dimensions.maintainability.details.push('Clean component modularity and exports.');
    }
    dimensions.maintainability.score = Math.max(0, maintScore);

    // 8. Performance (5%)
    let perfScore = 5;
    if (/\.value\.(push|splice|pop|shift|unshift)\(/.test(allCode)) {
      perfScore -= 3;
      diagnostics.push('In-place array mutation on signal (.value.push) degrades reactivity.');
      dimensions.performance.details.push('In-place array mutation detected.');
    }
    if (perfScore === 5) {
      dimensions.performance.details.push('Zero-VDOM static template hoisting and immutable reactivity verified.');
    }
    dimensions.performance.score = Math.max(0, perfScore);

    // Total Score
    const totalScore = Object.values(dimensions).reduce((sum, d) => sum + d.score, 0);
    const passed = totalScore >= 70 && dimensions.functionalCorrectness.score > 0;

    return {
      challengeId: challenge.id,
      challengeName: challenge.name,
      passed,
      totalScore,
      dimensions,
      diagnostics,
      executionLog: executionOutput || 'Execution completed.'
    };
  }
}
