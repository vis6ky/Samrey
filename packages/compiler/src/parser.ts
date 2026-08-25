/**
 * @license Apache-2.0
 * @samrey/compiler - High-Performance AST Tokenizer, Parser & Static Hoisting
 */

import {
  ASTRootNode,
  ASTNode,
  ASTElementNode,
  ASTComponentNode,
  ASTTextNode,
  ASTInterpolationNode,
  ASTAttributeNode,
  ASTShowNode,
  ASTForNode,
  SourceLocation,
  Position
} from './ast.js';
import {
  AIRCompilationResult,
  AIRTemplateUnit,
  AIRDynamicTextNode,
  AIRDynamicAttrNode,
  AIRDynamicEventNode,
  AIRControlFlowSlotNode
} from './air.js';
import { classifyBindingContext } from './security-classifier.js';
import { generateModuleCode } from './codegen.js';
import { evaluateConstantExpression } from './static-analyzer.js';
import { SamreyCompilerError, SamreyErrorCode } from './errors.js';
import { escapeHtmlText, escapeHtmlAttribute, sanitizeUri } from '@samrey/security';

// Void elements that do not require closing tags in HTML
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

// Pre-computed ASCII Lookup Tables for Zero-Regex, High-Throughput Tokenization
const TAG_CHAR_TABLE = new Uint8Array(128);
const ATTR_CHAR_TABLE = new Uint8Array(128);
const WHITESPACE_TABLE = new Uint8Array(128);

for (let i = 0; i < 128; i++) {
  const isAlpha = (i >= 65 && i <= 90) || (i >= 97 && i <= 122); // A-Z, a-z
  const isDigit = i >= 48 && i <= 57; // 0-9
  const isTagSpecial = i === 95 || i === 58 || i === 45; // _ : -
  const isAttrSpecial = isTagSpecial || i === 64 || i === 46; // @ .
  const isWhitespace = i === 32 || i === 10 || i === 13 || i === 9 || i === 12; // space, \n, \r, \t, \f

  if (isAlpha || isDigit || isTagSpecial) {
    TAG_CHAR_TABLE[i] = 1;
  }
  if (isAlpha || isDigit || isAttrSpecial) {
    ATTR_CHAR_TABLE[i] = 1;
  }
  if (isWhitespace) {
    WHITESPACE_TABLE[i] = 1;
  }
}

export interface ParseOptions {
  filename?: string;
}

export interface ParseResult {
  ast: ASTRootNode;
  diagnostics: string[];
  errors: SamreyCompilerError[];
}

/**
 * High-Performance Recursive-Descent Parser for Samrey templates/JSX.
 * Optimized with ASCII lookup tables, bulk location tracking, and zero unnecessary allocations.
 */
export class TemplateParser {
  private source: string;
  private length: number;
  private cursor: number = 0;
  private line: number = 1;
  private lineStartOffset: number = 0;
  private filename?: string;
  private diagnostics: string[] = [];
  private errors: SamreyCompilerError[] = [];

  constructor(source: string, options?: ParseOptions) {
    this.source = source;
    this.length = source.length;
    this.filename = options?.filename;
  }

  public parse(): ParseResult {
    const startPos = this.getPosition();
    const children: ASTNode[] = [];

    while (this.cursor < this.length) {
      const node = this.parseNode();
      if (node) {
        children.push(node);
      }
    }

    const endPos = this.getPosition();
    const root: ASTRootNode = {
      type: 'Root',
      children,
      loc: { start: startPos, end: endPos }
    };

    return {
      ast: root,
      diagnostics: this.diagnostics,
      errors: this.errors
    };
  }

  public getStructuredErrors(): SamreyCompilerError[] {
    return this.errors;
  }

  private isEOF(): boolean {
    return this.cursor >= this.length;
  }

  private peekCode(offset = 0): number {
    const idx = this.cursor + offset;
    return idx < this.length ? this.source.charCodeAt(idx) : 0;
  }

