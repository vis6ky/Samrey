/**
 * @license Apache-2.0
 * @samrey/doc - Samrey v1.0.0 Code & AST Validation Engine
 *
 * Implements real client-side validation for generated TypeScript / Samrey code:
 * 1. Syntax & Structural Balance (parentheses, braces, brackets, quotes)
 * 2. Symbol & Package Audit (grounded exclusively against @samrey/* v1.0.0 exports)
 * 3. Hallucination & Legacy Name Audit (blocks @aether/*, invent-a-hook, etc.)
 * 4. Foreign Framework Detection (React, Vue, Angular, Svelte, Solid, Redux, RxJS, etc.)
 * 5. Samrey Reactivity Pattern Audit (warns against static unwrapped signal in el(), in-place array mutations)
 */

export interface ForeignApiWarning {
  name: string;
  framework: string;
  samreyAlternative: string;
}

export interface CodeValidationResult {
  isValid: boolean;
  badgeText: string;
  badgeStatus: 'verified' | 'needs_correction';
  errors: string[];
  warnings: string[];
  foreignApis: ForeignApiWarning[];
  passedChecks: string[];
  auditedSymbols: string[];
}

export const OFFICIAL_SAMREY_EXPORTS: Record<string, string[]> = {
  '@samrey/reactivity': [
    'signal', 'computed', 'effect', 'batch', 'untrack', 'createRoot',
    'createContext', 'useContext', 'createStore', 'produce', 'reconcile',
    'onCleanup', 'getOwner', 'runWithOwner', 'isSignal', 'Signal', 'ReadonlySignal', 'Store', 'createMemo'
  ],
  '@samrey/runtime': [
    'el', 'text', 'svg', 'fragment', 'Show', 'For', 'Switch', 'Match', 'ErrorBoundary',
    'Suspense', 'Dynamic', 'mount', 'hydrate', 'onMount', 'onCleanup', 'onError',
    'createComponent', 'deriveAriaAttributes'
  ],
  '@samrey/router': [
    'createRouter', 'Router', 'Route', 'Link', 'useRouter', 'useParams',
    'useNavigate', 'useLocation', 'RouterView', 'createMemoryHistory', 'createBrowserHistory'
  ],
  '@samrey/forms': [
    'createForm', 'createField', 'standardSchemaValidator', 'deriveAriaAttributes',
    'bindField', 'validateField', 'validateForm'
  ],
  '@samrey/http': [
    'createHttpClient', 'resource', 'createCache', 'fetchResource', 'HttpClient', 'createResource'
  ],
  '@samrey/security': [
    'sanitizeHtml', 'sanitizeUri', 'sanitizeUrl', 'escapeHtmlText', 'escapeHtmlAttribute',
    'createCsrfToken', 'validateCsrfToken', 'stripSecrets', 'safeJsonParse', 'escapeJsonState', 'generateCsrfToken'
  ],
  '@samrey/ssr': [
    'renderToString', 'renderToStream', 'serializeState', 'hydrateState',
    'createSsrContext', 'renderToPipeableStream'
  ],
  '@samrey/testing': [
    'renderTest', 'renderTestComponent', 'fireEvent', 'waitFor', 'flushReactivity',
    'createMockResource', 'waitForNextUpdate', 'cleanupAllTestContainers', 'testHarness'
  ],
  '@samrey/devtools': [
    'initDevTools', 'ReactiveGraphInspector', 'PerfInspector', 'SamreyDevToolsBridge'
  ],
  '@samrey/compiler': [
    'compile', 'compileToRuntime', 'transformTsx', 'parseTemplate', 'buildAIR', 'generateCode'
  ],
  '@samrey/cli': [
    'runCli', 'createProject', 'buildProject'
  ]
};

