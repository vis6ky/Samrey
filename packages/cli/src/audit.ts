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

const KNOWN_DOM_EVENT_ATTRIBUTES = new Set<string>([
  'onabort', 'onafterprint', 'onanimationcancel', 'onanimationend', 'onanimationiteration',
  'onanimationstart', 'onauxclick', 'onbeforeinput', 'onbeforematch', 'onbeforeprint',
  'onbeforetoggle', 'onbeforeunload', 'onbegin', 'onblur', 'oncancel', 'oncanplay',
  'oncanplaythrough', 'onchange', 'onclick', 'onclose', 'oncommand',
  'oncontentvisibilityautostatechange', 'oncontextlost', 'oncontextmenu', 'oncontextrestored',
  'oncopy', 'oncuechange', 'oncut', 'ondblclick', 'ondrag', 'ondragend', 'ondragenter',
  'ondragleave', 'ondragover', 'ondragstart', 'ondrop', 'ondurationchange', 'onemptied',
  'onend', 'onended', 'onerror', 'onfocus', 'onfocusin', 'onfocusout', 'onformdata',
  'onfullscreenchange', 'onfullscreenerror', 'ongotpointercapture', 'onhashchange',
  'oninput', 'oninvalid', 'onkeydown', 'onkeypress', 'onkeyup', 'onlanguagechange',
  'onload', 'onloadeddata', 'onloadedmetadata', 'onloadstart', 'onlostpointercapture',
  'onmessage', 'onmessageerror', 'onmousedown', 'onmouseenter', 'onmouseleave', 'onmousemove',
  'onmouseout', 'onmouseover', 'onmouseup', 'onmousewheel', 'onoffline', 'ononline',
  'onpagehide', 'onpagereveal', 'onpageshow', 'onpageswap', 'onpaste', 'onpause', 'onplay',
  'onplaying', 'onpointercancel', 'onpointerdown', 'onpointerenter', 'onpointerleave',
  'onpointermove', 'onpointerout', 'onpointerover', 'onpointerrawupdate', 'onpointerup',
  'onpopstate', 'onprogress', 'onratechange', 'onrepeat', 'onreset', 'onresize',
  'onscroll', 'onscrollend', 'onscrollsnapchange', 'onscrollsnapchanging',
  'onsecuritypolicyviolation', 'onseeked', 'onseeking', 'onselect', 'onselectionchange',
  'onselectstart', 'onslotchange', 'onstalled', 'onstorage', 'onsubmit', 'onsuspend',
  'ontimeupdate', 'ontoggle', 'ontouchcancel', 'ontouchend', 'ontouchmove', 'ontouchstart',
  'ontransitioncancel', 'ontransitionend', 'ontransitionrun', 'ontransitionstart',
  'onunhandledrejection', 'onunload', 'onvolumechange', 'onwaiting', 'onwebkitanimationend',
  'onwebkitanimationiteration', 'onwebkitanimationstart', 'onwebkittransitionend', 'onwheel'
]);

const REGEX_PRECEDING_KEYWORDS = new Set<string>([
  'return', 'case', 'throw', 'typeof', 'void', 'delete', 'await', 'else', 'do', 'in', 'of'
]);

function isScriptLikeFile(filename: string): boolean {
  return /\.(?:ts|tsx|js|jsx|mts|cts|mjs|cjs)$/i.test(filename);
}

function isRawHtmlFile(filename: string): boolean {
  return /\.(?:html?|xhtml)$/i.test(filename);
}

function trySkipJsLineComment(source: string, pos: number, len: number): number {
  if (pos > 0 && source[pos - 1] === ':') return -1;
  const lineStart = Math.max(source.lastIndexOf('\n', pos - 1), source.lastIndexOf('\r', pos - 1)) + 1;
  let inQuote: string | null = null;
  for (let k = lineStart; k < pos; k++) {
    const ch = source[k]!;
    if (inQuote) {
      if (ch === '\\') {
        k++;
      } else if (ch === inQuote) {
        inQuote = null;
      }
    } else if (ch === '"' || ch === "'" || ch === '`') {
      inQuote = ch;
    }
  }
  if (inQuote !== null) return -1;
  const nl = source.indexOf('\n', pos + 2);
  return nl === -1 ? len : nl + 1;
}