  private peekChar(offset = 0): string {
    const idx = this.cursor + offset;
    return idx < this.length ? this.source[idx] : '';
  }

  private peekString(str: string): boolean {
    return this.source.startsWith(str, this.cursor);
  }

  private advance(count = 1): void {
    const target = Math.min(this.cursor + count, this.length);
    while (this.cursor < target) {
      if (this.source.charCodeAt(this.cursor) === 10) {
        this.line++;
        this.lineStartOffset = this.cursor + 1;
      }
      this.cursor++;
    }
  }

  private getPosition(): Position {
    return {
      line: this.line,
      column: this.cursor - this.lineStartOffset + 1,
      offset: this.cursor
    };
  }

  private recordDiagnostic(
    msg: string,
    pos = this.getPosition(),
    code: SamreyErrorCode = 'AETH-102',
    explanation?: string,
    suggestion?: string
  ): void {
    const diagStr = `[${code}] [${pos.line}:${pos.column}] ${msg}`;
    this.diagnostics.push(diagStr);
    this.errors.push(
      new SamreyCompilerError({
        code,
        message: msg,
        source: this.source,
        filename: this.filename,
        line: pos.line,
        column: pos.column,
        offset: pos.offset,
        explanation,
        suggestion
      })
    );
  }

  private parseNode(): ASTNode | null {
    const ch = this.peekCode();

    if (ch === 60) { // '<'
      if (this.peekString('<!--')) {
        this.skipComment();
        return null;
      }
      if (this.peekString('</')) {
        // Unexpected closing tag at root or out-of-order
        const pos = this.getPosition();
        this.recordDiagnostic('Unexpected closing tag', pos);
        this.skipUntilChar(62); // '>'
        if (this.peekCode() === 62) this.advance(1);
        return null;
      }
      return this.parseTagNode();
    }

    if (ch === 123) { // '{'
      return this.parseInterpolation();
    }

    return this.parseText();
  }

  private skipComment(): void {
    this.advance(4); // skip <!--
    const endIdx = this.source.indexOf('-->', this.cursor);
    if (endIdx !== -1) {
      this.advance(endIdx - this.cursor + 3);
    } else {
      this.advance(this.length - this.cursor);
      this.recordDiagnostic('Unclosed HTML comment at EOF');
    }
  }

