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
    'isStore',
    'onCleanup',
    'onError',
    'produce',
    'queueEffect',
    'reconcile',
    'runWithOwner',
    'setActiveSubscriber',
    'setGlobalErrorHandler',
    'setOwner',
    'signal',
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
    'TrustedTypesPolicy',
    'createCsrfToken',
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
    'sanitizeHtml',
    'sanitizeHtmlString',
    'sanitizeRedirectUri',
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
    'MockDOMNode',
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
    'validateSamreyCode',
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
    'resolveSafePath'
  ])
};

export const KNOWN_TYPE_EXPORTS: Record<string, Set<string>> = {
  '@samrey/reactivity': new Set([
    'Signal',
    'ReadonlySignal',
    'Subscriber',
    'Dependency',
    'Owner',
    'Dispose',
    'Context',
    'EffectFunction',
    'MemoFunction',
    'Store',
    'ReactiveNode'
  ]),
  '@samrey/router': new Set([
    'RouteConfig',
    'RouteRecord',
    'RouterOptions',
    'RouteMatch',
    'NavigateOptions',
    'HistoryLocation',
    'RouteParams',
    'RouterInstance',
    'History'
  ]),
  '@samrey/forms': new Set([
    'FormConfig',
    'FieldConfig',
    'ValidationResult',
    'FieldState',
    'FormState',
    'ValidatorFn',
    'FormErrors',
    'StandardSchemaV1',
    'Validator'
  ]),
  '@samrey/runtime': new Set([
    'Component',
    'Props',
    'Accessor',
    'Setter',
    'BindingContext',
    'DynamicChild',
    'TemplateNode',
    'SecurityClassification',
    'AIRNode',
    'ChildValue',
    'ElementProps',
    'DevDiagnostic',
    'ShowProps',
    'ForProps',
    'MatchProps',
    'SwitchProps',
    'ErrorBoundaryProps',
    'DynamicProps',
    'PortalProps',
    'SuspenseProps'
  ]),
  '@samrey/http': new Set([
    'RequestCache',
    'HttpClient',
    'HttpError',
    'HttpClientOptions',
    'FetchOptions',
    'Resource',
    'ResourceStatus',
    'HttpCacheOptions',
    'ResourceOptions',
    'RequestOptions'
  ]),
  '@samrey/ssr': new Set([
    'SSRContext',
    'ServerData',
    'HydrationOptions',
    'SerializeOptions',
    'DeserializeOptions',
    'StateValidator',
    'HydrateOptions',
    'HydrationResult',
    'StaticPathEntry',
    'StaticRouteConfig',
    'SSGOptions',
    'GeneratedPage',
    'SSGResult',
    'SSRHeadMetadata',
    'RenderToStringOptions',
    'RenderToStreamOptions',
    'ServerDataOptions',
    'ServerDataActions'
  ]),
  '@samrey/testing': new Set([
    'TestRenderResult',
    'RenderResult',
    'TestContainer'
  ]),
  '@samrey/security': new Set([
    'SamreyTrustedPolicy',
    'TrustedTypesOptions',
    'SecretGuardOptions'
  ]),
  '@samrey/compiler': new Set([
    'SourceLocationInfo',
    'SamreyErrorCode',
    'ErrorDefinition',
    'SamreyDiagnosticOptions',
    'Position',
    'SourceLocation',
    'ASTAttributeNode',
    'ASTTextNode',
    'ASTInterpolationNode',
    'ASTElementNode',
    'ASTComponentNode',
    'ASTShowNode',
    'ASTForNode',
    'ASTRootNode',
    'ASTNode',
    'SecurityContext',
    'AIRStaticNode',
    'AIRDynamicTextNode',
    'AIRDynamicAttrNode',
    'AIRDynamicEventNode',
    'AIRControlFlowSlotNode',
    'AIRNode',
    'AIRTemplateUnit',
    'AIRCompilationResult',
    'ParseOptions',
    'ParseResult',
    'ConstantFoldResult'
  ]),
  '@samrey/devtools': new Set([
    'InspectedSignalNode',
    'InspectedNetworkRequest',
    'InspectedRouterState',
    'InspectedFormState'
  ]),
  '@samrey/cli': new Set([
    'ExecResult',
    'AnalyzeCommandOptions',
    'DevCommandOptions',
    'TestCommandOptions',
    'GenerateArtifactType',
    'GenerateCommandOptions',
    'CreateCommandOptions',
    'CommandResult',
    'AuditCommandOptions',
    'PreviewCommandOptions',
    'BuildCommandOptions',
    'AuditReport',
    'StarterProjectFiles',
    'SamreyPluginOptions'
  ]),
  '@samrey/ai': new Set([
    'InstalledSamreyPackage',
    'SamreyProjectContext',
    'CodeValidationError',
    'CodeValidationWarning',
    'CodeValidationResult',
    'ProjectAnalysisReport',
    'SamreyCodeExample',
    'DiagnosticDiagnosis',
    'DocSection',
    'ApiReference',
    'SearchResult',
    'AgentSkillDefinition',
    'AiPlatform',
    'SecurityPolicy',
    'AiIntegrationConfig',
    'CompatibilityTask',
    'TaskExecutionResult',
    'CompatibilitySuiteReport'
  ]),
  '@samrey/mcp-server': new Set([
    'SafeCommandResult',
    'JsonRpcRequest',
    'JsonRpcResponse',
    'McpToolDefinition',
    'McpResourceDefinition',
    'McpPromptDefinition',
    'ToolCallResult',
    'ToolContext',
    'SamreyMcpServerOptions'
  ])
};

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

  // 1b. Validate @samrey/* Imports Against Official Package Exports
  const importRegex = /import\s+([\s\S]*?)\s+from\s+['"](@samrey\/[a-z0-9-]+)['"]/g;
  let impMatch: RegExpExecArray | null;
  while ((impMatch = importRegex.exec(code)) !== null) {
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

    const namedMatch = rawClause.match(/\{([\s\S]*?)\}/);
    if (namedMatch) {
      const items = namedMatch[1].split(',');
      for (const item of items) {
        const trimmed = item.trim();
        if (!trimmed) continue;
        const isItemType = isGlobalTypeImport || /^\s*type\s+/.test(trimmed);
        const withoutType = trimmed.replace(/^\s*type\s+/, '').trim();
        const symbol = withoutType.split(/\s+as\s+/)[0].trim();
        if (!symbol) continue;

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
              // Imported type without type keyword
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

  // 4b. Detect Direct Signal Value Reads or Static Literals in bind* Helpers
  const twoArgBindHelpers = ['bindText', 'bindDynamicChild'];
  for (const helper of twoArgBindHelpers) {
    const calls = extractCallArguments(code, helper);
    for (const call of calls) {
      if (call.args.length >= 2) {
        checkBindAccessor(helper, call.args[1], call.line, errors);
      }
    }
  }

  const threeArgBindHelpers = ['bindAttr', 'bindAttribute', 'bindClass', 'bindProperty', 'bindStyle'];
  for (const helper of threeArgBindHelpers) {
    const calls = extractCallArguments(code, helper);
    for (const call of calls) {
      if (call.args.length >= 3) {
        checkBindAccessor(helper, call.args[2], call.line, errors);
      }
    }
  }

  // 4c. Detect Unsafe Dynamic / Non-Literal innerHTML Assignments
  const innerHtmlRegex = /\b([a-zA-Z0-9_$.]+)?\binnerHTML\s*=\s*([^;\n]+)/g;
  let ihMatch: RegExpExecArray | null;
  while ((ihMatch = innerHtmlRegex.exec(code)) !== null) {
    const rawRhs = ihMatch[2].trim();
    const line = code.slice(0, ihMatch.index).split('\n').length;

    const isSafeLiteral =
      /^(?:'[^']*'|"[^"]*"|null|undefined|''|""|``)$/.test(rawRhs) ||
      (/^`[\s\S]*`$/.test(rawRhs) && !rawRhs.includes('${'));

    if (!isSafeLiteral) {
      errors.push({
        message: `Unsafe innerHTML assignment detected with non-literal expression "${rawRhs}". This introduces Cross-Site Scripting (XSS) vulnerabilities.`,
        line,
        suggestion: 'Use "rawHtml()" from @samrey/runtime for trusted markup, or sanitize the HTML with "sanitizeHtml()" from @samrey/security before assignment.'
      });
    }
  }

  // 4d. Detect document.write() / document.writeln()
  const docWriteRegex = /\bdocument\s*\.\s*(?:write|writeln)\s*\(/g;
  let dwMatch: RegExpExecArray | null;
  while ((dwMatch = docWriteRegex.exec(code)) !== null) {
    const line = code.slice(0, dwMatch.index).split('\n').length;
    errors.push({
      message: 'Dangerous "document.write()" call detected. Direct document writing blocks page parsing, destroys DOM state, and introduces severe XSS risks.',
      line,
      suggestion: 'Use fine-grained DOM templates with "template()" or surgical text bindings with "bindText()".'
    });
  }

  // 4e. Detect eval()
  const evalRegex = /\beval\s*\(/g;
  let evalMatch: RegExpExecArray | null;
  while ((evalMatch = evalRegex.exec(code)) !== null) {
    const line = code.slice(0, evalMatch.index).split('\n').length;
    errors.push({
      message: 'Dangerous "eval()" execution detected. Arbitrary dynamic code evaluation violates framework security sandboxing and enables code injection vulnerabilities.',
      line,
      suggestion: 'Use statically analyzed functions or compute values with "computed()" and pure signals from @samrey/reactivity.'
    });
  }

  // 4f. Detect new Function()
  const newFunctionRegex = /\bnew\s+Function\s*\(/g;
  let fnMatch: RegExpExecArray | null;
  while ((fnMatch = newFunctionRegex.exec(code)) !== null) {
    const line = code.slice(0, fnMatch.index).split('\n').length;
    errors.push({
      message: 'Dangerous "new Function()" constructor detected. Dynamic Function constructor evaluation circumvents strict CSP and enables arbitrary code execution.',
      line,
      suggestion: 'Define standard closures or use explicit compiled handlers instead of generating code strings dynamically.'
    });
  }

  // 4g. Detect javascript: URIs in Attributes
  const jsUriRegex = /\b(?:[a-zA-Z0-9_:-]+)\s*=\s*(?:'\s*javascript:[^']*'|"\s*javascript:[^"]*"|`\s*javascript:[^`]*`)/gi;
  let jsUriMatch: RegExpExecArray | null;
  while ((jsUriMatch = jsUriRegex.exec(code)) !== null) {
    const line = code.slice(0, jsUriMatch.index).split('\n').length;
    errors.push({
      message: `Dangerous "javascript:" URI scheme detected in attribute (${jsUriMatch[0]}). Executing script via URI schemes enables XSS attacks.`,
      line,
      suggestion: 'Use native event listeners with "on(element, \'click\', handler)" or standard valid URLs.'
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

function checkBindAccessor(
  helperName: string,
  accessorExpr: string,
  line: number,
  errors: CodeValidationError[]
): void {
  const trimmed = (accessorExpr || '').trim();
  if (!trimmed) return;

  const isArrowFn = /^(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/.test(trimmed);
  const isFuncExpr = /^function\b/.test(trimmed);

  if (isArrowFn || isFuncExpr) {
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
  functionName: string
): Array<{ rawCall: string; args: string[]; line: number }> {
  const results: Array<{ rawCall: string; args: string[]; line: number }> = [];
  const regex = new RegExp(`\\b${functionName}\\s*\\(`, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(code)) !== null) {
    const startIndex = match.index;
    const openParenIndex = match.index + match[0].length - 1;
    let depth = 1;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;
    let inLineComment = false;
    let inBlockComment = false;
    let currentArg = '';
    const args: string[] = [];

    let i = openParenIndex + 1;
    for (; i < code.length; i++) {
      const char = code[i];
      const prevChar = i > 0 ? code[i - 1] : '';

      if (inLineComment) {
        if (char === '\n') inLineComment = false;
        continue;
      }
      if (inBlockComment) {
        if (char === '/' && prevChar === '*') inBlockComment = false;
        continue;
      }

      if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
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
      }

      if (char === "'" && !inDoubleQuote && !inBacktick && prevChar !== '\\') {
        inSingleQuote = !inSingleQuote;
        currentArg += char;
        continue;
      }
      if (char === '"' && !inSingleQuote && !inBacktick && prevChar !== '\\') {
        inDoubleQuote = !inDoubleQuote;
        currentArg += char;
        continue;
      }
      if (char === '`' && !inSingleQuote && !inDoubleQuote && prevChar !== '\\') {
        inBacktick = !inBacktick;
        currentArg += char;
        continue;
      }

      if (!inSingleQuote && !inDoubleQuote && !inBacktick) {
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
