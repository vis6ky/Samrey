/**
 * @license Apache-2.0
 * @samrey/compiler - Structured Error Code System & Source Code Framing
 */

export interface SourceLocationInfo {
  filename?: string;
  line: number;
  column: number;
  offset?: number;
  length?: number;
}

export type SamreyErrorCode =
  | 'AETH-101' // Unclosed Tag
  | 'AETH-102' // Invalid Expression / Unclosed Interpolation
  | 'AETH-103' // Missing Required Directive Prop (e.g. <For> missing 'each' or 'key')
  | 'AETH-104' // Unexpected Closing Tag
  | 'AETH-105' // Invalid Attribute Syntax
  | 'AETH-106' // Unclosed Comment
  | 'AETH-107' // Duplicate Attribute
  | 'AETH-201' // Security Violation: Dangerous Scheme / Insecure Payload
  | 'AETH-202' // Accessibility Violation: Missing required accessibility attributes
  | 'AETH-301' // Reactivity: Cyclic Dependency / Infinite Effect Loop
  | 'AETH-302' // Runtime: Duplicate Key in <For> Reconciliation
  | 'AETH-303' // SSR/Hydration: DOM Tree / Attribute Mismatch
  | 'AETH-401' // Router: Route Not Found / Invalid Route Configuration
  | 'AETH-402' // HTTP: Resource Request Failure
  | 'AETH-501'; // Forms: Standard Schema Validation Error

export interface ErrorDefinition {
  code: SamreyErrorCode;
  title: string;
  defaultExplanation: string;
  defaultSuggestion: string;
}

export const ERROR_REGISTRY: Record<SamreyErrorCode, ErrorDefinition> = {
  'AETH-101': {
    code: 'AETH-101',
    title: 'Unclosed HTML/JSX Tag',
    defaultExplanation: 'An opening tag was not matched with a corresponding closing tag before the end of the template.',
    defaultSuggestion: 'Check for missing closing tags (e.g. </div> or self-closing <Component />).'
  },
  'AETH-102': {
    code: 'AETH-102',
    title: 'Invalid Expression',
    defaultExplanation: 'An interpolation expression was started with "{" but not properly closed with "}" or contains malformed syntax.',
    defaultSuggestion: 'Ensure all curly braces "{" are paired with closing "}" and expressions are syntactically valid.'
  },
  'AETH-103': {
    code: 'AETH-103',
    title: 'Missing Required Directive Prop',
    defaultExplanation: 'A built-in control flow component (<Show> or <For>) is missing one of its required props.',
    defaultSuggestion: 'Provide "when" for <Show>, or "each" and "key" for <For> (e.g. <For each={items()} key="id">).'
  },
  'AETH-104': {
    code: 'AETH-104',
    title: 'Unexpected Closing Tag',
    defaultExplanation: 'Encountered a closing tag that does not correspond to any active open tag in the hierarchy.',
    defaultSuggestion: 'Check tag nesting order and ensure closing tags match their opening counterpart.'
  },
  'AETH-105': {
    code: 'AETH-105',
    title: 'Invalid Attribute Syntax',
    defaultExplanation: 'Attribute name or value contains invalid characters or an unclosed quote string.',
    defaultSuggestion: 'Ensure attribute values are properly quoted or enclosed in dynamic curly brackets "{...}".'
  },
  'AETH-106': {
    code: 'AETH-106',
    title: 'Unclosed Comment',
    defaultExplanation: 'An HTML comment "<!--" was opened but reached the end of the file without "-->".',
    defaultSuggestion: 'Add "-->" to close the comment block.'
  },
  'AETH-107': {
    code: 'AETH-107',
    title: 'Duplicate Attribute',
    defaultExplanation: 'The same attribute is defined multiple times on a single element.',
    defaultSuggestion: 'Remove or consolidate duplicate attribute declarations.'
  },
  'AETH-201': {
    code: 'AETH-201',
    title: 'Security Violation',
    defaultExplanation: 'The template contains potentially dangerous code constructs such as javascript: URLs, unescaped raw HTML injection, or forbidden inline scripts.',
    defaultSuggestion: 'Use safe URLs (http, https, relative) and avoid inline script injections.'
  },
  'AETH-202': {
    code: 'AETH-202',
    title: 'Accessibility Non-Conformance',
    defaultExplanation: 'Element fails WCAG accessibility guidelines (e.g. <img> without alt, <button> without accessible label).',
    defaultSuggestion: 'Add meaningful alt attributes or aria-label attributes to the element.'
  },
  'AETH-301': {
    code: 'AETH-301',
    title: 'Cyclic Reactive Graph Dependency',
    defaultExplanation: 'A signal or computed dependency graph cycle was detected during propagation or effect execution.',
    defaultSuggestion: 'Avoid writing to a signal inside an effect that synchronously reads that same signal without untrack().'
  },
  'AETH-302': {
    code: 'AETH-302',
    title: 'Duplicate Key in Keyed List',
    defaultExplanation: 'Multiple items in a <For> keyed collection share the exact same key value.',
    defaultSuggestion: 'Ensure the key function or property generates unique identifiers across all list items.'
  },
  'AETH-303': {
    code: 'AETH-303',
    title: 'SSR Hydration Mismatch',
    defaultExplanation: 'The DOM structure or attribute rendered on the server does not match the client initial render.',
    defaultSuggestion: 'Ensure server-rendered state and client initial state are identical, or defer browser-only attributes to onMount.'
  },
  'AETH-401': {
    code: 'AETH-401',
    title: 'Route Resolution Error',
    defaultExplanation: 'The requested path did not match any registered routes and no fallback route was defined.',
    defaultSuggestion: 'Register a catch-all route (path: "*") or verify the navigation URL.'
  },
  'AETH-402': {
    code: 'AETH-402',
    title: 'HTTP Resource Error',
    defaultExplanation: 'A createResource request failed or returned a non-2xx status code.',
    defaultSuggestion: 'Check endpoint availability, network status, and error boundary fallback handlers.'
  },
  'AETH-501': {
    code: 'AETH-501',
    title: 'Form Validation Schema Error',
    defaultExplanation: 'Form input values failed Standard Schema validation constraints.',
    defaultSuggestion: 'Verify field validation requirements and error message displays.'
  }
};

