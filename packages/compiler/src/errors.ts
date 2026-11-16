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
  | 'SAMREY-101' // Unclosed Tag
  | 'SAMREY-102' // Invalid Expression / Unclosed Interpolation
  | 'SAMREY-103' // Missing Required Directive Prop
  | 'SAMREY-104' // Unexpected Closing Tag
  | 'SAMREY-105' // Invalid Attribute Syntax
  | 'SAMREY-106' // Unclosed Comment
  | 'SAMREY-107' // Duplicate Attribute
  | 'SAMREY-108' // Unsupported Template-Level Control Flow or Custom Component Tag
  | 'SAMREY-109' // Duplicate Template Reference
  | 'SAMREY-110' // Invalid Template Reference Identifier
  | 'SAMREY-111' // Unsupported Template Reference Placement
  | 'SAMREY-201' // Security Violation: Dangerous Scheme / Insecure Payload
  | 'SAMREY-202' // Accessibility Violation: Missing required accessibility attributes
  | 'SAMREY-301' // Reactivity: Cyclic Dependency / Infinite Effect Loop
  | 'SAMREY-302' // Runtime: Duplicate Key in <For> Reconciliation
  | 'SAMREY-303' // SSR/Hydration: DOM Tree / Attribute Mismatch
  | 'SAMREY-401' // Router: Route Not Found / Invalid Route Configuration
  | 'SAMREY-402' // HTTP: Resource Request Failure
  | 'SAMREY-501' // Forms: Standard Schema Validation Error
  | 'AETH-101'
  | 'AETH-102'
  | 'AETH-103'
  | 'AETH-104'
  | 'AETH-105'
  | 'AETH-106'
  | 'AETH-107'
  | 'AETH-108'
  | 'AETH-201'
  | 'AETH-202'
  | 'AETH-301'
  | 'AETH-302'
  | 'AETH-303'
  | 'AETH-401'
  | 'AETH-402'
  | 'AETH-501';

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface QuickFixPatch {
  description: string;
  replacementText: string;
}

export interface ErrorDefinition {
  code: SamreyErrorCode;
  title: string;
  severity: DiagnosticSeverity;
  defaultExplanation: string;
  defaultSuggestion: string;
  rootCause: string;
  documentationLink: string;
  generateQuickFix?: (source?: string, line?: number, column?: number) => QuickFixPatch | undefined;
}

