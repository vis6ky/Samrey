/**
 * @license Apache-2.0
 * @samrey/cli - "aether dev" Command
 */

import { CommandResult } from './create.js';

export interface DevCommandOptions {
  port?: number;
  host?: string | boolean;
  open?: boolean;
  dryRun?: boolean;
}

export async function runDevCommand(options: DevCommandOptions = {}): Promise<CommandResult> {
  const port = options.port || 3000;
  const host = options.host ? (typeof options.host === 'string' ? options.host : '0.0.0.0') : 'localhost';

  if (port < 1 || port > 65535) {
    return {
      success: false,
      message: `[Samrey Dev Error] Invalid port ${port}. Port must be between 1 and 65535.`,
      exitCode: 1
    };
  }

  const devUrl = `http://${host}:${port}`;
  const banner = [
    `  ▲ Samrey Development Server`,
    `  ➜ Local:   ${devUrl}/`,
    `  ➜ DevTools: Enabled (Bridge active on window.__AETHER_DEVTOOLS_BRIDGE__)`,
    `  ➜ HMR:     Fine-grained reactive signal updates enabled`,
    `  ➜ Mode:    Development (Diagnostics & runtime assertions active)`
  ].join('\n');

  if (options.dryRun) {
    return {
      success: true,
      message: `[Dry Run] Dev server configuration validated for port ${port}`,
      exitCode: 0,
      data: { port, host, devUrl }
    };
  }

  return {
    success: true,
    message: banner,
    exitCode: 0,
    data: { port, host, devUrl }
  };
}
