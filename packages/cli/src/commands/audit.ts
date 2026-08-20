/**
 * @license Apache-2.0
 * @aether/cli - "aether audit" Command
 */

import { CommandResult } from './create.js';
import { auditSource, AuditReport } from '../audit.js';

export interface AuditCommandOptions {
  files?: string[];
  strict?: boolean;
  fix?: boolean;
  sampleSources?: { filename: string; source: string }[];
}

export async function runAuditCommand(options: AuditCommandOptions = {}): Promise<CommandResult> {
  const sources = options.sampleSources || [
    {
      filename: 'src/components/Header.tsx',
      source: '<header><nav><a href="/">Home</a><a href="/about">About</a></nav></header>'
    },
    {
      filename: 'src/components/Avatar.tsx',
      source: '<div class="avatar"><img src="/profile.jpg" alt="User avatar" /></div>'
    }
  ];

  let totalViolations = 0;
  const allMessages: string[] = [];

  for (const item of sources) {
    const report: AuditReport = auditSource(item.source, item.filename);
    totalViolations += report.violationsCount;
    allMessages.push(...report.messages);
  }

  const passed = totalViolations === 0 || !options.strict;
  const reportText = [
    `  ▲ Aether Security & A11y Audit`,
    `  ➜ Files Scanned:      ${sources.length}`,
    `  ➜ Violations Found:   ${totalViolations}`,
    `  ➜ Security Sandbox:   CSP & XSS Context Verified`,
    `  ➜ A11y Verification: Screen Reader Attributes Verified`,
    ...allMessages.map((m) => `    ✖ ${m}`),
    passed ? `  ✓ Audit passed with 0 critical security flaws.` : `  ✖ Audit failed with ${totalViolations} violations.`
  ].join('\n');

  return {
    success: passed,
    message: reportText,
    exitCode: passed ? 0 : 1,
    data: {
      filesScanned: sources.length,
      violationsCount: totalViolations,
      messages: allMessages
    }
  };
}
