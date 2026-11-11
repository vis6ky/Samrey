/**
 * Zero-eval, zero-Function AST Tokenizer, Parser, and Sandbox Interpreter
 * for Samrey live playground execution.
 *
 * Replaces dynamic code compilation (`new Function` / `eval`) with a
 * self-contained, step-bounded AST evaluator that forbids constructor/prototype
 * traversal even across computed keys (`['const' + 'ructor']`) and isolates
 * all host globals (`window`, `document`, `globalThis`, `process`, `Function`).
 */

const BLOCKED_PROPERTY_KEYS = new Set([
  'constructor',
  '__proto__',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
  'ownerDocument',
  'defaultView'
]);

const MAX_EXECUTION_STEPS = 200_000;
const MAX_CALL_DEPTH = 128;

const BLOCKED_HOST_VALUES = new Set<unknown>(
  [
    Function,
    eval,
    typeof globalThis !== 'undefined' ? globalThis : undefined,
    typeof window !== 'undefined' ? window : undefined,
    typeof document !== 'undefined' ? document : undefined,
    typeof process !== 'undefined' ? process : undefined,
    typeof Reflect !== 'undefined' ? Reflect : undefined,
    typeof Proxy !== 'undefined' ? Proxy : undefined,
    typeof fetch !== 'undefined' ? fetch : undefined,
    typeof XMLHttpRequest !== 'undefined' ? XMLHttpRequest : undefined,
    typeof WebSocket !== 'undefined' ? WebSocket : undefined
  ].filter((v) => v !== undefined)
);

const SAFE_CONSTRUCTORS = new Set<unknown>([
  Date,
  Array,
  Map,
  Set,
  RegExp,
  Error,
  TypeError,
  RangeError,
  Promise,
  typeof URL !== 'undefined' ? URL : undefined,
  typeof URLSearchParams !== 'undefined' ? URLSearchParams : undefined
].filter((v) => v !== undefined));

const IMMUTABLE_HOST_OBJECTS = new Set<unknown>([
  ...SAFE_CONSTRUCTORS,
  Math,
  JSON,
  Object,
  Number,
  String,
  Boolean,
  Object.prototype,
  Array.prototype,
  Function.prototype,
  Error.prototype,
  TypeError.prototype,
  RangeError.prototype
]);

const SANDBOX_CLOSURE_FUNCTIONS = new WeakSet<Function>();

function createSafeObjectNamespace() {
  return Object.freeze({
    keys: (obj: object) => Object.keys(obj).filter((k) => !BLOCKED_PROPERTY_KEYS.has(k)),
    values: (obj: object) => Object.keys(obj).filter((k) => !BLOCKED_PROPERTY_KEYS.has(k)).map((k) => {
      const val = (obj as Record<string, unknown>)[k];
      assertSafeValue(val);
      return val;
    }),
    entries: (obj: object) => Object.keys(obj).filter((k) => !BLOCKED_PROPERTY_KEYS.has(k)).map((k) => {
      const val = (obj as Record<string, unknown>)[k];
      assertSafeValue(val);
      return [k, val];
    }),
    fromEntries: (entries: Iterable<[PropertyKey, unknown]>) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of entries) {
        const key = assertSafePropertyKey(k);
        assertSafeValue(v);
        out[key] = v;
      }
      return out;
    },
    assign: (target: Record<string, unknown>, ...sources: Array<Record<string, unknown> | null | undefined>) => {
      if (!target || (typeof target !== 'object' && typeof target !== 'function')) {
        throw new TypeError('[Sandbox] Object.assign target must be an object.');
      }
      if (
        IMMUTABLE_HOST_OBJECTS.has(target) ||
        (typeof target === 'function' && !SANDBOX_CLOSURE_FUNCTIONS.has(target))
      ) {
        throw new TypeError('[Sandbox Security] Cannot mutate built-in or host objects.');
      }
      for (const src of sources) {
        if (!src || typeof src !== 'object') continue;
        for (const k of Object.keys(src)) {
          if (BLOCKED_PROPERTY_KEYS.has(k)) continue;
          const val = src[k];
          assertSafeValue(val);
          target[k] = val;
        }
      }
      return target;
    },
    hasOwn: (obj: object, prop: PropertyKey) => {
      const key = assertSafePropertyKey(prop);
      return Object.prototype.hasOwnProperty.call(obj, key);
    },
    freeze: Object.freeze,
    is: Object.is
  });
}

function createSafeIntrinsics(): Record<string, unknown> {
  return {
    Math,
    JSON,
    Date,
    Array,
    Number,
    String,
    Boolean,
    Promise,
    Error,
    TypeError,
    RangeError,
    Map,
    Set,
    RegExp,
    Object: createSafeObjectNamespace(),
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    URL: typeof URL !== 'undefined' ? URL : undefined,
    URLSearchParams: typeof URLSearchParams !== 'undefined' ? URLSearchParams : undefined,
    NaN,
    Infinity,
    undefined
  };
}

function assertSafePropertyKey(rawKey: unknown): string {
  const key = String(rawKey);
  if (BLOCKED_PROPERTY_KEYS.has(key)) {
    throw new Error(`[Sandbox Security] Access to restricted property "${key}" is prohibited.`);
  }
  return key;
}

function assertSafeValue(val: unknown): void {
  if (val !== null && (typeof val === 'object' || typeof val === 'function')) {
    if (BLOCKED_HOST_VALUES.has(val)) {
      throw new Error('[Sandbox Security] Access to restricted host runtime object or constructor is prohibited.');
    }
  }
}

// ============================================================================
// Lexer
// ============================================================================

type TokenType =
  | 'number'
  | 'string'
  | 'template_no_sub'
  | 'template_head'
  | 'template_mid'
  | 'template_tail'
  | 'regex'
  | 'ident'
  | 'punct'
  | 'eof';

interface Token {
  type: TokenType;
  value: string;
  flags?: string;
  pos: number;
}

const REGEX_PRECEDING_KEYWORDS = new Set([
  'return',
  'throw',
  'case',
  'typeof',
  'void',
  'delete',
  'in',
  'instanceof',
  'else',
  'await',
  'new'
]);

const REGEX_PRECEDING_PUNCTS = new Set([
  '(', '[', '{', ',', ';', ':', '?', '=', '+=', '-=', '*=', '/=', '%=', '**=',
  '??=', '||=', '&&=', '!', '~', '&&', '||', '??', '==', '!=', '===', '!==',
  '<', '<=', '>', '>=', '+', '-', '*', '/', '%', '**', '&', '|', '^', '<<', '>>', '>>>', '=>'
]);

const MULTI_CHAR_PUNCTS = [
  '===', '!==', '>>>', '**=', '??=', '||=', '&&=', '...',
  '=>', '?.', '??', '&&', '||', '==', '!=', '<=', '>=', '<<', '>>',
  '++', '--', '**', '+=', '-=', '*=', '/=', '%='
];

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$';
}

function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || (ch >= '0' && ch <= '9');
}

function readEscapeSequence(src: string, index: number): { char: string; next: number } {
  const esc = src[index];
  if (esc === undefined) return { char: '', next: index };
  switch (esc) {
    case 'n': return { char: '\n', next: index + 1 };
    case 'r': return { char: '\r', next: index + 1 };
    case 't': return { char: '\t', next: index + 1 };
    case 'b': return { char: '\b', next: index + 1 };
    case 'f': return { char: '\f', next: index + 1 };
    case 'v': return { char: '\v', next: index + 1 };
    case '0': return { char: '\0', next: index + 1 };
    case '\\': return { char: '\\', next: index + 1 };
    case "'": return { char: "'", next: index + 1 };
    case '"': return { char: '"', next: index + 1 };
    case '`': return { char: '`', next: index + 1 };
    case '$': return { char: '$', next: index + 1 };
    case '\n': return { char: '', next: index + 1 };
    case '\r': return { char: '', next: src[index + 1] === '\n' ? index + 2 : index + 1 };
    case 'x': {
      const hex = src.slice(index + 1, index + 3);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        return { char: String.fromCharCode(parseInt(hex, 16)), next: index + 3 };
      }
      return { char: esc, next: index + 1 };
    }
    case 'u': {
      if (src[index + 1] === '{') {
        const close = src.indexOf('}', index + 2);
        if (close !== -1) {
          const hex = src.slice(index + 2, close);
          if (/^[0-9a-fA-F]+$/.test(hex)) {
            return { char: String.fromCodePoint(parseInt(hex, 16)), next: close + 1 };
          }
        }
      } else {
        const hex = src.slice(index + 1, index + 5);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          return { char: String.fromCharCode(parseInt(hex, 16)), next: index + 5 };
        }
      }
      return { char: esc, next: index + 1 };
    }
    default:
      return { char: esc, next: index + 1 };
  }
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const len = source.length;
  let i = 0;
  let canStartRegex = true;
  const templateDepthStack: number[] = [];

  const scanTemplateSegment = (startPos: number, isHead: boolean): void => {
    let text = '';
    while (i < len) {
      const ch = source[i];
      if (ch === '`') {
        i++;
        tokens.push({
          type: isHead ? 'template_no_sub' : 'template_tail',
          value: text,
          pos: startPos
        });
        canStartRegex = false;
        return;
      }
      if (ch === '$' && source[i + 1] === '{') {
        i += 2;
        tokens.push({
          type: isHead ? 'template_head' : 'template_mid',
          value: text,
          pos: startPos
        });
        templateDepthStack.push(0);
        canStartRegex = true;
        return;
      }
      if (ch === '\\') {
        i++;
        const esc = readEscapeSequence(source, i);
        text += esc.char;
        i = esc.next;
        continue;
      }
      text += ch;
      i++;
    }
    throw new SyntaxError('Unterminated template literal');
  };

  while (i < len) {
    const ch = source[i];

    // Whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Comments
    if (ch === '/' && source[i + 1] === '/') {
      const nl = source.indexOf('\n', i + 2);
      i = nl === -1 ? len : nl + 1;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end === -1) throw new SyntaxError('Unterminated block comment');
      i = end + 2;
      continue;
    }

    // Closing brace ending a template interpolation expression `${ ... }`
    if (ch === '}' && templateDepthStack.length > 0 && templateDepthStack[templateDepthStack.length - 1] === 0) {
      templateDepthStack.pop();
      const segStart = i++;
      scanTemplateSegment(segStart, false);
      continue;
    }

    // Track inner braces inside template expressions
    if (ch === '{' && templateDepthStack.length > 0) {
      templateDepthStack[templateDepthStack.length - 1]++;
    } else if (ch === '}' && templateDepthStack.length > 0) {
      templateDepthStack[templateDepthStack.length - 1]--;
    }

    // Template literal start
    if (ch === '`') {
      const start = i++;
      scanTemplateSegment(start, true);
      continue;
    }

    // String literals
    if (ch === "'" || ch === '"') {
      const quote = ch;
      const start = i++;
      let val = '';
      let closed = false;
      while (i < len) {
        const c = source[i];
        if (c === quote) {
          i++;
          closed = true;
          break;
        }
        if (c === '\n' || c === '\r') {
          throw new SyntaxError('Unterminated string literal');
        }
        if (c === '\\') {
          i++;
          const esc = readEscapeSequence(source, i);
          val += esc.char;
          i = esc.next;
          continue;
        }
        val += c;
        i++;
      }
      if (!closed) throw new SyntaxError('Unterminated string literal');
      tokens.push({ type: 'string', value: val, pos: start });
      canStartRegex = false;
      continue;
    }

    // Regex literal when '/' appears in expression-start position
    if (ch === '/' && canStartRegex && source[i + 1] !== '/' && source[i + 1] !== '*') {
      const start = i++;
      let pattern = '';
      let inClass = false;
      let closed = false;
      while (i < len) {
        const c = source[i];
        if (c === '\\') {
          if (i + 1 >= len) break;
          pattern += c + source[i + 1];
          i += 2;
          continue;
        }
        if (c === '[') inClass = true;
        else if (c === ']' && inClass) inClass = false;
        else if (c === '/' && !inClass) {
          i++;
          closed = true;
          break;
        } else if (c === '\n' || c === '\r') {
          break;
        }
        pattern += c;
        i++;
      }
      if (!closed) throw new SyntaxError('Unterminated regular expression literal');
      let flags = '';
      while (i < len && /[a-z]/i.test(source[i])) {
        flags += source[i++];
      }
      tokens.push({ type: 'regex', value: pattern, flags, pos: start });
      canStartRegex = false;
      continue;
    }

    // Numbers
    if ((ch >= '0' && ch <= '9') || (ch === '.' && source[i + 1] >= '0' && source[i + 1] <= '9')) {
      const start = i;
      if (ch === '0' && (source[i + 1] === 'x' || source[i + 1] === 'X')) {
        i += 2;
        while (i < len && /[0-9a-fA-F_]/.test(source[i])) i++;
      } else if (ch === '0' && (source[i + 1] === 'b' || source[i + 1] === 'B')) {
        i += 2;
        while (i < len && /[01_]/.test(source[i])) i++;
      } else if (ch === '0' && (source[i + 1] === 'o' || source[i + 1] === 'O')) {
        i += 2;
        while (i < len && /[0-7_]/.test(source[i])) i++;
      } else {
        while (i < len && /[0-9_]/.test(source[i])) i++;
        if (source[i] === '.' && source[i + 1] !== '.') {
          i++;
          while (i < len && /[0-9_]/.test(source[i])) i++;
        }
        if (source[i] === 'e' || source[i] === 'E') {
          i++;
          if (source[i] === '+' || source[i] === '-') i++;
          while (i < len && /[0-9_]/.test(source[i])) i++;
        }
      }
      tokens.push({ type: 'number', value: source.slice(start, i).replace(/_/g, ''), pos: start });
      canStartRegex = false;
      continue;
    }

    // Identifiers and keywords
    if (isIdentStart(ch)) {
      const start = i++;
      while (i < len && isIdentPart(source[i])) i++;
      const ident = source.slice(start, i);
      tokens.push({ type: 'ident', value: ident, pos: start });
      canStartRegex = REGEX_PRECEDING_KEYWORDS.has(ident);
      continue;
    }

    // Multi-char punctuators
    let matchedPunct = '';
    for (const p of MULTI_CHAR_PUNCTS) {
      if (source.startsWith(p, i)) {
        matchedPunct = p;
        break;
      }
    }
    const punct = matchedPunct || ch;
    tokens.push({ type: 'punct', value: punct, pos: i });
    i += punct.length;
    canStartRegex = REGEX_PRECEDING_PUNCTS.has(punct);
  }

  tokens.push({ type: 'eof', value: '', pos: len });
  return tokens;
}