  private parseTagNode(): ASTNode | null {
    const startPos = this.getPosition();
    this.advance(1); // skip '<'

    // Parse tag/component name
    const nameStart = this.cursor;
    while (this.cursor < this.length) {
      const code = this.source.charCodeAt(this.cursor);
      if (code < 128 && TAG_CHAR_TABLE[code] === 1) {
        this.cursor++;
      } else {
        break;
      }
    }

    const tagName = this.source.slice(nameStart, this.cursor);
    if (!tagName) {
      this.recordDiagnostic('Invalid or missing tag name after "<"', startPos);
      return null;
    }

    // Parse attributes
    const attributes: ASTAttributeNode[] = [];
    while (this.cursor < this.length) {
      this.skipWhitespace();
      const nextCode = this.peekCode();
      if (nextCode === 62 || (nextCode === 47 && this.peekCode(1) === 62)) { // '>' or '/>'
        break;
      }

      const attr = this.parseAttribute();
      if (attr) {
        attributes.push(attr);
      } else {
        this.advance(1);
      }
    }

    let isSelfClosing = false;
    if (this.peekString('/>')) {
      isSelfClosing = true;
      this.advance(2);
    } else if (this.peekCode() === 62) { // '>'
      this.advance(1);
      if (VOID_ELEMENTS.has(tagName.toLowerCase())) {
        isSelfClosing = true;
      }
    } else {
      this.recordDiagnostic(`Unclosed opening tag for <${tagName}>`, startPos);
    }

    // Control Flow Handling: <Show>
    if (tagName === 'Show') {
      return this.parseShowComponent(startPos, attributes, isSelfClosing);
    }

    // Control Flow Handling: <For>
    if (tagName === 'For') {
      return this.parseForComponent(startPos, attributes, isSelfClosing);
    }

    // Component Node (PascalCase / Capitalized tag name)
    const isComponent = tagName.charCodeAt(0) >= 65 && tagName.charCodeAt(0) <= 90;

    const children: ASTNode[] = [];
    let foundClosing = isSelfClosing;
    if (!isSelfClosing) {
      const closingTag = `</${tagName}>`;
      while (this.cursor < this.length) {
        this.skipWhitespace();
        if (this.peekString(closingTag)) {
          this.advance(closingTag.length);
          foundClosing = true;
          break;
        }

        if (this.peekString('</')) {
          // Found closing tag of something else or mismatched tag
          const closePos = this.getPosition();
          const scanStart = this.cursor + 2;
          let scanEnd = scanStart;
          while (scanEnd < this.length && this.source.charCodeAt(scanEnd) !== 62) {
            scanEnd++;
          }
          const foundTag = this.source.slice(scanStart, scanEnd).trim();
          this.recordDiagnostic(
            `Mismatched closing tag </${foundTag}>, expected </${tagName}>`,
            closePos,
            'AETH-104',
            `Encountered closing tag </${foundTag}> but currently inside open element <${tagName}>.`,
            `Close <${tagName}> with </${tagName}> or ensure tags are not interleaved.`
          );
          this.advance(scanEnd - this.cursor + (this.source.charCodeAt(scanEnd) === 62 ? 1 : 0));
          break;
        }

        const child = this.parseNode();
        if (child) {
          children.push(child);
        }
      }

      if (!foundClosing && this.cursor >= this.length) {
        this.recordDiagnostic(
          `Unclosed <${tagName}> tag, expected </${tagName}>`,
          startPos,
          'AETH-101',
          `The element <${tagName}> was never closed before the end of the template.`,
          `Add closing tag </${tagName}> or make it self-closing with <${tagName} />.`
        );
      }
    }

    const endPos = this.getPosition();
    const loc: SourceLocation = { start: startPos, end: endPos };

    if (isComponent) {
      return {
        type: 'Component',
        name: tagName,
        props: attributes,
        children,
        isSelfClosing,
        loc
      };
    }

    return {
      type: 'Element',
      tag: tagName,
      attributes,
      children,
      isSelfClosing,
      loc
    };
  }

  private parseShowComponent(
    startPos: Position,
    attributes: ASTAttributeNode[],
    isSelfClosing: boolean
  ): ASTShowNode {
    let whenExpr = '() => false';
    let fallbackNodes: ASTNode[] | undefined;
    let fallbackExpr: string | undefined;

    let hasWhen = false;
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (attr.name === 'when') {
        hasWhen = true;
        whenExpr = attr.expression || (attr.value ? `() => (${attr.value})` : '() => false');
      } else if (attr.name === 'fallback') {
        if (attr.isDynamic && attr.expression) {
          fallbackExpr = attr.expression;
        } else if (attr.value) {
          fallbackNodes = [
            {
              type: 'Text',
              value: attr.value,
              loc: attr.loc
            }
          ];
        }
      }
    }

    if (!hasWhen) {
      this.recordDiagnostic(
        '<Show> component is missing required "when" prop',
        startPos,
        'AETH-103',
        '<Show> requires a "when" conditional expression to evaluate whether to render its children.',
        'Add when={...} to <Show>, e.g. <Show when={isLoggedIn()}>'
      );
    }

    const children: ASTNode[] = [];
    if (!isSelfClosing) {
      const closingTag = '</Show>';
      while (this.cursor < this.length && !this.peekString(closingTag)) {
        const child = this.parseNode();
        if (child) children.push(child);
      }
      if (this.peekString(closingTag)) {
        this.advance(closingTag.length);
      } else {
        this.recordDiagnostic(
          'Unclosed <Show> component tag',
          startPos,
          'AETH-101',
          '<Show> component was opened but not closed before the end of the template.',
          'Add </Show> to close the component.'
        );
      }
    }

