/**
 * @license Apache-2.0
 * @samrey/cli - Fast Type & Framework Idiom Checker
 */

import * as path from 'node:path';
import { analyzeProject } from '@samrey/ai';
import { CommandResult } from './create.js';

export interface CheckOptions {
  cwd: string;
  json?: boolean;
}

export function runCheckCommand(options: CheckOptions): CommandResult {
  const root = path.resolve(options.cwd);
  const analysis = analyzeProject(root);

  if (options.json) {
    const jsonOutput = {
      status: analysis.issues.some(i => i.severity === 'error') ? 'failed' : 'passed',
      healthScore: analysis.healthScore,
      totalIssues: analysis.issues.length,
      errorsCount: analysis.issues.filter(i => i.severity === 'error').length,
      warningsCount: analysis.issues.filter(i => i.severity === 'warning').length,
      issues: analysis.issues,
      recommendations: analysis.recommendations
    };
    return {
      success: jsonOutput.errorsCount === 0,
      message: JSON.stringify(jsonOutput, null, 2),
      exitCode: jsonOutput.errorsCount === 0 ? 0 : 1
    };
  }

  const errors = analysis.issues.filter(i => i.severity === 'error');
  const warnings = analysis.issues.filter(i => i.severity === 'warning');

  let output = `\n▲ Samrey Project Check: ${analysis.project.projectName} (Health Score: ${analysis.healthScore}/100)\n`;

  if (analysis.issues.length === 0) {
    output += `  ✅ All files passed framework validation with 0 issues.\n`;
    return { success: true, message: output, exitCode: 0 };
  }

  for (const issue of analysis.issues) {
    const icon = issue.severity === 'error' ? '❌' : '⚠️';
    output += `\n  ${icon} [${issue.severity.toUpperCase()}] ${issue.filePath}:${issue.line}\n`;
    output += `     ${issue.message}\n`;
    output += `     Snippet: ${issue.codeSnippet}\n`;
    output += `     Fix:     ${issue.suggestedFix}\n`;
  }

  output += `\nFound ${errors.length} error(s), ${warnings.length} warning(s).\n`;
  return {
    success: errors.length === 0,
    message: output,
    exitCode: errors.length === 0 ? 0 : 1
  };
}