// ============================================================================
// AST Types
// ============================================================================

type PatternNode =
  | { kind: 'IdentPat'; name: string }
  | {
      kind: 'ObjectPat';
      props: Array<{ key: ExprNode; computed: boolean; value: PatternNode; defaultExpr?: ExprNode }>;
      rest?: string;
    }
  | {
      kind: 'ArrayPat';
      elems: Array<{ pattern: PatternNode; defaultExpr?: ExprNode } | null>;
      rest?: string;
    };

interface ParamSpec {
  pattern: PatternNode;
  defaultExpr?: ExprNode;
  isRest: boolean;
}

type ExprNode =
  | { kind: 'Literal'; value: unknown }
  | { kind: 'RegexLit'; pattern: string; flags: string }
  | { kind: 'Ident'; name: string }
  | { kind: 'This' }
  | { kind: 'Template'; quasis: string[]; exprs: ExprNode[] }
  | { kind: 'Array'; elems: Array<{ expr: ExprNode; spread: boolean } | null> }
  | {
      kind: 'Object';
      props: Array<
        | { kind: 'spread'; expr: ExprNode }
        | { kind: 'prop'; keyExpr: ExprNode; computed: boolean; value: ExprNode }
      >;
    }
  | {
      kind: 'FunctionExpr';
      name?: string;
      params: ParamSpec[];
      body: StmtNode[];
      isAsync: boolean;
      isArrow: boolean;
      exprBody?: ExprNode;
    }
  | { kind: 'Unary'; op: string; arg: ExprNode }
  | { kind: 'Await'; arg: ExprNode }
  | { kind: 'Update'; op: '++' | '--'; arg: ExprNode; prefix: boolean }
  | { kind: 'Binary'; op: string; left: ExprNode; right: ExprNode }
  | { kind: 'Logical'; op: '&&' | '||' | '??'; left: ExprNode; right: ExprNode }
  | { kind: 'Cond'; test: ExprNode; consequent: ExprNode; alternate: ExprNode }
  | { kind: 'Assign'; op: string; left: ExprNode; right: ExprNode }
  | { kind: 'New'; callee: ExprNode; args: Array<{ expr: ExprNode; spread: boolean }> }
  | { kind: 'Sequence'; exprs: ExprNode[] }
  | { kind: 'Chain'; base: ExprNode; steps: ChainStep[] };

type ChainStep =
  | { kind: 'member'; prop: ExprNode; computed: boolean; optional: boolean }
  | { kind: 'call'; args: Array<{ expr: ExprNode; spread: boolean }>; optional: boolean };

type StmtNode =
  | { kind: 'Empty' }
  | { kind: 'Block'; body: StmtNode[] }
  | { kind: 'ExprStmt'; expr: ExprNode }
  | {
      kind: 'VarDecl';
      declKind: 'const' | 'let' | 'var';
      decls: Array<{ pattern: PatternNode; init: ExprNode | null }>;
    }
  | { kind: 'FunctionDecl'; name: string; params: ParamSpec[]; body: StmtNode[]; isAsync: boolean }
  | { kind: 'If'; test: ExprNode; consequent: StmtNode; alternate: StmtNode | null }
  | { kind: 'While'; test: ExprNode; body: StmtNode }
  | { kind: 'DoWhile'; body: StmtNode; test: ExprNode }
  | {
      kind: 'For';
      init: StmtNode | ExprNode | null;
      test: ExprNode | null;
      update: ExprNode | null;
      body: StmtNode;
    }
  | {
      kind: 'ForIter';
      mode: 'of' | 'in';
      declKind: 'const' | 'let' | 'var' | null;
      left: PatternNode;
      right: ExprNode;
      body: StmtNode;
    }
  | {
      kind: 'Switch';
      discriminant: ExprNode;
      cases: Array<{ test: ExprNode | null; consequent: StmtNode[] }>;
    }
  | { kind: 'Try'; block: StmtNode[]; handlerParam: PatternNode | null; handlerBlock: StmtNode[] | null; finalizer: StmtNode[] | null }
  | { kind: 'Return'; arg: ExprNode | null }
  | { kind: 'Throw'; arg: ExprNode }
  | { kind: 'Break' }
  | { kind: 'Continue' };

// ============================================================================
// Recursive-Descent Parser
// ============================================================================

