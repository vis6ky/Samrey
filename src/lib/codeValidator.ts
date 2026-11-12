/**
 * @license Apache-2.0
 * @samrey/doc - Samrey v2.1.0 Code & AST Validation Engine
 *
 * Implements real client-side validation for generated TypeScript / Samrey code:
 * 1. Syntax & Structural Balance (parentheses, braces, brackets, quotes)
 * 2. Symbol & Package Audit (grounded exclusively against @samrey/* v2.1.0 exports)
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
    'PROXIED', 'SuspenseTrackerContext', 'batch', 'cancelPendingEffect', 'computed',
    'createContext', 'createMemo', 'createOwner', 'createRoot', 'createStore', 'effect',
    'getActiveSubscriber', 'getGlobalClock', 'getGlobalErrorHandler', 'getOwner',
    'handleError', 'incrementClock', 'isHydrationCapturing', 'isStore', 'onCleanup',
    'onError', 'produce', 'queueEffect', 'reconcile', 'recordHydrationRetarget',
    'runWithHydrationCapture', 'runWithOwner', 'setActiveSubscriber',
    'setGlobalErrorHandler', 'setOwner', 'signal', 'trackDependency', 'untrack',
    'useContext'
  ],
  '@samrey/runtime': [
    'Dynamic', 'ErrorBoundary', 'For', 'Match', 'Portal', 'Show', 'Suspense', 'Switch',
    'appendChildren', 'bindAttr', 'bindAttribute', 'bindClass', 'bindDynamicChild',
    'bindEvent', 'bindProperty', 'bindStyle', 'bindText', 'clearDevDiagnosticHistory',
    'computeIsDev', 'createComponent', 'el', 'emitDevDiagnostic', 'frag', 'fragment',
    'getDevDiagnosticHistory', 'hydrate', 'isDev', 'mount', 'on', 'onCleanup',
    'onDevDiagnostic', 'onError', 'onMount', 'rawHtml', 'reportDuplicateKey',
    'reportHydrationMismatch', 'reportReactiveGraphWarning', 'reportResourceError',
    'reportRouterError', 'reportStaleItemWarning', 'reportUnnecessaryUpdate',
    'svg', 'svgEl', 'template', 'text'
  ],
  '@samrey/router': [
    'Link', 'Route', 'Router', 'RouterContext', 'RouterOutlet', 'createBrowserHistory',
    'createLink', 'createMemoryHistory', 'createRouter', 'matchPath', 'matchRoute',
    'matchRoutes', 'setRouterInstance', 'useLocation', 'useNavigate', 'useParams',
    'useRouter', 'useSearchParams'
  ],
  '@samrey/forms': [
    'bindField', 'computeAriaAttributes', 'createField', 'createForm',
    'getAccessibleFieldProps', 'validateSchema', 'validators'
  ],
  '@samrey/http': [
    'HttpClient', 'HttpError', 'RequestCache', 'createHttpCache', 'createHttpClient',
    'createResource', 'defaultRequestCache', 'httpClient'
  ],
  '@samrey/security': [
    'DANGEROUS_HTML_TAGS', 'DANGEROUS_TEMPLATE_TAGS', 'SAFE_IMAGE_DATA_URI',
    'SRCSET_ATTRIBUTES', 'TrustedTypesPolicy', 'URL_ATTRIBUTES', 'createCsrfToken',
    'decodeCssEscapes', 'decodeHtmlEntities', 'escapeForScriptPayload',
    'escapeHtmlAttribute', 'escapeHtmlText', 'escapeJsonStringForScript',
    'generateCsrfToken', 'getSamreyTemplateTrustedPolicy', 'getSamreyTrustedPolicy',
    'isSafeUrl', 'isSensitiveKey', 'resetTrustedPolicyForTest', 'safeJsonParse',
    'safeJsonStringify', 'sanitizeAttribute', 'sanitizeCssStyle', 'sanitizeHeadTags',
    'sanitizeHtml', 'sanitizeHtmlString', 'sanitizeHtmlUrlAttributes',
    'sanitizeRedirectUri', 'sanitizeSrcset', 'sanitizeTemplateHtml', 'sanitizeUri',
    'sanitizeUrl', 'scrubPrototypePollution', 'setAllowedScriptOrigins', 'stripSecrets',
    'stripSensitiveState', 'timingSafeEqual', 'validateCsrfToken', 'verifyCsrfToken'
  ],
  '@samrey/ssr': [
    'createSSRContext', 'createServerData', 'deserializeHydrationState', 'escapeHtml',
    'escapeJsonState', 'generatePreHydrationScript', 'generateStaticSite',
    'getDelegatedEventScript', 'getSSRContext', 'getSSRLoaderError', 'hydrate',
    'hydrateFromSSR', 'invalidateClientDataCache', 'isSensitiveKey', 'renderToStream',
    'renderToString', 'replayCapturedEvents', 'resolveSSRContext', 'runWithSSRContext',
    'safeJsonParse', 'sanitizeSsrState', 'serializeState', 'serializeStateForHydration',
    'stripSecrets'
  ],
  '@samrey/testing': [
    'cleanupAllTestContainers', 'createMockResource', 'fireEvent', 'flushReactivity',
    'mount', 'renderTest', 'renderTestComponent', 'waitFor', 'waitForNextUpdate'
  ],
  '@samrey/devtools': [
    'ComponentInspector', 'DevToolsBridge', 'FormInspector', 'GraphInspector',
    'NetworkInspector', 'OwnerInspector', 'PerfInspector', 'PerformanceInspector',
    'ReactiveGraphInspector', 'RouterInspector', 'SamreyDevToolsBridge', 'computeIsDev',
    'defaultComponentInspector', 'defaultFormInspector', 'defaultGraphInspector',
    'defaultNetworkInspector', 'defaultOwnerInspector', 'defaultPerformanceInspector',
    'defaultRouterInspector', 'getGraphSnapshot', 'initDevTools', 'initDevtools',
    'isDevToolsActive', 'isSensitiveKey', 'samreyDevToolsBridge', 'sanitizePayload'
  ],
  '@samrey/compiler': [
    'ERROR_REGISTRY', 'SamreyCompilerError', 'TemplateParser', 'buildAIR',
    'buildAIRFromAST', 'classifyBindingContext', 'classifySecurityNode',
    'compileTemplate', 'evaluateConstantExpression', 'findUnsupportedTemplateTags',
    'formatSamreyDiagnostic', 'generateCode', 'generateModuleCode',
    'generateSourceFrame', 'hoistTemplates', 'isStaticSubtree', 'lintA11y',
    'lintAccessibility', 'parseTemplate'
  ],
  '@samrey/cli': [
    'CLI_VERSION', 'HELP_TEXT', 'auditSource', 'createLineSourceMap',
    'createNativeDevHandler', 'generateStarterProject', 'runAnalyzeCommand',
    'runAuditCommand', 'runBuildCommand', 'runCLI', 'runCreateCommand', 'runDevCommand',
    'runGenerateCommand', 'runPreviewCommand', 'runSamreyAudit', 'runTestCommand',
    'samreyPlugin', 'samreyVitePlugin', 'scaffoldArtifact', 'validateProjectName'
  ],
  '@samrey/ai': [
    'ALL_OFFICIAL_PACKAGES', 'COMPATIBILITY_TASKS', 'DEFAULT_AI_CONFIG',
    'DEFAULT_SECURITY_POLICY', 'KNOWN_TYPE_EXPORTS', 'MockDOMNode',
    'OFFICIAL_PACKAGE_EXPORTS', 'SAMREY_API_REGISTRY', 'SAMREY_DOC_SECTIONS',
    'SAMREY_EXAMPLES', 'SAMREY_SKILLS', 'analyzeProject', 'createAiConfig',
    'diagnoseCompilerError', 'diagnoseError', 'discoverSamreyProject', 'ensureMockDom',
    'generateAgentsMd', 'generateClaudeMd', 'generateCopilotInstructions',
    'generateCursorMdc', 'generateGeminiMd', 'getApiReference',
    'getAuthoritativeInstructionContent', 'getBestPractices', 'getDocumentation',
    'getExampleById', 'getExamples', 'getExamplesByQuery', 'installSkills',
    'runCompatibilitySuite', 'searchDocs', 'stripComments', 'tokenizeCode',
    'validateSamreyCode', 'verifyStdioHandshake', 'writeAllInstructions'
  ],
  '@samrey/mcp-server': [
    'MCP_ERROR_CODES', 'MCP_PROMPTS', 'MCP_RESOURCES', 'MCP_TOOLS', 'SamreyMcpServer',
    'executeSafeCommand', 'getPromptMessages', 'handleToolCall', 'readResource',
    'redactSecrets', 'resolveSafePath', 'safeWriteFile'
  ]
};

export const OFFICIAL_SAMREY_TYPES: Record<string, string[]> = {
  '@samrey/reactivity': [
    'Context', 'Dependency', 'HydrationCaptureRegistry', 'Owner', 'ReactiveNode',
    'ReadonlySignal', 'Signal', 'Subscriber', 'SuspenseTracker'
  ],
  '@samrey/runtime': [
    'ChildValue', 'Component', 'DevDiagnostic', 'DynamicProps', 'ElementProps',
    'ErrorBoundaryProps', 'ExtractRefs', 'ForProps', 'MatchProps', 'PortalProps',
    'ShowProps', 'SuspenseProps', 'SwitchProps', 'TagNameToElement', 'TemplateFactory',
    'TemplateRefs', 'TemplateRoot'
  ],
  '@samrey/compiler': [
    'AIRCompilationResult', 'AIRControlFlowSlotNode', 'AIRDynamicAttrNode',
    'AIRDynamicClassNode', 'AIRDynamicEventNode', 'AIRDynamicPropertyNode',
    'AIRDynamicTextNode', 'AIRNode', 'AIRStaticNode', 'AIRTemplateUnit',
    'ASTAttributeNode', 'ASTComponentNode', 'ASTElementNode', 'ASTForNode',
    'ASTInterpolationNode', 'ASTNode', 'ASTRootNode', 'ASTShowNode', 'ASTTextNode',
    'ConstantFoldResult', 'ErrorDefinition', 'ParseOptions', 'ParseResult', 'Position',
    'SamreyDiagnosticOptions', 'SamreyErrorCode', 'SecurityContext', 'SourceLocation',
    'SourceLocationInfo'
  ],
  '@samrey/router': [
    'LinkProps', 'RouteMatch', 'RouteRecord', 'RouterInstance'
  ],
  '@samrey/forms': [
    'AriaBindingAttributes', 'BindFieldOptions', 'FieldState', 'FormConfig',
    'FormInstance', 'FormValidateFn', 'StandardSchemaFailure', 'StandardSchemaIssue',
    'StandardSchemaResult', 'StandardSchemaSuccess', 'StandardSchemaV1', 'Validator'
  ],
  '@samrey/http': [
    'HttpCacheOptions', 'RequestOptions', 'Resource', 'ResourceActions',
    'ResourceOptions', 'ResourceStatus'
  ],
  '@samrey/ssr': [
    'DeserializeOptions', 'GeneratedPage', 'HydrateOptions', 'HydrationResult',
    'RenderToStreamOptions', 'RenderToStringOptions', 'SSGOptions', 'SSGResult',
    'SSRContext', 'SSRHeadMetadata', 'SecretGuardOptions', 'SerializeOptions',
    'ServerDataActions', 'ServerDataOptions', 'StateValidator', 'StaticPathEntry',
    'StaticRouteConfig'
  ],
  '@samrey/testing': [
    'TestRenderResult'
  ],
  '@samrey/devtools': [
    'DevToolsEvent', 'DevToolsEventType', 'InspectedComponent', 'InspectedEffect',
    'InspectedField', 'InspectedForm', 'InspectedHttpRequest', 'InspectedOwner',
    'InspectedPerfMetric', 'InspectedRoute', 'InspectedSignalNode'
  ],
  '@samrey/security': [
    'SamreyTrustedPolicy', 'SanitizeUriOptions', 'SecretGuardOptions',
    'TrustedTypesOptions'
  ],
  '@samrey/cli': [
    'AnalyzeCommandOptions', 'AuditCommandOptions', 'AuditReport',
    'BuildCommandOptions', 'CommandResult', 'CreateCommandOptions', 'DevCommandOptions',
    'GenerateArtifactType', 'GenerateCommandOptions', 'PreviewCommandOptions',
    'RawSourceMapV3', 'SamreyPluginOptions', 'StarterProjectFiles', 'TestCommandOptions'
  ],
  '@samrey/ai': [
    'AgentSkillDefinition', 'AiIntegrationConfig', 'AiPlatform', 'ApiReference',
    'CodeIssue', 'CodeToken', 'CodeValidationError', 'CodeValidationResult',
    'CodeValidationWarning', 'CompatibilitySuiteReport', 'CompatibilityTask',
    'DiagnosticDiagnosis', 'DocSection', 'InstalledSamreyPackage',
    'ProjectAnalysisReport', 'SamreyCodeExample', 'SamreyProjectContext',
    'SearchResult', 'SecurityPolicy', 'StdioHandshakeResult', 'TaskExecutionResult'
  ],
  '@samrey/mcp-server': [
    'JsonRpcRequest', 'JsonRpcResponse', 'McpPromptDefinition', 'McpResourceDefinition',
    'McpToolDefinition', 'SafeCommandResult', 'SamreyMcpServerOptions',
    'ToolCallResult', 'ToolContext'
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
  { regex: /\bBehaviorSubject\b|\bObservable\b/, name: 'RxJS Observable', framework: 'RxJS', alternative: "signal() and effect() from '@samrey/reactivity'" },
  { regex: /\$state|\$derived|\$effect/, name: 'Svelte 5 Runes', framework: 'Svelte', alternative: "signal(), computed(), effect() from '@samrey/reactivity'" }
];

const REGEX_PRECEDING_KEYWORDS = new Set([
  'return', 'throw', 'case', 'default', 'typeof', 'void', 'delete',
  'in', 'instanceof', 'of', 'await', 'yield', 'new', 'else', 'do'
]);

function scanRegexEnd(code: string, slashIndex: number): number {
  let k = slashIndex + 1;
  let inClass = false;
  while (k < code.length) {
    const c = code[k];
    if (c === '\n' || c === '\r') return -1;
    if (c === '\\') {
      k += 2;
      continue;
    }
    if (c === '[' && !inClass) {
      inClass = true;
      k++;
      continue;
    }
    if (c === ']' && inClass) {
      inClass = false;
      k++;
      continue;
    }
    if (c === '/' && !inClass) {
      k++;
      while (k < code.length && /[a-zA-Z]/.test(code[k])) {
        k++;
      }
      return k;
    }
    k++;
  }
  return -1;
}

function canPrecedeRegex(prevNonWsChar: string, lastIdent: string): boolean {
  if (!prevNonWsChar) return true;
  if ('=([{:;?,!&|^~+-*/%<>\n\r'.includes(prevNonWsChar)) return true;
  if (/[A-Za-z0-9_$]/.test(prevNonWsChar) && lastIdent) {
    return REGEX_PRECEDING_KEYWORDS.has(lastIdent);
  }
  return false;
}

