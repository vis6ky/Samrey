/**
 * @license Apache-2.0
 * @samrey/cli - Environment & Framework Health Diagnostic (Doctor)
 */

import * as path from 'node:path';
import { discoverSamreyProject } from '@samrey/ai';
import { CommandResult } from './create.js';

export interface DoctorOptions {
  cwd: string;
  json?: boolean;
}

export function runDoctorCommand(options: DoctorOptions): CommandResult {
  const root = path.resolve(options.cwd);
  const project = discoverSamreyProject(root);

  const nodeVersion = process.versions.node;
  const majorNode = parseInt(nodeVersion.split('.')[0] || '0', 10);
  const nodeSupported = majorNode >= 18;

  const checks = [
    {
      name: 'Node.js Runtime',
      status: nodeSupported ? 'passed' : 'failed',
      message: nodeSupported ? `Node.js v${nodeVersion} is supported (18+)` : `Node.js v${nodeVersion} is unsupported. Please upgrade to 18.18+ or 20+.`
    },
    {
      name: 'Samrey Project Configuration',
      status: project.isSamreyProject ? 'passed' : 'warning',
      message: project.isSamreyProject ? `Found ${project.installedPackages.length} @samrey/* packages (v${project.frameworkVersion})` : 'Not recognized as a Samrey project.'
    },
    {
      name: 'Build Tooling (Vite)',
      status: project.features.compiler ? 'passed' : 'warning',
      message: project.features.compiler ? 'Vite configuration detected' : 'vite.config.ts not found. Build may require manual bundler setup.'
    },
    {
      name: 'AI Agent Specification (AGENTS.md)',
      status: project.configFiles.includes('AGENTS.md') ? 'passed' : 'info',
      message: project.configFiles.includes('AGENTS.md') ? 'AGENTS.md instructions present' : 'AGENTS.md missing. Run "samrey ai init" to configure.'
    }
  ];

  const hasFailed = checks.some(c => c.status === 'failed');

  if (options.json) {
    return {
      success: !hasFailed,
      message: JSON.stringify({
        status: hasFailed ? 'failed' : 'healthy',
        projectRoot: root,
        frameworkVersion: project.frameworkVersion,
        checks
      }, null, 2),
      exitCode: hasFailed ? 1 : 0
    };
  }

  let text = `\n▲ Samrey Doctor Diagnostic: ${project.projectName}\n\n`;
  for (const c of checks) {
    const icon = c.status === 'passed' ? '✅' : c.status === 'failed' ? '❌' : '⚠️';
    text += `  ${icon} ${c.name.padEnd(30, ' ')}: ${c.message}\n`;
  }
  text += `\nSystem status: ${hasFailed ? 'ISSUES DETECTED' : 'HEALTHY'}\n`;

  return {
    success: !hasFailed,
    message: text,
    exitCode: hasFailed ? 1 : 0
  };
}