class SandboxParser {
  private readonly tokens: Token[];
  private cursor = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.cursor + offset, this.tokens.length - 1)];
  }

  private advance(): Token {
    const tok = this.peek();
    if (this.cursor < this.tokens.length - 1) this.cursor++;
    return tok;
  }

  private matchPunct(val: string): boolean {
    const tok = this.peek();
    if (tok.type === 'punct' && tok.value === val) {
      this.cursor++;
      return true;
    }
    return false;
  }

  private matchIdent(val: string): boolean {
    const tok = this.peek();
    if (tok.type === 'ident' && tok.value === val) {
      this.cursor++;
      return true;
    }
    return false;
  }

  private expectPunct(val: string): Token {
    const tok = this.peek();
    if (tok.type === 'punct' && tok.value === val) {
      return this.advance();
    }
    throw new SyntaxError(`Expected '${val}' but found '${tok.value || tok.type}' at position ${tok.pos}`);
  }

  private expectIdent(): Token {
    const tok = this.peek();
    if (tok.type === 'ident') {
      return this.advance();
    }
    throw new SyntaxError(`Expected identifier but found '${tok.value || tok.type}' at position ${tok.pos}`);
  }

  private consumeOptionalSemicolon(): void {
    this.matchPunct(';');
  }

  parseProgram(): StmtNode[] {
    const stmts: StmtNode[] = [];
    while (this.peek().type !== 'eof') {
      stmts.push(this.parseStatement());
    }
    return stmts;
  }

  private parseStatement(): StmtNode {
    const tok = this.peek();
    if (tok.type === 'punct' && tok.value === ';') {
      this.advance();
      return { kind: 'Empty' };
    }
    if (tok.type === 'punct' && tok.value === '{') {
      return { kind: 'Block', body: this.parseBlockStatements() };
    }
    if (tok.type === 'ident') {
      switch (tok.value) {
        case 'const':
        case 'let':
        case 'var':
          return this.parseVarDeclaration(true);
        case 'async':
          if (this.peek(1).type === 'ident' && this.peek(1).value === 'function') {
            this.advance();
            return this.parseFunctionDeclaration(true);
          }
          break;
        case 'function':
          return this.parseFunctionDeclaration(false);
        case 'if':
          return this.parseIfStatement();
        case 'while':
          return this.parseWhileStatement();
        case 'do':
          return this.parseDoWhileStatement();
        case 'for':
          return this.parseForStatement();
        case 'switch':
          return this.parseSwitchStatement();
        case 'try':
          return this.parseTryStatement();
        case 'return': {
          this.advance();
          const next = this.peek();
          if (
            next.type === 'eof' ||
            (next.type === 'punct' && (next.value === ';' || next.value === '}'))
          ) {
            this.consumeOptionalSemicolon();
            return { kind: 'Return', arg: null };
          }
          const arg = this.parseExpression();
          this.consumeOptionalSemicolon();
          return { kind: 'Return', arg };
        }
        case 'throw': {
          this.advance();
          const arg = this.parseExpression();
          this.consumeOptionalSemicolon();
          return { kind: 'Throw', arg };
        }
        case 'break':
          this.advance();
          this.consumeOptionalSemicolon();
          return { kind: 'Break' };
        case 'continue':
          this.advance();
          this.consumeOptionalSemicolon();
          return { kind: 'Continue' };
      }
    }

    const expr = this.parseExpression();
    this.consumeOptionalSemicolon();
    return { kind: 'ExprStmt', expr };
  }

  private parseBlockStatements(): StmtNode[] {
    this.expectPunct('{');
    const stmts: StmtNode[] = [];
    while (this.peek().type !== 'eof' && !(this.peek().type === 'punct' && this.peek().value === '}')) {
      stmts.push(this.parseStatement());
    }
    this.expectPunct('}');
    return stmts;
  }

  private parseVarDeclaration(consumeSemi: boolean): StmtNode {
    const declKind = this.advance().value as 'const' | 'let' | 'var';
    const decls: Array<{ pattern: PatternNode; init: ExprNode | null }> = [];
    do {
      const pattern = this.parseBindingPattern();
      let init: ExprNode | null = null;
      if (this.matchPunct('=')) {
        init = this.parseAssignmentExpr();
      }
      decls.push({ pattern, init });
    } while (this.matchPunct(','));
    if (consumeSemi) this.consumeOptionalSemicolon();
    return { kind: 'VarDecl', declKind, decls };
  }

  private parseBindingPattern(): PatternNode {
    const tok = this.peek();
    if (tok.type === 'ident') {
      this.advance();
      return { kind: 'IdentPat', name: tok.value };
    }
    if (tok.type === 'punct' && tok.value === '{') {
      this.advance();
      const props: Array<{ key: ExprNode; computed: boolean; value: PatternNode; defaultExpr?: ExprNode }> = [];
      let rest: string | undefined;
      while (!(this.peek().type === 'punct' && this.peek().value === '}')) {
        if (this.matchPunct('...')) {
          rest = this.expectIdent().value;
          this.matchPunct(',');
          break;
        }
        let key: ExprNode;
        let computed = false;
        let shorthandName: string | null = null;
        if (this.matchPunct('[')) {
          computed = true;
          key = this.parseAssignmentExpr();
          this.expectPunct(']');
        } else if (this.peek().type === 'string') {
          key = { kind: 'Literal', value: this.advance().value };
        } else {
          const id = this.expectIdent().value;
          key = { kind: 'Literal', value: id };
          shorthandName = id;
        }
        let value: PatternNode;
        if (this.matchPunct(':')) {
          value = this.parseBindingPattern();
        } else if (shorthandName) {
          value = { kind: 'IdentPat', name: shorthandName };
        } else {
          throw new SyntaxError('Expected : in destructuring property');
        }
        let defaultExpr: ExprNode | undefined;
        if (this.matchPunct('=')) {
          defaultExpr = this.parseAssignmentExpr();
        }
        props.push({ key, computed, value, defaultExpr });
        if (!this.matchPunct(',')) break;
      }
      this.expectPunct('}');
      return { kind: 'ObjectPat', props, rest };
    }
    if (tok.type === 'punct' && tok.value === '[') {
      this.advance();
      const elems: Array<{ pattern: PatternNode; defaultExpr?: ExprNode } | null> = [];
      let rest: string | undefined;
      while (!(this.peek().type === 'punct' && this.peek().value === ']')) {
        if (this.matchPunct(',')) {
          elems.push(null);
          continue;
        }
        if (this.matchPunct('...')) {
          rest = this.expectIdent().value;
          this.matchPunct(',');
          break;
        }
        const pattern = this.parseBindingPattern();
        let defaultExpr: ExprNode | undefined;
        if (this.matchPunct('=')) {
          defaultExpr = this.parseAssignmentExpr();
        }
        elems.push({ pattern, defaultExpr });
        if (!this.matchPunct(',')) break;
      }
      this.expectPunct(']');
      return { kind: 'ArrayPat', elems, rest };
    }
    throw new SyntaxError(`Invalid binding pattern near '${tok.value}'`);
  }

  private parseFunctionDeclaration(isAsync: boolean): StmtNode {
    this.expectIdent(); // 'function'
    const name = this.expectIdent().value;
    const params = this.parseParamList();
    const body = this.parseBlockStatements();
    return { kind: 'FunctionDecl', name, params, body, isAsync };
  }

  private parseParamList(): ParamSpec[] {
    this.expectPunct('(');
    const params: ParamSpec[] = [];
    while (!(this.peek().type === 'punct' && this.peek().value === ')')) {
      const isRest = this.matchPunct('...');
      const pattern = this.parseBindingPattern();
      let defaultExpr: ExprNode | undefined;
      if (!isRest && this.matchPunct('=')) {
        defaultExpr = this.parseAssignmentExpr();
      }
      params.push({ pattern, defaultExpr, isRest });
      if (!this.matchPunct(',') || isRest) break;
    }
    this.expectPunct(')');
    return params;
  }

  private parseIfStatement(): StmtNode {
    this.advance();
    this.expectPunct('(');
    const test = this.parseExpression();
    this.expectPunct(')');
    const consequent = this.parseStatement();
    let alternate: StmtNode | null = null;
    if (this.matchIdent('else')) {
      alternate = this.parseStatement();
    }
    return { kind: 'If', test, consequent, alternate };
  }

  private parseWhileStatement(): StmtNode {
    this.advance();
    this.expectPunct('(');
    const test = this.parseExpression();
    this.expectPunct(')');
    const body = this.parseStatement();
    return { kind: 'While', test, body };
  }

  private parseDoWhileStatement(): StmtNode {
    this.advance();
    const body = this.parseStatement();
    this.matchIdent('while');
    this.expectPunct('(');
    const test = this.parseExpression();
    this.expectPunct(')');
    this.consumeOptionalSemicolon();
    return { kind: 'DoWhile', body, test };
  }

  private parseForStatement(): StmtNode {
    this.advance();
    this.expectPunct('(');
    let init: StmtNode | ExprNode | null = null;

    if (!this.matchPunct(';')) {
      const t = this.peek();
      if (t.type === 'ident' && (t.value === 'const' || t.value === 'let' || t.value === 'var')) {
        const declKind = this.advance().value as 'const' | 'let' | 'var';
        const pat = this.parseBindingPattern();
        if (this.peek().type === 'ident' && (this.peek().value === 'of' || this.peek().value === 'in')) {
          const mode = this.advance().value as 'of' | 'in';
          const right = mode === 'of' ? this.parseAssignmentExpr() : this.parseExpression();
          this.expectPunct(')');
          const body = this.parseStatement();
          return { kind: 'ForIter', mode, declKind, left: pat, right, body };
        }
        let firstInit: ExprNode | null = null;
        if (this.matchPunct('=')) firstInit = this.parseAssignmentExpr();
        const decls: Array<{ pattern: PatternNode; init: ExprNode | null }> = [{ pattern: pat, init: firstInit }];
        while (this.matchPunct(',')) {
          const nextPat = this.parseBindingPattern();
          const nextInit = this.matchPunct('=') ? this.parseAssignmentExpr() : null;
          decls.push({ pattern: nextPat, init: nextInit });
        }
        init = { kind: 'VarDecl', declKind, decls };
        this.expectPunct(';');
      } else {
        const expr = this.parseExpression();
        if (expr.kind === 'Ident' && this.peek().type === 'ident' && (this.peek().value === 'of' || this.peek().value === 'in')) {
          const mode = this.advance().value as 'of' | 'in';
          const right = this.parseExpression();
          this.expectPunct(')');
          const body = this.parseStatement();
          return { kind: 'ForIter', mode, declKind: null, left: { kind: 'IdentPat', name: expr.name }, right, body };
        }
        init = expr;
        this.expectPunct(';');
      }
    }

    let test: ExprNode | null = null;
    if (!(this.peek().type === 'punct' && this.peek().value === ';')) {
      test = this.parseExpression();
    }
    this.expectPunct(';');

    let update: ExprNode | null = null;
    if (!(this.peek().type === 'punct' && this.peek().value === ')')) {
      update = this.parseExpression();
    }
    this.expectPunct(')');
    const body = this.parseStatement();
    return { kind: 'For', init, test, update, body };
  }

  private parseSwitchStatement(): StmtNode {
    this.advance();
    this.expectPunct('(');
    const discriminant = this.parseExpression();
    this.expectPunct(')');
    this.expectPunct('{');
    const cases: Array<{ test: ExprNode | null; consequent: StmtNode[] }> = [];
    while (this.peek().type !== 'eof' && !(this.peek().type === 'punct' && this.peek().value === '}')) {
      let test: ExprNode | null = null;
      if (this.matchIdent('case')) {
        test = this.parseExpression();
        this.expectPunct(':');
      } else if (this.matchIdent('default')) {
        this.expectPunct(':');
      } else {
        throw new SyntaxError('Expected case or default inside switch');
      }
      const consequent: StmtNode[] = [];
      while (
        this.peek().type !== 'eof' &&
        !(this.peek().type === 'punct' && this.peek().value === '}') &&
        !(this.peek().type === 'ident' && (this.peek().value === 'case' || this.peek().value === 'default'))
      ) {
        consequent.push(this.parseStatement());
      }
      cases.push({ test, consequent });
    }
    this.expectPunct('}');
    return { kind: 'Switch', discriminant, cases };
  }

  private parseTryStatement(): StmtNode {
    this.advance();
    const block = this.parseBlockStatements();
    let handlerParam: PatternNode | null = null;
    let handlerBlock: StmtNode[] | null = null;
    let finalizer: StmtNode[] | null = null;
    if (this.matchIdent('catch')) {
      if (this.matchPunct('(')) {
        handlerParam = this.parseBindingPattern();
        this.expectPunct(')');
      }
      handlerBlock = this.parseBlockStatements();
    }
    if (this.matchIdent('finally')) {
      finalizer = this.parseBlockStatements();
    }
    return { kind: 'Try', block, handlerParam, handlerBlock, finalizer };
  }

  // Expressions --------------------------------------------------------------

  private parseExpression(): ExprNode {
    const first = this.parseAssignmentExpr();
    if (!this.matchPunct(',')) return first;
    const exprs = [first];
    do {
      exprs.push(this.parseAssignmentExpr());
    } while (this.matchPunct(','));
    return { kind: 'Sequence', exprs };
  }

  private isArrowAhead(): boolean {
    let idx = this.cursor;
    const first = this.tokens[idx];
    if (first.type === 'ident' && first.value === 'async') idx++;
    const tok = this.tokens[idx];
    if (!tok) return false;
    if (tok.type === 'ident' && this.tokens[idx + 1]?.type === 'punct' && this.tokens[idx + 1].value === '=>') {
      return true;
    }
    if (tok.type === 'punct' && tok.value === '(') {
      let depth = 1;
      idx++;
      while (idx < this.tokens.length && depth > 0) {
        const cur = this.tokens[idx];
        if (cur.type === 'punct') {
          if (cur.value === '(') depth++;
          else if (cur.value === ')') depth--;
        }
        idx++;
      }
      return depth === 0 && this.tokens[idx]?.type === 'punct' && this.tokens[idx].value === '=>';
    }
    return false;
  }

  private parseArrowFunction(): ExprNode {
    const isAsync = this.matchIdent('async');
    let params: ParamSpec[];
    if (this.peek().type === 'ident') {
      params = [{ pattern: { kind: 'IdentPat', name: this.advance().value }, isRest: false }];
    } else {
      params = this.parseParamList();
    }
    this.expectPunct('=>');
    if (this.peek().type === 'punct' && this.peek().value === '{') {
      const body = this.parseBlockStatements();
      return { kind: 'FunctionExpr', params, body, isAsync, isArrow: true };
    }
    const exprBody = this.parseAssignmentExpr();
    return { kind: 'FunctionExpr', params, body: [], isAsync, isArrow: true, exprBody };
  }

  private parseAssignmentExpr(): ExprNode {
    if (this.isArrowAhead()) {
      return this.parseArrowFunction();
    }
    const left = this.parseConditionalExpr();
    const tok = this.peek();
    if (
      tok.type === 'punct' &&
      ['=', '+=', '-=', '*=', '/=', '%=', '**=', '??=', '||=', '&&='].includes(tok.value)
    ) {
      const op = this.advance().value;
      const right = this.parseAssignmentExpr();
      return { kind: 'Assign', op, left, right };
    }
    return left;
  }

  private parseConditionalExpr(): ExprNode {
    const test = this.parseNullishOrLogicalExpr();
    if (this.matchPunct('?')) {
      const consequent = this.parseAssignmentExpr();
      this.expectPunct(':');
      const alternate = this.parseAssignmentExpr();
      return { kind: 'Cond', test, consequent, alternate };
    }
    return test;
  }

  private parseNullishOrLogicalExpr(): ExprNode {
    return this.parseLogicalCoalesce();
  }

  private parseLogicalCoalesce(): ExprNode {
    let expr = this.parseLogicalOr();
    while (this.matchPunct('??')) {
      expr = { kind: 'Logical', op: '??', left: expr, right: this.parseLogicalOr() };
    }
    return expr;
  }

  private parseLogicalOr(): ExprNode {
    let expr = this.parseLogicalAnd();
    while (this.matchPunct('||')) {
      expr = { kind: 'Logical', op: '||', left: expr, right: this.parseLogicalAnd() };
    }
    return expr;
  }

  private parseLogicalAnd(): ExprNode {
    let expr = this.parseBitwiseOr();
    while (this.matchPunct('&&')) {
      expr = { kind: 'Logical', op: '&&', left: expr, right: this.parseBitwiseOr() };
    }
    return expr;
  }

  private parseBitwiseOr(): ExprNode {
    let expr = this.parseBitwiseXor();
    while (this.matchPunct('|')) {
      expr = { kind: 'Binary', op: '|', left: expr, right: this.parseBitwiseXor() };
    }
    return expr;
  }

  private parseBitwiseXor(): ExprNode {
    let expr = this.parseBitwiseAnd();
    while (this.matchPunct('^')) {
      expr = { kind: 'Binary', op: '^', left: expr, right: this.parseBitwiseAnd() };
    }
    return expr;
  }

  private parseBitwiseAnd(): ExprNode {
    let expr = this.parseEquality();
    while (this.matchPunct('&')) {
      expr = { kind: 'Binary', op: '&', left: expr, right: this.parseEquality() };
    }
    return expr;
  }

  private parseEquality(): ExprNode {
    let expr = this.parseRelational();
    while (this.peek().type === 'punct' && ['===', '!==', '==', '!='].includes(this.peek().value)) {
      const op = this.advance().value;
      expr = { kind: 'Binary', op, left: expr, right: this.parseRelational() };
    }
    return expr;
  }

  private parseRelational(): ExprNode {
    let expr = this.parseShift();
    while (true) {
      const t = this.peek();
      if (t.type === 'punct' && ['<', '<=', '>', '>='].includes(t.value)) {
        const op = this.advance().value;
        expr = { kind: 'Binary', op, left: expr, right: this.parseShift() };
      } else if (t.type === 'ident' && (t.value === 'in' || t.value === 'instanceof')) {
        const op = this.advance().value;
        expr = { kind: 'Binary', op, left: expr, right: this.parseShift() };
      } else {
        break;
      }
    }
    return expr;
  }

  private parseShift(): ExprNode {
    let expr = this.parseAdditive();
    while (this.peek().type === 'punct' && ['<<', '>>', '>>>'].includes(this.peek().value)) {
      const op = this.advance().value;
      expr = { kind: 'Binary', op, left: expr, right: this.parseAdditive() };
    }
    return expr;
  }

  private parseAdditive(): ExprNode {
    let expr = this.parseMultiplicative();
    while (this.peek().type === 'punct' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.advance().value;
      expr = { kind: 'Binary', op, left: expr, right: this.parseMultiplicative() };
    }
    return expr;
  }

  private parseMultiplicative(): ExprNode {
    let expr = this.parseExponentiation();
    while (this.peek().type === 'punct' && ['*', '/', '%'].includes(this.peek().value)) {
      const op = this.advance().value;
      expr = { kind: 'Binary', op, left: expr, right: this.parseExponentiation() };
    }
    return expr;
  }

  private parseExponentiation(): ExprNode {
    const left = this.parseUnary();
    if (this.matchPunct('**')) {
      return { kind: 'Binary', op: '**', left, right: this.parseExponentiation() };
    }
    return left;
  }

  private parseUnary(): ExprNode {
    const tok = this.peek();
    if (tok.type === 'punct' && (tok.value === '++' || tok.value === '--')) {
      const op = this.advance().value as '++' | '--';
      return { kind: 'Update', op, arg: this.parseUnary(), prefix: true };
    }
    if (tok.type === 'punct' && ['!', '+', '-', '~'].includes(tok.value)) {
      const op = this.advance().value;
      return { kind: 'Unary', op, arg: this.parseUnary() };
    }
    if (tok.type === 'ident' && ['typeof', 'void', 'delete'].includes(tok.value)) {
      const op = this.advance().value;
      return { kind: 'Unary', op, arg: this.parseUnary() };
    }
    if (tok.type === 'ident' && tok.value === 'await') {
      this.advance();
      return { kind: 'Await', arg: this.parseUnary() };
    }
    return this.parsePostfix();
  }

  private parseCallArgs(): Array<{ expr: ExprNode; spread: boolean }> {
    this.expectPunct('(');
    const args: Array<{ expr: ExprNode; spread: boolean }> = [];
    while (!(this.peek().type === 'punct' && this.peek().value === ')')) {
      const spread = this.matchPunct('...');
      args.push({ expr: this.parseAssignmentExpr(), spread });
      if (!this.matchPunct(',')) break;
    }
    this.expectPunct(')');
    return args;
  }

  private parsePostfix(): ExprNode {
    let expr = this.parseMemberOrNew();
    while (this.peek().type === 'punct' && (this.peek().value === '++' || this.peek().value === '--')) {
      const op = this.advance().value as '++' | '--';
      expr = { kind: 'Update', op, arg: expr, prefix: false };
    }
    return expr;
  }

  private parseMemberOrNew(): ExprNode {
    if (this.matchIdent('new')) {
      let callee = this.parsePrimary();
      while (this.peek().type === 'punct' && (this.peek().value === '.' || this.peek().value === '[')) {
        if (this.matchPunct('.')) {
          const prop = this.expectIdent().value;
          callee = { kind: 'Chain', base: callee, steps: [{ kind: 'member', prop: { kind: 'Literal', value: prop }, computed: false, optional: false }] };
        } else {
          this.advance();
          const key = this.parseExpression();
          this.expectPunct(']');
          callee = { kind: 'Chain', base: callee, steps: [{ kind: 'member', prop: key, computed: true, optional: false }] };
        }
      }
      const args = this.peek().type === 'punct' && this.peek().value === '(' ? this.parseCallArgs() : [];
      const newExpr: ExprNode = { kind: 'New', callee, args };
      return this.parseChainTail(newExpr);
    }
    return this.parseChainTail(this.parsePrimary());
  }

  private parseChainTail(base: ExprNode): ExprNode {
    const steps: ChainStep[] = [];
    while (true) {
      const tok = this.peek();
      if (tok.type === 'punct' && tok.value === '?.') {
        this.advance();
        if (this.peek().type === 'punct' && this.peek().value === '(') {
          steps.push({ kind: 'call', args: this.parseCallArgs(), optional: true });
        } else if (this.matchPunct('[')) {
          const key = this.parseExpression();
          this.expectPunct(']');
          steps.push({ kind: 'member', prop: key, computed: true, optional: true });
        } else {
          const id = this.expectIdent().value;
          steps.push({ kind: 'member', prop: { kind: 'Literal', value: id }, computed: false, optional: true });
        }
      } else if (tok.type === 'punct' && tok.value === '.') {
        this.advance();
        const id = this.expectIdent().value;
        steps.push({ kind: 'member', prop: { kind: 'Literal', value: id }, computed: false, optional: false });
      } else if (tok.type === 'punct' && tok.value === '[') {
        this.advance();
        const key = this.parseExpression();
        this.expectPunct(']');
        steps.push({ kind: 'member', prop: key, computed: true, optional: false });
      } else if (tok.type === 'punct' && tok.value === '(') {
        steps.push({ kind: 'call', args: this.parseCallArgs(), optional: false });
      } else {
        break;
      }
    }
    return steps.length > 0 ? { kind: 'Chain', base, steps } : base;
  }

  private parsePrimary(): ExprNode {
    const tok = this.peek();
    switch (tok.type) {
      case 'number':
        this.advance();
        return { kind: 'Literal', value: Number(tok.value) };
      case 'string':
        this.advance();
        return { kind: 'Literal', value: tok.value };
      case 'regex':
        this.advance();
        return { kind: 'RegexLit', pattern: tok.value, flags: tok.flags || '' };
      case 'template_no_sub':
        this.advance();
        return { kind: 'Literal', value: tok.value };
      case 'template_head': {
        const quasis: string[] = [this.advance().value];
        const exprs: ExprNode[] = [];
        while (true) {
          exprs.push(this.parseExpression());
          const next = this.peek();
          if (next.type === 'template_mid') {
            quasis.push(this.advance().value);
          } else if (next.type === 'template_tail') {
            quasis.push(this.advance().value);
            break;
          } else {
            throw new SyntaxError(`Expected closing template segment at position ${next.pos}`);
          }
        }
        return { kind: 'Template', quasis, exprs };
      }
      case 'ident': {
        if (tok.value === 'true') { this.advance(); return { kind: 'Literal', value: true }; }
        if (tok.value === 'false') { this.advance(); return { kind: 'Literal', value: false }; }
        if (tok.value === 'null') { this.advance(); return { kind: 'Literal', value: null }; }
        if (tok.value === 'this') { this.advance(); return { kind: 'This' }; }
        if (tok.value === 'async' && this.peek(1).type === 'ident' && this.peek(1).value === 'function') {
          this.advance();
          return this.parseFunctionExpression(true);
        }
        if (tok.value === 'function') {
          return this.parseFunctionExpression(false);
        }
        this.advance();
        return { kind: 'Ident', name: tok.value };
      }
      case 'punct': {
        if (tok.value === '(') {
          this.advance();
          const expr = this.parseExpression();
          this.expectPunct(')');
          return expr;
        }
        if (tok.value === '[') return this.parseArrayLiteral();
        if (tok.value === '{') return this.parseObjectLiteral();
      }
    }
    throw new SyntaxError(`Unexpected token '${tok.value || tok.type}' at position ${tok.pos}`);
  }

  private parseFunctionExpression(isAsync: boolean): ExprNode {
    this.expectIdent(); // 'function'
    let name: string | undefined;
    if (this.peek().type === 'ident') {
      name = this.advance().value;
    }
    const params = this.parseParamList();
    const body = this.parseBlockStatements();
    return { kind: 'FunctionExpr', name, params, body, isAsync, isArrow: false };
  }

  private parseArrayLiteral(): ExprNode {
    this.expectPunct('[');
    const elems: Array<{ expr: ExprNode; spread: boolean } | null> = [];
    while (!(this.peek().type === 'punct' && this.peek().value === ']')) {
      if (this.matchPunct(',')) {
        elems.push(null);
        continue;
      }
      const spread = this.matchPunct('...');
      elems.push({ expr: this.parseAssignmentExpr(), spread });
      if (!this.matchPunct(',')) break;
    }
    this.expectPunct(']');
    return { kind: 'Array', elems };
  }

  private parseObjectLiteral(): ExprNode {
    this.expectPunct('{');
    const props: Array<
      | { kind: 'spread'; expr: ExprNode }
      | { kind: 'prop'; keyExpr: ExprNode; computed: boolean; value: ExprNode }
    > = [];
    while (!(this.peek().type === 'punct' && this.peek().value === '}')) {
      if (this.matchPunct('...')) {
        props.push({ kind: 'spread', expr: this.parseAssignmentExpr() });
        if (!this.matchPunct(',')) break;
        continue;
      }
      let isAsyncMethod = false;
      if (
        this.peek().type === 'ident' &&
        this.peek().value === 'async' &&
        this.peek(1).type !== 'punct' &&
        this.peek(1).value !== ':' &&
        this.peek(1).value !== ','
      ) {
        isAsyncMethod = true;
        this.advance();
      }
      let keyExpr: ExprNode;
      let computed = false;
      let identKey: string | null = null;
      if (this.matchPunct('[')) {
        computed = true;
        keyExpr = this.parseAssignmentExpr();
        this.expectPunct(']');
      } else if (this.peek().type === 'string' || this.peek().type === 'number') {
        const lit = this.advance();
        keyExpr = { kind: 'Literal', value: lit.type === 'number' ? String(Number(lit.value)) : lit.value };
      } else {
        identKey = this.expectIdent().value;
        keyExpr = { kind: 'Literal', value: identKey };
      }

      if (this.peek().type === 'punct' && this.peek().value === '(') {
        const params = this.parseParamList();
        const body = this.parseBlockStatements();
        props.push({
          kind: 'prop',
          keyExpr,
          computed,
          value: { kind: 'FunctionExpr', params, body, isAsync: isAsyncMethod, isArrow: false }
        });
      } else if (this.matchPunct(':')) {
        props.push({ kind: 'prop', keyExpr, computed, value: this.parseAssignmentExpr() });
      } else if (identKey && !isAsyncMethod) {
        props.push({ kind: 'prop', keyExpr, computed: false, value: { kind: 'Ident', name: identKey } });
      } else {
        throw new SyntaxError('Expected property value in object literal');
      }
      if (!this.matchPunct(',')) break;
    }
    this.expectPunct('}');
    return { kind: 'Object', props };
  }
}