/**
 * Generate a visual source frame highlighting error location with line numbers and pointer.
 */
export function generateSourceFrame(
  source: string,
  line: number,
  column: number,
  length = 1,
  contextLines = 2
): string {
  if (!source) return '';
  const lines = source.split(/\r?\n/);
  const targetLineIdx = line - 1;

  if (targetLineIdx < 0 || targetLineIdx >= lines.length) {
    return '';
  }

  const startIdx = Math.max(0, targetLineIdx - contextLines);
  const endIdx = Math.min(lines.length - 1, targetLineIdx + contextLines);
  const maxLineNumWidth = String(endIdx + 1).length;

  const output: string[] = [];

  for (let i = startIdx; i <= endIdx; i++) {
    const lineNum = String(i + 1).padStart(maxLineNumWidth, ' ');
    const lineContent = lines[i];
    const isTarget = i === targetLineIdx;
    const prefix = isTarget ? ` > ${lineNum} | ` : `   ${lineNum} | `;
    output.push(`${prefix}${lineContent}`);

    if (isTarget) {
      const colPad = ' '.repeat(Math.max(0, column - 1));
      const pointer = '^'.repeat(Math.max(1, length));
      output.push(`   ${' '.repeat(maxLineNumWidth)} | ${colPad}${pointer}`);
    }
  }

  return output.join('\n');
}

export interface SamreyDiagnosticOptions {
  code: SamreyErrorCode;
  message?: string;
  source?: string;
  filename?: string;
  line?: number;
  column?: number;
  offset?: number;
  length?: number;
  explanation?: string;
  suggestion?: string;
}

export class SamreyCompilerError extends Error {
  public readonly code: SamreyErrorCode;
  public readonly filename?: string;
  public readonly line: number;
  public readonly column: number;
  public readonly offset?: number;
  public readonly length?: number;
  public readonly explanation: string;
  public readonly suggestion: string;
  public readonly sourceFrame?: string;

  constructor(options: SamreyDiagnosticOptions) {
    const def = ERROR_REGISTRY[options.code] || {
      code: options.code,
      title: 'Samrey Compiler Error',
      defaultExplanation: 'An error occurred during compilation.',
      defaultSuggestion: 'Review the template code around this location.'
    };

    const title = options.message || def.title;
    const line = options.line || 1;
    const column = options.column || 1;
    const explanation = options.explanation || def.defaultExplanation;
    const suggestion = options.suggestion || def.defaultSuggestion;

    let sourceFrame = '';
    if (options.source) {
      sourceFrame = generateSourceFrame(options.source, line, column, options.length || 1);
    }

    const locStr = options.filename ? `${options.filename}:${line}:${column}` : `${line}:${column}`;
    const formatted = `[${options.code}] ${title} at ${locStr}\n\n${sourceFrame ? `${sourceFrame}\n\n` : ''}Explanation: ${explanation}\nSuggestion:  ${suggestion}`;

    super(formatted);
    this.name = 'SamreyCompilerError';
    this.code = options.code;
    this.filename = options.filename;
    this.line = line;
    this.column = column;
    this.offset = options.offset;
    this.length = options.length;
    this.explanation = explanation;
    this.suggestion = suggestion;
    this.sourceFrame = sourceFrame;
  }
}

export function formatSamreyDiagnostic(err: SamreyCompilerError | SamreyDiagnosticOptions): string {
  if (err instanceof SamreyCompilerError) {
    return err.message;
  }
  const instance = new SamreyCompilerError(err);
  return instance.message;
}