export const ERROR_REGISTRY: Record<string, ErrorDefinition> = {
  'SAMREY-101': {
    code: 'SAMREY-101',
    title: 'Unclosed HTML/JSX Tag',
    severity: 'error',
    defaultExplanation: 'An opening tag was not matched with a corresponding closing tag before the end of the template.',
    defaultSuggestion: 'Check for missing closing tags (e.g. </div> or self-closing <Component />).',
    rootCause: 'Missing closing delimiter </tag> or self-closing slash /> on an opening element.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md#samrey-101-unclosed-tag',
    generateQuickFix: (_src) => ({
      description: 'Add matching closing tag',
      replacementText: '</div>'
    })
  },
  'SAMREY-102': {
    code: 'SAMREY-102',
    title: 'Invalid Expression',
    severity: 'error',
    defaultExplanation: 'An interpolation expression was started with "{" but not properly closed with "}" or contains malformed syntax.',
    defaultSuggestion: 'Ensure all curly braces "{" are paired with closing "}" and expressions are syntactically valid.',
    rootCause: 'Unclosed opening curly brace { without matching closing brace } in template string.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md#samrey-102-invalid-expression--unclosed-interpolation'
  },
  'SAMREY-103': {
    code: 'SAMREY-103',
    title: 'Missing Required Directive Prop',
    severity: 'error',
    defaultExplanation: 'A built-in control flow component is missing one of its required props.',
    defaultSuggestion: 'Provide "when" for Show, or "each" and "key" for For in TypeScript.',
    rootCause: 'Required parameter omitted when invoking Show() or For().',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md#samrey-103-missing-required-directive-prop'
  },
  'SAMREY-104': {
    code: 'SAMREY-104',
    title: 'Unexpected Closing Tag',
    severity: 'error',
    defaultExplanation: 'Encountered a closing tag that does not correspond to any active open tag in the hierarchy.',
    defaultSuggestion: 'Check tag nesting order and ensure closing tags match their opening counterpart.',
    rootCause: 'Closing tag encountered without matching opening parent element.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md#samrey-104-unexpected-closing-tag'
  },
  'SAMREY-105': {
    code: 'SAMREY-105',
    title: 'Invalid Attribute Syntax',
    severity: 'error',
    defaultExplanation: 'Attribute name or value contains invalid characters or an unclosed quote string.',
    defaultSuggestion: 'Ensure attribute values are properly quoted or enclosed in dynamic curly brackets "{...}".',
    rootCause: 'Malformed attribute declaration or unescaped quote character.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md'
  },
  'SAMREY-106': {
    code: 'SAMREY-106',
    title: 'Unclosed Comment',
    severity: 'error',
    defaultExplanation: 'An HTML comment "<!--" was opened but reached the end of the file without "-->".',
    defaultSuggestion: 'Add "-->" to close the comment block.',
    rootCause: 'HTML comment block opened with <!-- without terminating -->.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md'
  },
  'SAMREY-107': {
    code: 'SAMREY-107',
    title: 'Duplicate Attribute',
    severity: 'error',
    defaultExplanation: 'The same attribute is defined multiple times on a single element.',
    defaultSuggestion: 'Remove or consolidate duplicate attribute declarations.',
    rootCause: 'Single element specifies attribute name more than once.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md#samrey-107-duplicate-attribute'
  },
  'SAMREY-108': {
    code: 'SAMREY-108',
    title: 'Unsupported Template-Level Control Flow or Custom Component Tag',
    severity: 'error',
    defaultExplanation: 'Template-level control flow is not supported. Compose it with Show()/For() in TypeScript.',
    defaultSuggestion: 'Template-level control flow is not supported. Compose it with Show()/For() in TypeScript.',
    rootCause: '<Show> or <For> was used as an HTML template tag instead of as a TypeScript component function.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md#samrey-108-unsupported-template-level-control-flow-tag',
    generateQuickFix: () => ({
      description: 'Replace template tag with TypeScript Show() or For() function invocation',
      replacementText: 'Show({\n  when: () => condition.value,\n  children: () => ActiveView(),\n  fallback: () => GuestView()\n})'
    })
  },
  'SAMREY-109': {
    code: 'SAMREY-109',
    title: 'Duplicate Template Reference',
    severity: 'error',
    defaultExplanation: 'A template ref attribute was defined multiple times with the same identifier in the template.',
    defaultSuggestion: 'Use unique ref names for each referenced element in the template.',
    rootCause: 'Multiple elements inside the same template define identical ref="..." names.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md#samrey-109-duplicate-template-reference'
  },
  'SAMREY-110': {
    code: 'SAMREY-110',
    title: 'Invalid Template Reference Identifier',
    severity: 'error',
    defaultExplanation: 'A template ref attribute value is not a valid JavaScript identifier.',
    defaultSuggestion: 'Reference names must start with a letter, underscore, or dollar sign and contain only alphanumeric characters, underscores, or dollar signs.',
    rootCause: 'Template reference name contains illegal characters (spaces, hyphens, punctuation).',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md'
  },
  'SAMREY-111': {
    code: 'SAMREY-111',
    title: 'Unsupported Template Reference Placement',
    defaultExplanation: 'A template ref attribute was placed on an unsupported structure such as a custom component, control flow tag, or nested template.',
    severity: 'error',
    defaultSuggestion: 'Place ref attributes directly on standard HTML elements within the template.',
    rootCause: 'ref attribute placed on non-DOM element or virtual node.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md'
  },
  'SAMREY-201': {
    code: 'SAMREY-201',
    title: 'Security Violation',
    severity: 'error',
    defaultExplanation: 'The template contains potentially dangerous code constructs such as javascript: URLs, unescaped raw HTML injection, or forbidden inline scripts.',
    defaultSuggestion: 'Use safe URLs (http, https, relative) and avoid inline script injections.',
    rootCause: 'Dangerous URI protocol (javascript:, vbscript:) or unsanitized script sink detected.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md#samrey-201-dangerous-uri--insecure-payload'
  },
  'SAMREY-202': {
    code: 'SAMREY-202',
    title: 'Accessibility Non-Conformance',
    severity: 'warning',
    defaultExplanation: 'Element fails WCAG accessibility guidelines (e.g. <img> without alt, <button> without accessible label).',
    defaultSuggestion: 'Add meaningful alt attributes or aria-label attributes to the element.',
    rootCause: 'Visual or interactive element lacks required accessible name or text alternative.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md#samrey-202-accessibility-violation'
  },
  'SAMREY-301': {
    code: 'SAMREY-301',
    title: 'Cyclic Reactive Graph Dependency',
    severity: 'error',
    defaultExplanation: 'A signal or computed dependency graph cycle was detected during propagation or effect execution.',
    defaultSuggestion: 'Avoid writing to a signal inside an effect that synchronously reads that same signal without untrack().',
    rootCause: 'Effect or computed writes to a signal that is synchronously read in the same evaluation pass.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md#samrey-301-cyclic-dependency--infinite-effect-loop'
  },
  'SAMREY-302': {
    code: 'SAMREY-302',
    title: 'Duplicate Key in Keyed List',
    severity: 'warning',
    defaultExplanation: 'Multiple items in a <For> keyed collection share the exact same key value.',
    defaultSuggestion: 'Ensure the key function or property generates unique identifiers across all list items.',
    rootCause: 'Key selector function returned non-unique key for multiple array items.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md#samrey-302-duplicate-key-in-for-reconciliation'
  },
  'SAMREY-303': {
    code: 'SAMREY-303',
    title: 'SSR Hydration Mismatch',
    severity: 'warning',
    defaultExplanation: 'The DOM structure or attribute rendered on the server does not match the client initial render.',
    defaultSuggestion: 'Ensure server-rendered state and client initial state are identical, or defer browser-only attributes to onMount.',
    rootCause: 'Client state differed from server-rendered HTML during hydrate() pass.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md#samrey-303-ssr--hydration-mismatch'
  },
  'SAMREY-401': {
    code: 'SAMREY-401',
    title: 'Route Resolution Error',
    severity: 'error',
    defaultExplanation: 'The requested path did not match any registered routes and no fallback route was defined.',
    defaultSuggestion: 'Register a catch-all route (path: "*") or verify the navigation URL.',
    rootCause: 'Navigation path does not match router table and no wildcard route exists.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md#samrey-401-route-not-found--invalid-route-configuration'
  },
  'SAMREY-402': {
    code: 'SAMREY-402',
    title: 'HTTP Resource Error',
    severity: 'error',
    defaultExplanation: 'A createResource request failed or returned a non-2xx status code.',
    defaultSuggestion: 'Check endpoint availability, network status, and error boundary fallback handlers.',
    rootCause: 'createResource fetcher promise rejected or network request timed out.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md#samrey-402-resource-request-failure'
  },
  'SAMREY-501': {
    code: 'SAMREY-501',
    title: 'Form Validation Schema Error',
    severity: 'error',
    defaultExplanation: 'Form input values failed Standard Schema validation constraints.',
    defaultSuggestion: 'Verify field validation requirements and error message displays.',
    rootCause: 'createForm validate function returned validation error strings for fields.',
    documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md#samrey-501-form-schema-validation-failure'
  }
};