// ============================================================================
// Environment & Step-Bounded Evaluator
// ============================================================================

interface BindingSlot {
  kind: 'const' | 'let' | 'var';
  value: unknown;
}

class Env {
  readonly vars = new Map<string, BindingSlot>();
  readonly parent: Env | null;
  readonly isFunctionScope: boolean;

  constructor(parent: Env | null, isFunctionScope = false) {
    this.parent = parent;
    this.isFunctionScope = isFunctionScope;
  }

  define(name: string, kind: 'const' | 'let' | 'var', value: unknown): void {
    if (BLOCKED_PROPERTY_KEYS.has(name)) {
      throw new Error(`[Sandbox Security] Invalid variable identifier "${name}".`);
    }
    this.vars.set(name, { kind, value });
  }

  getFunctionScope(): Env {
    let cur: Env = this;
    while (!cur.isFunctionScope && cur.parent) {
      cur = cur.parent;
    }
    return cur;
  }

  lookup(name: string): BindingSlot | undefined {
    let cur: Env | null = this;
    while (cur) {
      const slot = cur.vars.get(name);
      if (slot) return slot;
      cur = cur.parent;
    }
    return undefined;
  }

  get(name: string): unknown {
    const slot = this.lookup(name);
    if (!slot) {
      throw new ReferenceError(`${name} is not defined`);
    }
    assertSafeValue(slot.value);
    return slot.value;
  }