function trySkipJsRegexLiteral(source: string, pos: number, len: number): number {
  let j = pos - 1;
  while (j >= 0 && (source[j] === ' ' || source[j] === '\t')) {
    j--;
  }
  let canStartRegex = j < 0 || '=([,:?!&|^~;{}\n\r'.includes(source[j]!);
  if (!canStartRegex && /[a-zA-Z]/.test(source[j]!)) {
    let wordStart = j;
    while (wordStart > 0 && /[a-zA-Z0-9_$]/.test(source[wordStart - 1]!)) {
      wordStart--;
    }
    canStartRegex = REGEX_PRECEDING_KEYWORDS.has(source.slice(wordStart, j + 1));
  }
  if (!canStartRegex) return -1;

  let k = pos + 1;
  let inClass = false;
  while (k < len) {
    const ch = source[k]!;
    if (ch === '\n' || ch === '\r') return -1;
    if (ch === '\\') {
      k += 2;
      continue;
    }
    if (ch === '[' && !inClass) {
      inClass = true;
      k++;
      continue;
    }
    if (ch === ']' && inClass) {
      inClass = false;
      k++;
      continue;
    }
    if (ch === '/' && !inClass) {
      k++;
      while (k < len && /[a-zA-Z]/.test(source[k]!)) {
        k++;
      }
      return k;
    }
    k++;
  }
  return -1;
}

/**
 * Scans HTML/JSX opening tags with comment/regex skipping and balanced brace, quote,
 * and template-literal awareness so comments, regexes, and `>` inside attributes
 * never split tags or produce false-positive HTML matches.
 */
function scanOpeningTags(source: string, scriptLike: boolean): ScannedOpeningTag[] {
  const tags: ScannedOpeningTag[] = [];
  const len = source.length;
  let i = 0;

  while (i < len) {
    const ch = source[i]!;

    if (ch === '<') {
      if (source.startsWith('<!--', i)) {
        const endComment = source.indexOf('-->', i + 4);
        i = endComment === -1 ? len : endComment + 3;
        continue;
      }
    } else if (scriptLike && ch === '/') {
      const next = source[i + 1];
      if (next === '/') {
        const skipped = trySkipJsLineComment(source, i, len);
        if (skipped !== -1) {
          i = skipped;
          continue;
        }
      } else if (next === '*') {
        const closeBlock = source.indexOf('*/', i + 2);
        i = closeBlock === -1 ? len : closeBlock + 2;
        continue;
      } else {
        const skippedRegex = trySkipJsRegexLiteral(source, i, len);
        if (skippedRegex !== -1) {
          i = skippedRegex;
          continue;
        }
      }
      i++;
      continue;
    } else {
      i++;
      continue;
    }

    const lt = i;
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
            let qPos = pos + 1;
            let closed = false;
            while (qPos < len) {
              const qc = source[qPos]!;
              if (qc === '\\' && qPos + 1 < len) {
                qPos += 2;
                continue;
              }
              if (qc === valCh) {
                value = source.slice(pos + 1, qPos);
                pos = qPos + 1;
                closed = true;
                break;
              }
              qPos++;
            }
            if (!closed) {
              value = source.slice(pos + 1);
              pos = len;
            }
          } else if (scriptLike && valCh === '\\' && (source[pos + 1] === '"' || source[pos + 1] === "'")) {
            const targetQuote = source[pos + 1]!;
            let qPos = pos + 2;
            let closed = false;
            while (qPos < len) {
              if (source[qPos] === '\\') {
                if (source[qPos + 1] === targetQuote) {
                  value = source.slice(pos + 2, qPos);
                  pos = qPos + 2;
                  closed = true;
                  break;
                }
                if (qPos + 1 < len) {
                  qPos += 2;
                  continue;
                }
              }
              if (source[qPos] === targetQuote) {
                break;
              }
              qPos++;
            }
            if (!closed) {
              value = source.slice(pos + 2, qPos);
              pos = qPos;
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
  const scriptLike = isScriptLikeFile(filename);
  const rawHtml = isRawHtmlFile(filename);
  const openingTags = scanOpeningTags(source, scriptLike);

  for (const tagInfo of openingTags) {
    const { tag, offset: tagOffset, endOffset, selfClosing, attrs } = tagInfo;
    const tagLine = getLineNumber(source, tagOffset);
    const parsedAttrs: Record<string, string> = Object.create(null);

    for (const attr of attrs) {
      const { name: attrName, lower: attrLower, value: rawVal, isJsxExpr, offset: attrOffset } = attr;
      const attrLine = getLineNumber(source, attrOffset);

      if (!(attrLower in parsedAttrs)) {
        parsedAttrs[attrLower] = isJsxExpr ? `{${rawVal}}` : rawVal;
      }

      // Check inline DOM event handlers: allow JSX `{expr}` props in JSX/Samrey files, flag raw HTML `{...}` and static/unquoted handlers
      if (KNOWN_DOM_EVENT_ATTRIBUTES.has(attrLower) && (!isJsxExpr || rawHtml)) {
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
