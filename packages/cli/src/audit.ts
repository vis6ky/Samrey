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

function getLineNumber(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

export function auditSource(source: string, filename = 'Component.tsx'): AuditReport {
  const messages: string[] = [];

  // Scan for img tags without alt
  const imgRegex = /<img\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(source)) !== null) {
    const attrString = match[1] || '';
    if (!attrString.includes('alt=')) {
      const line = getLineNumber(source, match.index);
      messages.push(`${filename}:${line}: <img> tag missing required 'alt' attribute.`);
    }
  }

  // Scan for script tags: only flag inline scripts (no src) or CSP-violating scripts
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>|<script\b([^>]*)\/?>/gi;
  while ((match = scriptRegex.exec(source)) !== null) {
    const attrs = match[1] ?? match[3] ?? '';
    const body = match[2] ?? '';
    const line = getLineNumber(source, match.index);

    const srcMatch = /\bsrc\s*=\s*(?:["']([^"']*)["']|([^\s>]+))/i.exec(attrs);
    const srcVal = srcMatch ? (srcMatch[1] ?? srcMatch[2] ?? '').trim() : null;

    if (!srcVal) {
      messages.push(`${filename}:${line}: Inline <script> tag without src attribute violates CSP.`);
    } else if (srcVal.toLowerCase().startsWith('javascript:')) {
      messages.push(`${filename}:${line}: Insecure "javascript:" URI in <script src> violates CSP.`);
    } else if (body.trim().length > 0) {
      messages.push(`${filename}:${line}: <script> tag with src attribute must not contain inline code. Violates CSP.`);
    }
  }

  // Scan for javascript: URIs in attributes
  const jsUriRegex = /(?:href|src|action|formaction)\s*=\s*['"]?\s*javascript:/gi;
  while ((match = jsUriRegex.exec(source)) !== null) {
    const line = getLineNumber(source, match.index);
    messages.push(`${filename}:${line}: Insecure "javascript:" URI detected in template attribute.`);
  }

  // Scan for inline event handlers (onclick, onload, onerror, etc.)
  const onHandlerRegex = /(?:^|[\s/])(?:on[a-zA-Z0-9_-]+)\s*=\s*['"][^'"]*['"]/gi;
  while ((match = onHandlerRegex.exec(source)) !== null) {
    const line = getLineNumber(source, match.index);
    messages.push(`${filename}:${line}: Inline event handler attribute detected (violates CSP strict policy).`);
  }

  // Scan for srcdoc
  const srcdocRegex = /(?:^|[\s/])srcdoc\s*=/gi;
  while ((match = srcdocRegex.exec(source)) !== null) {
    const line = getLineNumber(source, match.index);
    messages.push(`${filename}:${line}: Dangerous "srcdoc" attribute detected.`);
  }

  return {
    filesScanned: 1,
    violationsCount: messages.length,
    messages
  };
}

export const runSamreyAudit = auditSource;