  set(name: string, value: unknown): unknown {
    const slot = this.lookup(name);
    if (!slot) {
      throw new ReferenceError(`Assignment to undeclared variable '${name}' is prohibited in strict sandbox mode`);
    }
    if (slot.kind === 'const') {
      throw new TypeError(`Assignment to constant variable '${name}'`);
    }
    assertSafeValue(value);
    slot.value = value;
    return value;
  }
}

type ControlSignal =
  | { type: 'normal'; value: unknown }
  | { type: 'return'; value: unknown }
  | { type: 'break' }
  | { type: 'continue' };

const NORMAL_VOID: ControlSignal = { type: 'normal', value: undefined };

interface ExecBudget {
  steps: number;
  depth: number;
}

function tickStep(budget: ExecBudget): void {
  budget.steps++;
  if (budget.steps > MAX_EXECUTION_STEPS) {
    throw new Error('[Sandbox Security] Execution step limit exceeded (infinite loop or excessive computation aborted).');
  }
}

function readSafeProp(obj: unknown, keyRaw: unknown): unknown {
  if (obj === null || obj === undefined) {
    throw new TypeError(`Cannot read properties of ${String(obj)} (reading '${String(keyRaw)}')`);
  }
  const key = assertSafePropertyKey(keyRaw);
  const val = (obj as Record<string, unknown>)[key];
  assertSafeValue(val);
  return val;
}

function writeSafeProp(obj: unknown, keyRaw: unknown, value: unknown): unknown {
  if (obj === null || obj === undefined || (typeof obj !== 'object' && typeof obj !== 'function')) {
    throw new TypeError(`Cannot set property '${String(keyRaw)}' of ${String(obj)}`);
  }
  const key = assertSafePropertyKey(keyRaw);
  if (
    IMMUTABLE_HOST_OBJECTS.has(obj) ||
    (typeof obj === 'function' && !SANDBOX_CLOSURE_FUNCTIONS.has(obj))
  ) {
    throw new TypeError(`[Sandbox Security] Mutating host or intrinsic property "${key}" is prohibited.`);
  }
  assertSafeValue(value);
  (obj as Record<string, unknown>)[key] = value;
  return value;
}

function applyBinaryOp(op: string, l: any, r: any): unknown {
  switch (op) {
    case '+': return l + r;
    case '-': return l - r;
    case '*': return l * r;
    case '/': return l / r;
    case '%': return l % r;
    case '**': return l ** r;
    case '<<': return l << r;
    case '>>': return l >> r;
    case '>>>': return l >>> r;
    case '&': return l & r;
    case '^': return l ^ r;
    case '|': return l | r;
    case '<': return l < r;
    case '<=': return l <= r;
    case '>': return l > r;
    case '>=': return l >= r;
    case '==': return l == r;
    case '!=': return l != r;
    case '===': return l === r;
    case '!==': return l !== r;
    case 'in': {
      assertSafePropertyKey(l);
      return l in r;
    }
    case 'instanceof': return l instanceof r;
    default:
      throw new Error(`Unsupported binary operator: ${op}`);
  }
}

function applyCompoundOp(op: string, cur: any, right: any): unknown {
  switch (op) {
    case '+=': return cur + right;
    case '-=': return cur - right;
    case '*=': return cur * right;
    case '/=': return cur / right;
    case '%=': return cur % right;
    case '**=': return cur ** right;
    default: throw new Error(`Unsupported assignment operator: ${op}`);
  }
}

class SandboxEvaluator {
  private readonly budget: ExecBudget = { steps: 0, depth: 0 };

  /** Runs a top-level evaluation inside an elevated depth frame so closures share the step budget. */
  runWithDepthFrame<T>(fn: () => T): T {
    this.budget.depth++;
    try {
      return fn();
    } finally {
      this.budget.depth--;
    }
  }

  hoistStatements(stmts: StmtNode[], env: Env): void {
    for (const stmt of stmts) {
      if (stmt.kind === 'FunctionDecl') {
        const fn = this.createClosure(
          stmt.params,
          stmt.body,
          env,
          stmt.isAsync,
          false,
          undefined,
          stmt.name
        );
        env.define(stmt.name, 'var', fn);
      } else if (stmt.kind === 'VarDecl' && stmt.declKind === 'var') {
        const fnEnv = env.getFunctionScope();
        for (const d of stmt.decls) {
          this.hoistPatternNames(d.pattern, fnEnv);
        }
      }
    }
  }

  private hoistPatternNames(pat: PatternNode, env: Env): void {
    if (pat.kind === 'IdentPat') {
      if (!env.vars.has(pat.name)) env.define(pat.name, 'var', undefined);
    } else if (pat.kind === 'ObjectPat') {
      for (const p of pat.props) this.hoistPatternNames(p.value, env);
      if (pat.rest && !env.vars.has(pat.rest)) env.define(pat.rest, 'var', undefined);
    } else if (pat.kind === 'ArrayPat') {
      for (const e of pat.elems) if (e) this.hoistPatternNames(e.pattern, env);
      if (pat.rest && !env.vars.has(pat.rest)) env.define(pat.rest, 'var', undefined);
    }
  }