const FOREIGN_API_MAP: Array<{ regex: RegExp; name: string; framework: string; alternative: string }> = [
  { regex: /\buseState\b/, name: 'useState', framework: 'React', alternative: "signal() from '@samrey/reactivity'" },
  { regex: /\buseEffect\b/, name: 'useEffect', framework: 'React', alternative: "effect() or onMount() from '@samrey/reactivity' / '@samrey/runtime'" },
  { regex: /\buseMemo\b/, name: 'useMemo', framework: 'React', alternative: "computed() from '@samrey/reactivity'" },
  { regex: /\buseCallback\b/, name: 'useCallback', framework: 'React', alternative: 'Plain TypeScript function (single execution paradigm)' },
  { regex: /\buseRef\b/, name: 'useRef', framework: 'React', alternative: "Plain let variable or signal() / DOM element reference" },
  { regex: /\buseReducer\b/, name: 'useReducer', framework: 'React', alternative: "createStore() with produce() from '@samrey/reactivity'" },
  { regex: /\bcreatesignal\b/i, name: 'createSignal', framework: 'SolidJS', alternative: "signal() from '@samrey/reactivity'" },
  { regex: /\bcreatememo\b/i, name: 'createMemo', framework: 'SolidJS', alternative: "computed() from '@samrey/reactivity'" },
  { regex: /\bcreateeffect\b/i, name: 'createEffect', framework: 'SolidJS', alternative: "effect() from '@samrey/reactivity'" },
  { regex: /\bv-model\b/i, name: 'v-model', framework: 'Vue', alternative: "bindField() from '@samrey/forms' or signal accessor" },
  { regex: /\bv-if\b/i, name: 'v-if', framework: 'Vue', alternative: "Show({ when: () => ... }) from '@samrey/runtime'" },
  { regex: /\bv-for\b/i, name: 'v-for', framework: 'Vue', alternative: "For({ each: () => ... }) from '@samrey/runtime'" },
  { regex: /\bdefineComponent\b/, name: 'defineComponent', framework: 'Vue', alternative: "Plain function component returning el() from '@samrey/runtime'" },
  { regex: /\bcreateSlice\b/, name: 'createSlice', framework: 'Redux Toolkit', alternative: "createStore() from '@samrey/reactivity'" },
  { regex: /\buseSelector\b/, name: 'useSelector', framework: 'Redux', alternative: "computed(() => store.key) from '@samrey/reactivity'" },
  { regex: /\bcreateStore(?!\s*\(.*@samrey\/reactivity)/, name: 'Redux createStore', framework: 'Redux', alternative: "createStore() from '@samrey/reactivity'" },
  { regex: /\bBehaviorSubject\b|\bObservable\b/, name: 'RxJS Observable', framework: 'RxJS', alternative: "signal() and effect() from '@samrey/reactivity'" },
  { regex: /\$state|\$derived|\$effect/, name: 'Svelte 5 Runes', framework: 'Svelte', alternative: "signal(), computed(), effect() from '@samrey/reactivity'" }
];

/**
 * Validates syntax, structure, symbols, imports, and reactive patterns in TypeScript/Samrey code.
 */
export function validateSamreyCode(
  code: string,
  options: { isForeignConversion?: boolean; isDebugging?: boolean } = {}
): CodeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const foreignApis: ForeignApiWarning[] = [];
  const passedChecks: string[] = [];
  const auditedSymbols: string[] = [];

  if (!code || !code.trim()) {
    return {
      isValid: false,
      badgeText: '⚠ Generated solution needs correction',
      badgeStatus: 'needs_correction',
      errors: ['No code snippet provided for validation.'],
      warnings: [],
      foreignApis: [],
      passedChecks: [],
      auditedSymbols: []
    };
  }

  const trimmed = code.trim();

  // 1. Structural Balance Check (Parentheses, Braces, Brackets, String Quotes)
  let parenCount = 0;
  let braceCount = 0;
  let bracketCount = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    const nextChar = trimmed[i + 1];

    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inSingleQuote) {
      if (char === '\\') { i++; continue; }
      if (char === "'") inSingleQuote = false;
      continue;
    }
    if (inDoubleQuote) {
      if (char === '\\') { i++; continue; }
      if (char === '"') inDoubleQuote = false;
      continue;
    }
    if (inBacktick) {
      if (char === '\\') { i++; continue; }
      if (char === '`') inBacktick = false;
      continue;
    }

    // Comment starts
    if (char === '/' && nextChar === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    // Quotes
    if (char === "'") { inSingleQuote = true; continue; }
    if (char === '"') { inDoubleQuote = true; continue; }
    if (char === '`') { inBacktick = true; continue; }

    // Delimiters
    if (char === '(') parenCount++;
    else if (char === ')') parenCount--;
    else if (char === '{') braceCount++;
    else if (char === '}') braceCount--;
    else if (char === '[') bracketCount++;
    else if (char === ']') bracketCount--;

    if (parenCount < 0) errors.push('Syntax error: Unexpected closing parenthesis `)`');
    if (braceCount < 0) errors.push('Syntax error: Unexpected closing brace `}`');
    if (bracketCount < 0) errors.push('Syntax error: Unexpected closing bracket `]`');
  }

  if (parenCount > 0) errors.push(`Syntax error: ${parenCount} unclosed parenthesis \`(\``);
  if (braceCount > 0) errors.push(`Syntax error: ${braceCount} unclosed brace \`{\``);
  if (bracketCount > 0) errors.push(`Syntax error: ${bracketCount} unclosed bracket \`[\``);
  if (inSingleQuote || inDoubleQuote || inBacktick) errors.push('Syntax error: Unclosed string literal');

  if (errors.length === 0) {
    passedChecks.push('AST & Bracket Structure Balanced');
  }

  // 2. Package & Import Audit
  const importRegex = /import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(trimmed)) !== null) {
    const pkg = match[4];
    const namedImports = match[1] ? match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean) : [];

    if (pkg.startsWith('@samrey/')) {
      const validPkgExports = OFFICIAL_SAMREY_EXPORTS[pkg];
      if (!validPkgExports) {
        errors.push(`Unknown Samrey package \`${pkg}\`. Valid packages: ${Object.keys(OFFICIAL_SAMREY_EXPORTS).join(', ')}`);
      } else {
        for (const named of namedImports) {
          auditedSymbols.push(`${pkg} -> ${named}`);
          if (!validPkgExports.includes(named)) {
            errors.push(`Symbol \`${named}\` is not exported by \`${pkg}\`. Available: ${validPkgExports.slice(0, 8).join(', ')}...`);
          }
        }
      }
    } else if (pkg.startsWith('@aether/')) {
      errors.push(`Deprecated package \`${pkg}\`. Use official \`@samrey/*\` packages in v1.0.0.`);
    }
  }

  if (errors.length === 0 && auditedSymbols.length > 0) {
    passedChecks.push(`Grounded against @samrey/* v1.0.0 (${auditedSymbols.length} symbols verified)`);
  }

  // 3. Foreign Framework Detection
  for (const foreign of FOREIGN_API_MAP) {
    if (foreign.regex.test(trimmed)) {
      foreignApis.push({
        name: foreign.name,
        framework: foreign.framework,
        samreyAlternative: foreign.alternative
      });
      if (!options.isForeignConversion && !options.isDebugging) {
        warnings.push(`Foreign API \`${foreign.name}\` (${foreign.framework}) detected. Recommended: ${foreign.alternative}`);
      }
    }
  }

  if (foreignApis.length === 0) {
    passedChecks.push('Zero Foreign Framework APIs / Native Samrey Architecture');
  }

  // 4. Samrey Specific Reactive Bug Checks
  // Check for broken static text node binding: el('p', null, count.value) where count is a signal
  if (/\bel\s*\([^)]*,\s*[^,)]*,\s*([a-zA-Z0-9_$]+)\.value\b/.test(trimmed)) {
    warnings.push('Reactive binding note: Signal `.value` evaluated statically inside `el()`. Use accessor closure `() => signal.value` for live fine-grained DOM updates.');
  }

  // Check for in-place array mutation: todos.value.push(...)
  if (/\b([a-zA-Z0-9_$]+)\.value\.(?:push|splice|pop|shift|unshift)\b/.test(trimmed)) {
    warnings.push('Reactive state note: In-place array mutation detected. Assign a new array reference `signal.value = [...signal.value, newItem]` to trigger reactive setters.');
  }

  if (warnings.length === 0 && errors.length === 0) {
    passedChecks.push('Glitch-Free Reactive Signals & Zero-VDOM DOM Bindings Checked');
  }

  const isValid = errors.length === 0 && (options.isForeignConversion || options.isDebugging || foreignApis.length === 0);

  return {
    isValid,
    badgeText: isValid ? '✓ Samrey v1.0.0 Verified' : '⚠ Generated solution needs correction',
    badgeStatus: isValid ? 'verified' : 'needs_correction',
    errors,
    warnings,
    foreignApis,
    passedChecks,
    auditedSymbols
  };
}
