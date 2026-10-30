/**
 * @license Apache-2.0
 * @samrey/cli - "samrey test" Command
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CommandResult } from './create.js';
import { execProcess, resolveProjectVitest } from '../exec.js';

export interface TestCommandOptions {
  cwd?: string;
  files?: string[];
  watch?: boolean;
  coverage?: boolean;
  dryRun?: boolean;
}

const TEST_FILE_REGEX = /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/;
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage']);

function findTestFiles(dir: string, baseDir = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTestFiles(fullPath, baseDir));
    } else if (entry.isFile() && TEST_FILE_REGEX.test(entry.name)) {
      results.push(path.relative(baseDir, fullPath).replace(/\\/g, '/'));
    }
  }
  return results;
}

export async function runTestCommand(options: TestCommandOptions = {}): Promise<CommandResult> {
  const projectRoot = options.cwd || process.cwd();

  if (options.dryRun) {
    return {
      success: true,
      message: `  ▲ Samrey Test Runner (dry run)\n  ➜ Dry run complete`,
      exitCode: 0,
      data: { dryRun: true }
    };
  }

  const explicitFiles = options.files && options.files.length > 0 ? options.files : null;
  const discoveredFiles = explicitFiles || findTestFiles(projectRoot);

  if (discoveredFiles.length === 0) {
    return {
      success: false,
      message: '[Samrey Test Error] No test files found. Create test files matching *.test.ts or *.spec.ts to run tests.',
      exitCode: 1
    };
  }

  // 1. Check for vitest
  const vitestBin = resolveProjectVitest(projectRoot);
  if (vitestBin) {
    const vitestArgs = [vitestBin, 'run'];
    if (options.watch) vitestArgs.push('--watch');
    if (options.coverage) vitestArgs.push('--coverage');
    vitestArgs.push(...discoveredFiles);

    const res = await execProcess(process.execPath, vitestArgs, { cwd: projectRoot });
    return {
      success: res.exitCode === 0,
      message: res.exitCode === 0
        ? `  ▲ Samrey Test Runner (Vitest)\n  ✓ All test suites passed cleanly.\n${res.stdout}`.trim()
        : `[Samrey Test Error] Tests failed with exit code ${res.exitCode}.\n${res.stderr || res.stdout}`.trim(),
      exitCode: res.exitCode,
      data: { runner: 'vitest', files: discoveredFiles }
    };
  }

  // 2. Direct Node test runner
  const hasTs = discoveredFiles.some((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
  const nodeArgs: string[] = [];
  if (hasTs) {
    nodeArgs.push('--import', 'tsx');
  }
  nodeArgs.push('--test', ...discoveredFiles);

  const res = await execProcess(process.execPath, nodeArgs, { cwd: projectRoot });
  const passed = res.exitCode === 0;

  return {
    success: passed,
    message: passed
      ? `  ▲ Samrey Test Runner (Node.js Test Runner)\n  ✓ All test suites passed cleanly.\n${res.stdout}`.trim()
      : `[Samrey Test Error] Tests failed with exit code ${res.exitCode}.\n${res.stderr || res.stdout}`.trim(),
    exitCode: res.exitCode,
    data: {
      runner: 'node:test',
      files: discoveredFiles,
      passed
    }
  };
}