  private createClosure(
    params: ParamSpec[],
    body: StmtNode[],
    closureEnv: Env,
    isAsync: boolean,
    isArrow: boolean,
    exprBody?: ExprNode,
    fnName?: string
  ): (...args: unknown[]) => unknown {
    const evaluator = this;
    if (isAsync) {
      const asyncFn = async function (this: unknown, ...args: unknown[]) {
        const resetBudget = evaluator.budget.depth === 0;
        if (resetBudget) evaluator.budget.steps = 0;
        if (evaluator.budget.depth >= MAX_CALL_DEPTH) {
          throw new Error('[Sandbox Security] Maximum call stack depth exceeded.');
        }
        evaluator.budget.depth++;
        try {
          const callEnv = new Env(closureEnv, true);
          if (fnName) callEnv.define(fnName, 'const', asyncFn); // allow recursive lookup
          if (!isArrow) callEnv.define('this', 'const', this);
          for (let idx = 0; idx < params.length; idx++) {
            const param = params[idx];
            if (param.isRest) {
              evaluator.bindPattern(param.pattern, 'let', args.slice(idx), callEnv);
              break;
            }
            const rawVal = idx < args.length ? args[idx] : undefined;
            const resolvedVal = rawVal === undefined && param.defaultExpr
              ? await evaluator.evalExprAsync(param.defaultExpr, callEnv)
              : rawVal;
            evaluator.bindPattern(param.pattern, 'let', resolvedVal, callEnv);
          }
          if (exprBody) {
            return await evaluator.evalExprAsync(exprBody, callEnv);
          }
          evaluator.hoistStatements(body, callEnv);
          const res = await evaluator.execStmtListAsync(body, callEnv);
          return res.type === 'return' ? res.value : undefined;
        } finally {
          evaluator.budget.depth--;
        }
      };
      SANDBOX_CLOSURE_FUNCTIONS.add(asyncFn);
      return asyncFn;
    }

    const syncFn = function (this: unknown, ...args: unknown[]) {
      const resetBudget = evaluator.budget.depth === 0;
      if (resetBudget) evaluator.budget.steps = 0;
      if (evaluator.budget.depth >= MAX_CALL_DEPTH) {
        throw new Error('[Sandbox Security] Maximum call stack depth exceeded.');
      }
      evaluator.budget.depth++;
      try {
        const callEnv = new Env(closureEnv, true);
        if (fnName) callEnv.define(fnName, 'const', syncFn);
        if (!isArrow) callEnv.define('this', 'const', this);
        for (let idx = 0; idx < params.length; idx++) {
          const param = params[idx];
          if (param.isRest) {
            evaluator.bindPattern(param.pattern, 'let', args.slice(idx), callEnv);
            break;
          }
          const rawVal = idx < args.length ? args[idx] : undefined;
          const resolvedVal = rawVal === undefined && param.defaultExpr
            ? evaluator.evalExprSync(param.defaultExpr, callEnv)
            : rawVal;
          evaluator.bindPattern(param.pattern, 'let', resolvedVal, callEnv);
        }
        if (exprBody) {
          return evaluator.evalExprSync(exprBody, callEnv);
        }
        evaluator.hoistStatements(body, callEnv);
        const res = evaluator.execStmtListSync(body, callEnv);
        return res.type === 'return' ? res.value : undefined;
      } finally {
        evaluator.budget.depth--;
      }
    };
    SANDBOX_CLOSURE_FUNCTIONS.add(syncFn);
    return syncFn;
  }

  private bindPattern(pat: PatternNode, declKind: 'const' | 'let' | 'var', val: unknown, env: Env): void {
    const targetEnv = declKind === 'var' ? env.getFunctionScope() : env;
    if (pat.kind === 'IdentPat') {
      assertSafeValue(val);
      if (declKind === 'var' && targetEnv.vars.has(pat.name)) {
        targetEnv.set(pat.name, val);
      } else {
        targetEnv.define(pat.name, declKind, val);
      }
      return;
    }
    if (pat.kind === 'ObjectPat') {
      if (val === null || val === undefined) {
        throw new TypeError(`Cannot destructure property of ${String(val)}`);
      }
      const obj = val as Record<string, unknown>;
      const usedKeys = new Set<string>();
      for (const prop of pat.props) {
        const keyVal = this.evalExprSync(prop.key, env);
        const key = assertSafePropertyKey(keyVal);
        usedKeys.add(key);
        let propVal = readSafeProp(obj, key);
        if (propVal === undefined && prop.defaultExpr) {
          propVal = this.evalExprSync(prop.defaultExpr, env);
        }
        this.bindPattern(prop.value, declKind, propVal, env);
      }
      if (pat.rest) {
        const restObj: Record<string, unknown> = {};
        for (const k of Object.keys(obj)) {
          if (!usedKeys.has(k) && !BLOCKED_PROPERTY_KEYS.has(k)) {
            const v = obj[k];
            assertSafeValue(v);
            restObj[k] = v;
          }
        }
        this.bindPattern({ kind: 'IdentPat', name: pat.rest }, declKind, restObj, env);
      }
      return;
    }
    if (pat.kind === 'ArrayPat') {
      const arr = Array.from(val as Iterable<unknown>);
      for (let i = 0; i < pat.elems.length; i++) {
        const elem = pat.elems[i];
        if (!elem) continue;
        let itemVal = arr[i];
        if (itemVal === undefined && elem.defaultExpr) {
          itemVal = this.evalExprSync(elem.defaultExpr, env);
        }
        assertSafeValue(itemVal);
        this.bindPattern(elem.pattern, declKind, itemVal, env);
      }
      if (pat.rest) {
        this.bindPattern({ kind: 'IdentPat', name: pat.rest }, declKind, arr.slice(pat.elems.length), env);
      }
    }
  }

  // Synchronous Evaluation ---------------------------------------------------

  execStmtListSync(stmts: StmtNode[], env: Env): ControlSignal {
    let lastVal: unknown = undefined;
    for (const stmt of stmts) {
      const sig = this.execStmtSync(stmt, env);
      if (sig.type !== 'normal') return sig;
      lastVal = sig.value;
    }
    return { type: 'normal', value: lastVal };
  }

  execStmtSync(stmt: StmtNode, env: Env): ControlSignal {
    tickStep(this.budget);
    switch (stmt.kind) {
      case 'Empty':
      case 'FunctionDecl':
        return NORMAL_VOID;
      case 'Block': {
        const blockEnv = new Env(env);
        this.hoistStatements(stmt.body, blockEnv);
        return this.execStmtListSync(stmt.body, blockEnv);
      }
      case 'ExprStmt':
        return { type: 'normal', value: this.evalExprSync(stmt.expr, env) };
      case 'VarDecl': {
        for (const decl of stmt.decls) {
          const val = decl.init ? this.evalExprSync(decl.init, env) : undefined;
          this.bindPattern(decl.pattern, stmt.declKind, val, env);
        }
        return NORMAL_VOID;
      }
      case 'If': {
        if (this.evalExprSync(stmt.test, env)) {
          return this.execStmtSync(stmt.consequent, env);
        }
        return stmt.alternate ? this.execStmtSync(stmt.alternate, env) : NORMAL_VOID;
      }
      case 'While': {
        while (this.evalExprSync(stmt.test, env)) {
          const sig = this.execStmtSync(stmt.body, env);
          if (sig.type === 'break') break;
          if (sig.type === 'return') return sig;
        }
        return NORMAL_VOID;
      }
      case 'DoWhile': {
        do {
          const sig = this.execStmtSync(stmt.body, env);
          if (sig.type === 'break') break;
          if (sig.type === 'return') return sig;
        } while (this.evalExprSync(stmt.test, env));
        return NORMAL_VOID;
      }
      case 'For': {
        const loopEnv = new Env(env);
        if (stmt.init) {
          if ('kind' in stmt.init && stmt.init.kind === 'VarDecl') {
            this.execStmtSync(stmt.init as StmtNode, loopEnv);
          } else {
            this.evalExprSync(stmt.init as ExprNode, loopEnv);
          }
        }
        while (!stmt.test || this.evalExprSync(stmt.test, loopEnv)) {
          const sig = this.execStmtSync(stmt.body, loopEnv);
          if (sig.type === 'break') break;
          if (sig.type === 'return') return sig;
          if (stmt.update) this.evalExprSync(stmt.update, loopEnv);
        }
        return NORMAL_VOID;
      }
      case 'ForIter': {
        const right = this.evalExprSync(stmt.right, env);
        if (stmt.mode === 'of') {
          for (const item of right as Iterable<unknown>) {
            const iterEnv = new Env(env);
            if (stmt.declKind) {
              this.bindPattern(stmt.left, stmt.declKind, item, iterEnv);
            } else if (stmt.left.kind === 'IdentPat') {
              env.set(stmt.left.name, item);
            }
            const sig = this.execStmtSync(stmt.body, iterEnv);
            if (sig.type === 'break') break;
            if (sig.type === 'return') return sig;
          }
        } else {
          for (const key in right as Record<string, unknown>) {
            if (BLOCKED_PROPERTY_KEYS.has(key)) continue;
            const iterEnv = new Env(env);
            if (stmt.declKind) {
              this.bindPattern(stmt.left, stmt.declKind, key, iterEnv);
            } else if (stmt.left.kind === 'IdentPat') {
              env.set(stmt.left.name, key);
            }
            const sig = this.execStmtSync(stmt.body, iterEnv);
            if (sig.type === 'break') break;
            if (sig.type === 'return') return sig;
          }
        }
        return NORMAL_VOID;
      }
      case 'Switch': {
        const disc = this.evalExprSync(stmt.discriminant, env);
        const switchEnv = new Env(env);
        let matched = false;
        let defaultIdx = -1;
        for (let idx = 0; idx < stmt.cases.length; idx++) {
          const c = stmt.cases[idx];
          if (!matched) {
            if (c.test === null) {
              defaultIdx = idx;
              continue;
            }
            if (this.evalExprSync(c.test, switchEnv) !== disc) continue;
            matched = true;
          }
          const sig = this.execStmtListSync(c.consequent, switchEnv);
          if (sig.type === 'break') return NORMAL_VOID;
          if (sig.type !== 'normal') return sig;
        }
        if (!matched && defaultIdx !== -1) {
          for (let idx = defaultIdx; idx < stmt.cases.length; idx++) {
            const sig = this.execStmtListSync(stmt.cases[idx].consequent, switchEnv);
            if (sig.type === 'break') return NORMAL_VOID;
            if (sig.type !== 'normal') return sig;
          }
        }
        return NORMAL_VOID;
      }
      case 'Try': {
        let sig: ControlSignal = NORMAL_VOID;
        try {
          const tryEnv = new Env(env);
          this.hoistStatements(stmt.block, tryEnv);
          sig = this.execStmtListSync(stmt.block, tryEnv);
        } catch (err) {
          if (stmt.handlerBlock) {
            const catchEnv = new Env(env);
            if (stmt.handlerParam) {
              this.bindPattern(stmt.handlerParam, 'let', err, catchEnv);
            }
            this.hoistStatements(stmt.handlerBlock, catchEnv);
            sig = this.execStmtListSync(stmt.handlerBlock, catchEnv);
          } else {
            if (stmt.finalizer) {
              const finEnv = new Env(env);
              this.hoistStatements(stmt.finalizer, finEnv);
              this.execStmtListSync(stmt.finalizer, finEnv);
            }
            throw err;
          }
        }
        if (stmt.finalizer) {
          const finEnv = new Env(env);
          this.hoistStatements(stmt.finalizer, finEnv);
          const finSig = this.execStmtListSync(stmt.finalizer, finEnv);
          if (finSig.type !== 'normal') return finSig;
        }
        return sig;
      }
      case 'Return':
        return { type: 'return', value: stmt.arg ? this.evalExprSync(stmt.arg, env) : undefined };
      case 'Throw':
        throw this.evalExprSync(stmt.arg, env);
      case 'Break':
        return { type: 'break' };
      case 'Continue':
        return { type: 'continue' };
    }
  }