    const endPos = this.getPosition();
    return {
      type: 'Show',
      when: whenExpr,
      fallback: fallbackNodes,
      fallbackExpression: fallbackExpr,
      children,
      loc: { start: startPos, end: endPos }
    };
  }

  private parseForComponent(
    startPos: Position,
    attributes: ASTAttributeNode[],
    isSelfClosing: boolean
  ): ASTForNode {
    let eachExpr = '() => []';
    let keyExpr: string | undefined;
    let fallbackNodes: ASTNode[] | undefined;
    let fallbackExpr: string | undefined;
    let hasEach = false;

    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (attr.name === 'each') {
        hasEach = true;
        eachExpr = attr.expression || (attr.value ? `() => (${attr.value})` : '() => []');
      } else if (attr.name === 'key') {
        keyExpr = attr.expression || attr.value || undefined;
      } else if (attr.name === 'fallback') {
        if (attr.isDynamic && attr.expression) {
          fallbackExpr = attr.expression;
        } else if (attr.value) {
          fallbackNodes = [{ type: 'Text', value: attr.value, loc: attr.loc }];
        }
      }
    }

    if (!hasEach) {
      this.recordDiagnostic(
        '<For> component is missing required "each" prop',
        startPos,
        'AETH-103',
        '<For> requires an "each" array or reactive accessor to iterate over.',
        'Add each={...} to <For>, e.g. <For each={users()} key="id">'
      );
    }

    const children: ASTNode[] = [];
    if (!isSelfClosing) {
      const closingTag = '</For>';
      while (this.cursor < this.length && !this.peekString(closingTag)) {
        const child = this.parseNode();
        if (child) children.push(child);
      }
      if (this.peekString(closingTag)) {
        this.advance(closingTag.length);
      } else {
        this.recordDiagnostic(
          'Unclosed <For> component tag',
          startPos,
          'AETH-101',
          '<For> component was opened but not closed before the end of the template.',
          'Add </For> to close the component.'
        );
      }
    }

    const endPos = this.getPosition();
    return {
      type: 'For',
      each: eachExpr,
      key: keyExpr,
      fallback: fallbackNodes,
      fallbackExpression: fallbackExpr,
      children,
      loc: { start: startPos, end: endPos }
    };
  }

  private parseAttribute(): ASTAttributeNode | null {
    this.skipWhitespace();
    const startPos = this.getPosition();

    // Parse attribute name
    const nameStart = this.cursor;
    while (this.cursor < this.length) {
      const code = this.source.charCodeAt(this.cursor);
      if (code < 128 && ATTR_CHAR_TABLE[code] === 1) {
        this.cursor++;
      } else {
        break;
      }
    }

    const name = this.source.slice(nameStart, this.cursor);
    if (!name) return null;

    const isEvent = name.charCodeAt(0) === 64 || (name.length > 2 && name.startsWith('on') && name.charCodeAt(2) >= 65 && name.charCodeAt(2) <= 90);
    const eventName = isEvent
      ? (name.charCodeAt(0) === 64 ? name.slice(1) : name.slice(2).toLowerCase())
      : undefined;

    this.skipWhitespace();

    let value: string | null = null;
    let isDynamic = false;
    let expression: string | undefined;

    if (this.peekCode() === 61) { // '='
      this.advance(1); // skip '='
      this.skipWhitespace();

      const valCode = this.peekCode();
      if (valCode === 123) { // '{'
        // Dynamic expression attribute: attr={expr}
        isDynamic = true;
        expression = this.extractBalancedCurly();
      } else if (valCode === 34 || valCode === 39) { // '"' or "'"
        const quote = this.peekChar();
        this.advance(1);
        const quoteIdx = this.source.indexOf(quote, this.cursor);
        if (quoteIdx !== -1) {
          value = this.source.slice(this.cursor, quoteIdx);
          this.advance(quoteIdx - this.cursor + 1);
        } else {
          value = this.source.slice(this.cursor);
          this.advance(this.length - this.cursor);
          this.recordDiagnostic(
            `Unterminated attribute string literal for "${name}"`,
            startPos,
            'AETH-105',
            `Attribute "${name}" has an opening quote but no matching closing quote.`,
            'Add a matching closing quote to terminate the attribute value.'
          );
        }
      } else {
        // Unquoted attribute value
        const unquotedStart = this.cursor;
        while (this.cursor < this.length) {
          const c = this.source.charCodeAt(this.cursor);
          if ((c < 128 && WHITESPACE_TABLE[c] === 1) || c === 62) { // whitespace or '>'
            break;
          }
          this.cursor++;
        }
        value = this.source.slice(unquotedStart, this.cursor);
      }
    } else {
      // Boolean attribute (e.g. disabled, checked)
      value = 'true';
    }

    const endPos = this.getPosition();
    const secContext = isEvent
      ? 'safe-attr'
      : classifyBindingContext('attr', name);

    return {
      type: 'Attribute',
      name,
      value,
      isDynamic,
      isEvent,
      eventName,
      expression,
      securityContext: secContext,
      loc: { start: startPos, end: endPos }
    };
  }

  private parseInterpolation(): ASTInterpolationNode {
    const startPos = this.getPosition();
    const expression = this.extractBalancedCurly();
    const endPos = this.getPosition();

    return {
      type: 'Interpolation',
      expression,
      securityContext: classifyBindingContext('text'),
      loc: { start: startPos, end: endPos }
    };
  }

  private extractBalancedCurly(): string {
    if (this.peekCode() !== 123) return ''; // '{'
    this.advance(1); // skip opening '{'

    let depth = 1;
    const startOffset = this.cursor;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inTemplateQuote = false;

    while (this.cursor < this.length) {
      const code = this.source.charCodeAt(this.cursor);

      if (code === 92 && (inSingleQuote || inDoubleQuote || inTemplateQuote)) { // '\'
        this.cursor += 2; // skip escape and escaped char
        continue;
      }

      if (code === 39 && !inDoubleQuote && !inTemplateQuote) { // "'"
        inSingleQuote = !inSingleQuote;
      } else if (code === 34 && !inSingleQuote && !inTemplateQuote) { // '"'
        inDoubleQuote = !inDoubleQuote;
      } else if (code === 96 && !inSingleQuote && !inDoubleQuote) { // '`'
        inTemplateQuote = !inTemplateQuote;
      } else if (!inSingleQuote && !inDoubleQuote && !inTemplateQuote) {
        if (code === 123) { // '{'
          depth++;
        } else if (code === 125) { // '}'
          depth--;
          if (depth === 0) {
            const rawContent = this.source.slice(startOffset, this.cursor);
            this.advance(1); // skip closing '}'
            return rawContent.trim();
          }
        }
      }

      if (code === 10) {
        this.line++;
        this.lineStartOffset = this.cursor + 1;
      }
      this.cursor++;
    }

    this.recordDiagnostic(
      'Unterminated interpolation expression, missing "}"',
      undefined,
      'AETH-102',
      'An expression opened with "{" was not closed before the end of the template.',
      'Add a closing "}" to terminate the expression.'
    );
    return this.source.slice(startOffset, this.cursor).trim();
  }

  private parseText(): ASTTextNode {
    const startPos = this.getPosition();
    const startOffset = this.cursor;

    while (this.cursor < this.length) {
      const code = this.source.charCodeAt(this.cursor);
      if (code === 60 || code === 123) { // '<' or '{'
        break;
      }
      if (code === 10) {
        this.line++;
        this.lineStartOffset = this.cursor + 1;
      }
      this.cursor++;
    }

    const text = this.source.slice(startOffset, this.cursor);
    const endPos = this.getPosition();

    return {
      type: 'Text',
      value: text,
      loc: { start: startPos, end: endPos }
    };
  }

  private skipWhitespace(): void {
    while (this.cursor < this.length) {
      const code = this.source.charCodeAt(this.cursor);
      if (code < 128 && WHITESPACE_TABLE[code] === 1) {
        if (code === 10) {
          this.line++;
          this.lineStartOffset = this.cursor + 1;
        }
        this.cursor++;
      } else {
        break;
      }
    }
  }

  private skipUntilChar(targetCode: number): void {
    while (this.cursor < this.length && this.source.charCodeAt(this.cursor) !== targetCode) {
      if (this.source.charCodeAt(this.cursor) === 10) {
        this.line++;
        this.lineStartOffset = this.cursor + 1;
      }
      this.cursor++;
    }
  }
}

