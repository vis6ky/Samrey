/**
 * @license Apache-2.0
 * @samrey/cli - Security & Accessibility Static Auditor
 */

import { lintA11y } from '@samrey/compiler';
import {
  URL_ATTRIBUTES,
  SRCSET_ATTRIBUTES,
  decodeHtmlEntities,
  sanitizeUri,
  sanitizeSrcset
} from '@samrey/security';

export interface AuditReport {
  filesScanned: number;
  violationsCount: number;
  messages: string[];
}

function getLineNumber(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

function isDynamicTemplateValue(val: string): boolean {
  const trimmed = val.trim();
  return (
    trimmed.startsWith('{') ||
    trimmed.includes('${') ||
    trimmed.includes('{{')
  );
}

function detectUriSchemeLabel(rawVal: string): string {
  const decoded = decodeHtmlEntities(rawVal).replace(/[\u0000-\u0020]+/g, '');
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*:)/.exec(decoded);
  return schemeMatch ? schemeMatch[1]!.toLowerCase() : 'unsafe';
}

export function auditSource(source: string, filename = 'Component.tsx'): AuditReport {
  const messages: string[] = [];
  let match: RegExpExecArray | null;

  // Scan HTML/JSX opening tags for a11y parity, inline handlers, srcdoc, and dangerous URLs/srcset
  const tagRegex = /<([a-zA-Z][a-zA-Z0-9-]*)\b((?:[^>"'{}]|"[^"]*"|'[^']*'|\{[^}]*\})*)>/g;
  const attrRegex = /\b([a-zA-Z_:][a-zA-Z0-9_.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\}|([^\s>"'`/]+)))?/g;

  while ((match = tagRegex.exec(source)) !== null) {
    const tag = match[1]!.toLowerCase();
    const attrBlock = match[2] || '';
    const tagOffset = match.index + 1 + match[1]!.length;
    const tagLine = getLineNumber(source, match.index);

    const parsedAttrs: Record<string, string> = {};
    attrRegex.lastIndex = 0;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRegex.exec(attrBlock)) !== null) {
      const attrName = attrMatch[1]!;
      const attrLower = attrName.toLowerCase();
      const attrLine = getLineNumber(source, tagOffset + attrMatch.index);

      const isJsxExpr = attrMatch[4] !== undefined;
      const rawVal = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? attrMatch[5] ?? '';

      if (!(attrLower in parsedAttrs)) {
        parsedAttrs[attrLower] = isJsxExpr ? `{${rawVal}}` : rawVal;
      }

      // Check inline DOM event handlers (allow JSX expression props when explicit `{expr}`, flag string/unquoted handlers)
      if (attrLower.startsWith('on') && attrLower.length > 2 && !isJsxExpr) {
        messages.push(
          `${filename}:${attrLine}: Inline event handler attribute "${attrName}" detected (violates CSP strict policy).`
        );
      }

      // Check srcdoc attribute
      if (attrLower === 'srcdoc') {
        messages.push(`${filename}:${attrLine}: Dangerous "srcdoc" attribute detected.`);
      }

      // Check all URL attributes from @samrey/security (script[src] is checked below with inline-body rules)
      if (
        URL_ATTRIBUTES.has(attrLower) &&
        !(tag === 'script' && attrLower === 'src') &&
        !isJsxExpr &&
        !isDynamicTemplateValue(rawVal)
      ) {
        const trimmed = rawVal.trim();
        if (
          trimmed.length > 0 &&
          sanitizeUri(trimmed, {
            allowProtocolRelative: true,
            allowImageDataUri: tag === 'img' || tag === 'source'
          }) === 'about:blank' &&
          !/^about:blank$/i.test(trimmed)
        ) {
          const schemeLabel = detectUriSchemeLabel(trimmed);
          messages.push(
            `${filename}:${attrLine}: Insecure "${schemeLabel}" URI detected in "${attrLower}" attribute.`
          );
        }
      }

      // Check srcset / imagesrcset compound attributes via @samrey/security
      if (
        SRCSET_ATTRIBUTES.has(attrLower) &&
        !isJsxExpr &&
        !isDynamicTemplateValue(rawVal)
      ) {
        const trimmed = rawVal.trim();
        if (trimmed.length > 0) {
          const sanitized = sanitizeSrcset(trimmed);
          if (/\babout:blank\b/i.test(sanitized) && !/\babout:blank\b/i.test(trimmed)) {
            messages.push(
              `${filename}:${attrLine}: Insecure URI detected in "${attrLower}" attribute (blocked scheme).`
            );
          }
        }
      }
    }

    if (tag === 'img' || tag === 'a') {
      const a11yWarnings = lintA11y(tag, parsedAttrs);
      for (const warning of a11yWarnings) {
        messages.push(`${filename}:${tagLine}: ${warning}`);
      }
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
    } else if (
      !isDynamicTemplateValue(srcVal) &&
      sanitizeUri(srcVal, { allowProtocolRelative: true }) === 'about:blank' &&
      !/^about:blank$/i.test(srcVal)
    ) {
      const schemeLabel = detectUriSchemeLabel(srcVal);
      messages.push(`${filename}:${line}: Insecure "${schemeLabel}" URI in <script src> violates CSP.`);
    } else if (body.trim().length > 0) {
      messages.push(`${filename}:${line}: <script> tag with src attribute must not contain inline code. Violates CSP.`);
    }
  }

  return {
    filesScanned: 1,
    violationsCount: messages.length,
    messages
  };
}

export const runSamreyAudit = auditSource;