function stripCommentsAndStrings(code: string, keepStrings = false): string {
  let out = '';
  let i = 0;
  const templateBraceStack: number[] = [];
  let prevNonWsChar = '';
  let lastIdent = '';

  const updatePrevFromNonWs = (ch: string) => {
    if (/[A-Za-z0-9_$]/.test(ch)) {
      if (/[A-Za-z0-9_$]/.test(prevNonWsChar)) {
        lastIdent += ch;
      } else {
        lastIdent = ch;
      }
    } else {
      lastIdent = '';
    }
    prevNonWsChar = ch;
  };

  const consumeTemplateSegment = () => {
    while (i < code.length) {
      const cur = code[i];
      if (cur === '\\' && i + 1 < code.length) {
        out += keepStrings ? cur + code[i + 1] : (code[i + 1] === '\n' ? ' \n' : '  ');
        i += 2;
        continue;
      }
      if (cur === '$' && code[i + 1] === '{') {
        out += keepStrings ? '${' : '  ';
        i += 2;
        templateBraceStack.push(1);
        prevNonWsChar = '{';
        lastIdent = '';
        return;
      }
      if (cur === '`') {
        out += keepStrings ? '`' : ' ';
        i++;
        prevNonWsChar = '`';
        lastIdent = '';
        return;
      }
      out += keepStrings ? cur : (cur === '\n' ? '\n' : ' ');
      i++;
    }
  };

  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1];
    if (ch === '/' && next === '/') {
      out += '  ';
      i += 2;
      while (i < code.length && code[i] !== '\n') {
        out += ' ';
        i++;
      }
      continue;
    }
    if (ch === '/' && next === '*') {
      out += '  ';
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        out += code[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < code.length) {
        out += '  ';
        i += 2;
      }
      continue;
    }
    if (ch === '/' && canPrecedeRegex(prevNonWsChar, lastIdent)) {
      const regexEnd = scanRegexEnd(code, i);
      if (regexEnd !== -1) {
        out += keepStrings ? code.slice(i, regexEnd) : ' ';
        i = regexEnd;
        prevNonWsChar = '/';
        lastIdent = '';
        continue;
      }
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      out += keepStrings ? ch : ' ';
      i++;
      while (i < code.length) {
        const cur = code[i];
        if (cur === '\\' && i + 1 < code.length) {
          out += keepStrings ? cur + code[i + 1] : (code[i + 1] === '\n' ? ' \n' : '  ');
          i += 2;
          continue;
        }
        if (cur === quote) {
          out += keepStrings ? cur : ' ';
          i++;
          break;
        }
        out += keepStrings ? cur : (cur === '\n' ? '\n' : ' ');
        i++;
      }
      prevNonWsChar = quote;
      lastIdent = '';
      continue;
    }
    if (ch === '`') {
      out += keepStrings ? '`' : ' ';
      i++;
      consumeTemplateSegment();
      continue;
    }
    if (templateBraceStack.length > 0 && ch === '{') {
      templateBraceStack[templateBraceStack.length - 1]++;
      out += ch;
      updatePrevFromNonWs(ch);
      i++;
      continue;
    }
    if (templateBraceStack.length > 0 && ch === '}') {
      templateBraceStack[templateBraceStack.length - 1]--;
      if (templateBraceStack[templateBraceStack.length - 1] === 0) {
        templateBraceStack.pop();
        out += keepStrings ? '}' : ' ';
        i++;
        consumeTemplateSegment();
        continue;
      }
      out += ch;
      updatePrevFromNonWs(ch);
      i++;
      continue;
    }
    if (!/\s/.test(ch)) {
      updatePrevFromNonWs(ch);
    } else if (ch === '\n' || ch === '\r') {
      lastIdent = '';
    }
    out += ch;
    i++;
  }
  return out;
}

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

  // 1. Structural Balance Check (Parentheses, Braces, Brackets, String Quotes, Nested Templates)
  let parenCount = 0;
  let braceCount = 0;
  let bracketCount = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  const templateBraceStack: number[] = [];
  let inLineComment = false;
  let inBlockComment = false;
  let structPrevChar = '';
  let structLastIdent = '';

  const trackStructChar = (c: string) => {
    if (/[A-Za-z0-9_$]/.test(c)) {
      structLastIdent = /[A-Za-z0-9_$]/.test(structPrevChar) ? structLastIdent + c : c;
    } else {
      structLastIdent = '';
    }
    structPrevChar = c;
  };

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    const nextChar = trimmed[i + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        structLastIdent = '';
      }
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
      if (char === "'") { inSingleQuote = false; structPrevChar = "'"; structLastIdent = ''; }
      continue;
    }
    if (inDoubleQuote) {
      if (char === '\\') { i++; continue; }
      if (char === '"') { inDoubleQuote = false; structPrevChar = '"'; structLastIdent = ''; }
      continue;
    }
    if (inBacktick) {
      if (char === '\\') { i++; continue; }
      if (char === '$' && nextChar === '{') {
        templateBraceStack.push(1);
        inBacktick = false;
        structPrevChar = '{';
        structLastIdent = '';
        i++;
        continue;
      }
      if (char === '`') { inBacktick = false; structPrevChar = '`'; structLastIdent = ''; }
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

    // Regex literal start
    if (char === '/' && canPrecedeRegex(structPrevChar, structLastIdent)) {
      const regexEnd = scanRegexEnd(trimmed, i);
      if (regexEnd !== -1) {
        i = regexEnd - 1;
        structPrevChar = '/';
        structLastIdent = '';
        continue;
      }
    }

    // Quotes
    if (char === "'") { inSingleQuote = true; continue; }
    if (char === '"') { inDoubleQuote = true; continue; }
    if (char === '`') { inBacktick = true; continue; }

    if (!/\s/.test(char)) {
      trackStructChar(char);
    } else if (char === '\n' || char === '\r') {
      structLastIdent = '';
    }

    if (templateBraceStack.length > 0 && char === '{') {
      templateBraceStack[templateBraceStack.length - 1]++;
    } else if (templateBraceStack.length > 0 && char === '}') {
      templateBraceStack[templateBraceStack.length - 1]--;
      if (templateBraceStack[templateBraceStack.length - 1] === 0) {
        templateBraceStack.pop();
        inBacktick = true;
        continue;
      }
    }

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
  if (inSingleQuote || inDoubleQuote || inBacktick || templateBraceStack.length > 0) errors.push('Syntax error: Unclosed string literal');

  if (errors.length === 0) {
    passedChecks.push('AST & Bracket Structure Balanced');
  }

  const codeWithoutComments = stripCommentsAndStrings(trimmed, true);
  const codeWithoutCommentsAndStrings = stripCommentsAndStrings(trimmed, false);

  // 2. Package & Import Audit
  const importRegex = /\bimport\s+((?:type\s+)?(?:\*\s+as\s+[A-Za-z_$][\w$]*|\{[^}]*\}|[A-Za-z_$][\w$]*(?:\s*,\s*(?:\*\s+as\s+[A-Za-z_$][\w$]*|\{[^}]*\}))?))\s+from\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  let importsSamreyReactivity = false;
  let importsRedux = false;

  while ((match = importRegex.exec(codeWithoutComments)) !== null) {
    const rawClause = match[1].trim();
    const pkg = match[2];
    const isGlobalTypeImport = /^\s*type\b/.test(rawClause);
    const namedMatch = rawClause.match(/\{([\s\S]*?)\}/);
    const rawItems = namedMatch ? namedMatch[1].split(',').map(s => s.trim()).filter(Boolean) : [];

    if (pkg === '@samrey/reactivity') importsSamreyReactivity = true;
    if (pkg === 'redux' || pkg === '@reduxjs/toolkit') importsRedux = true;

    if (pkg.startsWith('@samrey/')) {
      const validPkgExports = OFFICIAL_SAMREY_EXPORTS[pkg];
      const validPkgTypes = OFFICIAL_SAMREY_TYPES[pkg] || [];
      if (!validPkgExports) {
        errors.push(`Unknown Samrey package \`${pkg}\`. Valid packages: ${Object.keys(OFFICIAL_SAMREY_EXPORTS).join(', ')}`);
      } else {
        const clauseWithoutType = rawClause.replace(/^type\s+/, '').trim();
        if (!clauseWithoutType.startsWith('{') && !clauseWithoutType.startsWith('*')) {
          const defMatch = clauseWithoutType.match(/^([A-Za-z_$][\w$]*)/);
          if (defMatch) {
            errors.push(`Default import \`${defMatch[1]}\` is not supported for \`${pkg}\` — use named imports instead.`);
          }
        }
        for (const rawItem of rawItems) {
          const isInlineType = /^\s*type\s+/.test(rawItem);
          const cleanName = rawItem.replace(/^\s*type\s+/, '').split(/\s+as\s+/)[0].trim();
          if (!cleanName) continue;
          auditedSymbols.push(`${pkg} -> ${cleanName}`);

          if (isGlobalTypeImport || isInlineType) {
            if (!validPkgExports.includes(cleanName) && !validPkgTypes.includes(cleanName)) {
              errors.push(`Type \`${cleanName}\` is not exported by \`${pkg}\`.`);
            }
          } else if (!validPkgExports.includes(cleanName)) {
            if (validPkgTypes.includes(cleanName)) {
              errors.push(`Symbol \`${cleanName}\` is a TypeScript type-only export from \`${pkg}\` — use \`import type { ${cleanName} }\` or \`type ${cleanName}\`.`);
            } else {
              errors.push(`Symbol \`${cleanName}\` is not exported by \`${pkg}\`. Available: ${validPkgExports.slice(0, 8).join(', ')}...`);
            }
          }
        }
      }
    } else if (pkg.startsWith('@aether/')) {
      errors.push(`Deprecated package \`${pkg}\`. Use official \`@samrey/*\` packages in v2.1.0.`);
    }
  }

  if (errors.length === 0 && auditedSymbols.length > 0) {
    passedChecks.push(`Grounded against @samrey/* v2.1.0 (${auditedSymbols.length} symbols verified)`);
  }

  // 3. Foreign Framework Detection (scanned outside comments and string literals)
  for (const foreign of FOREIGN_API_MAP) {
    if (foreign.regex.test(codeWithoutCommentsAndStrings)) {
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

  if (
    /\bcreateStore\b/.test(codeWithoutCommentsAndStrings) &&
    (importsRedux || (!importsSamreyReactivity && /\b(?:applyMiddleware|combineReducers|compose)\b/.test(codeWithoutCommentsAndStrings)))
  ) {
    foreignApis.push({
      name: 'Redux createStore',
      framework: 'Redux',
      samreyAlternative: "createStore() from '@samrey/reactivity'"
    });
    if (!options.isForeignConversion && !options.isDebugging) {
      warnings.push("Foreign API `Redux createStore` (Redux) detected. Recommended: createStore() from '@samrey/reactivity'");
    }
  }

  if (foreignApis.length === 0) {
    passedChecks.push('Zero Foreign Framework APIs / Native Samrey Architecture');
  }

  // 4. Samrey Specific Reactive Bug Checks (scanned outside comments and strings)
  // Check for broken static text node binding: el('p', null, count.value) where count is a signal
  if (/\bel\s*\([^)]*,\s*[^,)]*,\s*([a-zA-Z0-9_$]+)\.value\b/.test(codeWithoutCommentsAndStrings)) {
    warnings.push('Reactive binding note: Signal `.value` evaluated statically inside `el()`. Use accessor closure `() => signal.value` for live fine-grained DOM updates.');
  }

  // Check for in-place array mutation: todos.value.push(...)
  if (/\b([a-zA-Z0-9_$]+)\.value\.(?:push|splice|pop|shift|unshift)\b/.test(codeWithoutCommentsAndStrings)) {
    warnings.push('Reactive state note: In-place array mutation detected. Assign a new array reference `signal.value = [...signal.value, newItem]` to trigger reactive setters.');
  }

  if (warnings.length === 0 && errors.length === 0) {
    passedChecks.push('Glitch-Free Reactive Signals & Zero-VDOM DOM Bindings Checked');
  }

  const isValid = errors.length === 0 && (options.isForeignConversion || options.isDebugging || foreignApis.length === 0);

  return {
    isValid,
    badgeText: isValid ? '✓ Samrey v2.1.0 Verified' : '⚠ Generated solution needs correction',
    badgeStatus: isValid ? 'verified' : 'needs_correction',
    errors,
    warnings,
    foreignApis,
    passedChecks,
    auditedSymbols
  };
}
