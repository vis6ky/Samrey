/**
 * @license Apache-2.0
 * Samrey Framework — Provider-Independent Authenticated Agent Evaluator
 * 
 * Evaluates Samrey applications created by AI agents (Antigravity, Gemini, Claude, Codex, etc.)
 * without requiring direct external provider API keys.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BENCHMARK_TASKS, AgentContext, ExecutionCategory } from './adapter.js';

import { testCounter } from './tests/test-01-counter.js';
import { testComponents } from './tests/test-02-components.js';
import { testRouting } from './tests/test-03-routing.js';
import { testForms } from './tests/test-04-forms.js';
import { testDebugApp } from './tests/test-05-debug.js';

export interface EvaluationResult {
  taskId: string;
  taskTitle: string;
  agent: AgentContext;
  timestamp: string;
  passed: boolean;
  score: number; // 0 - 100
  dimensions: {
    compilation: { score: number; max: number; passed: boolean; message: string };
    astAntiPatterns: { score: number; max: number; passed: boolean; violations: string[] };
    functionalTests: { score: number; max: number; passed: boolean; subtests: { name: string; passed: boolean; error?: string }[] };
    qualityA11y: { score: number; max: number; passed: boolean; notes: string[] };
  };
  errors: string[];
}

export async function evaluateTask(
  taskNum: string,
  options: {
    fixtureDir?: string;
    useReference?: boolean;
    agentContext?: Partial<AgentContext>;
  } = {}
): Promise<EvaluationResult> {
  const taskDef = BENCHMARK_TASKS[taskNum];
  if (!taskDef) {
    throw new Error(`Invalid task number "${taskNum}". Valid options: 01, 02, 03, 04, 05`);
  }

  const rootDir = process.cwd();
  const targetDir = options.useReference
    ? resolve(rootDir, 'benchmarks/interactive/evaluation/reference-solutions')
    : resolve(rootDir, options.fixtureDir || taskDef.fixtureDir);

  const agent: AgentContext = {
    agentName: options.agentContext?.agentName || (options.useReference ? 'Reference Solution' : 'Antigravity IDE Agent'),
    modelIdentifier: options.agentContext?.modelIdentifier || 'gemini-in-antigravity',
    category: options.agentContext?.category || (options.useReference ? 'authenticated-ide-agent' : 'authenticated-ide-agent'),
    humanInterventions: options.agentContext?.humanInterventions ?? 0,
    correctionCycles: options.agentContext?.correctionCycles ?? 0,
    notes: options.agentContext?.notes
  };

  const errors: string[] = [];
  const violations: string[] = [];
  const qualityNotes: string[] = [];

  // Dimension 1: Static Code Inspection & Anti-Pattern Check (AST / regex)
  let staticScore = 20;
  let allSourceCode = '';

  const checkSourceFiles = (fileNames: string[]) => {
    for (const file of fileNames) {
      const fullPath = options.useReference
        ? resolve(rootDir, taskDef.referenceFile)
        : resolve(targetDir, 'src', file);

      if (!existsSync(fullPath)) {
        errors.push(`Target source file not found: ${fullPath}`);
        return;
      }
      const code = readFileSync(fullPath, 'utf-8');
      allSourceCode += '\n' + code;

      // Check forbidden foreign hooks
      if (/useState|useEffect|useRef|useCallback|useMemo/.test(code) && taskNum !== '05') {
        violations.push(`[${file}] Contains forbidden foreign React hooks (useState, useEffect, etc.)`);
        staticScore = Math.max(0, staticScore - 10);
      }

      // Check forbidden template tags <Show> or <For>
      if (/<Show[\s>]|<For[\s>]/i.test(code) && taskNum !== '05') {
        violations.push(`[${file}] Contains prohibited <Show> or <For> HTML tag in string template (SAMREY-108)`);
        staticScore = Math.max(0, staticScore - 10);
      }

      // Check in-place mutation
      if (/\.value\.push\(|\.value\.splice\(|\.value\.sort\(/.test(code) && taskNum !== '05') {
        violations.push(`[${file}] Mutates signal array in-place (.value.push/splice). In Samrey, assign a new reference.`);
        staticScore = Math.max(0, staticScore - 10);
      }
    }
  };

  switch (taskNum) {
    case '01':
      checkSourceFiles(['Counter.ts']);
      break;
    case '02':
      checkSourceFiles(['Badge.ts', 'UserCard.ts']);
      break;
    case '03':
      checkSourceFiles(['DashboardRouter.ts']);
      break;
    case '04':
      checkSourceFiles(['CheckoutForm.ts']);
      break;
    case '05':
      checkSourceFiles(['BrokenApp.ts']);
      break;
  }

  // Dimension 2: Module Import / Compilation
  let compilationScore = 0;
  let loadedModules: any = {};

  try {
    if (options.useReference) {
      const moduleUrl = pathToFileURL(resolve(rootDir, taskDef.referenceFile)).href;
      loadedModules = await import(moduleUrl);
      compilationScore = 20;
    } else {
      switch (taskNum) {
        case '01': {
          const modUrl = pathToFileURL(resolve(targetDir, 'src/Counter.ts')).href;
          loadedModules = await import(modUrl);
          break;
        }
        case '02': {
          const badgeUrl = pathToFileURL(resolve(targetDir, 'src/Badge.ts')).href;
          const userCardUrl = pathToFileURL(resolve(targetDir, 'src/UserCard.ts')).href;
          loadedModules = {
            badge: await import(badgeUrl),
            userCard: await import(userCardUrl)
          };
          break;
        }
        case '03': {
          const modUrl = pathToFileURL(resolve(targetDir, 'src/DashboardRouter.ts')).href;
          loadedModules = await import(modUrl);
          break;
        }
        case '04': {
          const modUrl = pathToFileURL(resolve(targetDir, 'src/CheckoutForm.ts')).href;
          loadedModules = await import(modUrl);
          break;
        }
        case '05': {
          const modUrl = pathToFileURL(resolve(targetDir, 'src/BrokenApp.ts')).href;
          loadedModules = await import(modUrl);
          break;
        }
      }
      compilationScore = 20;
    }
  } catch (err: any) {
    errors.push(`Compilation / import error: ${err.message}`);
    compilationScore = 0;
  }

  // Dimension 3: Functional Tests
  let testResult = { passed: false, message: 'Not executed', subtests: [] as { name: string; passed: boolean; error?: string }[] };

  if (compilationScore > 0) {
    try {
      switch (taskNum) {
        case '01':
          testResult = await testCounter(loadedModules);
          break;
        case '02':
          testResult = await testComponents(
            options.useReference ? loadedModules : loadedModules.badge,
            options.useReference ? loadedModules : loadedModules.userCard
          );
          break;
        case '03':
          testResult = await testRouting(loadedModules);
          break;
        case '04':
          testResult = await testForms(loadedModules);
          break;
        case '05':
          testResult = await testDebugApp(loadedModules, allSourceCode);
          break;
      }
    } catch (err: any) {
      errors.push(`Test execution runtime error: ${err.message}`);
      testResult = {
        passed: false,
        message: err.message,
        subtests: [{ name: 'Runtime Execution', passed: false, error: err.message }]
      };
    }
  }

  const passedSubtests = testResult.subtests.filter(t => t.passed).length;
  const totalSubtests = testResult.subtests.length || 1;
  const functionalScore = Math.round((passedSubtests / totalSubtests) * 40);

  // Dimension 4: Accessibility & Code Quality
  let qualityScore = 20;
  if (/aria-|role=|alt=|<label/i.test(allSourceCode)) {
    qualityNotes.push('Included accessible HTML/ARIA markup.');
  } else {
    qualityScore -= 5;
    qualityNotes.push('Missing explicit accessibility attributes (aria-*, role, label).');
  }

  if (/template\s*\(/i.test(allSourceCode)) {
    qualityNotes.push('Hoisted static markup using template(...) cloning.');
  } else {
    qualityScore -= 10;
    qualityNotes.push('Missing template(...) cloning; direct DOM creation detected.');
  }

  qualityScore = Math.max(0, qualityScore);

  const totalScore = compilationScore + staticScore + functionalScore + qualityScore;
  const overallPassed = totalScore >= 80 && testResult.passed;

  const result: EvaluationResult = {
    taskId: taskDef.id,
    taskTitle: taskDef.title,
    agent,
    timestamp: new Date().toISOString(),
    passed: overallPassed,
    score: totalScore,
    dimensions: {
      compilation: {
        score: compilationScore,
        max: 20,
        passed: compilationScore === 20,
        message: compilationScore === 20 ? 'TypeScript / Module clean load' : 'Failed to import module'
      },
      astAntiPatterns: {
        score: staticScore,
        max: 20,
        passed: violations.length === 0,
        violations
      },
      functionalTests: {
        score: functionalScore,
        max: 40,
        passed: testResult.passed,
        subtests: testResult.subtests
      },
      qualityA11y: {
        score: qualityScore,
        max: 20,
        passed: qualityScore >= 15,
        notes: qualityNotes
      }
    },
    errors
  };

  saveReport(result);
  return result;
}

function saveReport(result: EvaluationResult): void {
  const reportsDir = resolve(process.cwd(), 'benchmarks/interactive/reports');
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  // 1. Write per-run JSON
  const dateStr = result.timestamp.replace(/[:.]/g, '-');
  const safeAgent = result.agent.agentName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const runFile = join(reportsDir, `${dateStr}-${result.taskId}-${safeAgent}.json`);
  writeFileSync(runFile, JSON.stringify(result, null, 2), 'utf-8');

  // 2. Update latest results JSON
  const latestFile = join(reportsDir, 'latest-results.json');
  let currentLatest: Record<string, EvaluationResult> = {};
  if (existsSync(latestFile)) {
    try {
      currentLatest = JSON.parse(readFileSync(latestFile, 'utf-8'));
    } catch {
      currentLatest = {};
    }
  }
  currentLatest[`${result.taskId}_${result.agent.category}`] = result;
  writeFileSync(latestFile, JSON.stringify(currentLatest, null, 2), 'utf-8');

  // 3. Update Markdown Summary
  updateMarkdownReport(reportsDir, currentLatest);
}

function updateMarkdownReport(reportsDir: string, results: Record<string, EvaluationResult>): void {
  const mdFile = join(reportsDir, 'EVALUATION-REPORT.md');

  let md = `# Samrey AI Coding Agent Benchmark — Evaluation Report\n\n`;
  md += `> **Authority**: Independent verification results for coding agents executing real Samrey tasks.\n`;
  md += `> **Zero API Keys Required**: Evaluated inside authenticated local developer environments (Antigravity, Gemini, Claude Code, Codex).\n\n`;

  md += `## Execution Categories\n\n`;
  md += `Results are partitioned strictly by execution category to ensure fair comparison:\n`;
  md += `1. **Authenticated IDE Agent** (e.g. Antigravity IDE, Gemini inside IDE)\n`;
  md += `2. **Fully Automated CLI** (e.g. Claude Code, Gemini CLI in headless mode)\n`;
  md += `3. **Interactive Human-Assisted** (developer prompted or assisted the model)\n\n`;

  md += `## Scoreboard\n\n`;
  md += `| Task | Agent / Model | Category | Score | Result | Compilation | AST Clean | Tests | A11y / Quality |\n`;
  md += `| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  for (const item of Object.values(results)) {
    const statusIcon = item.passed ? '✅ PASS' : '❌ FAIL';
    md += `| **${item.taskId}** (${item.taskTitle}) | ${item.agent.agentName} | \`${item.agent.category}\` | **${item.score}/100** | ${statusIcon} | ${item.dimensions.compilation.score}/20 | ${item.dimensions.astAntiPatterns.score}/20 | ${item.dimensions.functionalTests.score}/40 | ${item.dimensions.qualityA11y.score}/20 |\n`;
  }

  md += `\n---\n`;
  md += `*Last updated: ${new Date().toISOString()}*\n`;

  writeFileSync(mdFile, md, 'utf-8');
}

// CLI Execution Entry Point
if (process.argv[1]?.endsWith('evaluator.ts') || process.argv[1]?.endsWith('evaluator.js')) {
  const args = process.argv.slice(2);

  const getArg = (name: string): string | undefined => {
    const prefix = `--${name}=`;
    const arg = args.find(a => a.startsWith(prefix));
    return arg ? arg.slice(prefix.length) : undefined;
  };

  const isSelfTest = args.includes('--self-test') || args.includes('--all-self-test');
  const taskArg = getArg('task') || '01';
  const categoryArg = (getArg('category') || 'authenticated-ide-agent') as ExecutionCategory;
  const agentArg = getArg('agent') || (isSelfTest ? 'Reference Implementation' : 'Antigravity IDE Agent');
  const modelArg = getArg('model') || 'gemini-in-antigravity';

  async function run() {
    if (args.includes('--all-self-test')) {
      console.log('▲ Running comprehensive self-test across all 5 benchmark challenges using reference solutions...\n');
      const taskKeys = Object.keys(BENCHMARK_TASKS);
      let allPassed = true;

      for (const t of taskKeys) {
        const res = await evaluateTask(t, {
          useReference: true,
          agentContext: { agentName: 'Golden Reference', category: 'authenticated-ide-agent' }
        });
        console.log(`  Task ${t} [${res.taskId}]: ${res.passed ? '✅ PASS' : '✕ FAIL'} (${res.score}/100)`);
        for (const sub of res.dimensions.functionalTests.subtests) {
          console.log(`    - ${sub.name}: ${sub.passed ? '✓' : '✕ ' + sub.error}`);
        }
        if (!res.passed) allPassed = false;
      }

      console.log(`\nSelf-test overall result: ${allPassed ? '✅ ALL 5 REFERENCE SOLUTIONS PASSED (100%)' : '✕ SOME TESTS FAILED'}`);
      process.exit(allPassed ? 0 : 1);
    } else {
      console.log(`▲ Evaluating Task ${taskArg} for Agent "${agentArg}" (${categoryArg})...\n`);
      const res = await evaluateTask(taskArg, {
        useReference: isSelfTest,
        fixtureDir: getArg('fixture'),
        agentContext: {
          agentName: agentArg,
          modelIdentifier: modelArg,
          category: categoryArg
        }
      });

      console.log(`Result: ${res.passed ? '✅ PASSED' : '✕ FAILED'} | Score: ${res.score}/100`);
      console.log(`- Compilation: ${res.dimensions.compilation.score}/20`);
      console.log(`- Anti-Pattern / AST Cleanliness: ${res.dimensions.astAntiPatterns.score}/20`);
      console.log(`- Functional Tests: ${res.dimensions.functionalTests.score}/40`);
      console.log(`- Quality & Accessibility: ${res.dimensions.qualityA11y.score}/20`);

      if (res.errors.length > 0) {
        console.log('\nErrors:');
        res.errors.forEach(e => console.log(`  ✕ ${e}`));
      }

      process.exit(res.passed ? 0 : 1);
    }
  }

  run().catch(err => {
    console.error('Fatal evaluator error:', err);
    process.exit(1);
  });
}
