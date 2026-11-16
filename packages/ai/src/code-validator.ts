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
  { match: /(?:\bfrom\s*|\bimport\s*|\brequire\s*\(\s*)['"]react(?:-dom)?['"]/, name: 'React' },
  { match: /(?:\bfrom\s*|\bimport\s*|\brequire\s*\(\s*)['"]vue['"]/, name: 'Vue' },
  { match: /(?:\bfrom\s*|\bimport\s*|\brequire\s*\(\s*)['"]@angular\//, name: 'Angular' },
  { match: /(?:\bfrom\s*|\bimport\s*|\brequire\s*\(\s*)['"]svelte['"]/, name: 'Svelte' },
  { match: /(?:\bfrom\s*|\bimport\s*|\brequire\s*\(\s*)['"]solid-js['"]/, name: 'Solid' }
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

export const OFFICIAL_PACKAGE_EXPORTS: Record<string, Set<string>> = {
  '@samrey/reactivity': new Set([
    'PROXIED',
    'batch',
    'cancelPendingEffect',
    'computed',
    'createContext',
    'createMemo',
    'createOwner',
    'createRoot',
    'createStore',
    'effect',
    'getActiveSubscriber',
    'getGlobalClock',
    'getGlobalErrorHandler',
    'getOwner',
    'handleError',
    'incrementClock',
    'isHydrationCapturing',
    'isStore',
    'onCleanup',
    'onError',
    'produce',
    'queueEffect',
    'reconcile',
    'recordHydrationRetarget',
    'runWithHydrationCapture',
    'runWithOwner',
    'setActiveSubscriber',
    'setGlobalErrorHandler',
    'setOwner',
    'signal',
    'SuspenseTrackerContext',
    'trackDependency',
    'untrack',
    'useContext'
  ]),
  '@samrey/runtime': new Set([
    'Dynamic',
    'ErrorBoundary',
    'For',
    'Match',
    'Portal',
    'Show',
    'Suspense',
    'Switch',
    'appendChildren',
    'bindAttr',
    'bindAttribute',
    'bindClass',
    'bindDynamicChild',
    'bindEvent',
    'bindProperty',
    'bindStyle',
    'bindText',
    'clearDevDiagnosticHistory',
    'computeIsDev',
    'createComponent',
    'el',
    'emitDevDiagnostic',
    'frag',
    'fragment',
    'getDevDiagnosticHistory',
    'hydrate',
    'isDev',
    'mount',
    'on',
    'onCleanup',
    'onDevDiagnostic',
    'onError',
    'onMount',
    'rawHtml',
    'reportDuplicateKey',
    'reportHydrationMismatch',
    'reportReactiveGraphWarning',
    'reportResourceError',
    'reportRouterError',
    'reportStaleItemWarning',
    'reportUnnecessaryUpdate',
    'svg',
    'svgEl',
    'template',
    'text'
  ]),
  '@samrey/compiler': new Set([
    'ERROR_REGISTRY',
    'SamreyCompilerError',
    'TemplateParser',
    'buildAIR',
    'buildAIRFromAST',
    'classifyBindingContext',
    'classifySecurityNode',
    'compileTemplate',
    'evaluateConstantExpression',
    'findUnsupportedTemplateTags',
    'formatSamreyDiagnostic',
    'generateCode',
    'generateModuleCode',
    'generateSourceFrame',
    'hoistTemplates',
    'isStaticSubtree',
    'lintA11y',
    'lintAccessibility',
    'parseTemplate'
  ]),
  '@samrey/router': new Set([
    'Link',
    'Route',
    'Router',
    'RouterContext',
    'RouterOutlet',
    'createBrowserHistory',
    'createLink',
    'createMemoryHistory',
    'createRouter',
    'matchPath',
    'matchRoute',
    'matchRoutes',
    'setRouterInstance',
    'useLocation',
    'useNavigate',
    'useParams',
    'useRouter',
    'useSearchParams'
  ]),
  '@samrey/forms': new Set([
    'bindField',
    'computeAriaAttributes',
    'createField',
    'createForm',
    'getAccessibleFieldProps',
    'validateSchema',
    'validators'
  ]),
  '@samrey/http': new Set([
    'HttpClient',
    'HttpError',
    'RequestCache',
    'createHttpCache',
    'createHttpClient',
    'createResource',
    'defaultRequestCache',
    'httpClient'
  ]),
  '@samrey/ssr': new Set([
    'createSSRContext',
    'createServerData',
    'deserializeHydrationState',
    'escapeHtml',
    'escapeJsonState',
    'generatePreHydrationScript',
    'generateStaticSite',
    'getDelegatedEventScript',
    'getSSRContext',
    'getSSRLoaderError',
    'hydrate',
    'hydrateFromSSR',
    'invalidateClientDataCache',
    'isSensitiveKey',
    'renderToStream',
    'renderToString',
    'replayCapturedEvents',
    'resolveSSRContext',
    'runWithSSRContext',
    'safeJsonParse',
    'sanitizeSsrState',
    'serializeState',
    'serializeStateForHydration',
    'stripSecrets'
  ]),
  '@samrey/testing': new Set([
    'cleanupAllTestContainers',
    'createMockResource',
    'fireEvent',
    'flushReactivity',
    'mount',
    'renderTest',
    'renderTestComponent',
    'waitFor',
    'waitForNextUpdate'
  ]),
  '@samrey/devtools': new Set([
    'ComponentInspector',
    'DevToolsBridge',
    'FormInspector',
    'GraphInspector',
    'NetworkInspector',
    'OwnerInspector',
    'PerfInspector',
    'PerformanceInspector',
    'ReactiveGraphInspector',
    'RouterInspector',
    'SamreyDevToolsBridge',
    'computeIsDev',
    'defaultComponentInspector',
    'defaultFormInspector',
    'defaultGraphInspector',
    'defaultNetworkInspector',
    'defaultOwnerInspector',
    'defaultPerformanceInspector',
    'defaultRouterInspector',
    'getGraphSnapshot',
    'initDevTools',
    'initDevtools',
    'isDevToolsActive',
    'isSensitiveKey',
    'samreyDevToolsBridge',
    'sanitizePayload'
  ]),
  '@samrey/security': new Set([
    'DANGEROUS_HTML_TAGS',
    'DANGEROUS_TEMPLATE_TAGS',
    'SAFE_IMAGE_DATA_URI',
    'SRCSET_ATTRIBUTES',
    'TrustedTypesPolicy',
    'URL_ATTRIBUTES',
    'createCsrfToken',
    'decodeCssEscapes',
    'decodeHtmlEntities',
    'escapeForScriptPayload',
    'escapeHtmlAttribute',
    'escapeHtmlText',
    'escapeJsonStringForScript',
    'generateCsrfToken',
    'getSamreyTemplateTrustedPolicy',
    'getSamreyTrustedPolicy',
    'isSafeUrl',
    'isSensitiveKey',
    'resetTrustedPolicyForTest',
    'safeJsonParse',
    'safeJsonStringify',
    'sanitizeAttribute',
    'sanitizeCssStyle',
    'sanitizeHeadTags',
    'sanitizeHtml',
    'sanitizeHtmlString',
    'sanitizeHtmlUrlAttributes',
    'sanitizeRedirectUri',
    'sanitizeSrcset',
    'sanitizeTemplateHtml',
    'sanitizeUri',
    'sanitizeUrl',
    'scrubPrototypePollution',
    'setAllowedScriptOrigins',
    'stripSecrets',
    'stripSensitiveState',
    'timingSafeEqual',
    'validateCsrfToken',
    'verifyCsrfToken'
  ]),
  '@samrey/cli': new Set([
    'CLI_VERSION',
    'HELP_TEXT',
    'auditSource',
    'createLineSourceMap',
    'createNativeDevHandler',
    'generateStarterProject',
    'runAnalyzeCommand',
    'runAuditCommand',
    'runBuildCommand',
    'runCLI',
    'runCreateCommand',
    'runDevCommand',
    'runGenerateCommand',
    'runPreviewCommand',
    'runSamreyAudit',
    'runTestCommand',
    'samreyPlugin',
    'samreyVitePlugin',
    'scaffoldArtifact',
    'validateProjectName'
  ]),
  '@samrey/ai': new Set([
    'ALL_OFFICIAL_PACKAGES',
    'COMPATIBILITY_TASKS',
    'DEFAULT_AI_CONFIG',
    'DEFAULT_SECURITY_POLICY',
    'KNOWN_TYPE_EXPORTS',
    'MockDOMNode',
    'OFFICIAL_PACKAGE_EXPORTS',
    'SAMREY_API_REGISTRY',
    'SAMREY_DOC_SECTIONS',
    'SAMREY_EXAMPLES',
    'SAMREY_SKILLS',
    'analyzeProject',
    'createAiConfig',
    'diagnoseCompilerError',
    'diagnoseError',
    'discoverSamreyProject',
    'ensureMockDom',
    'generateAgentsMd',
    'generateClaudeMd',
    'generateCopilotInstructions',
    'generateCursorMdc',
    'generateGeminiMd',
    'getApiReference',
    'getAuthoritativeInstructionContent',
    'getBestPractices',
    'getDocumentation',
    'getExampleById',
    'getExamples',
    'getExamplesByQuery',
    'installSkills',
    'runCompatibilitySuite',
    'searchDocs',
    'stripComments',
    'tokenizeCode',
    'validateSamreyCode',
    'verifyStdioHandshake',
    'writeAllInstructions'
  ]),
  '@samrey/mcp-server': new Set([
    'MCP_ERROR_CODES',
    'MCP_PROMPTS',
    'MCP_RESOURCES',
    'MCP_TOOLS',
    'SamreyMcpServer',
    'executeSafeCommand',
    'getPromptMessages',
    'handleToolCall',
    'readResource',
    'redactSecrets',
    'resolveSafePath',
    'safeWriteFile'
  ])
};

export const KNOWN_TYPE_EXPORTS: Record<string, Set<string>> = {
  '@samrey/reactivity': new Set([
    'Context',
    'Dependency',
    'HydrationCaptureRegistry',
    'Owner',
    'ReactiveNode',
    'ReadonlySignal',
    'Signal',
    'Subscriber',
    'SuspenseTracker'
  ]),
  '@samrey/runtime': new Set([
    'ChildValue',
    'Component',
    'DevDiagnostic',
    'DynamicProps',
    'ElementProps',
    'ErrorBoundaryProps',
    'ExtractRefs',
    'ForProps',
    'MatchProps',
    'PortalProps',
    'ShowProps',
    'SuspenseProps',
    'SwitchProps',
    'TagNameToElement',
    'TemplateFactory',
    'TemplateRefs',
    'TemplateRoot'
  ]),
  '@samrey/compiler': new Set([
    'AIRCompilationResult',
    'AIRControlFlowSlotNode',
    'AIRDynamicAttrNode',
    'AIRDynamicClassNode',
    'AIRDynamicEventNode',
    'AIRDynamicPropertyNode',
    'AIRDynamicTextNode',
    'AIRNode',
    'AIRStaticNode',
    'AIRTemplateUnit',
    'ASTAttributeNode',
    'ASTComponentNode',
    'ASTElementNode',
    'ASTForNode',
    'ASTInterpolationNode',
    'ASTNode',
    'ASTRootNode',
    'ASTShowNode',
    'ASTTextNode',
    'ConstantFoldResult',
    'ErrorDefinition',
    'ParseOptions',
    'ParseResult',
    'Position',
    'SamreyDiagnosticOptions',
    'SamreyErrorCode',
    'SecurityContext',
    'SourceLocation',
    'SourceLocationInfo'
  ]),
  '@samrey/router': new Set([
    'LinkProps',
    'RouteMatch',
    'RouteRecord',
    'RouterInstance'
  ]),
  '@samrey/forms': new Set([
    'AriaBindingAttributes',
    'BindFieldOptions',
    'FieldState',
    'FormConfig',
    'FormInstance',
    'FormValidateFn',
    'StandardSchemaFailure',
    'StandardSchemaIssue',
    'StandardSchemaResult',
    'StandardSchemaSuccess',
    'StandardSchemaV1',
    'Validator'
  ]),
  '@samrey/http': new Set([
    'HttpCacheOptions',
    'RequestOptions',
    'Resource',
    'ResourceActions',
    'ResourceOptions',
    'ResourceStatus'
  ]),
  '@samrey/ssr': new Set([
    'DeserializeOptions',
    'GeneratedPage',
    'HydrateOptions',
    'HydrationResult',
    'RenderToStreamOptions',
    'RenderToStringOptions',
    'SSGOptions',
    'SSGResult',
    'SSRContext',
    'SSRHeadMetadata',
    'SecretGuardOptions',
    'SerializeOptions',
    'ServerDataActions',
    'ServerDataOptions',
    'StateValidator',
    'StaticPathEntry',
    'StaticRouteConfig'
  ]),
  '@samrey/testing': new Set([
    'TestRenderResult'
  ]),
  '@samrey/devtools': new Set([
    'DevToolsEvent',
    'DevToolsEventType',
    'InspectedComponent',
    'InspectedEffect',
    'InspectedField',
    'InspectedForm',
    'InspectedHttpRequest',
    'InspectedOwner',
    'InspectedPerfMetric',
    'InspectedRoute',
    'InspectedSignalNode'
  ]),
  '@samrey/security': new Set([
    'SamreyTrustedPolicy',
    'SanitizeUriOptions',
    'SecretGuardOptions',
    'TrustedTypesOptions'
  ]),
  '@samrey/cli': new Set([
    'AnalyzeCommandOptions',
    'AuditCommandOptions',
    'AuditReport',
    'BuildCommandOptions',
    'CommandResult',
    'CreateCommandOptions',
    'DevCommandOptions',
    'GenerateArtifactType',
    'GenerateCommandOptions',
    'PreviewCommandOptions',
    'RawSourceMapV3',
    'SamreyPluginOptions',
    'StarterProjectFiles',
    'TestCommandOptions'
  ]),
  '@samrey/ai': new Set([
    'AgentSkillDefinition',
    'AiIntegrationConfig',
    'AiPlatform',
    'ApiReference',
    'CodeIssue',
    'CodeToken',
    'CodeValidationError',
    'CodeValidationResult',
    'CodeValidationWarning',
    'CompatibilitySuiteReport',
    'CompatibilityTask',
    'DiagnosticDiagnosis',
    'DocSection',
    'InstalledSamreyPackage',
    'ProjectAnalysisReport',
    'SamreyCodeExample',
    'SamreyProjectContext',
    'SearchResult',
    'SecurityPolicy',
    'StdioHandshakeResult',
    'TaskExecutionResult'
  ]),
  '@samrey/mcp-server': new Set([
    'JsonRpcRequest',
    'JsonRpcResponse',
    'McpPromptDefinition',
    'McpResourceDefinition',
    'McpToolDefinition',
    'SafeCommandResult',
    'SamreyMcpServerOptions',
    'ToolCallResult',
    'ToolContext'
  ])
};

export interface CodeToken {
  type: 'identifier' | 'keyword' | 'string' | 'template' | 'number' | 'punct' | 'regex';
  value: string;
  raw: string;
  line: number;
  col: number;
  start: number;
  end: number;
}

const JS_KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function',
  'if', 'import', 'in', 'instanceof', 'new', 'return', 'super', 'switch',
  'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
  'let', 'static', 'enum', 'await', 'async', 'type', 'interface', 'as',
  'from', 'of', 'null', 'undefined', 'true', 'false'
]);

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

function canPrecedeRegex(
  prevNonWsChar: string,
  lastIdent: string,
  prevTwoNonWsChars = '',
  charBeforeIncDec = ''
): boolean {
  if (!prevNonWsChar) return true;
  if (prevTwoNonWsChars === '++' || prevTwoNonWsChars === '--') {
    if (/[A-Za-z0-9_$)\]]/.test(charBeforeIncDec)) {
      return false; // postfix ++ / -- cannot precede regex
    }
  }
  if ('=([{:;?,!&|^~+-*/%<>\n\r'.includes(prevNonWsChar)) return true;
  if (prevNonWsChar === '}') return true; // block close e.g. if (x) {} /regex/
  if (/[A-Za-z0-9_$]/.test(prevNonWsChar) && lastIdent) {
    return REGEX_PRECEDING_KEYWORDS.has(lastIdent);
  }
  return false;
}

function stripCommentsAndStrings(code: string, keepTemplateExpressions = false): string {
  let out = '';
  let i = 0;
  const templateBraceStack: number[] = [];
  let prevNonWsChar = '';
  let prevTwoNonWsChars = '';
  let charBeforeIncDec = '';
  let lastIdent = '';

  const updatePrev = (ch: string) => {
    if (/[A-Za-z0-9_$]/.test(ch)) {
      lastIdent = /[A-Za-z0-9_$]/.test(prevNonWsChar) ? lastIdent + ch : ch;
    } else {
      lastIdent = '';
    }
    if (ch === '+' || ch === '-') {
      if (prevNonWsChar === ch) {
        prevTwoNonWsChars = ch + ch;
      } else {
        charBeforeIncDec = prevNonWsChar;
        prevTwoNonWsChars = ch;
      }
    } else {
      prevTwoNonWsChars = ch;
      charBeforeIncDec = '';
    }
    prevNonWsChar = ch;
  };

  const consumeTemplateSegment = () => {
    while (i < code.length) {
      const cur = code[i];
      if (cur === '\\' && i + 1 < code.length) {
        out += code[i + 1] === '\n' ? ' \n' : '  ';
        i += 2;
        continue;
      }
      if (cur === '$' && code[i + 1] === '{') {
        out += keepTemplateExpressions ? '${' : '  ';
        i += 2;
        templateBraceStack.push(1);
        prevNonWsChar = '{';
        prevTwoNonWsChars = '{';
        charBeforeIncDec = '';
        lastIdent = '';
        return;
      }
      if (cur === '`') {
        out += ' ';
        i++;
        prevNonWsChar = '`';
        prevTwoNonWsChars = '`';
        charBeforeIncDec = '';
        lastIdent = '';
        return;
      }
      out += cur === '\n' ? '\n' : ' ';
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
      if (i < code.length && code[i] === '\n') {
        out += '\n';
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

    if (ch === '/' && next !== '/' && next !== '*' && canPrecedeRegex(prevNonWsChar, lastIdent, prevTwoNonWsChars, charBeforeIncDec)) {
      const regEnd = scanRegexEnd(code, i);
      if (regEnd !== -1) {
        while (i < regEnd) {
          out += code[i] === '\n' ? '\n' : ' ';
          i++;
        }
        updatePrev('/');
        continue;
      }
    }

    if (ch === "'" || ch === '"') {
      const quote = ch;
      out += ' ';
      i++;
      while (i < code.length) {
        const cur = code[i];
        if (cur === '\\' && i + 1 < code.length) {
          out += code[i + 1] === '\n' ? ' \n' : '  ';
          i += 2;
          continue;
        }
        if (cur === quote) {
          out += ' ';
          i++;
          break;
        }
        out += cur === '\n' ? '\n' : ' ';
        i++;
      }
      updatePrev(quote);
      continue;
    }

    if (ch === '`') {
      out += ' ';
      i++;
      consumeTemplateSegment();
      continue;
    }

    if (templateBraceStack.length > 0 && ch === '{') {
      templateBraceStack[templateBraceStack.length - 1]++;
      out += ch;
      updatePrev(ch);
      i++;
      continue;
    }

    if (templateBraceStack.length > 0 && ch === '}') {
      templateBraceStack[templateBraceStack.length - 1]--;
      if (templateBraceStack[templateBraceStack.length - 1] === 0) {
        templateBraceStack.pop();
        out += ' ';
        i++;
        consumeTemplateSegment();
        continue;
      }
      out += ch;
      updatePrev(ch);
      i++;
      continue;
    }

    if (!/\s/.test(ch)) {
      updatePrev(ch);
    } else if (ch === '\n' || ch === '\r') {
      lastIdent = '';
    }
    out += ch;
    i++;
  }
  return out;
}

export function stripComments(code: string): string {
  let result = '';
  let i = 0;
  const templateBraceStack: number[] = [];
  let prevNonWsChar = '';
  let prevTwoNonWsChars = '';
  let charBeforeIncDec = '';
  let lastIdent = '';

  const updatePrev = (ch: string) => {
    if (/[A-Za-z0-9_$]/.test(ch)) {
      lastIdent = /[A-Za-z0-9_$]/.test(prevNonWsChar) ? lastIdent + ch : ch;
    } else {
      lastIdent = '';
    }
    if (ch === '+' || ch === '-') {
      if (prevNonWsChar === ch) {
        prevTwoNonWsChars = ch + ch;
      } else {
        charBeforeIncDec = prevNonWsChar;
        prevTwoNonWsChars = ch;
      }
    } else {
      prevTwoNonWsChars = ch;
      charBeforeIncDec = '';
    }
    prevNonWsChar = ch;
  };

  const consumeTemplateSegment = () => {
    while (i < code.length) {
      if (code[i] === '\\' && i + 1 < code.length) {
        result += code[i] + code[i + 1];
        i += 2;
      } else if (code[i] === '$' && code[i + 1] === '{') {
        result += '${';
        i += 2;
        templateBraceStack.push(1);
        updatePrev('{');
        return;
      } else if (code[i] === '`') {
        result += '`';
        i++;
        updatePrev('`');
        return;
      } else {
        result += code[i];
        if (!/\s/.test(code[i])) updatePrev(code[i]);
        i++;
      }
    }
  };

  while (i < code.length) {
    if (code[i] === '/' && code[i + 1] === '/') {
      result += '  ';
      i += 2;
      while (i < code.length && code[i] !== '\n') {
        result += ' ';
        i++;
      }
      if (i < code.length && code[i] === '\n') {
        result += '\n';
        i++;
      }
      continue;
    } else if (code[i] === '/' && code[i + 1] === '*') {
      result += '  ';
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        result += code[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < code.length) {
        result += '  ';
        i += 2;
      }
      continue;
    } else if (
      code[i] === '/' &&
      code[i + 1] !== '/' &&
      code[i + 1] !== '*' &&
      canPrecedeRegex(prevNonWsChar, lastIdent, prevTwoNonWsChars, charBeforeIncDec)
    ) {
      const regEnd = scanRegexEnd(code, i);
      if (regEnd !== -1) {
        result += code.slice(i, regEnd);
        i = regEnd;
        updatePrev('/');
        continue;
      }
    } else if (code[i] === "'" || code[i] === '"') {
      const quote = code[i];
      result += quote;
      i++;
      while (i < code.length && code[i] !== quote) {
        if (code[i] === '\\' && i + 1 < code.length) {
          result += code[i] + code[i + 1];
          i += 2;
        } else {
          result += code[i];
          i++;
        }
      }
      if (i < code.length) {
        result += code[i];
        i++;
      }
      updatePrev(quote);
      continue;
    } else if (code[i] === '`') {
      result += '`';
      i++;
      consumeTemplateSegment();
      continue;
    } else if (templateBraceStack.length > 0 && code[i] === '{') {
      templateBraceStack[templateBraceStack.length - 1]++;
      result += '{';
      updatePrev('{');
      i++;
      continue;
    } else if (templateBraceStack.length > 0 && code[i] === '}') {
      templateBraceStack[templateBraceStack.length - 1]--;
      result += '}';
      updatePrev('}');
      i++;
      if (templateBraceStack[templateBraceStack.length - 1] === 0) {
        templateBraceStack.pop();
        consumeTemplateSegment();
      }
      continue;
    } else {
      if (!/\s/.test(code[i])) {
        updatePrev(code[i]);
      } else if (code[i] === '\n' || code[i] === '\r') {
        lastIdent = '';
      }
      result += code[i];
      i++;
      continue;
    }
  }
  return result;
}

export function tokenizeCode(code: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  function advance(): string {
    const ch = code[i];
    i++;
    if (ch === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
    return ch;
  }

  const templateBraceStack: number[] = [];

  while (i < code.length) {
    const char = code[i];

    if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
      advance();
      continue;
    }

    if (char === '/' && code[i + 1] === '/') {
      while (i < code.length && code[i] !== '\n') {
        advance();
      }
      continue;
    }

    if (char === '/' && code[i + 1] === '*') {
      advance(); advance();
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        advance();
      }
      if (i < code.length) {
        advance(); advance();
      }
      continue;
    }

    if (char === '/' && code[i + 1] !== '/' && code[i + 1] !== '*') {
      const prevTok = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
      const prevPrevTok = tokens.length > 1 ? tokens[tokens.length - 2] : undefined;
      let canRegex = false;
      if (!prevTok) {
        canRegex = true;
      } else if (prevTok.type === 'punct') {
        if (prevTok.value === ')' || prevTok.value === ']') {
          canRegex = false;
        } else if (prevTok.value === '++' || prevTok.value === '--') {
          if (prevPrevTok && (prevPrevTok.type === 'identifier' || prevPrevTok.value === ')' || prevPrevTok.value === ']')) {
            canRegex = false;
          } else {
            canRegex = true;
          }
        } else {
          canRegex = true;
        }
      } else if (prevTok.type === 'keyword') {
        canRegex = REGEX_PRECEDING_KEYWORDS.has(prevTok.value);
      }

      if (canRegex) {
        const regexEnd = scanRegexEnd(code, i);
        if (regexEnd !== -1) {
          const start = i;
          const startLine = line;
          const startCol = col;
          let raw = '';
          while (i < regexEnd) {
            raw += advance();
          }
          tokens.push({
            type: 'regex',
            value: raw,
            raw,
            line: startLine,
            col: startCol,
            start,
            end: regexEnd
          });
          continue;
        }
      }
    }

    if (char === "'" || char === '"') {
      const quote = char;
      const start = i;
      const startLine = line;
      const startCol = col;
      advance();
      let value = '';
      while (i < code.length && code[i] !== quote) {
        if (code[i] === '\\' && i + 1 < code.length) {
          advance();
          value += code[i];
          advance();
        } else if (code[i] === '\n') {
          break;
        } else {
          value += code[i];
          advance();
        }
      }
      if (i < code.length && code[i] === quote) {
        advance();
      }
      tokens.push({
        type: 'string',
        value,
        raw: code.slice(start, i),
        line: startLine,
        col: startCol,
        start,
        end: i
      });
      continue;
    }

    if (char === '`') {
      const start = i;
      const startLine = line;
      const startCol = col;
      advance();
      let value = '';
      while (i < code.length) {
        if (code[i] === '\\' && i + 1 < code.length) {
          advance();
          value += code[i];
          advance();
        } else if (code[i] === '$' && code[i + 1] === '{') {
          advance(); advance();
          templateBraceStack.push(1);
          break;
        } else if (code[i] === '`') {
          advance();
          break;
        } else {
          value += code[i];
          advance();
        }
      }
      tokens.push({
        type: 'template',
        value,
        raw: code.slice(start, i),
        line: startLine,
        col: startCol,
        start,
        end: i
      });
      continue;
    }

    if (templateBraceStack.length > 0) {
      if (char === '{') {
        templateBraceStack[templateBraceStack.length - 1]++;
      } else if (char === '}') {
        templateBraceStack[templateBraceStack.length - 1]--;
        if (templateBraceStack[templateBraceStack.length - 1] === 0) {
          templateBraceStack.pop();
          const start = i;
          const startLine = line;
          const startCol = col;
          advance();
          let value = '';
          while (i < code.length) {
            if (code[i] === '\\' && i + 1 < code.length) {
              advance();
              value += code[i];
              advance();
            } else if (code[i] === '$' && code[i + 1] === '{') {
              advance(); advance();
              templateBraceStack.push(1);
              break;
            } else if (code[i] === '`') {
              advance();
              break;
            } else {
              value += code[i];
              advance();
            }
          }
          tokens.push({
            type: 'template',
            value,
            raw: code.slice(start, i),
            line: startLine,
            col: startCol,
            start,
            end: i
          });
          continue;
        }
      }
    }

    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(code[i + 1] || ''))) {
      const start = i;
      const startLine = line;
      const startCol = col;
      while (i < code.length && /[0-9a-zA-Z_.]/.test(code[i])) {
        advance();
      }
      tokens.push({
        type: 'number',
        value: code.slice(start, i),
        raw: code.slice(start, i),
        line: startLine,
        col: startCol,
        start,
        end: i
      });
      continue;
    }

    if (/[a-zA-Z_$]/.test(char)) {
      const start = i;
      const startLine = line;
      const startCol = col;
      while (i < code.length && /[a-zA-Z0-9_$]/.test(code[i])) {
        advance();
      }
      const val = code.slice(start, i);
      tokens.push({
        type: JS_KEYWORDS.has(val) ? 'keyword' : 'identifier',
        value: val,
        raw: val,
        line: startLine,
        col: startCol,
        start,
        end: i
      });
      continue;
    }

    const start = i;
    const startLine = line;
    const startCol = col;
    const three = code.slice(i, i + 3);
    if (three === '===' || three === '!==') {
      advance(); advance(); advance();
      tokens.push({ type: 'punct', value: three, raw: three, line: startLine, col: startCol, start, end: i });
      continue;
    }
    const two = code.slice(i, i + 2);
    if (
      two === '==' || two === '!=' || two === '<=' || two === '>=' || two === '=>' ||
      two === '??' || two === '?.' || two === '&&' || two === '||' || two === '++' ||
      two === '--' || two === '+=' || two === '-='
    ) {
      advance(); advance();
      tokens.push({ type: 'punct', value: two, raw: two, line: startLine, col: startCol, start, end: i });
      continue;
    }

    advance();
    tokens.push({
      type: 'punct',
      value: char,
      raw: char,
      line: startLine,
      col: startCol,
      start,
      end: i
    });
  }

  return tokens;
}

export function validateSamreyCode(
  source: string,
  options: { filename?: string; isTemplateOnly?: boolean } = {}
): CodeValidationResult {
  const code = source || '';
  const errors: CodeValidationError[] = [];
  const warnings: CodeValidationWarning[] = [];
  const detectedApis: string[] = [];

  const codeWithoutComments = stripComments(code);
  const codeWithoutStrings = stripCommentsAndStrings(code, false);
  const tokens = tokenizeCode(code);

  // 1. Detect Foreign Framework Imports
  let foreignFrameworkDetected: string | undefined;
  for (const forbidden of FORBIDDEN_IMPORTS) {
    if (forbidden.match.test(codeWithoutComments)) {
      foreignFrameworkDetected = forbidden.name;
      errors.push({
        message: `Forbidden ${forbidden.name} import detected. Samrey is an independent framework with its own compile-time reactive runtime.`,
        suggestion: 'Import reactive primitives from @samrey/reactivity and DOM helpers from @samrey/runtime.'
      });
    }
  }

  // 1b. Validate @samrey/* Imports Against Official Package Exports
  const importedReactivitySymbols = new Set<string>();
  const importRegex = /\bimport\s+((?:type\s+)?(?:\*\s+as\s+[A-Za-z_$][\w$]*|\{[^}]*\}|[A-Za-z_$][\w$]*(?:\s*,\s*(?:\*\s+as\s+[A-Za-z_$][\w$]*|\{[^}]*\}))?))\s+from\s+['"](@samrey\/[a-z0-9_-]+)['"]/g;
  let impMatch: RegExpExecArray | null;
  while ((impMatch = importRegex.exec(codeWithoutComments)) !== null) {
    const rawClause = impMatch[1].trim();
    const pkg = impMatch[2];
    const isGlobalTypeImport = /^\s*type\s+/.test(rawClause);

    const validExports = OFFICIAL_PACKAGE_EXPORTS[pkg];
    const validTypes = KNOWN_TYPE_EXPORTS[pkg];

    if (!validExports) {
      errors.push({
        message: `Package "${pkg}" is not a recognized @samrey package.`,
        suggestion: `Use one of the official packages: ${Object.keys(OFFICIAL_PACKAGE_EXPORTS).join(', ')}.`
      });
      continue;
    }

    const clauseWithoutType = rawClause.replace(/^type\s+/, '').trim();
    if (!clauseWithoutType.startsWith('{') && !clauseWithoutType.startsWith('*')) {
      const defMatch = clauseWithoutType.match(/^([A-Za-z_$][\w$]*)/);
      if (defMatch) {
        errors.push({
          message: `Default import "${defMatch[1]}" is not supported for "${pkg}". All @samrey/* packages use named exports.`,
          suggestion: `Use named imports instead: import { ... } from '${pkg}';`
        });
      }
    }

    const namedMatch = rawClause.match(/\{([\s\S]*?)\}/);
    if (namedMatch) {
      const items = namedMatch[1].split(',');
      for (const item of items) {
        const trimmed = item.trim();
        if (!trimmed) continue;
        const isItemType = isGlobalTypeImport || /^\s*type\s+/.test(trimmed);
        const withoutType = trimmed.replace(/^\s*type\s+/, '').trim();
        const [symbolPart, aliasPart] = withoutType.split(/\s+as\s+/);
        const symbol = (symbolPart || '').trim();
        const localName = (aliasPart || symbolPart || '').trim();
        if (!symbol) continue;

        if (!isItemType && pkg === '@samrey/reactivity') {
          importedReactivitySymbols.add(localName);
          importedReactivitySymbols.add(symbol);
        }

        if (isItemType) {
          if (!validExports.has(symbol) && (!validTypes || !validTypes.has(symbol))) {
            errors.push({
              message: `Type "${symbol}" is not exported by ${pkg}.`,
              suggestion: `Verify type exports for ${pkg}.`
            });
          }
        } else {
          if (!validExports.has(symbol)) {
            if (validTypes && validTypes.has(symbol)) {
              errors.push({
                message: `Symbol "${symbol}" is a TypeScript type-only export from ${pkg}. Use "import type { ${symbol} }" or "type ${symbol}".`,
                suggestion: `Change import to: import { type ${symbol} } from '${pkg}';`
              });
              continue;
            }

            let suggestion = `Check the official API reference for ${pkg}.`;
            if (pkg === '@samrey/router') {
              if (symbol === 'RouterView') suggestion = 'Use "RouterOutlet" from @samrey/router instead.';
              if (symbol === 'useRoute') suggestion = 'Use "useLocation" or "useParams" from @samrey/router.';
            } else if (pkg === '@samrey/reactivity') {
              if (symbol === 'store') suggestion = 'Use "createStore" from @samrey/reactivity.';
            } else if (pkg === '@samrey/forms') {
              if (symbol === 'Field' || symbol === 'useField') suggestion = 'Use "createField" or "bindField" from @samrey/forms.';
            } else if (pkg === '@samrey/testing') {
              if (symbol === 'render') suggestion = 'Use "renderTest" from @samrey/testing.';
              if (symbol === 'flushMicrotasks') suggestion = 'Use "flushReactivity" from @samrey/testing.';
            }

            errors.push({
              message: `Symbol "${symbol}" is not exported by ${pkg}.`,
              suggestion
            });
          }
        }
      }
    }
  }

  // 2. Detect React Hooks
  const forbiddenHookSet = new Set(FORBIDDEN_HOOKS);
  const flaggedHooks = new Set<string>();
  for (let tIdx = 0; tIdx < tokens.length; tIdx++) {
    const tok = tokens[tIdx];
    if (tok.type !== 'identifier' || !forbiddenHookSet.has(tok.value)) continue;
    if (flaggedHooks.has(tok.value)) continue;
    if (tok.value === 'useContext' && importedReactivitySymbols.has('useContext')) continue;
    const nextTok = tokens[tIdx + 1];
    if (!nextTok || nextTok.value !== '(') continue;
    const prevTok = tokens[tIdx - 1];
    if (prevTok && prevTok.value === '.') {
      const ownerTok = tokens[tIdx - 2];
      if (!ownerTok || ownerTok.value !== 'React') continue;
    }
    const hook = tok.value;
    flaggedHooks.add(hook);
    errors.push({
      message: `Foreign React hook "${hook}()" detected. React hooks are not part of Samrey.`,
      line: tok.line,
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

  // 2b. Detect Vue Directives (v-if, v-for, v-model, etc.)
  const vueDirectives = ['v-if', 'v-for', 'v-model', 'v-show', 'v-else', 'v-html', 'v-text'];
  for (const dir of vueDirectives) {
    if (new RegExp(`\\b${dir}\\b`).test(codeWithoutComments)) {
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

  // 2c. Detect Solid foreign APIs
  const solidApis = ['createSignal', 'createEffect'];
  for (const api of solidApis) {
    if (new RegExp(`\\b${api}\\b`).test(codeWithoutStrings)) {
      foreignFrameworkDetected = 'Solid';
      errors.push({
        message: `Foreign Solid API "${api}()" detected. Samrey is an independent framework with its own compile-time reactive runtime.`,
        suggestion: api === 'createSignal' ? 'Use "signal(initialValue)" from @samrey/reactivity.' : 'Use "effect(() => ...)" from @samrey/reactivity.'
      });
    }
  }

  // 2d. Detect Svelte 5 Runes ($state, $derived, $effect)
  const svelteRunes = ['$state', '$derived', '$effect'];
  for (const rune of svelteRunes) {
    const escaped = rune.replace('$', '\\$');
    if (new RegExp(`(?:^|[^a-zA-Z0-9_$])${escaped}\\b`).test(codeWithoutStrings)) {
      foreignFrameworkDetected = 'Svelte';
      errors.push({
        message: `Foreign Svelte rune "${rune}" detected. Samrey does not use Svelte runes.`,
        suggestion: rune === '$state' ? 'Use "signal(initialValue)" from @samrey/reactivity.' : rune === '$derived' ? 'Use "computed(() => ...)" from @samrey/reactivity.' : 'Use "effect(() => ...)" from @samrey/reactivity.'
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
    'createStore',
    'produce',
    'reconcile',
    'createRoot',
    'onCleanup',
    'onError',
    'template',
    'bindText',
    'bindAttr',
    'bindAttribute',
    'bindClass',
    'bindProperty',
    'bindDynamicChild',
    'on',
    'createComponent',
    'Show',
    'For',
    'Switch',
    'Match',
    'createRouter',
    'RouterOutlet',
    'Link',
    'useLocation',
    'useParams',
    'useNavigate',
    'useRouter',
    'createForm',
    'createField',
    'bindField',
    'createResource',
    'createHttpClient',
    'renderToString',
    'renderToStream',
    'hydrate',
    'renderTest',
    'flushReactivity'
  ];

  for (const api of apiCandidates) {
    if (new RegExp(`\\b${api}\\b`).test(codeWithoutComments)) {
      detectedApis.push(api);
    }
  }

  // 4. In-place array mutation on signals
  const inPlaceRegex = /\.value\.(push|splice|pop|shift|unshift|sort|reverse)\s*\(/g;
  let inPlaceMatch: RegExpExecArray | null;
  while ((inPlaceMatch = inPlaceRegex.exec(codeWithoutStrings)) !== null) {
    const line = code.slice(0, inPlaceMatch.index).split('\n').length;
    warnings.push({
      message: `In-place array mutation ".value.${inPlaceMatch[1]}()" detected. Signal subscribers will NOT be notified of array interior changes.`,
      line,
      suggestion: `Replace with immutable assignment: "signal.value = [...signal.value, newItem]" or "signal.update(arr => [...arr, newItem])".`
    });
  }

  // 4b. Detect Direct Signal Value Reads or Static Literals in bind* Helpers
  const twoArgBindHelpers = ['bindText', 'bindDynamicChild'];
  for (const helper of twoArgBindHelpers) {
    const calls = extractCallArguments(code, helper, codeWithoutStrings);
    for (const call of calls) {
      if (call.args.length >= 2) {
        checkBindAccessor(helper, call.args[1], call.line, errors);
      }
    }
  }

  const threeArgBindHelpers = ['bindAttr', 'bindAttribute', 'bindClass', 'bindProperty', 'bindStyle'];
  for (const helper of threeArgBindHelpers) {
    const calls = extractCallArguments(code, helper, codeWithoutStrings);
    for (const call of calls) {
      if (call.args.length >= 3) {
        checkBindAccessor(helper, call.args[2], call.line, errors);
      }
    }
  }

  // 4c. Detect document.write() / document.writeln() via AST tokens
  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    const isWriteName = t.value === 'write' || t.value === 'writeln';
    if (!isWriteName) continue;

    const isDotDocWrite =
      t.type === 'identifier' &&
      idx >= 2 &&
      (tokens[idx - 1].value === '.' || tokens[idx - 1].value === '?.') &&
      tokens[idx - 2].value === 'document' &&
      idx + 1 < tokens.length &&
      (tokens[idx + 1].value === '(' || (tokens[idx + 1].value === '?.' && tokens[idx + 2]?.value === '('));

    const isBracketDocWrite =
      (t.type === 'string' || t.type === 'template') &&
      idx >= 2 &&
      tokens[idx - 1].value === '[' &&
      (tokens[idx - 2].value === 'document' || (tokens[idx - 2].value === '?.' && tokens[idx - 3]?.value === 'document')) &&
      tokens[idx + 1]?.value === ']' &&
      (tokens[idx + 2]?.value === '(' || (tokens[idx + 2]?.value === '?.' && tokens[idx + 3]?.value === '('));

    if (isDotDocWrite || isBracketDocWrite) {
      errors.push({
        message: 'Dangerous "document.write()" call detected. Direct document writing blocks page parsing, destroys DOM state, and introduces severe XSS risks.',
        line: t.line,
        suggestion: 'Use fine-grained DOM templates with "template()" or surgical text bindings with "bindText()".'
      });
    }
  }

  // 4d. Detect eval() (direct, optional-chaining, indirect (0, eval), and window/globalThis eval)
  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    if (t.value !== 'eval') continue;

    const isBracketEval =
      (t.type === 'string' || t.type === 'template') &&
      idx >= 2 &&
      tokens[idx - 1]?.value === '[' &&
      tokens[idx + 1]?.value === ']' &&
      (tokens[idx + 2]?.value === '(' || (tokens[idx + 2]?.value === '?.' && tokens[idx + 3]?.value === '('));

    if (isBracketEval) {
      errors.push({
        message: 'Dangerous "eval()" execution detected. Arbitrary dynamic code evaluation violates framework security sandboxing and enables code injection vulnerabilities.',
        line: t.line,
        suggestion: 'Use statically analyzed functions or compute values with "computed()" and pure signals from @samrey/reactivity.'
      });
      continue;
    }

    if (t.type === 'identifier') {
      const prev = idx > 0 ? tokens[idx - 1] : null;
      const prevPrev = idx > 1 ? tokens[idx - 2] : null;
      const next = idx + 1 < tokens.length ? tokens[idx + 1] : null;
      const nextNext = idx + 2 < tokens.length ? tokens[idx + 2] : null;

      const isDirectCall = next?.value === '(' || (next?.value === '?.' && nextNext?.value === '(');
      const isParenEval =
        next?.value === ')' &&
        (nextNext?.value === '(' || (nextNext?.value === '?.' && tokens[idx + 3]?.value === '('));

      if (isDirectCall || isParenEval) {
        if (prev && (prev.value === '.' || prev.value === '?.')) {
          if (prevPrev && (prevPrev.value === 'window' || prevPrev.value === 'globalThis')) {
            errors.push({
              message: 'Dangerous "eval()" execution detected. Arbitrary dynamic code evaluation violates framework security sandboxing and enables code injection vulnerabilities.',
              line: t.line,
              suggestion: 'Use statically analyzed functions or compute values with "computed()" and pure signals from @samrey/reactivity.'
            });
          }
        } else {
          errors.push({
            message: 'Dangerous "eval()" execution detected. Arbitrary dynamic code evaluation violates framework security sandboxing and enables code injection vulnerabilities.',
            line: t.line,
            suggestion: 'Use statically analyzed functions or compute values with "computed()" and pure signals from @samrey/reactivity.'
          });
        }
      }
    }
  }

  // 4e. Detect Function constructor
  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    if (t.value !== 'Function') continue;

    const isBracketFunction =
      (t.type === 'string' || t.type === 'template') &&
      idx >= 2 &&
      tokens[idx - 1]?.value === '[' &&
      (tokens[idx - 2]?.value === 'window' || tokens[idx - 2]?.value === 'globalThis') &&
      tokens[idx + 1]?.value === ']' &&
      (tokens[idx + 2]?.value === '(' || (tokens[idx + 2]?.value === '?.' && tokens[idx + 3]?.value === '('));

    if (isBracketFunction) {
      errors.push({
        message: 'Dangerous "Function" constructor detected. Dynamic Function constructor evaluation circumvents strict CSP and enables arbitrary code execution.',
        line: t.line,
        suggestion: 'Define standard closures or use explicit compiled handlers instead of generating code strings dynamically.'
      });
      continue;
    }

    if (t.type === 'identifier') {
      const prev = idx > 0 ? tokens[idx - 1] : null;
      const prevPrev = idx > 1 ? tokens[idx - 2] : null;
      const next = idx + 1 < tokens.length ? tokens[idx + 1] : null;

      const isCall = next?.value === '(' || (next?.value === '?.' && tokens[idx + 2]?.value === '(');
      const isNew = prev?.value === 'new';
      const isWindowOrGlobal = prev && (prev.value === '.' || prev.value === '?.') && prevPrev && (prevPrev.value === 'window' || prevPrev.value === 'globalThis');
      const isTypeAnnotation = prev && (prev.value === ':' || prev.value === 'type' || prev.value === 'interface' || prev.value === 'extends' || prev.value === 'implements');

      if ((isNew && isCall) || (isWindowOrGlobal && isCall) || (isCall && !isTypeAnnotation && (!prev || prev.value === '(' || prev.value === '=' || prev.value === 'return' || prev.value === ',' || prev.value === ';' || prev.value === '{'))) {
        errors.push({
          message: 'Dangerous "new Function()" constructor detected. Dynamic Function constructor evaluation circumvents strict CSP and enables arbitrary code execution.',
          line: t.line,
          suggestion: 'Define standard closures or use explicit compiled handlers instead of generating code strings dynamically.'
        });
      }
    }
  }

  // 4f. Detect setTimeout() / setInterval() with string arguments
  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    if (
      (t.value === 'setTimeout' || t.value === 'setInterval') &&
      t.type === 'identifier'
    ) {
      const prev = idx > 0 ? tokens[idx - 1] : null;
      if (prev && (prev.value === '.' || prev.value === '?.')) {
        const prevPrev = idx > 1 ? tokens[idx - 2] : null;
        if (!prevPrev || (prevPrev.value !== 'window' && prevPrev.value !== 'globalThis')) {
          continue;
        }
      }
      const next = idx + 1 < tokens.length ? tokens[idx + 1] : null;
      if (next && next.value === '(') {
        const firstArgToken = idx + 2 < tokens.length ? tokens[idx + 2] : null;
        if (firstArgToken && (firstArgToken.type === 'string' || firstArgToken.type === 'template')) {
          errors.push({
            message: `Dangerous "${t.value}()" execution with string argument detected. Passing strings to timer functions performs implicit code evaluation (eval) and introduces code injection vulnerabilities.`,
            line: t.line,
            suggestion: `Pass a callback function closure instead of a string: "${t.value}(() => ..., delay)".`
          });
        }
      }
    }
  }

  // 4g. Detect Unsafe Dynamic / Non-Literal innerHTML and outerHTML Assignments (dot & bracket, = & +=)
  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    const isDotHtmlSink =
      (t.value === 'outerHTML' || t.value === 'innerHTML') &&
      t.type === 'identifier' &&
      idx + 1 < tokens.length &&
      (tokens[idx + 1].value === '=' || tokens[idx + 1].value === '+=');

    let isBracketHtmlSink = false;
    let bracketPropName = '';
    let bracketCloseIdx = -1;

    if (t.value === '[' && idx > 0) {
      let b = idx + 1;
      let bracketTokens: CodeToken[] = [];
      let bDepth = 1;
      while (b < tokens.length) {
        if (tokens[b].value === '[') bDepth++;
        else if (tokens[b].value === ']') {
          bDepth--;
          if (bDepth === 0) {
            bracketCloseIdx = b;
            break;
          }
        }
        bracketTokens.push(tokens[b]);
        b++;
      }

      if (bracketCloseIdx !== -1 && bracketCloseIdx + 1 < tokens.length && (tokens[bracketCloseIdx + 1].value === '=' || tokens[bracketCloseIdx + 1].value === '+=')) {
        if (bracketTokens.length === 1 && (bracketTokens[0].value === 'innerHTML' || bracketTokens[0].value === 'outerHTML')) {
          isBracketHtmlSink = true;
          bracketPropName = bracketTokens[0].value;
        } else {
          const concatenated = bracketTokens.filter(tok => tok.type === 'string' || tok.type === 'template').map(tok => tok.value).join('');
          if (concatenated === 'innerHTML' || concatenated === 'outerHTML') {
            isBracketHtmlSink = true;
            bracketPropName = concatenated;
          }
        }
      }
    }

    if (isDotHtmlSink || isBracketHtmlSink) {
      const propName = isDotHtmlSink ? t.value : bracketPropName;
      const opIdx = isDotHtmlSink ? idx + 1 : bracketCloseIdx + 1;
      const isCompound = tokens[opIdx].value === '+=';
      let rhsTokens: CodeToken[] = [];
      let j = opIdx + 1;
      let parenDepth = 0;
      let braceDepth = 0;
      let bracketDepth = 0;

      while (j < tokens.length) {
        const tok = tokens[j];
        const prevJTok = tokens[j - 1];

        if (parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
          if (tok.value === ';' || tok.value === '}' || tok.value === ',') {
            break;
          }
          if (tok.line > prevJTok.line) {
            const statementStarters = new Set(['const', 'let', 'var', 'function', 'class', 'return', 'if', 'for', 'while', 'export', 'import', 'switch', 'try', 'throw']);
            if (statementStarters.has(tok.value) || (tok.type === 'identifier' && !'+\\-*/%?:=<>!&|^'.includes(tok.value))) {
              break;
            }
          }
        }

        if (tok.value === '(') parenDepth++;
        else if (tok.value === ')') parenDepth--;
        else if (tok.value === '{') braceDepth++;
        else if (tok.value === '}') braceDepth--;
        else if (tok.value === '[') bracketDepth++;
        else if (tok.value === ']') bracketDepth--;
        rhsTokens.push(tok);
        j++;
      }

      const isSingleString = !isCompound && rhsTokens.length === 1 && rhsTokens[0].type === 'string';
      const isStaticTemplate = !isCompound && rhsTokens.length === 1 && rhsTokens[0].type === 'template';
      const isNullOrUndefined =
        !isCompound && rhsTokens.length === 1 && (rhsTokens[0].value === 'null' || rhsTokens[0].value === 'undefined');

      if (!isSingleString && !isStaticTemplate && !isNullOrUndefined) {
        const rhsRaw = rhsTokens.length > 0
          ? code.slice(rhsTokens[0].start, rhsTokens[rhsTokens.length - 1].end).trim()
          : '';
        if (propName === 'outerHTML') {
          errors.push({
            message: `Unsafe outerHTML assignment detected with non-literal expression "${rhsRaw}". This introduces Cross-Site Scripting (XSS) vulnerabilities.`,
            line: t.line,
            suggestion: 'Use fine-grained DOM templates with "template()", or sanitize the HTML with "sanitizeHtml()" from @samrey/security before assignment.'
          });
        } else {
          errors.push({
            message: `Unsafe innerHTML assignment detected with non-literal expression "${rhsRaw}". This introduces Cross-Site Scripting (XSS) vulnerabilities.`,
            line: t.line,
            suggestion: 'Use "rawHtml()" from @samrey/runtime for trusted markup, or sanitize the HTML with "sanitizeHtml()" from @samrey/security before assignment.'
          });
        }
      }
    }
  }

  // 4h. Detect insertAdjacentHTML with non-literal dynamic expressions
  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    const isDotAdjacent =
      t.value === 'insertAdjacentHTML' &&
      t.type === 'identifier' &&
      (tokens[idx + 1]?.value === '(' || (tokens[idx + 1]?.value === '?.' && tokens[idx + 2]?.value === '('));

    const isBracketAdjacent =
      t.value === 'insertAdjacentHTML' &&
      (t.type === 'string' || t.type === 'template') &&
      idx > 0 &&
      tokens[idx - 1].value === '[' &&
      tokens[idx + 1]?.value === ']' &&
      (tokens[idx + 2]?.value === '(' || (tokens[idx + 2]?.value === '?.' && tokens[idx + 3]?.value === '('));

    if (isDotAdjacent || isBracketAdjacent) {
      const openParenIdx = isDotAdjacent
        ? (tokens[idx + 1].value === '(' ? idx + 1 : idx + 2)
        : (tokens[idx + 2].value === '(' ? idx + 2 : idx + 3);

      let j = openParenIdx + 1;
      let parenDepth = 1;
      let argTokens: CodeToken[][] = [[]];

      while (j < tokens.length && parenDepth > 0) {
        const tok = tokens[j];
        if (tok.value === '(') parenDepth++;
        else if (tok.value === ')') {
          parenDepth--;
          if (parenDepth === 0) break;
        }

        if (tok.value === ',' && parenDepth === 1) {
          argTokens.push([]);
        } else {
          argTokens[argTokens.length - 1].push(tok);
        }
        j++;
      }

      if (argTokens.length >= 2) {
        const markupArg = argTokens[1];
        const isSingleString = markupArg.length === 1 && markupArg[0].type === 'string';
        const isStaticTemplate = markupArg.length === 1 && markupArg[0].type === 'template';

        if (!isSingleString && !isStaticTemplate) {
          const argRaw = markupArg.length > 0
            ? code.slice(markupArg[0].start, markupArg[markupArg.length - 1].end).trim()
            : '';
          errors.push({
            message: `Unsafe insertAdjacentHTML call detected with non-literal markup expression "${argRaw}". Inserting unverified markup introduces Cross-Site Scripting (XSS) vulnerabilities.`,
            line: t.line,
            suggestion: 'Use fine-grained DOM templates with "template()", append DOM elements, or sanitize the HTML with "sanitizeHtml()" from @samrey/security before insertion.'
          });
        }
      }
    }
  }

  // 4i. Detect dangerous URI schemes (javascript:, vbscript:, data:text/html) in HTML/JSX attributes, setAttribute, and style/srcset
  const dangerousUriPattern = /(?:javascript|vbscript|data\s*:\s*text\/html)/i;

  const attrWithUriRegex = /\b(href|xlink:href|src|action|formaction|poster|data|codebase|background|cite|longdesc|ping|srcset|imagesrcset|style)\s*=\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/gi;
  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = attrWithUriRegex.exec(codeWithoutComments)) !== null) {
    const before = codeWithoutComments.slice(0, attrMatch.index);
    if (/\b(?:const|let|var)\s*$/.test(before)) {
      continue;
    }
    const lastOpen = before.lastIndexOf('<');
    const lastClose = before.lastIndexOf('>');
    if (lastOpen === -1 || lastOpen < lastClose) {
      continue;
    }

    const attrName = attrMatch[1].toLowerCase();
    const val = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
    let isDangerous = false;
    if (attrName === 'style') {
      if (/url\s*\(\s*['"]?\s*(?:javascript|vbscript|data\s*:\s*text\/html)/i.test(val)) {
        isDangerous = true;
      }
    } else if (attrName === 'srcset' || attrName === 'imagesrcset') {
      if (dangerousUriPattern.test(val)) {
        isDangerous = true;
      }
    } else {
      if (/^\s*(?:javascript|vbscript|data\s*:\s*text\/html)/i.test(val)) {
        isDangerous = true;
      }
    }

    if (isDangerous) {
      const line = codeWithoutComments.slice(0, attrMatch.index).split('\n').length;
      const scheme = /vbscript:/i.test(val) ? 'vbscript:' : /data\s*:\s*text\/html/i.test(val) ? 'data:text/html' : 'javascript:';
      errors.push({
        message: `Dangerous "${scheme}" URI scheme detected in attribute "${attrName}". Executing script via URI schemes enables XSS attacks.`,
        line,
        suggestion: 'Use native event listeners with "on(element, \'click\', handler)" or standard valid URLs.'
      });
    }
  }

  // Check setAttribute('href', 'javascript:...') calls
  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    if (
      t.value === 'setAttribute' &&
      tokens[idx + 1]?.value === '(' &&
      tokens[idx + 2]?.type === 'string' &&
      tokens[idx + 3]?.value === ',' &&
      (tokens[idx + 4]?.type === 'string' || tokens[idx + 4]?.type === 'template')
    ) {
      const attrName = tokens[idx + 2].value.toLowerCase();
      const val = tokens[idx + 4].value;
      if (
        (attrName === 'style' && /url\s*\(\s*['"]?\s*(?:javascript|vbscript|data\s*:\s*text\/html)/i.test(val)) ||
        (attrName !== 'style' && dangerousUriPattern.test(val))
      ) {
        const scheme = /vbscript:/i.test(val) ? 'vbscript:' : /data\s*:\s*text\/html/i.test(val) ? 'data:text/html' : 'javascript:';
        errors.push({
          message: `Dangerous "${scheme}" URI scheme passed to setAttribute("${attrName}"). Executing script via URI schemes enables XSS attacks.`,
          line: t.line,
          suggestion: 'Use native event listeners with "on(element, \'click\', handler)" or standard valid URLs.'
        });
      }
    }
  }

  // 4j. Detect dangerous URI schemes in el() / Attribute Objects
  const DANGEROUS_URI_ATTRS = new Set([
    'href', 'src', 'action', 'formaction', 'poster', 'data', 'codebase',
    'background', 'cite', 'longdesc', 'ping', 'srcset', 'imagesrcset', 'style'
  ]);

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    if (
      (t.type === 'string' || t.type === 'template') &&
      dangerousUriPattern.test(t.value)
    ) {
      if (idx >= 3 && tokens[idx - 1].value === ':') {
        const keyToken = tokens[idx - 2];
        const delimToken = tokens[idx - 3];
        if (
          (delimToken.value === '{' || delimToken.value === ',') &&
          (keyToken.type === 'identifier' || keyToken.type === 'string') &&
          DANGEROUS_URI_ATTRS.has(keyToken.value.toLowerCase())
        ) {
          const scheme = /vbscript:/i.test(t.value) ? 'vbscript:' : /data\s*:\s*text\/html/i.test(t.value) ? 'data:text/html' : 'javascript:';
          errors.push({
            message: `Dangerous "${scheme}" URI scheme detected in attribute/property "${keyToken.value}". Executing script via URI schemes enables XSS attacks.`,
            line: t.line,
            suggestion: 'Use native event listeners with "on(element, \'click\', handler)" or standard valid URLs.'
          });
        }
      }
    }
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

function stripOuterBalancedParens(expr: string): string {
  let current = expr.trim();
  while (current.startsWith('(') && current.endsWith(')')) {
    let depth = 0;
    let inSingle = false;
    let inDouble = false;
    let inBacktick = false;
    let enclosesAll = true;
    for (let i = 0; i < current.length; i++) {
      const ch = current[i];
      if (inSingle) {
        if (ch === '\\') i++;
        else if (ch === "'") inSingle = false;
        continue;
      }
      if (inDouble) {
        if (ch === '\\') i++;
        else if (ch === '"') inDouble = false;
        continue;
      }
      if (inBacktick) {
        if (ch === '\\') i++;
        else if (ch === '`') inBacktick = false;
        continue;
      }
      if (ch === "'") { inSingle = true; continue; }
      if (ch === '"') { inDouble = true; continue; }
      if (ch === '`') { inBacktick = true; continue; }
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0 && i < current.length - 1) {
          enclosesAll = false;
          break;
        }
      }
    }
    if (!enclosesAll || depth !== 0) break;
    current = current.slice(1, -1).trim();
  }
  return current;
}

function splitTopLevelConditional(expr: string): { cond: string; whenTrue: string; whenFalse: string } | null {
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let questionIdx = -1;
  let nestedQuestions = 0;

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    const next = expr[i + 1];
    if (inSingle) {
      if (ch === '\\') i++;
      else if (ch === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      if (ch === '\\') i++;
      else if (ch === '"') inDouble = false;
      continue;
    }
    if (inBacktick) {
      if (ch === '\\') i++;
      else if (ch === '`') inBacktick = false;
      continue;
    }
    if (ch === "'") { inSingle = true; continue; }
    if (ch === '"') { inDouble = true; continue; }
    if (ch === '`') { inBacktick = true; continue; }

    if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (ch === '[') bracketDepth++;
    else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    else if (ch === '{') braceDepth++;
    else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
    else if (parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      if (ch === '?') {
        if (next === '?' || next === '.') {
          i++;
          continue;
        }
        if (questionIdx === -1) {
          questionIdx = i;
        } else {
          nestedQuestions++;
        }
      } else if (ch === ':' && questionIdx !== -1) {
        if (nestedQuestions > 0) {
          nestedQuestions--;
        } else {
          return {
            cond: expr.slice(0, questionIdx).trim(),
            whenTrue: expr.slice(questionIdx + 1, i).trim(),
            whenFalse: expr.slice(i + 1).trim()
          };
        }
      }
    }
  }
  return null;
}

function collectTypeofFunctionGuards(cond: string): { trueRefs: Set<string>; falseRefs: Set<string> } {
  const trueRefs = new Set<string>();
  const falseRefs = new Set<string>();
  const member = '[a-zA-Z_$][a-zA-Z0-9_$]*(?:\\s*\\.\\s*[a-zA-Z_$][a-zA-Z0-9_$]*)*';
  const eqRegex = new RegExp(
    `\\btypeof\\s+(${member})\\s*(?:===?|!==?)\\s*['"]function['"]|['"]function['"]\\s*(?:===?|!==?)\\s*typeof\\s+(${member})`,
    'g'
  );
  let m: RegExpExecArray | null;
  while ((m = eqRegex.exec(cond)) !== null) {
    const rawRef = (m[1] || m[2] || '').replace(/\s+/g, '');
    if (!rawRef) continue;
    if (m[0].includes('!=')) {
      falseRefs.add(rawRef);
    } else {
      trueRefs.add(rawRef);
    }
  }
  return { trueRefs, falseRefs };
}

function isValidAccessorExpression(expr: string, knownFunctionRefs: Set<string> = new Set()): boolean {
  const trimmed = (expr || '').trim();
  if (!trimmed) return false;

  if (
    /^(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/.test(trimmed) ||
    /^(?:async\s+)?function\b/.test(trimmed)
  ) {
    return true;
  }

  const unwrapped = stripOuterBalancedParens(trimmed);
  if (unwrapped !== trimmed) {
    return isValidAccessorExpression(unwrapped, knownFunctionRefs);
  }

  const normalizedRef = unwrapped.replace(/\s+/g, '');
  if (knownFunctionRefs.has(normalizedRef)) {
    return true;
  }

  const conditional = splitTopLevelConditional(unwrapped);
  if (conditional) {
    const { trueRefs, falseRefs } = collectTypeofFunctionGuards(conditional.cond);
    const nextTrueRefs = new Set([...knownFunctionRefs, ...trueRefs]);
    const nextFalseRefs = new Set([...knownFunctionRefs, ...falseRefs]);
    return (
      isValidAccessorExpression(conditional.whenTrue, nextTrueRefs) &&
      isValidAccessorExpression(conditional.whenFalse, nextFalseRefs)
    );
  }

  return false;
}

function checkBindAccessor(
  helperName: string,
  accessorExpr: string,
  line: number,
  errors: CodeValidationError[]
): void {
  const trimmed = (accessorExpr || '').trim();
  if (!trimmed) return;

  if (isValidAccessorExpression(trimmed)) {
    return;
  }

  if (/\.value\b/.test(trimmed)) {
    errors.push({
      message: `Direct signal value read "${trimmed}" passed to ${helperName}(). Reactive bindings require an accessor function (e.g., "() => ${trimmed}").`,
      line,
      suggestion: `Wrap the signal access in an arrow function: "() => ${trimmed}". Passing a signal value directly evaluates it once and loses reactivity.`
    });
  } else if (/^(['"`]|true\b|false\b|\d)/.test(trimmed)) {
    errors.push({
      message: `Static literal "${trimmed}" passed to ${helperName}(). Samrey bind helpers require an accessor function.`,
      line,
      suggestion: `Pass an accessor function like "() => ${trimmed}" or set static properties directly during element creation.`
    });
  } else {
    errors.push({
      message: `Argument "${trimmed}" passed to ${helperName}() is not an accessor function. Samrey bind helpers require a getter function (e.g. "() => ${trimmed}.value").`,
      line,
      suggestion: `Pass an accessor function "() => ..." instead of a bare variable or signal instance.`
    });
  }
}

function extractCallArguments(
  code: string,
  functionName: string,
  codeWithoutStrings?: string
): Array<{ rawCall: string; args: string[]; line: number }> {
  const results: Array<{ rawCall: string; args: string[]; line: number }> = [];
  const regex = new RegExp(`\\b${functionName}\\s*\\(`, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    if (codeWithoutStrings && codeWithoutStrings.slice(match.index, match.index + functionName.length) !== functionName) {
      continue;
    }
    const startIndex = match.index;
    const openParenIndex = match.index + match[0].length - 1;
    let depth = 1;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;
    const templateBraceStack: number[] = [];
    let inLineComment = false;
    let inBlockComment = false;
    let currentArg = '';
    const args: string[] = [];

    let i = openParenIndex + 1;
    for (; i < code.length; i++) {
      const char = code[i];

      if (inLineComment) {
        if (char === '\n') inLineComment = false;
        continue;
      }
      if (inBlockComment) {
        if (char === '*' && code[i + 1] === '/') {
          inBlockComment = false;
          i++;
        }
        continue;
      }

      if (inSingleQuote) {
        if (char === '\\' && i + 1 < code.length) {
          currentArg += char + code[i + 1];
          i++;
          continue;
        }
        if (char === "'") inSingleQuote = false;
        currentArg += char;
        continue;
      }

      if (inDoubleQuote) {
        if (char === '\\' && i + 1 < code.length) {
          currentArg += char + code[i + 1];
          i++;
          continue;
        }
        if (char === '"') inDoubleQuote = false;
        currentArg += char;
        continue;
      }

      if (inBacktick) {
        if (char === '\\' && i + 1 < code.length) {
          currentArg += char + code[i + 1];
          i++;
          continue;
        }
        if (char === '$' && code[i + 1] === '{') {
          templateBraceStack.push(1);
          depth++;
          inBacktick = false;
          currentArg += '${';
          i++;
          continue;
        }
        if (char === '`') inBacktick = false;
        currentArg += char;
        continue;
      }

      if (char === '/' && code[i + 1] === '/') {
        inLineComment = true;
        i++;
        continue;
      }
      if (char === '/' && code[i + 1] === '*') {
        inBlockComment = true;
        i++;
        continue;
      }
      if (char === "'") {
        inSingleQuote = true;
        currentArg += char;
        continue;
      }
      if (char === '"') {
        inDoubleQuote = true;
        currentArg += char;
        continue;
      }
      if (char === '`') {
        inBacktick = true;
        currentArg += char;
        continue;
      }

      if (templateBraceStack.length > 0 && char === '{') {
        templateBraceStack[templateBraceStack.length - 1]++;
        depth++;
        currentArg += char;
        continue;
      }
      if (templateBraceStack.length > 0 && char === '}') {
        templateBraceStack[templateBraceStack.length - 1]--;
        depth--;
        if (templateBraceStack[templateBraceStack.length - 1] === 0) {
          templateBraceStack.pop();
          inBacktick = true;
        }
        currentArg += char;
        continue;
      }

      if (char === '(' || char === '{' || char === '[') {
        depth++;
        currentArg += char;
      } else if (char === ')' || char === '}' || char === ']') {
        depth--;
        if (depth === 0) {
          args.push(currentArg.trim());
          break;
        }
        currentArg += char;
      } else if (char === ',' && depth === 1) {
        args.push(currentArg.trim());
        currentArg = '';
      } else {
        currentArg += char;
      }
    }

    const line = code.slice(0, startIndex).split('\n').length;
    const rawCall = code.slice(startIndex, i + 1);
    results.push({ rawCall, args, line });
  }

  return results;
}
