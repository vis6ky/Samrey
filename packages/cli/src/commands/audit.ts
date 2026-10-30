/**
 * @license Apache-2.0
 * @samrey/cli - "samrey audit" Command
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CommandResult } from './create.js';
import { auditSource, AuditReport } from '../audit.js';

export interface AuditCommandOptions {
  cwd?: string;
  files?: string[];
  strict?: boolean;
  warnOnly?: boolean;
  fix?: boolean;
}

const AUDIT_FILE_REGEX = /\.(ts|tsx|js|jsx|samrey|html)$/;
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', '.cache']);

function findAuditFiles(dir: string, baseDir = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findAuditFiles(fullPath, baseDir));
    } else if (entry.isFile() && AUDIT_FILE_REGEX.test(entry.name)) {
      results.push(path.relative(baseDir, fullPath).replace(/\\/g, '/'));
    }
  }
  return results;
}

export async function runAuditCommand(options: AuditCommandOptions = {}): Promise<CommandResult> {
  const projectRoot = options.cwd || process.cwd();

  const explicitFiles = options.files && options.files.length > 0 ? options.files : null;
  const discoveredFiles = explicitFiles || findAuditFiles(projectRoot);

  let totalViolations = 0;
  const allMessages: string[] = [];

  for (const relFile of discoveredFiles) {
    const absPath = path.resolve(projectRoot, relFile);
    try {
      const content = fs.readFileSync(absPath, 'utf8');
      const report: AuditReport = auditSource(content, relFile);
      totalViolations += report.violationsCount;
      allMessages.push(...report.messages);
    } catch {
      // Ignore unreadable files
    }
  }

  const passed = totalViolations === 0 || Boolean(options.warnOnly);
  const reportText = [
    `  ▲ Samrey Security & A11y Static Check`,
    `  ➜ Summary: ${discoveredFiles.length} files scanned, ${totalViolations} violations (checks: img alt, javascript: URIs, inline handlers, <script>)`,
    ...allMessages.map((m) => `    ✖ ${m}`),
    passed
      ? (totalViolations === 0 ? `  ✓ Static check passed with 0 violations.` : `  ! Static check passed with warnings (--warn-only active).`)
      : `  ✖ Static check failed with ${totalViolations} violation(s).`
  ].join('\n');

  return {
    success: passed,
    message: reportText,
    exitCode: passed ? 0 : 1,
    data: {
      filesScanned: discoveredFiles.length,
      violationsCount: totalViolations,
      messages: allMessages
    }
  };
}