  private evalExprSync(expr: ExprNode, env: Env): unknown {
    tickStep(this.budget);
    switch (expr.kind) {
      case 'Literal':
        return expr.value;
      case 'RegexLit':
        return new RegExp(expr.pattern, expr.flags);
      case 'Ident':
        return env.get(expr.name);
      case 'This': {
        const slot = env.lookup('this');
        return slot ? slot.value : undefined;
      }
      case 'Template': {
        let out = expr.quasis[0];
        for (let i = 0; i < expr.exprs.length; i++) {
          const part = this.evalExprSync(expr.exprs[i], env);
          out += String(part) + expr.quasis[i + 1];
        }
        return out;
      }
      case 'Array': {
        const out: unknown[] = [];
        for (const el of expr.elems) {
          if (!el) {
            out.length += 1;
            continue;
          }
          const val = this.evalExprSync(el.expr, env);
          if (el.spread) {
            for (const item of val as Iterable<unknown>) {
              assertSafeValue(item);
              out.push(item);
            }
          } else {
            assertSafeValue(val);
            out.push(val);
          }
        }
        return out;
      }
      case 'Object': {
        const out: Record<string, unknown> = {};
        for (const prop of expr.props) {
          if (prop.kind === 'spread') {
            const src = this.evalExprSync(prop.expr, env);
            if (src && typeof src === 'object') {
              for (const k of Object.keys(src)) {
                if (BLOCKED_PROPERTY_KEYS.has(k)) continue;
                const val = (src as Record<string, unknown>)[k];
                assertSafeValue(val);
                out[k] = val;
              }
            }
          } else {
            const key = assertSafePropertyKey(this.evalExprSync(prop.keyExpr, env));
            const val = this.evalExprSync(prop.value, env);
            assertSafeValue(val);
            out[key] = val;
          }
        }
        return out;
      }
      case 'FunctionExpr':
        return this.createClosure(expr.params, expr.body, env, expr.isAsync, expr.isArrow, expr.exprBody, expr.name);
      case 'Unary': {
        if (expr.op === 'typeof') {
          if (expr.arg.kind === 'Ident' && !env.lookup(expr.arg.name)) {
            return 'undefined';
          }
          return typeof this.evalExprSync(expr.arg, env);
        }
        if (expr.op === 'delete') {
          if (expr.arg.kind === 'Chain' && expr.arg.steps.length > 0) {
            const lastIdx = expr.arg.steps.length - 1;
            const lastStep = expr.arg.steps[lastIdx];
            if (lastStep.kind === 'member') {
              const target = this.evalChainPrefixSync(expr.arg.base, expr.arg.steps.slice(0, lastIdx), env);
              const key = assertSafePropertyKey(this.evalExprSync(lastStep.prop, env));
              return target != null ? delete (target as Record<string, unknown>)[key] : true;
            }
          }
          return true;
        }
        const val = this.evalExprSync(expr.arg, env);
        switch (expr.op) {
          case '!': return !val;
          case '+': return Number(val);
          case '-': return -Number(val);
          case '~': return ~Number(val);
          case 'void': return undefined;
          default: return undefined;
        }
      }
      case 'Await':
        throw new SyntaxError('await is only valid inside async functions');
      case 'Update': {
        const delta = expr.op === '++' ? 1 : -1;
        if (expr.arg.kind === 'Ident') {
          const cur = Number(env.get(expr.arg.name));
          const next = cur + delta;
          env.set(expr.arg.name, next);
          return expr.prefix ? next : cur;
        }
        if (expr.arg.kind === 'Chain' && expr.arg.steps.length > 0) {
          const lastIdx = expr.arg.steps.length - 1;
          const lastStep = expr.arg.steps[lastIdx];
          if (lastStep.kind === 'member') {
            const target = this.evalChainPrefixSync(expr.arg.base, expr.arg.steps.slice(0, lastIdx), env);
            const key = assertSafePropertyKey(this.evalExprSync(lastStep.prop, env));
            const cur = Number(readSafeProp(target, key));
            const next = cur + delta;
            writeSafeProp(target, key, next);
            return expr.prefix ? next : cur;
          }
        }
        throw new SyntaxError('Invalid left-hand side expression in update operation');
      }
      case 'Binary': {
        const left = this.evalExprSync(expr.left, env);
        const right = this.evalExprSync(expr.right, env);
        return applyBinaryOp(expr.op, left, right);
      }
      case 'Logical': {
        const left = this.evalExprSync(expr.left, env);
        if (expr.op === '&&') return left ? this.evalExprSync(expr.right, env) : left;
        if (expr.op === '||') return left ? left : this.evalExprSync(expr.right, env);
        return left !== null && left !== undefined ? left : this.evalExprSync(expr.right, env);
      }
      case 'Cond':
        return this.evalExprSync(expr.test, env)
          ? this.evalExprSync(expr.consequent, env)
          : this.evalExprSync(expr.alternate, env);
      case 'Assign': {
        const evaluateRhs = () => this.evalExprSync(expr.right, env);
        if (expr.left.kind === 'Ident') {
          const name = expr.left.name;
          if (expr.op === '=') return env.set(name, evaluateRhs());
          const cur = env.get(name);
          if (expr.op === '??=') return cur ?? env.set(name, evaluateRhs());
          if (expr.op === '||=') return cur || env.set(name, evaluateRhs());
          if (expr.op === '&&=') return cur && env.set(name, evaluateRhs());
          return env.set(name, applyCompoundOp(expr.op, cur, evaluateRhs()));
        }
        if (expr.left.kind === 'Chain' && expr.left.steps.length > 0) {
          const lastIdx = expr.left.steps.length - 1;
          const lastStep = expr.left.steps[lastIdx];
          if (lastStep.kind === 'member') {
            const target = this.evalChainPrefixSync(expr.left.base, expr.left.steps.slice(0, lastIdx), env);
            const key = assertSafePropertyKey(this.evalExprSync(lastStep.prop, env));
            if (expr.op === '=') return writeSafeProp(target, key, evaluateRhs());
            const cur = readSafeProp(target, key);
            if (expr.op === '??=') return cur ?? writeSafeProp(target, key, evaluateRhs());
            if (expr.op === '||=') return cur || writeSafeProp(target, key, evaluateRhs());
            if (expr.op === '&&=') return cur && writeSafeProp(target, key, evaluateRhs());
            return writeSafeProp(target, key, applyCompoundOp(expr.op, cur, evaluateRhs()));
          }
        }
        throw new SyntaxError('Invalid left-hand side in assignment');
      }
      case 'New': {
        const Ctor = this.evalExprSync(expr.callee, env) as new (...a: unknown[]) => unknown;
        if (!SAFE_CONSTRUCTORS.has(Ctor)) {
          throw new Error('[Sandbox Security] Instantiating arbitrary constructors with "new" is prohibited.');
        }
        const args = this.evalArgsSync(expr.args, env);
        const instance = new Ctor(...args);
        assertSafeValue(instance);
        return instance;
      }
      case 'Sequence': {
        let res: unknown = undefined;
        for (const sub of expr.exprs) res = this.evalExprSync(sub, env);
        return res;
      }
      case 'Chain':
        return this.evalChainPrefixSync(expr.base, expr.steps, env);
    }
  }

  private evalArgsSync(args: Array<{ expr: ExprNode; spread: boolean }>, env: Env): unknown[] {
    const out: unknown[] = [];
    for (const arg of args) {
      const val = this.evalExprSync(arg.expr, env);
      if (arg.spread) {
        for (const item of val as Iterable<unknown>) {
          assertSafeValue(item);
          out.push(item);
        }
      } else {
        assertSafeValue(val);
        out.push(val);
      }
    }
    return out;
  }

  private evalChainPrefixSync(base: ExprNode, steps: ChainStep[], env: Env): unknown {
    let current: unknown = this.evalExprSync(base, env);
    let thisArg: unknown = undefined;

    for (const step of steps) {
      if (step.optional && (current === null || current === undefined)) {
        return undefined;
      }
      if (step.kind === 'member') {
        const key = this.evalExprSync(step.prop, env);
        thisArg = current;
        current = readSafeProp(current, key);
      } else {
        if (typeof current !== 'function' || BLOCKED_HOST_VALUES.has(current)) {
          if (step.optional && current === undefined) return undefined;
          throw new TypeError('Target is not a callable function in sandbox');
        }
        const callArgs = this.evalArgsSync(step.args, env);
        const result = (current as (...a: unknown[]) => unknown).apply(thisArg, callArgs);
        assertSafeValue(result);
        current = result;
        thisArg = undefined;
      }
    }
    return current;
  }

  // Asynchronous Evaluation (for `async` functions using `await`) -------------

  async execStmtListAsync(stmts: StmtNode[], env: Env): Promise<ControlSignal> {
    let lastVal: unknown = undefined;
    for (const stmt of stmts) {
      const sig = await this.execStmtAsync(stmt, env);
      if (sig.type !== 'normal') return sig;
      lastVal = sig.value;
    }
    return { type: 'normal', value: lastVal };
  }

