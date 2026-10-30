/**
 * @license Apache-2.0
 * @samrey/cli - "samrey preview" Command
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CommandResult } from './create.js';
import { execProcess, resolveProjectVite, collectFilesRecursively } from '../exec.js';

export interface PreviewCommandOptions {
  cwd?: string;
  port?: number;
  host?: boolean;
  outDir?: string;
  dryRun?: boolean;
}

export async function runPreviewCommand(options: PreviewCommandOptions = {}): Promise<CommandResult> {
  const projectRoot = options.cwd || process.cwd();
  const port = options.port || 4173;
  const host = Boolean(options.host);
  const outDir = options.outDir || 'dist';
  const absoluteOutDir = path.resolve(projectRoot, outDir);

  if (!fs.existsSync(absoluteOutDir)) {
    return {
      success: false,
      message: '[Samrey Preview Error] No build output found. Please run samrey build first.',
      exitCode: 1
    };
  }

  const files = collectFilesRecursively(absoluteOutDir);
  if (files.length === 0) {
    return {
      success: false,
      message: `[Samrey Preview Error] Build output directory "${outDir}" is empty. Please run samrey build first.`,
      exitCode: 1
    };
  }

  if (options.dryRun) {
    return {
      success: true,
      message: `  ▲ Samrey Production Preview Server (dry run)\n  ➜ Serving: ${outDir} at http://${host ? '0.0.0.0' : 'localhost'}:${port}/`,
      exitCode: 0,
      data: { port, host, outDir, dryRun: true }
    };
  }

  const viteBin = resolveProjectVite(projectRoot);
  if (!viteBin) {
    return {
      success: false,
      message: '[Samrey Preview Error] Vite was not found in your project.\nPlease install Vite by running: npm install --save-dev vite',
      exitCode: 1
    };
  }

  const previewArgs = [viteBin, 'preview', '--port', String(port), '--outDir', outDir];
  if (host) {
    previewArgs.push('--host', '0.0.0.0');
  }

  const execRes = await execProcess(process.execPath, previewArgs, { cwd: projectRoot });
  return {
    success: execRes.exitCode === 0,
    message: execRes.exitCode === 0
      ? `  ▲ Samrey Production Preview Server\n  ✓ Preview server finished.\n${execRes.stdout}`.trim()
      : `[Samrey Preview Error] Preview server failed with exit code ${execRes.exitCode}.\n${execRes.stderr || execRes.stdout}`.trim(),
    exitCode: execRes.exitCode,
    data: { port, host, outDir }
  };
}
