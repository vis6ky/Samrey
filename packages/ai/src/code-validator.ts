/**
 * @license Apache-2.0
 * @samrey/ai - Code Validator & Compiler Verification Engine
 */

import { compileTemplate, SamreyCompilerError } from '@samrey/compiler';

export interface CodeValidationError {
  message: string;
  code?: string;
  line?: number;
  column?: number;
  sourceFrame?: string;
  suggestion?: string;
}

export interface CodeValidationWarning {
  message: string;
  line?: number;
  suggestion?: string;
}

export interface CodeValidationResult {
  valid: boolean;
  compiles: boolean;
  errors: CodeValidationError[];
  warnings: CodeValidationWarning[];
  detectedApis: string[];
  foreignFrameworkDetected?: string;
  compiledCode?: string;
}

const FORBIDDEN_IMPORTS = [
  { match: /['"]react['"]|['"]react-dom['"]/, name: 'React' },
  { match: /['"]vue['"]/, name: 'Vue' },
  { match: /['"]@angular\//, name: 'Angular' },
  { match: /['"]svelte['"]/, name: 'Svelte' },
  { match: /['"]solid-js['"]/, name: 'Solid' }
];

const FORBIDDEN_HOOKS = [
  'useState',
  'useEffect',
  'useMemo',
  'useCallback',
  'useRef',
  'useContext',
  'useReducer',
  'useLayoutEffect'
];

export function validateSamreyCode(
  source: string,
  options: { filename?: string; isTemplateOnly?: boolean } = {}
): CodeValidationResult {
  const code = source || '';
  const errors: CodeValidationError[] = [];
  const warnings: CodeValidationWarning[] = [];
  const detectedApis: string[] = [];

  // 1. Detect Foreign Framework Imports
  let foreignFrameworkDetected: string | undefined;
  for (const forbidden of FORBIDDEN_IMPORTS) {
    if (forbidden.match.test(code)) {
      foreignFrameworkDetected = forbidden.name;
      errors.push({
        message: `Forbidden ${forbidden.name} import detected. Samrey is an independent framework with its own compile-time reactive runtime.`,
        suggestion: 'Import reactive primitives from @samrey/reactivity and DOM helpers from @samrey/runtime.'
      });
    }
  }

  // 2. Detect React Hooks
  for (const hook of FORBIDDEN_HOOKS) {
    const hookRegex = new RegExp(`\\b${hook}\\s*\\(`, 'g');
    const match = hookRegex.exec(code);
    if (match) {
      const line = code.slice(0, match.index).split('\n').length;
      errors.push({
        message: `Foreign React hook "${hook}()" detected. React hooks are not part of Samrey.`,
        line,
        suggestion:
          hook === 'useState'
            ? 'Use "signal(initialValue)" from @samrey/reactivity. Access with .value, mutate with .value = or .update().'
            : hook === 'useEffect'
            ? 'Use "effect(() => ...)" from @samrey/reactivity.'
            : hook === 'useMemo'
            ? 'Use "computed(() => ...)" from @samrey/reactivity.'
            : 'Use pure signals, store(), or component-scoped variables.'
      });
    }
  }

  // 2b. Detect Vue Directives (v-if, v-for, v-model, etc.)
  const vueDirectives = ['v-if', 'v-for', 'v-model', 'v-show', 'v-else', 'v-html', 'v-text'];
  for (const dir of vueDirectives) {
    if (new RegExp(`\\b${dir}\\b`).test(code)) {
      foreignFrameworkDetected = 'Vue';
      errors.push({
        message: `Foreign Vue directive "${dir}" detected. Samrey does not use Vue directives.`,
        suggestion: dir === 'v-if' || dir === 'v-show'
          ? 'Use Show({ when: signal, children: ... }) from @samrey/runtime for conditional rendering.'
          : dir === 'v-for'
          ? 'Use For({ each: signal, key: "id", children: (item) => ... }) from @samrey/runtime for list rendering.'
          : 'Use fine-grained signal bindings.'
      });
    }
  }

  // 3. Detect Samrey Official APIs
  const apiCandidates = [
    'signal',
    'computed',
    'effect',
    'batch',
    'untrack',
    'store',
    'createRoot',
    'onCleanup',
    'onError',
    'template',
    'bindText',
    'bindAttr',
    'bindDynamicChild',
    'on',
    'createComponent',
    'Show',
    'For',
    'Switch',
    'Match',
    'createRouter',
    'RouterView',
    'Link',
    'useRoute',
    'useNavigate',
    'createForm',
    'Field',
    'useField',
    'createResource',
    'createHttpClient',
    'renderToString',
    'renderToStream',
    'hydrate'
  ];

  for (const api of apiCandidates) {
    if (new RegExp(`\\b${api}\\b`).test(code)) {
      detectedApis.push(api);
    }
  }

  // 4. In-place array mutation on signals
  const inPlaceRegex = /\.value\.(push|splice|pop|shift|unshift|sort|reverse)\s*\(/g;
  let inPlaceMatch: RegExpExecArray | null;
  while ((inPlaceMatch = inPlaceRegex.exec(code)) !== null) {
    const line = code.slice(0, inPlaceMatch.index).split('\n').length;
    warnings.push({
      message: `In-place array mutation ".value.${inPlaceMatch[1]}()" detected. Signal subscribers will NOT be notified of array interior changes.`,
      line,
      suggestion: `Replace with immutable assignment: "signal.value = [...signal.value, newItem]" or "signal.update(arr => [...arr, newItem])".`
    });
  }

  // 5. Template compilation check
  let compiles = false;
  let compiledCode: string | undefined;

  const templateToCompile = options.isTemplateOnly
    ? code
    : extractTemplateString(code);

  if (templateToCompile && errors.length === 0) {
    try {
      const result = compileTemplate(templateToCompile, { filename: options.filename || 'component.tsx' });
      compiles = true;
      compiledCode = result.generatedCode;

      if (result.diagnostics && result.diagnostics.length > 0) {
        for (const d of result.diagnostics) {
          warnings.push({
            message: String(d)
          });
        }
      }
    } catch (err: any) {
      compiles = false;
      if (err instanceof SamreyCompilerError) {
        errors.push({
          message: err.message,
          code: err.code,
          line: err.line,
          column: err.column,
          sourceFrame: err.sourceFrame,
          suggestion: err.suggestion
        });
      } else {
        errors.push({
          message: `Compiler syntax error: ${err?.message || err}`,
          suggestion: 'Check template for unclosed tags, unterminated braces, or invalid attributes.'
        });
      }
    }
  } else if (!templateToCompile && errors.length === 0) {
    compiles = true;
  }

  return {
    valid: errors.length === 0,
    compiles,
    errors,
    warnings,
    detectedApis,
    foreignFrameworkDetected,
    compiledCode
  };
}

function extractTemplateString(source: string): string | null {
  // Check for template(`...`) or template('...')
  const tmplMatch = source.match(/template\s*\(\s*([`'"])([\s\S]*?)\1\s*\)/);
  if (tmplMatch && tmplMatch[2]) {
    return tmplMatch[2];
  }

  // Check for return statement returning JSX-like element
  const jsxMatch = source.match(/return\s+(<[a-zA-Z][\s\S]*>[\s\S]*<\/[a-zA-Z]>|<[a-zA-Z][\s\S]*\/>);?/);
  if (jsxMatch && jsxMatch[1]) {
    return jsxMatch[1];
  }

  return null;
}
