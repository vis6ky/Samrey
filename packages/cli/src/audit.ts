/**
 * @license Apache-2.0
 * @samrey/cli - Security & Accessibility Static Auditor
 */

import { lintA11y } from '@samrey/compiler';

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

  // Scan for javascript: URIs in attributes
  if (/(?:href|src|action|formaction)\s*=\s*['"]?\s*javascript:/i.test(source)) {
    messages.push(`${filename}: Insecure "javascript:" URI detected in template attribute.`);
  }

  // Scan for inline event handlers (onclick, onload, onerror, etc.)
  if (/[\s/](?:on[a-zA-Z0-9_-]+)\s*=\s*['"][^'"]*['"]/i.test(source)) {
    messages.push(`${filename}: Inline event handler attribute detected (violates CSP strict policy).`);
  }

  // Scan for srcdoc
  if (/[\s/]srcdoc\s*=/i.test(source)) {
    messages.push(`${filename}: Dangerous "srcdoc" attribute detected.`);
  }

  return {
    filesScanned: 1,
    violationsCount: messages.length,
    messages
  };
}

export const runSamreyAudit = auditSource;
