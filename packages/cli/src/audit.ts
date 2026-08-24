/**
 * @license Apache-2.0
 * @gati/cli - Security & Accessibility Static Auditor
 */

import { lintA11y } from '@gati/compiler';

export interface AuditReport {
  filesScanned: number;
  violationsCount: number;
  messages: string[];
}

export function auditSource(source: string, filename = 'Component.tsx'): AuditReport {
  const messages: string[] = [];

  // Simple scan for img tags without alt
  const imgRegex = /<img\b([^>]*)>/gi;
  let match;
  while ((match = imgRegex.exec(source)) !== null) {
    const attrString = match[1] || '';
    if (!attrString.includes('alt=')) {
      messages.push(`${filename}: <img> tag missing required 'alt' attribute.`);
    }
  }

  // Scan for inline script tags
  if (source.includes('<script')) {
    messages.push(`${filename}: Explicit <script> tag found in template. Violates CSP.`);
  }

  return {
    filesScanned: 1,
    violationsCount: messages.length,
    messages
  };
}

export const runGatiAudit = auditSource;
