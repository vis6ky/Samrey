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
  ignore?: string[];
}

const AUDIT_FILE_REGEX = /\.(ts|tsx|js|jsx|samrey|html)$/;
const DEFAULT_IGNORE_DIRS = new Set([
  'node_modules',
  'dist',
  'bin',
  '.git',
  'coverage',
  '.cache',
  'test',
  'tests',
  'fixtures'
]);

function isTestOrMinFile(filename: string): boolean {
  if (filename.endsWith('.min.js')) return true;
  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename)) return true;
  return false;
}

function matchesGlob(relPath: string, globPattern: string): boolean {
  const normalized = relPath.replace(/\\/g, '/');
  const pattern = globPattern.replace(/\\/g, '/');
  // Simple glob matching supporting *, **, and exact substrings
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/(?<!\.)\*/g, '[^/]*');
  return new RegExp(`(^|/)${escaped}($|/)`).test(normalized) || new RegExp(`^${escaped}$`).test(normalized);
}

function findAuditFiles(dir: string, baseDir = dir, userIgnores: string[] = []): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    if (DEFAULT_IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const relFromBase = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (userIgnores.some((ig) => matchesGlob(relFromBase, ig))) continue;

    if (entry.isDirectory()) {
      results.push(...findAuditFiles(fullPath, baseDir, userIgnores));
    } else if (entry.isFile() && AUDIT_FILE_REGEX.test(entry.name)) {
      if (isTestOrMinFile(entry.name)) continue;
      results.push(relFromBase);
    }
  }
  return results;
}

export async function runAuditCommand(options: AuditCommandOptions = {}): Promise<CommandResult> {
  const projectRoot = options.cwd || process.cwd();
  const userIgnores = options.ignore || [];

  const explicitFiles = options.files && options.files.length > 0 ? options.files : null;
  const discoveredFiles = explicitFiles
    ? explicitFiles.filter((f) => !userIgnores.some((ig) => matchesGlob(f, ig)))
    : findAuditFiles(projectRoot, projectRoot, userIgnores);

  if (discoveredFiles.length === 0) {
    const warningMsg = '  ⚠ Warning: 0 files scanned for audit.';
    const strictFail = Boolean(options.strict);
    return {
      success: !strictFail,
      message: [
        warningMsg,
        strictFail
          ? '  ✖ Audit failed: --strict requires at least one file to be scanned.'
          : '  ✓ Audit completed with 0 files scanned.'
      ].join('\n'),
      exitCode: strictFail ? 1 : 0,
      data: {
        filesScanned: 0,
        violationsCount: 0,
        messages: [warningMsg]
      }
    };
  }

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
