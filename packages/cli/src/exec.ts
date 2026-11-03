/**
 * @license Apache-2.0
 * @samrey/cli - Process Execution & Project Resolvers
 */

import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function execProcess(
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv }
): Promise<ExecResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const env = { ...process.env, ...options.env };
    delete env.NODE_TEST_CONTEXT;

    const child = spawn(command, args, {
      cwd: options.cwd,
      env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.on('data', (chunk) => {
      const str = chunk.toString();
      stdout += str;
      if (process.env.NODE_ENV !== 'test') {
        process.stdout.write(str);
      }
    });

    child.stderr.on('data', (chunk) => {
      const str = chunk.toString();
      stderr += str;
      if (process.env.NODE_ENV !== 'test') {
        process.stderr.write(str);
      }
    });

    child.on('error', (err) => {
      stderr += err.message;
      resolve({ exitCode: 1, stdout, stderr });
    });

    child.on('close', (code) => {
      resolve({ exitCode: code ?? 0, stdout, stderr });
    });
  });
}

export function resolveProjectVite(projectRoot: string): string | null {
  // 1. Direct path in node_modules/vite/bin/vite.js
  const localVite = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  if (fs.existsSync(localVite)) {
    return localVite;
  }
  // 2. Try require.resolve from project's package.json
  try {
    const pkgPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const req = createRequire(pkgPath);
      return req.resolve('vite/bin/vite.js');
    }
  } catch {}
  return null;
}

export function resolveProjectVitest(projectRoot: string): string | null {
  const localVitest = path.join(projectRoot, 'node_modules', 'vitest', 'vitest.mjs');
  if (fs.existsSync(localVitest)) {
    return localVitest;
  }
  try {
    const pkgPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const req = createRequire(pkgPath);
      return req.resolve('vitest/vitest.mjs');
    }
  } catch {}
  return null;
}

export function collectFilesRecursively(dir: string, baseDir = dir): { relativePath: string; absolutePath: string }[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: { relativePath: string; absolutePath: string }[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFilesRecursively(fullPath, baseDir));
    } else if (entry.isFile()) {
      results.push({
        relativePath: path.relative(baseDir, fullPath).replace(/\\/g, '/'),
        absolutePath: fullPath
      });
    }
  }
  return results;
}
