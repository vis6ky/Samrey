/**
 * @license Apache-2.0
 * @samrey/cli - "samrey analyze" Command
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { CommandResult } from './create.js';
import { collectFilesRecursively } from '../exec.js';

export interface AnalyzeCommandOptions {
  cwd?: string;
  outDir?: string;
  json?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} kB`;
}

export async function runAnalyzeCommand(options: AnalyzeCommandOptions = {}): Promise<CommandResult> {
  const projectRoot = options.cwd || process.cwd();
  const outDir = options.outDir || 'dist';
  const absoluteOutDir = path.resolve(projectRoot, outDir);

  if (!fs.existsSync(absoluteOutDir)) {
    return {
      success: false,
      message: '[Samrey Analyze Error] No build output found. Please run samrey build first.',
      exitCode: 1
    };
  }

  const files = collectFilesRecursively(absoluteOutDir);
  if (files.length === 0) {
    return {
      success: false,
      message: `[Samrey Analyze Error] Build output directory "${outDir}" is empty. Please run samrey build first.`,
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

  const analysisData = {
    outDir,
    files: fileEntries,
    totalRawBytes,
    totalGzipBytes
  };

  if (options.json) {
    return {
      success: true,
      message: JSON.stringify(analysisData, null, 2),
      exitCode: 0,
      data: analysisData
    };
  }

  const report = [
    `  ▲ Samrey Build Bundle Analysis`,
    `  ➜ Output Directory: ${outDir} (${fileEntries.length} files)`,
    `  ➜ File Breakdown:`,
    ...fileEntries.map((f) => `    - ${f.path}: ${formatSize(f.rawBytes)} (gzip: ${formatSize(f.gzipBytes)})`),
    `  ➜ Total Bundle Size: ${formatSize(totalRawBytes)} (gzip: ${formatSize(totalGzipBytes)})`,
    `  ✓ Analysis complete.`
  ].join('\n');

  return {
    success: true,
    message: report,
    exitCode: 0,
    data: analysisData
  };
}