// Aliases for backward-compatibility with tests and legacy lookups
for (const [key, val] of Object.entries(ERROR_REGISTRY)) {
  if (key.startsWith('SAMREY-')) {
    const legacyKey = key.replace('SAMREY-', 'AETH-');
    (ERROR_REGISTRY as any)[legacyKey] = { ...val, code: legacyKey as SamreyErrorCode };
  } else if (key.startsWith('AETH-')) {
    const modernKey = key.replace('AETH-', 'SAMREY-');
    if (!ERROR_REGISTRY[modernKey]) {
      (ERROR_REGISTRY as any)[modernKey] = { ...val, code: modernKey as SamreyErrorCode };
    }
  }
}

export function generateSourceFrame(
  source: string,
  line: number,
  column: number,
  length = 1
): string {
  if (!source) return '';

  const lines = source.split(/\r?\n/);
  const targetLineIdx = line - 1;

  if (targetLineIdx < 0 || targetLineIdx >= lines.length) {
    return '';
  }

  const startLineIdx = Math.max(0, targetLineIdx - 2);
  const endLineIdx = Math.min(lines.length - 1, targetLineIdx + 2);

  const maxLineNumLength = String(endLineIdx + 1).length;
  const frameLines: string[] = [];

  for (let idx = startLineIdx; idx <= endLineIdx; idx++) {
    const currentLineNum = idx + 1;
    const lineNumStr = String(currentLineNum).padStart(maxLineNumLength, ' ');
    const isTarget = idx === targetLineIdx;
    const prefix = isTarget ? '> ' : '  ';

    frameLines.push(`${prefix}${lineNumStr} | ${lines[idx]}`);

    if (isTarget) {
      const caretIndent = ' '.repeat(prefix.length + maxLineNumLength + 3 + Math.max(0, column - 1));
      const carets = '^'.repeat(Math.max(1, length));
      frameLines.push(`${caretIndent}${carets}`);
    }
  }

  return frameLines.join('\n');
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
  severity?: DiagnosticSeverity;
  rootCause?: string;
  quickFix?: QuickFixPatch;
}