  async execStmtAsync(stmt: StmtNode, env: Env): Promise<ControlSignal> {
    tickStep(this.budget);
    switch (stmt.kind) {
      case 'Empty':
      case 'FunctionDecl':
        return NORMAL_VOID;
      case 'Block': {
        const blockEnv = new Env(env);
        this.hoistStatements(stmt.body, blockEnv);
        return await this.execStmtListAsync(stmt.body, blockEnv);
      }
      case 'ExprStmt':
        return { type: 'normal', value: await this.evalExprAsync(stmt.expr, env) };
      case 'VarDecl': {
        for (const decl of stmt.decls) {
          const val = decl.init ? await this.evalExprAsync(decl.init, env) : undefined;
          this.bindPattern(decl.pattern, stmt.declKind, val, env);
        }
        return NORMAL_VOID;
      }
      case 'If': {
        if (await this.evalExprAsync(stmt.test, env)) {
          return await this.execStmtAsync(stmt.consequent, env);
        }
        return stmt.alternate ? await this.execStmtAsync(stmt.alternate, env) : NORMAL_VOID;
      }
      case 'While': {
        while (await this.evalExprAsync(stmt.test, env)) {
          const sig = await this.execStmtAsync(stmt.body, env);
          if (sig.type === 'break') break;
          if (sig.type === 'return') return sig;
        }
        return NORMAL_VOID;
      }
      case 'DoWhile': {
        do {
          const sig = await this.execStmtAsync(stmt.body, env);
          if (sig.type === 'break') break;
          if (sig.type === 'return') return sig;
        } while (await this.evalExprAsync(stmt.test, env));
        return NORMAL_VOID;
      }
      case 'For': {
        const loopEnv = new Env(env);
        if (stmt.init) {
          if ('kind' in stmt.init && stmt.init.kind === 'VarDecl') {
            await this.execStmtAsync(stmt.init as StmtNode, loopEnv);
          } else {
            await this.evalExprAsync(stmt.init as ExprNode, loopEnv);
          }
        }
        while (!stmt.test || (await this.evalExprAsync(stmt.test, loopEnv))) {
          const sig = await this.execStmtAsync(stmt.body, loopEnv);
          if (sig.type === 'break') break;
          if (sig.type === 'return') return sig;
          if (stmt.update) await this.evalExprAsync(stmt.update, loopEnv);
        }
        return NORMAL_VOID;
      }
      case 'ForIter': {
        const right = await this.evalExprAsync(stmt.right, env);
        if (stmt.mode === 'of') {
          for (const item of right as Iterable<unknown>) {
            const iterEnv = new Env(env);
            if (stmt.declKind) {
              this.bindPattern(stmt.left, stmt.declKind, item, iterEnv);
            } else if (stmt.left.kind === 'IdentPat') {
              env.set(stmt.left.name, item);
            }
            const sig = await this.execStmtAsync(stmt.body, iterEnv);
            if (sig.type === 'break') break;
            if (sig.type === 'return') return sig;
          }
        } else {
          for (const key in right as Record<string, unknown>) {
            if (BLOCKED_PROPERTY_KEYS.has(key)) continue;
            const iterEnv = new Env(env);
            if (stmt.declKind) {
              this.bindPattern(stmt.left, stmt.declKind, key, iterEnv);
            } else if (stmt.left.kind === 'IdentPat') {
              env.set(stmt.left.name, key);
            }
            const sig = await this.execStmtAsync(stmt.body, iterEnv);
            if (sig.type === 'break') break;
            if (sig.type === 'return') return sig;
          }
        }
        return NORMAL_VOID;
      }
      case 'Try': {
        let sig: ControlSignal = NORMAL_VOID;
        try {
          const tryEnv = new Env(env);
          this.hoistStatements(stmt.block, tryEnv);
          sig = await this.execStmtListAsync(stmt.block, tryEnv);
        } catch (err) {
          if (stmt.handlerBlock) {
            const catchEnv = new Env(env);
            if (stmt.handlerParam) this.bindPattern(stmt.handlerParam, 'let', err, catchEnv);
            this.hoistStatements(stmt.handlerBlock, catchEnv);
            sig = await this.execStmtListAsync(stmt.handlerBlock, catchEnv);
          } else {
            if (stmt.finalizer) {
              const finEnv = new Env(env);
              this.hoistStatements(stmt.finalizer, finEnv);
              await this.execStmtListAsync(stmt.finalizer, finEnv);
            }
            throw err;
          }
        }
        if (stmt.finalizer) {
          const finEnv = new Env(env);
          this.hoistStatements(stmt.finalizer, finEnv);
          const finSig = await this.execStmtListAsync(stmt.finalizer, finEnv);
          if (finSig.type !== 'normal') return finSig;
        }
        return sig;
      }
      case 'Return':
        return { type: 'return', value: stmt.arg ? await this.evalExprAsync(stmt.arg, env) : undefined };
      case 'Throw':
        throw await this.evalExprAsync(stmt.arg, env);
      case 'Switch': {
        const disc = await this.evalExprAsync(stmt.discriminant, env);
        const switchEnv = new Env(env);
        let matched = false;
        let defaultIdx = -1;
        for (let idx = 0; idx < stmt.cases.length; idx++) {
          const c = stmt.cases[idx];
          if (!matched) {
            if (c.test === null) {
              defaultIdx = idx;
              continue;
            }
            if ((await this.evalExprAsync(c.test, switchEnv)) !== disc) continue;
            matched = true;
          }
          const sig = await this.execStmtListAsync(c.consequent, switchEnv);
          if (sig.type === 'break') return NORMAL_VOID;
          if (sig.type !== 'normal') return sig;
        }
        if (!matched && defaultIdx !== -1) {
          for (let idx = defaultIdx; idx < stmt.cases.length; idx++) {
            const sig = await this.execStmtListAsync(stmt.cases[idx].consequent, switchEnv);
            if (sig.type === 'break') return NORMAL_VOID;
            if (sig.type !== 'normal') return sig;
          }
        }
        return NORMAL_VOID;
      }
      case 'Break':
        return { type: 'break' };
      case 'Continue':
        return { type: 'continue' };
      default:
        return this.execStmtSync(stmt, env);
    }
  }

  async evalExprAsync(expr: ExprNode, env: Env): Promise<unknown> {
    tickStep(this.budget);
    switch (expr.kind) {
      case 'Await': {
        const awaited = await this.evalExprAsync(expr.arg, env);
        assertSafeValue(awaited);
        return awaited;
      }
      case 'Template': {
        let out = expr.quasis[0];
        for (let i = 0; i < expr.exprs.length; i++) {
          const part = await this.evalExprAsync(expr.exprs[i], env);
          out += String(part) + expr.quasis[i + 1];
        }
        return out;
      }
      case 'Array': {
        const out: unknown[] = [];
        for (const el of expr.elems) {
          if (!el) {
            out.length += 1;
            continue;
          }
          const val = await this.evalExprAsync(el.expr, env);
          if (el.spread) {
            for (const item of val as Iterable<unknown>) {
              assertSafeValue(item);
              out.push(item);
            }
          } else {
            assertSafeValue(val);
            out.push(val);
          }
        }
        return out;
      }
      case 'Object': {
        const out: Record<string, unknown> = {};
        for (const prop of expr.props) {
          if (prop.kind === 'spread') {
            const src = await this.evalExprAsync(prop.expr, env);
            if (src && typeof src === 'object') {
              for (const k of Object.keys(src)) {
                if (BLOCKED_PROPERTY_KEYS.has(k)) continue;
                const val = (src as Record<string, unknown>)[k];
                assertSafeValue(val);
                out[k] = val;
              }
            }
          } else {
            const key = assertSafePropertyKey(await this.evalExprAsync(prop.keyExpr, env));
            const val = await this.evalExprAsync(prop.value, env);
            assertSafeValue(val);
            out[key] = val;
          }
        }
        return out;
      }
      case 'Binary': {
        const left = await this.evalExprAsync(expr.left, env);
        const right = await this.evalExprAsync(expr.right, env);
        return applyBinaryOp(expr.op, left, right);
      }
      case 'Logical': {
        const left = await this.evalExprAsync(expr.left, env);
        if (expr.op === '&&') return left ? await this.evalExprAsync(expr.right, env) : left;
        if (expr.op === '||') return left ? left : await this.evalExprAsync(expr.right, env);
        return left !== null && left !== undefined ? left : await this.evalExprAsync(expr.right, env);
      }
      case 'Cond':
        return (await this.evalExprAsync(expr.test, env))
          ? await this.evalExprAsync(expr.consequent, env)
          : await this.evalExprAsync(expr.alternate, env);
      case 'Assign': {
        const evaluateRhs = () => this.evalExprAsync(expr.right, env);
        if (expr.left.kind === 'Ident') {
          const name = expr.left.name;
          if (expr.op === '=') return env.set(name, await evaluateRhs());
          const cur = env.get(name);
          if (expr.op === '??=') return cur ?? env.set(name, await evaluateRhs());
          if (expr.op === '||=') return cur || env.set(name, await evaluateRhs());
          if (expr.op === '&&=') return cur && env.set(name, await evaluateRhs());
          return env.set(name, applyCompoundOp(expr.op, cur, await evaluateRhs()));
        }
        if (expr.left.kind === 'Chain' && expr.left.steps.length > 0) {
          const lastIdx = expr.left.steps.length - 1;
          const lastStep = expr.left.steps[lastIdx];
          if (lastStep.kind === 'member') {
            const target = await this.evalChainPrefixAsync(expr.left.base, expr.left.steps.slice(0, lastIdx), env);
            const key = assertSafePropertyKey(await this.evalExprAsync(lastStep.prop, env));
            if (expr.op === '=') return writeSafeProp(target, key, await evaluateRhs());
            const cur = readSafeProp(target, key);
            if (expr.op === '??=') return cur ?? writeSafeProp(target, key, await evaluateRhs());
            if (expr.op === '||=') return cur || writeSafeProp(target, key, await evaluateRhs());
            if (expr.op === '&&=') return cur && writeSafeProp(target, key, await evaluateRhs());
            return writeSafeProp(target, key, applyCompoundOp(expr.op, cur, await evaluateRhs()));
          }
        }
        throw new SyntaxError('Invalid left-hand side in assignment');
      }
      case 'New': {
        const Ctor = (await this.evalExprAsync(expr.callee, env)) as new (...a: unknown[]) => unknown;
        if (!SAFE_CONSTRUCTORS.has(Ctor)) {
          throw new Error('[Sandbox Security] Instantiating arbitrary constructors with "new" is prohibited.');
        }
        const args = await this.evalArgsAsync(expr.args, env);
        const instance = new Ctor(...args);
        assertSafeValue(instance);
        return instance;
      }
      case 'Chain':
        return await this.evalChainPrefixAsync(expr.base, expr.steps, env);
      default:
        return this.evalExprSync(expr, env);
    }
  }

  private async evalArgsAsync(args: Array<{ expr: ExprNode; spread: boolean }>, env: Env): Promise<unknown[]> {
    const out: unknown[] = [];
    for (const arg of args) {
      const val = await this.evalExprAsync(arg.expr, env);
      if (arg.spread) {
        for (const item of val as Iterable<unknown>) {
          assertSafeValue(item);
          out.push(item);
        }
      } else {
        assertSafeValue(val);
        out.push(val);
      }
    }
    return out;
  }

  private async evalChainPrefixAsync(base: ExprNode, steps: ChainStep[], env: Env): Promise<unknown> {
    let current: unknown = await this.evalExprAsync(base, env);
    let thisArg: unknown = undefined;

    for (const step of steps) {
      if (step.optional && (current === null || current === undefined)) {
        return undefined;
      }
      if (step.kind === 'member') {
        const key = await this.evalExprAsync(step.prop, env);
        thisArg = current;
        current = readSafeProp(current, key);
      } else {
        if (typeof current !== 'function' || BLOCKED_HOST_VALUES.has(current)) {
          if (step.optional && current === undefined) return undefined;
          throw new TypeError('Target is not a callable function in sandbox');
        }
        const callArgs = await this.evalArgsAsync(step.args, env);
        const result = (current as (...a: unknown[]) => unknown).apply(thisArg, callArgs);
        assertSafeValue(result);
        current = result;
        thisArg = undefined;
      }
    }
    return current;
  }
}

/**
 * Parses and executes sandboxed JavaScript (post TypeScript signature stripping)
 * completely in-memory via an AST interpreter with zero `eval` / `Function` calls.
 */
export function evaluateSandboxedProgram(
  code: string,
  scope: Record<string, unknown>,
  componentNames: string[]
): unknown {
  const tokens = tokenize(code);
  const parser = new SandboxParser(tokens);
  const ast = parser.parseProgram();

  const rootEnv = new Env(null, true);
  const intrinsics = createSafeIntrinsics();
  for (const [k, v] of Object.entries(intrinsics)) {
    rootEnv.define(k, 'const', v);
  }
  for (const [k, v] of Object.entries(scope)) {
    if (!BLOCKED_PROPERTY_KEYS.has(k)) {
      rootEnv.vars.set(k, { kind: 'const', value: v });
    }
  }

  const evaluator = new SandboxEvaluator();
  // Keep depth >= 1 across initial program + entry component evaluation so closures cannot reset step budget
  return evaluator.runWithDepthFrame(() => {
    evaluator.hoistStatements(ast, rootEnv);
    const sig = evaluator.execStmtListSync(ast, rootEnv);

    if (sig.type === 'return') {
      assertSafeValue(sig.value);
      return sig.value;
    }

    const detectedPrimary = ast.find(
      (s): s is Extract<StmtNode, { kind: 'FunctionDecl' }> => s.kind === 'FunctionDecl'
    )?.name;
    const primaryName = componentNames[0] ?? detectedPrimary;
    if (primaryName) {
      const slot = rootEnv.lookup(primaryName);
      if (slot && typeof slot.value === 'function') {
        const res = (slot.value as () => unknown)();
        assertSafeValue(res);
        return res;
      }
    }

    const finalVal = sig.type === 'normal' ? sig.value : null;
    assertSafeValue(finalVal);
    return finalVal;
  });
}