/**
 * Compiles an AST into static HTML skeletons and dynamic slot bindings (AIR) with compile-time constant hoisting.
 */
export function buildAIRFromAST(ast: ASTRootNode): {
  templates: AIRTemplateUnit[];
  bindingsCode: string[];
  diagnostics: string[];
} {
  const templates: AIRTemplateUnit[] = [];
  const bindingsCode: string[] = [];
  const diagnostics: string[] = [];

  let templateCounter = 0;

  function processNodes(nodes: ASTNode[], currentPath: number[]): {
    html: string;
    slots: (AIRDynamicTextNode | AIRDynamicAttrNode | AIRDynamicEventNode | AIRControlFlowSlotNode)[];
  } {
    let html = '';
    const slots: (AIRDynamicTextNode | AIRDynamicAttrNode | AIRDynamicEventNode | AIRControlFlowSlotNode)[] = [];

    let childIndex = 0;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const nodePath = [...currentPath, childIndex];

      if (node.type === 'Text') {
        html += node.value;
        childIndex++;
      } else if (node.type === 'Interpolation') {
        // Compile-time Constant Expression Folding for static interpolations
        const fold = evaluateConstantExpression(node.expression);
        if (fold.isConstant && fold.value !== null) {
          html += escapeHtmlText(fold.value);
          childIndex++;
        } else {
          html += '<!-- dynamic-slot -->';
          const dynamicSlot: AIRDynamicTextNode = {
            type: 'dynamic-text',
            expression: node.expression,
            path: nodePath,
            securityContext: node.securityContext
          };
          slots.push(dynamicSlot);
          childIndex++;
        }
      } else if (node.type === 'Element') {
        let tagOpen = `<${node.tag}`;

        for (let a = 0; a < node.attributes.length; a++) {
          const attr = node.attributes[a];
          if (attr.isEvent && attr.eventName) {
            const eventSlot: AIRDynamicEventNode = {
              type: 'dynamic-event',
              eventName: attr.eventName,
              handlerExpression: attr.expression || attr.value || '() => {}',
              path: nodePath
            };
            slots.push(eventSlot);
          } else if (attr.isDynamic && attr.expression) {
            // Compile-time Constant Expression Folding for static attributes
            const fold = evaluateConstantExpression(attr.expression);
            if (fold.isConstant && fold.value !== null) {
              let safeFoldVal = fold.value;
              const lowerName = attr.name.toLowerCase();
              if (lowerName === 'href' || lowerName === 'src' || lowerName === 'action' || lowerName === 'formaction' || lowerName === 'xlink:href') {
                safeFoldVal = sanitizeUri(safeFoldVal);
              }
              tagOpen += ` ${attr.name}="${escapeHtmlAttribute(safeFoldVal)}"`;
            } else {
              const attrSlot: AIRDynamicAttrNode = {
                type: 'dynamic-attr',
                name: attr.name,
                expression: attr.expression,
                path: nodePath,
                securityContext: attr.securityContext
              };
              slots.push(attrSlot);
            }
          } else if (attr.value !== null) {
            let safeAttrVal = attr.value;
            const lowerName = attr.name.toLowerCase();
            if (lowerName === 'href' || lowerName === 'src' || lowerName === 'action' || lowerName === 'formaction' || lowerName === 'xlink:href') {
              safeAttrVal = sanitizeUri(safeAttrVal);
            }
            tagOpen += ` ${attr.name}="${escapeHtmlAttribute(safeAttrVal)}"`;
          } else {
            tagOpen += ` ${attr.name}`;
          }
        }

        if (node.isSelfClosing) {
          tagOpen += ' />';
          html += tagOpen;
        } else {
          tagOpen += '>';
          const childrenResult = processNodes(node.children, [...nodePath]);
          slots.push(...childrenResult.slots);
          html += `${tagOpen}${childrenResult.html}</${node.tag}>`;
        }
        childIndex++;
      } else if (node.type === 'Component') {
        html += '<!-- component-slot -->';
        const helper = `createComponent(${node.name}, { ${node.props
          .map((p) => `${p.name}: ${p.expression || JSON.stringify(p.value)}`)
          .join(', ')} })`;
        slots.push({
          type: 'control-flow-slot',
          flowType: 'Show',
          expression: helper,
          path: nodePath,
          helperCode: helper
        });
        childIndex++;
      } else if (node.type === 'Show') {
        html += '<!-- show-slot -->';
        const helper = `Show({ when: ${node.when.startsWith('(') ? node.when : `() => (${node.when})`}, children: () => /* sub-render */ null })`;
        slots.push({
          type: 'control-flow-slot',
          flowType: 'Show',
          expression: node.when,
          path: nodePath,
          helperCode: helper
        });
        childIndex++;
      } else if (node.type === 'For') {
        html += '<!-- for-slot -->';
        const helper = `For({ each: ${node.each.startsWith('(') ? node.each : `() => (${node.each})`}, key: ${node.key || 'undefined'}, children: (item, i) => /* sub-render */ null })`;
        slots.push({
          type: 'control-flow-slot',
          flowType: 'For',
          expression: node.each,
          path: nodePath,
          helperCode: helper
        });
        childIndex++;
      }
    }

    return { html, slots };
  }

  const { html, slots } = processNodes(ast.children, [0]);

  templateCounter++;
  const templateUnit: AIRTemplateUnit = {
    id: `_tmpl$${templateCounter}`,
    staticHtml: html,
    dynamicSlots: slots
  };
  templates.push(templateUnit);

  // Generate binding instructions from slots
  for (let idx = 0; idx < slots.length; idx++) {
    const slot = slots[idx];
    if (slot.type === 'dynamic-text') {
      bindingsCode.push(`bindText(root.childNodes[${idx}], () => (${slot.expression}));`);
    } else if (slot.type === 'dynamic-attr') {
      bindingsCode.push(`bindAttr(root, ${JSON.stringify(slot.name)}, () => (${slot.expression}));`);
    } else if (slot.type === 'dynamic-event') {
      bindingsCode.push(`on(root, ${JSON.stringify(slot.eventName)}, ${slot.handlerExpression});`);
    }
  }

  return { templates, bindingsCode, diagnostics };
}

/**
 * Compiles raw template or JSX source code into AIR and standalone JS code.
 */
export function compileTemplate(rawSource: string, options?: ParseOptions): AIRCompilationResult {
  const parser = new TemplateParser(rawSource);
  const { ast, diagnostics } = parser.parse();

  const { templates, bindingsCode } = buildAIRFromAST(ast);
  const componentBody = bindingsCode.join('\n  ');
  const generatedCode = generateModuleCode(templates, componentBody);

  return {
    ast,
    templates,
    generatedCode,
    diagnostics
  };
}