export interface StructuredDiagnosticJson {
  code: string;
  severity: DiagnosticSeverity;
  title: string;
  filename?: string;
  line: number;
  column: number;
  offset?: number;
  length?: number;
  explanation: string;
  rootCause: string;
  suggestion: string;
  documentationLink: string;
  sourceFrame?: string;
  quickFix?: QuickFixPatch;
}

export class SamreyCompilerError extends Error {
  public readonly code: SamreyErrorCode;
  public readonly severity: DiagnosticSeverity;
  public readonly filename?: string;
  public readonly line: number;
  public readonly column: number;
  public readonly offset?: number;
  public readonly length?: number;
  public readonly explanation: string;
  public readonly rootCause: string;
  public readonly suggestion: string;
  public readonly documentationLink: string;
  public readonly quickFix?: QuickFixPatch;
  public readonly sourceFrame?: string;

  constructor(options: SamreyDiagnosticOptions) {
    const def = ERROR_REGISTRY[options.code] || {
      code: options.code,
      title: 'Samrey Compiler Error',
      severity: options.severity || 'error',
      defaultExplanation: 'An error occurred during compilation.',
      defaultSuggestion: 'Review the template code around this location.',
      rootCause: 'Unspecified compiler diagnostic error.',
      documentationLink: 'https://github.com/vis6ky/Samrey/blob/main/ai/ERROR_REFERENCE.md'
    };

    const title = options.message || def.title;
    const line = options.line || 1;
    const column = options.column || 1;
    const explanation = options.explanation || def.defaultExplanation;
    const suggestion = options.suggestion || def.defaultSuggestion;
    const rootCause = options.rootCause || def.rootCause;
    const severity = options.severity || def.severity;
    const documentationLink = def.documentationLink;
    const quickFix = options.quickFix || (def.generateQuickFix ? def.generateQuickFix(options.source, line, column) : undefined);

    let sourceFrame = '';
    if (options.source) {
      sourceFrame = generateSourceFrame(options.source, line, column, options.length || 1);
    }

    const locStr = options.filename ? `${options.filename}:${line}:${column}` : `${line}:${column}`;
    const formatted = `[${options.code}] ${title} at ${locStr}\n\n${sourceFrame ? `${sourceFrame}\n\n` : ''}Explanation: ${explanation}\nSuggestion:  ${suggestion}`;

    super(formatted);
    Object.setPrototypeOf(this, SamreyCompilerError.prototype);
    this.name = 'SamreyCompilerError';
    this.code = options.code;
    this.severity = severity;
    this.filename = options.filename;
    this.line = line;
    this.column = column;
    this.offset = options.offset;
    this.length = options.length;
    this.explanation = explanation;
    this.rootCause = rootCause;
    this.suggestion = suggestion;
    this.documentationLink = documentationLink;
    this.quickFix = quickFix;
    this.sourceFrame = sourceFrame;
  }

  public toJSON(): StructuredDiagnosticJson {
    return {
      code: this.code,
      severity: this.severity,
      title: this.name,
      filename: this.filename,
      line: this.line,
      column: this.column,
      offset: this.offset,
      length: this.length,
      explanation: this.explanation,
      rootCause: this.rootCause,
      suggestion: this.suggestion,
      documentationLink: this.documentationLink,
      sourceFrame: this.sourceFrame,
      quickFix: this.quickFix
    };
  }
}

export function formatSamreyDiagnostic(err: SamreyCompilerError | SamreyDiagnosticOptions): string {
  if (err instanceof SamreyCompilerError) {
    return err.message;
  }
  const instance = new SamreyCompilerError(err);
  return instance.message;
}
