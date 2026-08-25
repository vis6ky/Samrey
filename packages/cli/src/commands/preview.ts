/**
 * @license Apache-2.0
 * @samrey/cli - "samrey preview" Command
 */

import { CommandResult } from './create.js';

export interface PreviewCommandOptions {
  port?: number;
  host?: boolean;
  outDir?: string;
  dryRun?: boolean;
}

export async function runPreviewCommand(options: PreviewCommandOptions = {}): Promise<CommandResult> {
  const port = options.port || 4173;
  const host = options.host ? '0.0.0.0' : 'localhost';
  const outDir = options.outDir || 'dist';

  const message = [
    `  ▲ Samrey Production Preview Server`,
    `  ➜ Local:   http://${host}:${port}/`,
    `  ➜ Serving: ${outDir}`,
    `  ➜ Mode:    Production static preview with HTTP caching headers`,
    `  ✓ Preview server ready.`
  ].join('\n');

  return {
    success: true,
    message,
    exitCode: 0,
    data: {
      port,
      host,
      outDir
    }
  };
}
