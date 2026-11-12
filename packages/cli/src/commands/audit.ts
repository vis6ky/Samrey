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
  json?: boolean;
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

function segmentToRegex(segment: string): RegExp {
  let expr = '^';
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i]!;
    if (ch === '*') expr += '[^/]*';
    else if (ch === '?') expr += '[^/]';
    else if ('.+^${}()|[]\\'.includes(ch)) expr += '\\' + ch;
    else expr += ch;
  }
  expr += '$';
  return new RegExp(expr);
}

function matchSegments(relSegs: string[], patSegs: string[]): boolean {
  const m = patSegs.length;
  const n = relSegs.length;
  const dp: boolean[][] = Array.from({ length: m + 1 }, () => new Array<boolean>(n + 1).fill(false));
  dp[0]![0] = true;

  for (let i = 1; i <= m; i++) {
    const pat = patSegs[i - 1]!;
    if (pat === '**') {
      dp[i]![0] = dp[i - 1]![0]!;
      for (let j = 1; j <= n; j++) {
        dp[i]![j] = dp[i - 1]![j]! || dp[i]![j - 1]!;
      }
    } else {
      const re = segmentToRegex(pat);
      for (let j = 1; j <= n; j++) {
        if (dp[i - 1]![j - 1]! && re.test(relSegs[j - 1]!)) {
          dp[i]![j] = true;
        }
      }
    }
  }

  return dp[m]![n]!;
}

function matchesGlob(relPath: string, globPattern: string): boolean {
  const normalized = relPath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+|\/+$/g, '');
  const pattern = globPattern.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+|\/+$/g, '');
  if (!pattern) return false;

  const relSegs = normalized ? normalized.split('/') : [];
  if (!pattern.includes('/')) {
    const segRe = segmentToRegex(pattern);
    return relSegs.some((seg) => segRe.test(seg));
  }

  const rawPatSegs = pattern.split('/');
  const patSegs: string[] = [];
  for (const s of rawPatSegs) {
    if (s === '**' && patSegs[patSegs.length - 1] === '**') continue;
    patSegs.push(s);
  }

  if (matchSegments(relSegs, patSegs)) {
    return true;
  }
  // Ignoring a directory prefix like `src/**` or `src/vendor` also skips files beneath it
  if (patSegs[patSegs.length - 1] !== '**' && relSegs.length > patSegs.length) {
    return matchSegments(relSegs.slice(0, patSegs.length), patSegs);
  }
  return false;
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
  if (options.fix) {
    return {
      success: false,
      message: '[Samrey Audit Error] Automatic "--fix" is not supported because remediating inline scripts, URIs, and alt text safely requires semantic review.',
      exitCode: 1,
      data: {
        filesScanned: 0,
        violationsCount: 0,
        messages: ['Automatic --fix is not supported.']
      }
    };
  }

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

  const payload = {
    filesScanned: discoveredFiles.length,
    violationsCount: totalViolations,
    messages: allMessages
  };

  return {
    success: passed,
    message: options.json ? JSON.stringify({ success: passed, ...payload }, null, 2) : reportText,
    exitCode: passed ? 0 : 1,
    data: payload
  };
}
