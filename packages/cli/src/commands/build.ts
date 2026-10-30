/**
 * @license Apache-2.0
 * @samrey/cli - "samrey build" Command
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { CommandResult } from './create.js';
import { execProcess, resolveProjectVite, collectFilesRecursively } from '../exec.js';

export interface BuildCommandOptions {
  cwd?: string;
  outDir?: string;
  ssr?: boolean;
  minify?: boolean;
  sourcemap?: boolean;
  dryRun?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} kB`;
}

export async function runBuildCommand(options: BuildCommandOptions = {}): Promise<CommandResult> {
  const projectRoot = options.cwd || process.cwd();
  const outDir = options.outDir || 'dist';

  if (options.dryRun) {
    return {
      success: true,
      message: `  ▲ Samrey Production Build (dry run)\n  ➜ Would build with Vite into ${outDir}`,
      exitCode: 0,
      data: { outDir, dryRun: true }
    };
  }

  const viteBin = resolveProjectVite(projectRoot);
  if (!viteBin) {
    return {
      success: false,
      message: '[Samrey Build Error] Vite was not found in your project.\nPlease install Vite by running: npm install --save-dev vite',
      exitCode: 1
    };
  }

  const buildArgs = [viteBin, 'build', '--outDir', outDir];
  if (options.ssr) {
    buildArgs.push('--ssr');
  }

  const execRes = await execProcess(process.execPath, buildArgs, { cwd: projectRoot });
  if (execRes.exitCode !== 0) {
    return {
      success: false,
      message: `[Samrey Build Error] Build failed with exit code ${execRes.exitCode}.\n${execRes.stderr || execRes.stdout}`.trim(),
      exitCode: execRes.exitCode || 1
    };
  }

  const absoluteOutDir = path.resolve(projectRoot, outDir);
  const files = collectFilesRecursively(absoluteOutDir);

  if (files.length === 0) {
    return {
      success: false,
      message: `[Samrey Build Error] No output files produced in ${outDir}.`,
      exitCode: 1
    };
  }

  let totalRawBytes = 0;
  let totalGzipBytes = 0;

  const fileEntries = files.map((file) => {
    const rawBytes = fs.statSync(file.absolutePath).size;
    const gzipBytes = zlib.gzipSync(fs.readFileSync(file.absolutePath)).length;
    totalRawBytes += rawBytes;
    totalGzipBytes += gzipBytes;
    return {
      path: file.relativePath,
      rawBytes,
      gzipBytes
    };
  });

  const report = [
    `  ▲ Samrey Production Build`,
    `  ➜ Output Directory: ${outDir}`,
    `  ➜ Built Assets:`,
    ...fileEntries.map((f) => `    - ${f.path} (${formatSize(f.rawBytes)}, gzip: ${formatSize(f.gzipBytes)})`),
    `  ➜ Total Size:       ${formatSize(totalRawBytes)} (gzip: ${formatSize(totalGzipBytes)})`,
    `  ✓ Build finished successfully.`
  ].join('\n');

  return {
    success: true,
    message: report,
    exitCode: 0,
    data: {
      outDir,
      files: fileEntries,
      totalRawBytes,
      totalGzipBytes
    }
  };
}
