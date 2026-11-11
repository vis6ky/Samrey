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

interface ScannedAttr {
  name: string;
  lower: string;
  value: string;
  isJsxExpr: boolean;
  offset: number;
}

interface ScannedOpeningTag {
  tag: string;
  offset: number;
  endOffset: number;
  selfClosing: boolean;
  attrs: ScannedAttr[];
}

function skipJsString(source: string, pos: number, end: number, quote: string): number {
  pos++; // skip opening quote
  while (pos < end) {
    const ch = source[pos]!;
    if (ch === '\\') {
      pos += 2;
      continue;
    }
    pos++;
    if (ch === quote) break;
  }
  return pos;
}

function skipJsTemplateLiteral(source: string, pos: number, end: number): number {
  pos++; // skip opening backtick
  while (pos < end) {
    const ch = source[pos]!;
    if (ch === '\\') {
      pos += 2;
      continue;
    }
    if (ch === '$' && source[pos + 1] === '{') {
      pos = skipBalancedBraces(source, pos + 1, end);
      continue;
    }
    pos++;
    if (ch === '`') break;
  }
  return pos;
}

function skipBalancedBraces(source: string, pos: number, end: number): number {
  let depth = 0;
  while (pos < end) {
    const ch = source[pos]!;
    if (ch === '"' || ch === "'") {
      pos = skipJsString(source, pos, end, ch);
      continue;
    }
    if (ch === '`') {
      pos = skipJsTemplateLiteral(source, pos, end);
      continue;
    }
    if (ch === '/' && source[pos + 1] === '/') {
      const nl = source.indexOf('\n', pos + 2);
      pos = nl === -1 ? end : nl + 1;
      continue;
    }
    if (ch === '/' && source[pos + 1] === '*') {
      const close = source.indexOf('*/', pos + 2);
      pos = close === -1 ? end : close + 2;
      continue;
    }
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) return pos + 1;
    }
    pos++;
  }
  return end;
}

/**
 * Scans HTML/JSX opening tags with balanced brace, quote, and template-literal
 * awareness so nested expressions and `>` inside attributes never split tags.
 */
function scanOpeningTags(source: string): ScannedOpeningTag[] {
  const tags: ScannedOpeningTag[] = [];
  const len = source.length;
  let i = 0;

  while (i < len) {
    const lt = source.indexOf('<', i);
    if (lt === -1) break;

    const firstChar = source[lt + 1];
    if (!firstChar || !/[a-zA-Z]/.test(firstChar)) {
      i = lt + 1;
      continue;
    }

    let nameEnd = lt + 2;
    while (nameEnd < len && /[a-zA-Z0-9-]/.test(source[nameEnd]!)) {
      nameEnd++;
    }

    const boundary = source[nameEnd];
    if (!boundary || !/[\s/>]/.test(boundary)) {
      i = lt + 1;
      continue;
    }

    const tag = source.slice(lt + 1, nameEnd).toLowerCase();
    const attrs: ScannedAttr[] = [];
    let pos = nameEnd;
    let selfClosing = false;
    let abortedAt: number | null = null;
    let closedAt = -1;

    while (pos < len) {
      while (pos < len && /\s/.test(source[pos]!)) pos++;
      if (pos >= len) break;

      const ch = source[pos]!;
      if (ch === '>') {
        closedAt = pos + 1;
        break;
      }
      if (ch === '/' && source[pos + 1] === '>') {
        selfClosing = true;
        closedAt = pos + 2;
        break;
      }
      if (ch === '<') {
        abortedAt = pos;
        break;
      }
      if (ch === '{') {
        pos = skipBalancedBraces(source, pos, len);
        continue;
      }

      if (/[a-zA-Z_:]/.test(ch)) {
        const attrStart = pos;
        pos++;
        while (pos < len && /[a-zA-Z0-9_.:-]/.test(source[pos]!)) pos++;
        const attrName = source.slice(attrStart, pos);

        let lookahead = pos;
        while (lookahead < len && /\s/.test(source[lookahead]!)) lookahead++;

        let value = '';
        let isJsxExpr = false;

        if (source[lookahead] === '=') {
          pos = lookahead + 1;
          while (pos < len && /\s/.test(source[pos]!)) pos++;

          const valCh = source[pos];
          if (valCh === '"' || valCh === "'") {
            const closeQ = source.indexOf(valCh, pos + 1);
            if (closeQ === -1) {
              value = source.slice(pos + 1);
              pos = len;
            } else {
              value = source.slice(pos + 1, closeQ);
              pos = closeQ + 1;
            }
          } else if (valCh === '{') {
            const closeBrace = skipBalancedBraces(source, pos, len);
            value = source.slice(pos + 1, Math.max(pos + 1, closeBrace - 1));
            isJsxExpr = true;
            pos = closeBrace;
          } else {
            const valStart = pos;
            while (
              pos < len &&
              !/[\s><]/.test(source[pos]!) &&
              !(source[pos] === '/' && source[pos + 1] === '>')
            ) {
              pos++;
            }
            value = source.slice(valStart, pos);
          }
        }

        attrs.push({
          name: attrName,
          lower: attrName.toLowerCase(),
          value,
          isJsxExpr,
          offset: attrStart
        });
        continue;
      }

      pos++;
    }

    if (abortedAt !== null) {
      i = abortedAt;
      continue;
    }
    if (closedAt === -1) {
      i = lt + 1;
      continue;
    }

    tags.push({
      tag,
      offset: lt,
      endOffset: closedAt,
      selfClosing,
      attrs
    });
    i = closedAt;
  }

  return tags;
}

export function auditSource(source: string, filename = 'Component.tsx'): AuditReport {
  const messages: string[] = [];
  const openingTags = scanOpeningTags(source);

  for (const tagInfo of openingTags) {
    const { tag, offset: tagOffset, endOffset, selfClosing, attrs } = tagInfo;
    const tagLine = getLineNumber(source, tagOffset);
    const parsedAttrs: Record<string, string> = {};

    for (const attr of attrs) {
      const { name: attrName, lower: attrLower, value: rawVal, isJsxExpr, offset: attrOffset } = attr;
      const attrLine = getLineNumber(source, attrOffset);

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

    if (tag === 'script') {
      let body = '';
      if (!selfClosing) {
        const closeMatch = /<\/script\b[^>]*>/i.exec(source.slice(endOffset));
        if (closeMatch) {
          body = source.slice(endOffset, endOffset + closeMatch.index);
        }
      }

      const srcAttr = attrs.find((a) => a.lower === 'src');
      const srcVal = srcAttr
        ? (srcAttr.isJsxExpr ? `{${srcAttr.value}}` : srcAttr.value).trim()
        : null;

      if (!srcVal) {
        messages.push(`${filename}:${tagLine}: Inline <script> tag without src attribute violates CSP.`);
      } else if (
        !isDynamicTemplateValue(srcVal) &&
        sanitizeUri(srcVal, { allowProtocolRelative: true }) === 'about:blank' &&
        !/^about:blank$/i.test(srcVal)
      ) {
        const schemeLabel = detectUriSchemeLabel(srcVal);
        messages.push(`${filename}:${tagLine}: Insecure "${schemeLabel}" URI in <script src> violates CSP.`);
      } else if (body.trim().length > 0) {
        messages.push(`${filename}:${tagLine}: <script> tag with src attribute must not contain inline code. Violates CSP.`);
      }
    }
  }

  return {
    filesScanned: 1,
    violationsCount: messages.length,
    messages
  };
}

export const runSamreyAudit = auditSource;
