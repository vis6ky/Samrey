/**
 * @license Apache-2.0
 * @samrey/mcp-server - MCP Tool Definitions & Execution Handlers
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  searchDocs,
  getDocumentation,
  getApiReference,
  getBestPractices,
  getExamples,
  getExampleById,
  discoverSamreyProject,
  analyzeProject,
  validateSamreyCode,
  diagnoseError,
  runCompatibilitySuite,
  SAMREY_SKILLS,
  generateAgentsMd,
  generateGeminiMd,
  generateClaudeMd,
  generateCopilotInstructions,
  generateCursorMdc,
  SAMREY_API_REGISTRY
} from '@samrey/ai';
import { ArchitecturePlanner, SelfCorrectionEngine, WorkflowEngine } from '@samrey/ai-workflow';
import { McpToolDefinition, ToolCallResult } from './protocol.js';
import { resolveSafePath, executeSafeCommand, redactSecrets, safeWriteFile } from './security.js';

export interface ToolContext {
  projectRoot: string;
  allowExec?: boolean;
}

const NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_NAME_LENGTH = 100;

function validateArtifactName(name: string): string | null {
  if (!name || typeof name !== 'string') {
    return 'Name is required and must be a string.';
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return 'Name cannot be empty.';
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return `Name exceeds maximum length of ${MAX_NAME_LENGTH} characters.`;
  }
  if (!NAME_REGEX.test(trimmed)) {
    return `Invalid name "${trimmed}". Must match /^[A-Za-z_][A-Za-z0-9_]*$/ and contain only alphanumeric characters or underscores.`;
  }
  return null;
}

const ALLOWED_DIR_PREFIXES = ['src/', 'examples/', 'tests/', 'benchmarks/'];
const FORBIDDEN_FILE_PATTERNS = [
  /(^|\/)\.[^/]+(\/|$)/i,
  /(^|\/)package\.json$/i,
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/i,
  /(^|\/)\.git(\/|$)/i,
  /(^|\/)\.github(\/|$)/i,
  /(^|\/)node_modules(\/|$)/i,
  /(^|\/)[^/]+\.config\.[a-z0-9]+$/i,
  /(^|\/)tsconfig(\.[^/]+)?\.json$/i
];

function validateTargetPath(
  targetPath: string,
  root: string,
  overwrite = false
): { valid: boolean; error?: string; resolvedPath?: string } {
  if (typeof targetPath !== 'string') {
    return { valid: false, error: 'Target path must be a string.' };
  }

  let resolved: string;
  try {
    resolved = resolveSafePath(root, targetPath);
  } catch (err: any) {
    return { valid: false, error: err?.message || String(err) };
  }

  const resolvedRoot = path.resolve(root);
  const realRoot = (() => {
    try {
      return fs.realpathSync.native ? fs.realpathSync.native(resolvedRoot) : fs.realpathSync(resolvedRoot);
    } catch {
      return resolvedRoot;
    }
  })();

  const normalizedRel = path.relative(realRoot, resolved).replace(/\\/g, '/');

  for (const pattern of FORBIDDEN_FILE_PATTERNS) {
    if (pattern.test(normalizedRel)) {
      return { valid: false, error: `Refusing to write to protected file: "${targetPath}".` };
    }
  }

  const isAllowedPrefix = ALLOWED_DIR_PREFIXES.some((prefix) => normalizedRel.startsWith(prefix));
  if (!isAllowedPrefix) {
    return {
      valid: false,
      error: `Target path "${targetPath}" must be located within one of the allowed directories: src/, examples/, tests/, benchmarks/.`
    };
  }

  if (fs.existsSync(resolved) && overwrite !== true) {
    return {
      valid: false,
      error: `Refusing to overwrite existing file at "${targetPath}". Pass overwrite: true to allow.`
    };
  }

  return { valid: true, resolvedPath: resolved };
}

export const MCP_TOOLS: McpToolDefinition[] = [
  // 1. samrey_get_project_context
  {
    name: 'samrey_get_project_context',
    description: 'Retrieve comprehensive project context: package version, dependencies, entrypoints, discovered components, routes, and architectural health.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // 2. samrey_get_architecture
  {
    name: 'samrey_get_architecture',
    description: 'Retrieve authoritative Samrey framework architectural rules, zero-VDOM execution invariants, and compilation pipelines.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Optional architecture focus: "lifecycle", "reactivity", "compiler", "ssr", "security", or "all"'
        }
      }
    }
  },

  // 3. samrey_get_api_contracts
  {
    name: 'samrey_get_api_contracts',
    description: 'Retrieve verified TypeScript API contracts and signatures across all 13 @samrey/* packages.',
    inputSchema: {
      type: 'object',
      properties: {
        package: {
          type: 'string',
          description: 'Package name (e.g. "@samrey/reactivity", "@samrey/runtime", or "all")'
        }
      }
    }
  },

  // 4. samrey_search_docs
  {
    name: 'samrey_search_docs',
    description: 'Search official Samrey framework documentation, guides, APIs, and error codes by keywords.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keywords to search for (e.g. "signals", "Show", "routing", "SAMREY-108")' },
        category: { type: 'string', description: 'Optional category filter (e.g. reactivity, runtime, compiler, routing, forms, http, ssr)' },
        limit: { type: 'number', description: 'Maximum number of results to return (default: 5)' }
      },
      required: ['query']
    }
  },

  // 5. samrey_get_documentation
  {
    name: 'samrey_get_documentation',
    description: 'Retrieve complete documentation for a specific Samrey framework topic or section.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic or section ID (e.g. "reactivity-signals", "runtime-components-and-dom", "forms-validation")' }
      },
      required: ['topic']
    }
  },

  // 6. samrey_get_api_reference
  {
    name: 'samrey_get_api_reference',
    description: 'Retrieve detailed API signature, parameters, return type, and example for a specific Samrey function.',
    inputSchema: {
      type: 'object',
      properties: {
        apiName: { type: 'string', description: 'Name of the Samrey API export (e.g. "signal", "template", "bindText", "createForm", "renderTest")' }
      },
      required: ['apiName']
    }
  },

  // 7. samrey_get_examples
  {
    name: 'samrey_get_examples',
    description: 'Search verified production-grade code examples demonstrating idiomatic Samrey patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain or keyword filter (e.g. "counter", "search", "form", "routing", "ssr", "testing")' },
        exampleId: { type: 'string', description: 'Specific example ID to retrieve' }
      }
    }
  },

  // 8. samrey_get_best_practices
  {
    name: 'samrey_get_best_practices',
    description: 'Retrieve architectural rules, zero-VDOM guidelines, and prohibited foreign framework idioms.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional category (e.g. "reactivity", "components", "ssr", "testing", "anti-patterns")' }
      }
    }
  },

  // 9. samrey_analyze_project
  {
    name: 'samrey_analyze_project',
    description: 'Inspect current project directory, detect Samrey dependencies, identify components, routes, and check for architectural anti-patterns.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // 10. samrey_detect_version
  {
    name: 'samrey_detect_version',
    description: 'Detect installed Samrey framework version and check compatibility across packages.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // 11. samrey_detect_packages
  {
    name: 'samrey_detect_packages',
    description: 'List installed @samrey/* packages with their respective versions and configuration status.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // 12. samrey_inspect_structure
  {
    name: 'samrey_inspect_structure',
    description: 'Analyze project file tree, verify standard Samrey source directories, and identify entrypoints.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // 13. samrey_init_project
  {
    name: 'samrey_init_project',
    description: 'Initialize AI instructions, configuration files, and portable skills in the current project.',
    inputSchema: {
      type: 'object',
      properties: {
        force: { type: 'boolean', description: 'Overwrite existing configuration files if present' }
      }
    }
  },

  // 14. samrey_generate_component
  {
    name: 'samrey_generate_component',
    description: 'Generate an idiomatic Samrey component with static template hoisting, template references (.refs), and companion unit tests.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Component name (PascalCase, e.g. UserCard, HeaderNav)' },
        targetPath: { type: 'string', description: 'Optional relative path to write file (e.g. "src/components/UserCard.ts")' },
        withProps: { type: 'boolean', description: 'Whether to scaffold typed props interface (default: true)' },
        withTest: { type: 'boolean', description: 'Whether to generate companion unit test (default: true)' },
        overwrite: { type: 'boolean', description: 'Allow overwriting existing target path (default: false)' }
      },
      required: ['name']
    }
  },

  // 15. samrey_generate_feature
  {
    name: 'samrey_generate_feature',
    description: 'Generate a complete vertical feature slice: component, reactive store, route snippet, and unit tests with structured machine-readable output.',
    inputSchema: {
      type: 'object',
      properties: {
        featureName: { type: 'string', description: 'Feature name in PascalCase (e.g. "UserProfile", "ProductCatalog")' },
        routePath: { type: 'string', description: 'Optional route path (e.g. "/profile", "/catalog")' },
        targetDir: { type: 'string', description: 'Optional directory (e.g. "src/features/UserProfile")' }
      },
      required: ['featureName']
    }
  },

  // 16. samrey_generate_page
  {
    name: 'samrey_generate_page',
    description: 'Generate a new Samrey page view component with header, layout, and reactive content.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Page name (e.g. "DashboardView", "SettingsPage")' },
        targetPath: { type: 'string', description: 'Relative path to write file (e.g. "src/routes/Dashboard.ts")' }
      },
      required: ['name']
    }
  },

  // 17. samrey_generate_route
  {
    name: 'samrey_generate_route',
    description: 'Scaffold route configuration snippet matching path to component view.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'URL route path (e.g. "/dashboard", "/users/:id")' },
        componentName: { type: 'string', description: 'Component function name (e.g. "DashboardView")' }
      },
      required: ['path', 'componentName']
    }
  },

  // 18. samrey_validate_code
  {
    name: 'samrey_validate_code',
    description: 'Validate code snippet using @samrey/compiler and semantic anti-pattern linter.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'TypeScript or JSX code to validate' },
        filename: { type: 'string', description: 'Optional virtual filename (e.g. "MyComponent.tsx")' }
      },
      required: ['code']
    }
  },

  // 19. samrey_validate_project
  {
    name: 'samrey_validate_project',
    description: 'Deeply scan the workspace for compiler diagnostics, foreign framework idioms (React hooks, <Show> HTML tags), and syntax errors.',
    inputSchema: {
      type: 'object',
      properties: {
        targetDir: { type: 'string', description: 'Optional directory to scan (default: "src")' }
      }
    }
  },

  // 20. samrey_fix_diagnostics
  {
    name: 'samrey_fix_diagnostics',
    description: 'Automatically generate or apply deterministic AST and regex code repairs for diagnostic errors (e.g. SAMREY-108, foreign hooks, missing .value).',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Source code snippet to repair' },
        filePath: { type: 'string', description: 'Optional relative file path inside project to repair' },
        apply: { type: 'boolean', description: 'If true and filePath is specified, writes the fixed code to disk' }
      }
    }
  },

  // 21. samrey_check_accessibility
  {
    name: 'samrey_check_accessibility',
    description: 'Scan template markup and components for accessibility (a11y) violations: missing image alt, anchor href/aria-label, button types, or form labels.',
    inputSchema: {
      type: 'object',
      properties: {
        targetPath: { type: 'string', description: 'Optional file or directory to scan (default: "src")' },
        source: { type: 'string', description: 'Optional inline template code to inspect' }
      }
    }
  },

  // 22. samrey_check_security
  {
    name: 'samrey_check_security',
    description: 'Audit project source code for security vulnerabilities: dangerous script schemes, unescaped HTML sinks, secret exposure, or missing CSRF verification.',
    inputSchema: {
      type: 'object',
      properties: {
        targetPath: { type: 'string', description: 'Optional file or directory to audit (default: "src")' },
        source: { type: 'string', description: 'Optional inline code to inspect' }
      }
    }
  },

  // 23. samrey_verify_application
  {
    name: 'samrey_verify_application',
    description: 'Perform an end-to-end multi-dimensional quality audit covering functionality, types, API accuracy, security, a11y, and maintainability.',
    inputSchema: {
      type: 'object',
      properties: {
        runTests: { type: 'boolean', description: 'Run test suite if execution is permitted (default: false)' },
        runBuild: { type: 'boolean', description: 'Run build command if execution is permitted (default: false)' }
      }
    }
  },

  // 24. samrey_check_compatibility
  {
    name: 'samrey_check_compatibility',
    description: 'Run the automated 13-task Samrey compatibility suite assessing compile and runtime readiness.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // 25. samrey_run_tests
  {
    name: 'samrey_run_tests',
    description: 'Execute application test suites within controlled project boundaries. Note: executes project code. Requires SAMREY_MCP_ALLOW_EXEC=1 or allowExec server option.',
    inputSchema: {
      type: 'object',
      properties: {
        testPath: { type: 'string', description: 'Optional specific test file path to run' }
      }
    }
  },

  // 26. samrey_build_project
  {
    name: 'samrey_build_project',
    description: 'Compile and bundle the Samrey project for production via Vite. Note: executes project code. Requires SAMREY_MCP_ALLOW_EXEC=1 or allowExec server option.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // 27. samrey_diagnose_errors
  {
    name: 'samrey_diagnose_errors',
    description: 'Diagnose compiler or runtime error messages and provide actionable explanations and quick fixes.',
    inputSchema: {
      type: 'object',
      properties: {
        errorMessage: { type: 'string', description: 'The error text or compiler diagnostic message (e.g. "SAMREY-108")' },
        sourceCode: { type: 'string', description: 'Optional code snippet that produced the error' }
      },
      required: ['errorMessage']
    }
  },

  // 28. samrey_workflow_start
  {
    name: 'samrey_workflow_start',
    description: 'Initialize or resume an autonomous AI development task lifecycle.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Unique identifier for the task' },
        taskTitle: { type: 'string', description: 'Human-readable title of the task' },
        agentId: { type: 'string', description: 'Optional agent identifier' }
      },
      required: ['taskId', 'taskTitle']
    }
  },

  // 29. samrey_workflow_plan
  {
    name: 'samrey_workflow_plan',
    description: 'Generate a structured Samrey application architecture plan from functional requirements.',
    inputSchema: {
      type: 'object',
      properties: {
        appName: { type: 'string', description: 'Name of the application' },
        description: { type: 'string', description: 'Application purpose summary' },
        features: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of features to architect'
        }
      },
      required: ['appName', 'description', 'features']
    }
  },

  // 30. samrey_workflow_status
  {
    name: 'samrey_workflow_status',
    description: 'Inspect task state, completed stages, outstanding stages, changed files, and execution trace.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'Task identifier' }
      },
      required: ['taskId']
    }
  },

  // 31. samrey_self_correct
  {
    name: 'samrey_self_correct',
    description: 'Diagnose a build, test, or runtime failure and formulate a safe, targeted correction using Samrey rules.',
    inputSchema: {
      type: 'object',
      properties: {
        errorMessage: { type: 'string', description: 'Failure message or stack trace' },
        targetFile: { type: 'string', description: 'Optional path to the failing source file' },
        stage: { type: 'string', enum: ['BUILD', 'VALIDATION', 'TEST', 'RUNTIME'], description: 'Failure stage' }
      },
      required: ['errorMessage']
    }
  }
];

export async function handleToolCall(
  toolName: string,
  args: Record<string, any> = {},
  ctx: ToolContext
): Promise<ToolCallResult> {
  const root = ctx.projectRoot || process.cwd();

  switch (toolName) {
    case 'samrey_get_project_context': {
      const project = discoverSamreyProject(root);
      const analysis = analyzeProject(root);
      const result = {
        status: 'success',
        projectRoot: root,
        projectName: project.projectName,
        version: project.frameworkVersion,
        isSamreyProject: project.isSamreyProject,
        dependencies: project.installedPackages,
        features: project.features,
        entrypoints: project.entryFiles,
        componentsCount: analysis.discoveredComponents.length,
        components: analysis.discoveredComponents.slice(0, 30),
        routesCount: analysis.discoveredRoutes.length,
        routes: analysis.discoveredRoutes,
        healthScore: analysis.healthScore,
        documentationReference: 'file://' + path.resolve(root, 'ai/SPEC.md')
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }

    case 'samrey_get_architecture': {
      const topic = String(args.topic || 'all').toLowerCase();
      const specPath = path.resolve(root, 'ai/ARCHITECTURE.md');
      let archText = '';
      if (fs.existsSync(specPath)) {
        archText = fs.readFileSync(specPath, 'utf8');
      } else {
        archText = `# Samrey Framework Architecture
- Zero Virtual DOM: Components run EXACTLY ONCE.
- Compile-Time Static Hoisting: template("...") cloning.
- Surgical Fine-Grained DOM Bindings: bindText, bindAttr, on.
- Push-Pull Reactive Signals: signal, computed, effect, createStore.`;
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              topic,
              invariants: [
                'Components execute exactly once (Zero VDOM)',
                'Invariant HTML is statically hoisted into template() elements',
                'Signals drive surgical O(1) DOM updates without tree diffing',
                'Control flow (Show, For, Switch) are component functions, never HTML tags'
              ],
              architectureDetails: archText
            }, null, 2)
          }
        ]
      };
    }

    case 'samrey_get_api_contracts': {
      const pkg = String(args.package || 'all').toLowerCase();
      const contractsPath = path.resolve(root, 'ai/API_CONTRACTS.md');
      let content = '';
      if (fs.existsSync(contractsPath)) {
        content = fs.readFileSync(contractsPath, 'utf8');
      } else {
        content = JSON.stringify(SAMREY_API_REGISTRY, null, 2);
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              package: pkg,
              contracts: content,
              documentationLink: 'https://github.com/vis6ky/Samrey'
            }, null, 2)
          }
        ]
      };
    }

    case 'samrey_search_docs': {
      const results = searchDocs(args.query || '', {
        category: args.category,
        limit: args.limit
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }]
      };
    }

    case 'samrey_get_documentation': {
      const doc = getDocumentation(args.topic || '');
      if (!doc) {
        return {
          content: [{ type: 'text', text: `Documentation topic "${args.topic}" not found.` }],
          isError: true
        };
      }
      return {
        content: [{ type: 'text', text: doc.content }]
      };
    }

    case 'samrey_get_api_reference': {
      const api = getApiReference(args.apiName || '');
      if (!api) {
        return {
          content: [{ type: 'text', text: `API "${args.apiName}" not found in Samrey registry.` }],
          isError: true
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(api, null, 2) }]
      };
    }

    case 'samrey_get_examples': {
      if (args.exampleId) {
        const ex = getExampleById(args.exampleId);
        if (!ex) {
          return {
            content: [{ type: 'text', text: `Example ID "${args.exampleId}" not found.` }],
            isError: true
          };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(ex, null, 2) }]
        };
      }
      const examples = getExamples(args.domain);
      return {
        content: [{ type: 'text', text: JSON.stringify(examples, null, 2) }]
      };
    }

    case 'samrey_get_best_practices': {
      const best = getBestPractices();
      return {
        content: [{ type: 'text', text: JSON.stringify(best, null, 2) }]
      };
    }

    case 'samrey_analyze_project': {
      const report = analyzeProject(root);
      return {
        content: [{ type: 'text', text: JSON.stringify(report, null, 2) }]
      };
    }

    case 'samrey_detect_version': {
      const project = discoverSamreyProject(root);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            version: project.frameworkVersion,
            isSamreyProject: project.isSamreyProject,
            installedPackages: project.installedPackages
          }, null, 2)
        }]
      };
    }

    case 'samrey_detect_packages': {
      const project = discoverSamreyProject(root);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            packages: project.installedPackages,
            features: project.features
          }, null, 2)
        }]
      };
    }

    case 'samrey_inspect_structure': {
      const project = discoverSamreyProject(root);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            sourceDirs: project.sourceDirs,
            entrypoints: project.entryFiles,
            configFiles: project.configFiles
          }, null, 2)
        }]
      };
    }

    case 'samrey_init_project': {
      const written: string[] = [];
      const force = Boolean(args.force);

      const targets = [
        { path: 'AGENTS.md', content: generateAgentsMd() },
        { path: 'GEMINI.md', content: generateGeminiMd() },
        { path: 'CLAUDE.md', content: generateClaudeMd() },
        { path: '.github/copilot-instructions.md', content: generateCopilotInstructions() },
        { path: '.cursor/rules/samrey.mdc', content: generateCursorMdc() }
      ];

      try {
        for (const t of targets) {
          const full = path.join(root, t.path);
          if (!force && fs.existsSync(full)) continue;
          safeWriteFile(t.path, t.content, root, force);
          written.push(t.path);
        }

        for (const skill of SAMREY_SKILLS) {
          const sRel = `skills/${skill.id}/SKILL.md`;
          const full = path.join(root, sRel);
          if (!force && fs.existsSync(full)) continue;
          safeWriteFile(sRel, skill.content, root, force);
          written.push(sRel);
        }
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Init failed: ${err?.message || err}` }],
          isError: true
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            filesCreated: written
          }, null, 2)
        }]
      };
    }

    case 'samrey_generate_component': {
      const name = String(args.name || '').trim();
      const nameError = validateArtifactName(name);
      if (nameError) {
        return {
          content: [{ type: 'text', text: nameError }],
          isError: true
        };
      }

      const withProps = args.withProps !== false;
      const componentCode = `import { signal } from '@samrey/reactivity';
import { template, on, bindText } from '@samrey/runtime';

${withProps ? `export interface ${name}Props {\n  title?: string;\n  initialCount?: number;\n}\n` : ''}
// Hoisted static template with Template References (.refs)
const _tmpl = template('<div ref="box" class="${name.toLowerCase()}-card"><h3 ref="title"></h3><button ref="btn">Count: <span ref="count"></span></button></div>');

export function ${name}(${withProps ? `props: ${name}Props = {}` : ''}) {
  const count = signal(${withProps ? 'props.initialCount ?? 0' : '0'});
  const root = _tmpl.clone();
  const { box, title, btn, count: countEl } = root.refs;

  ${withProps ? `bindText(title, () => props.title ?? '${name}');` : `bindText(title, () => '${name}');`}
  bindText(countEl, () => count.value.toString());

  on(btn, 'click', () => {
    count.update(n => n + 1);
  });

  return root;
}
`;

      const testCode = `import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { ${name} } from './${name}.js';

describe('${name} Component', () => {
  it('renders and increments state reactively', async () => {
    const { container } = renderTest(() => ${name}({ title: 'Test ${name}', initialCount: 5 }));
    const button = container.querySelector('button')!;
    assert.ok(button.textContent?.includes('5'));

    fireEvent(button, 'click');
    await flushReactivity();

    assert.ok(button.textContent?.includes('6'));
  });
});
`;

      let writtenPath: string | undefined;
      let writtenTestPath: string | undefined;

      if (args.targetPath) {
        const pathValidation = validateTargetPath(args.targetPath, root, Boolean(args.overwrite));
        if (!pathValidation.valid || !pathValidation.resolvedPath) {
          return {
            content: [{ type: 'text', text: pathValidation.error || 'Invalid target path.' }],
            isError: true
          };
        }
        writtenPath = pathValidation.resolvedPath;
        safeWriteFile(writtenPath, componentCode, root, Boolean(args.overwrite));

        if (args.withTest !== false) {
          const testPath = writtenPath.replace(/\.(ts|js|tsx|jsx)$/, '.test.ts');
          if (testPath !== writtenPath) {
            safeWriteFile(testPath, testCode, root, Boolean(args.overwrite));
            writtenTestPath = testPath;
          }
        }
      }

      const validation = validateSamreyCode(componentCode, { filename: `${name}.ts` });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            componentName: name,
            code: componentCode,
            testCode: args.withTest !== false ? testCode : undefined,
            writtenPath: writtenPath ? path.relative(root, writtenPath) : undefined,
            writtenTestPath: writtenTestPath ? path.relative(root, writtenTestPath) : undefined,
            validation: {
              valid: validation.valid,
              errors: validation.errors,
              warnings: validation.warnings
            }
          }, null, 2)
        }]
      };
    }

    case 'samrey_generate_feature': {
      const feat = String(args.featureName || '').trim();
      const featError = validateArtifactName(feat);
      if (featError) {
        return {
          content: [{ type: 'text', text: featError }],
          isError: true
        };
      }

      const routePath = args.routePath || `/${feat.toLowerCase()}`;
      const baseDir = args.targetDir || `src/features/${feat}`;

      const storeCode = `import { signal, computed } from '@samrey/reactivity';

export interface ${feat}Item {
  id: string;
  name: string;
  active: boolean;
}

export function create${feat}Store() {
  const items = signal<${feat}Item[]>([]);
  const loading = signal(false);
  const activeCount = computed(() => items.value.filter(i => i.active).length);

  return {
    items,
    loading,
    activeCount,
    addItem: (name: string) => {
      const newItem: ${feat}Item = { id: Date.now().toString(), name, active: true };
      items.value = [...items.value, newItem];
    },
    toggleItem: (id: string) => {
      items.update(list => list.map(item => item.id === id ? { ...item, active: !item.active } : item));
    }
  };
}
`;

      const componentCode = `import { template, bindText, on, For } from '@samrey/runtime';
import { create${feat}Store } from './${feat}Store.js';

const _tmpl = template(\`
  <div class="${feat.toLowerCase()}-feature">
    <h2>${feat} Manager</h2>
    <div class="summary">Active Items: <span ref="count"></span></div>
    <div class="actions">
      <input ref="input" placeholder="New item name..." />
      <button ref="addBtn">Add</button>
    </div>
    <ul ref="list" class="items-list"></ul>
  </div>
\`);

const _itemTmpl = template('<li class="item-row"><span ref="name"></span><button ref="toggleBtn">Toggle</button></li>');

export function ${feat}View() {
  const store = create${feat}Store();
  const root = _tmpl.clone();
  const { count, input, addBtn, list } = root.refs;

  bindText(count, () => store.activeCount.value.toString());

  on(addBtn, 'click', () => {
    const inp = input as HTMLInputElement;
    if (inp.value.trim()) {
      store.addItem(inp.value.trim());
      inp.value = '';
    }
  });

  list.appendChild(
    For({
      each: () => store.items.value,
      key: (item) => item.id,
      children: (item) => {
        const row = _itemTmpl.clone();
        const { name, toggleBtn } = row.refs;
        bindText(name, () => item.name);
        on(toggleBtn, 'click', () => store.toggleItem(item.id));
        return row;
      }
    })
  );

  return root;
}
`;

      const testCode = `import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { ${feat}View } from './${feat}View.js';

describe('${feat} Feature', () => {
  it('renders and adds items reactively', async () => {
    const { container } = renderTest(() => ${feat}View());
    const input = container.querySelector('input')!;
    const button = container.querySelector('.actions button')!;
    const countEl = container.querySelector('.summary span')!;

    assert.equal(countEl.textContent, '0');

    input.value = 'Item 1';
    fireEvent(button, 'click');
    await flushReactivity();

    assert.equal(countEl.textContent, '1');
    assert.ok(container.textContent?.includes('Item 1'));
  });
});
`;

      const routeSnippet = `{ path: '${routePath}', component: ${feat}View }`;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            featureName: feat,
            routePath,
            files: {
              store: { relativePath: `${baseDir}/${feat}Store.ts`, code: storeCode },
              component: { relativePath: `${baseDir}/${feat}View.ts`, code: componentCode },
              test: { relativePath: `${baseDir}/${feat}.test.ts`, code: testCode }
            },
            routeConfigSnippet: routeSnippet
          }, null, 2)
        }]
      };
    }

    case 'samrey_validate_project': {
      const targetDir = args.targetDir ? resolveSafePath(root, args.targetDir) : root;
      const analysis = analyzeProject(targetDir);
      const diagnostics: any[] = [];

      for (const issue of analysis.issues) {
        diagnostics.push({
          file: issue.filePath,
          line: issue.line,
          severity: issue.severity,
          category: issue.category,
          message: issue.message,
          codeSnippet: issue.codeSnippet,
          suggestedFix: issue.suggestedFix
        });
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: diagnostics.some(d => d.severity === 'error') ? 'has_issues' : 'success',
            healthScore: analysis.healthScore,
            totalDiagnostics: diagnostics.length,
            diagnostics,
            recommendations: analysis.recommendations
          }, null, 2)
        }]
      };
    }

    case 'samrey_fix_diagnostics': {
      let codeToFix = String(args.code || '');
      let filePath = args.filePath ? String(args.filePath) : undefined;
      let targetFile: string | undefined;

      if (filePath) {
        const pathValidation = validateTargetPath(filePath, root, true);
        if (!pathValidation.valid) {
          return {
            content: [{ type: 'text', text: `Path validation failed: ${pathValidation.error}` }],
            isError: true
          };
        }
        targetFile = pathValidation.resolvedPath!;
        if (!fs.existsSync(targetFile)) {
          return {
            content: [{ type: 'text', text: `File not found: "${filePath}". samrey_fix_diagnostics only repairs existing files.` }],
            isError: true
          };
        }
        codeToFix = fs.readFileSync(targetFile, 'utf8');
      }

      if (!codeToFix) {
        return {
          content: [{ type: 'text', text: 'No code or valid filePath provided for repair.' }],
          isError: true
        };
      }

      let repaired = codeToFix;
      const changes: string[] = [];

      // 1. Repair React hooks
      if (repaired.includes('useState(')) {
        repaired = repaired.replace(/const\s+\[([a-zA-Z0-9_]+),\s*set[a-zA-Z0-9_]+\]\s*=\s*useState\(([^)]*)\);?/g, 'const $1 = signal($2);');
        if (!repaired.includes('@samrey/reactivity')) {
          repaired = `import { signal } from '@samrey/reactivity';\n` + repaired;
        }
        changes.push('Replaced foreign useState() with native Samrey signal()');
      }

      if (repaired.includes('useEffect(')) {
        repaired = repaired.replace(/useEffect\(\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[[^\]]*\]\s*\);?/g, 'effect(() => {\n$1\n});');
        if (!repaired.includes('effect') && repaired.includes('@samrey/reactivity')) {
          repaired = repaired.replace(/import\s*\{([^}]+)\}\s*from\s*'@samrey\/reactivity';/, "import { $1, effect } from '@samrey/reactivity';");
        }
        changes.push('Replaced foreign useEffect() with native Samrey effect()');
      }

      // 2. Repair template-level <Show> or <For> tags
      if (repaired.includes('<Show') || repaired.includes('<For')) {
        repaired = repaired.replace(/<Show\s+when=\{([^}]+)\}>([\s\S]*?)<\/Show>/g, 'Show({\n  when: () => $1,\n  children: () => $2\n})');
        changes.push('Converted template-level <Show> into Show({ when, children }) function');
      }

      // 3. Write back if apply is true
      if (args.apply) {
        if (!targetFile) {
          return {
            content: [{ type: 'text', text: 'Cannot apply fixes without a valid, existing filePath within allowed directories.' }],
            isError: true
          };
        }
        if (changes.length > 0) {
          safeWriteFile(targetFile, repaired, root, true);
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'success',
            applied: Boolean(args.apply && targetFile),
            filePath: filePath ? path.relative(root, targetFile!) : undefined,
            changesCount: changes.length,
            changes,
            repairedCode: repaired
          }, null, 2)
        }]
      };
    }

    case 'samrey_check_accessibility': {
      let codeToScan = String(args.source || '');
      const violations: any[] = [];

      function checkCode(code: string, fileLabel: string) {
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineNum = i + 1;

          // 1. Image without alt
          if (/<img\b/i.test(line) && !/\balt\s*=/i.test(line)) {
            violations.push({
              file: fileLabel,
              line: lineNum,
              tag: 'img',
              rule: 'SAMREY-202',
              severity: 'error',
              description: '<img> element missing alt attribute',
              recommendation: 'Add an informative alt="..." attribute for screen readers'
            });
          }

          // 2. Anchor without href or aria-label
          if (/<a\b/i.test(line) && !/\bhref\s*=/i.test(line) && !/\baria-label\s*=/i.test(line)) {
            violations.push({
              file: fileLabel,
              line: lineNum,
              tag: 'a',
              rule: 'SAMREY-202',
              severity: 'warning',
              description: '<a> element missing valid href or aria-label',
              recommendation: 'Add href or aria-label attribute'
            });
          }

          // 3. Button without type
          if (/<button\b/i.test(line) && !/\btype\s*=/i.test(line)) {
            violations.push({
              file: fileLabel,
              line: lineNum,
              tag: 'button',
              rule: 'SAMREY-202',
              severity: 'warning',
              description: '<button> missing explicit type attribute',
              recommendation: 'Add type="button" | "submit" | "reset"'
            });
          }
        }
      }

      if (codeToScan) {
        checkCode(codeToScan, 'inline_source');
      } else {
        const target = args.targetPath ? path.resolve(root, args.targetPath) : path.resolve(root, 'src');
        if (fs.existsSync(target)) {
          const files = fs.readdirSync(target, { recursive: true })
            .filter((f: any) => /\.(ts|tsx|js|html)$/.test(String(f)));
          for (const f of files) {
            const full = path.join(target, String(f));
            if (fs.statSync(full).isFile()) {
              checkCode(fs.readFileSync(full, 'utf8'), path.relative(root, full));
            }
          }
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: violations.length === 0 ? 'passed' : 'violations_found',
            totalViolations: violations.length,
            violations
          }, null, 2)
        }]
      };
    }

    case 'samrey_check_security': {
      let codeToScan = String(args.source || '');
      const vulnerabilities: any[] = [];

      function checkSec(code: string, fileLabel: string) {
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineNum = i + 1;

          // 1. Dangerous scheme
          if (/javascript:|vbscript:/i.test(line)) {
            vulnerabilities.push({
              file: fileLabel,
              line: lineNum,
              rule: 'SAMREY-201',
              severity: 'error',
              description: 'Prohibited dangerous URI scheme (javascript: or vbscript:)',
              recommendation: 'Use sanitizeUrl() from @samrey/security'
            });
          }

          // 2. Direct innerHTML assignment
          if (/\.innerHTML\s*=/i.test(line) && !line.includes('sanitizeHtml')) {
            vulnerabilities.push({
              file: fileLabel,
              line: lineNum,
              rule: 'SAMREY-201',
              severity: 'error',
              description: 'Unsanitized innerHTML assignment',
              recommendation: 'Wrap untrusted HTML in sanitizeHtml() from @samrey/security'
            });
          }

          // 3. Exposed secret keys in source
          if (/(api[_-]?key|secret|password|private[_-]?key)\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/i.test(line)) {
            vulnerabilities.push({
              file: fileLabel,
              line: lineNum,
              rule: 'SAMREY-201',
              severity: 'error',
              description: 'Hardcoded secret or credential detected in source code',
              recommendation: 'Move credentials to environment variables and use stripSecrets() during SSR'
            });
          }
        }
      }

      if (codeToScan) {
        checkSec(codeToScan, 'inline_source');
      } else {
        const target = args.targetPath ? path.resolve(root, args.targetPath) : path.resolve(root, 'src');
        if (fs.existsSync(target)) {
          const files = fs.readdirSync(target, { recursive: true })
            .filter((f: any) => /\.(ts|tsx|js)$/.test(String(f)));
          for (const f of files) {
            const full = path.join(target, String(f));
            if (fs.statSync(full).isFile()) {
              checkSec(fs.readFileSync(full, 'utf8'), path.relative(root, full));
            }
          }
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: vulnerabilities.length === 0 ? 'secure' : 'vulnerabilities_found',
            totalVulnerabilities: vulnerabilities.length,
            vulnerabilities
          }, null, 2)
        }]
      };
    }

    case 'samrey_verify_application': {
      const analysis = analyzeProject(root);
      const a11yResult = await handleToolCall('samrey_check_accessibility', {}, ctx);
      const secResult = await handleToolCall('samrey_check_security', {}, ctx);

      const parsedA11y = JSON.parse(a11yResult.content[0].text);
      const parsedSec = JSON.parse(secResult.content[0].text);

      const canExec = Boolean(
        ctx.allowExec ||
        process.env.SAMREY_MCP_ALLOW_EXEC === '1' ||
        process.env.SAMREY_MCP_ALLOW_EXEC === 'true'
      );

      let testPassed = true;
      let buildPassed = true;

      if (canExec && (args.runTests || args.runBuild)) {
        if (args.runTests) {
          try {
            const res = await executeSafeCommand('npm', ['test'], root);
            testPassed = res.exitCode === 0;
          } catch {
            testPassed = false;
          }
        }
        if (args.runBuild) {
          try {
            const res = await executeSafeCommand('npm', ['run', 'build'], root);
            buildPassed = res.exitCode === 0;
          } catch {
            buildPassed = false;
          }
        }
      }

      // Phase 7 Multi-Factor Weighted Scoring
      // Functional: 30%, Build/Types: 15%, API: 15%, Tests: 10%, Security: 10%, A11y: 5%, Maintainability: 10%, Performance: 5%
      const funcScore = testPassed ? 30 : 0;
      const buildScore = buildPassed ? 15 : 0;
      const apiScore = analysis.issues.some(i => i.category === 'foreign-framework') ? 0 : 15;
      const testScore = testPassed ? 10 : 0;
      const secScore = parsedSec.vulnerabilities.length === 0 ? 10 : Math.max(0, 10 - parsedSec.vulnerabilities.length * 3);
      const a11yScore = parsedA11y.violations.length === 0 ? 5 : Math.max(0, 5 - parsedA11y.violations.length * 1);
      const maintScore = Math.round(analysis.healthScore * 0.1);
      const perfScore = 5;

      const totalScore = funcScore + buildScore + apiScore + testScore + secScore + a11yScore + maintScore + perfScore;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: totalScore >= 70 ? 'verified' : 'failed',
            overallScore: totalScore,
            scoreBreakdown: {
              functionalCorrectness: { score: funcScore, max: 30 },
              buildAndTypeCheck: { score: buildScore, max: 15 },
              samreyApiUsage: { score: apiScore, max: 15 },
              testCoverageAndSuccess: { score: testScore, max: 10 },
              security: { score: secScore, max: 10 },
              accessibility: { score: a11yScore, max: 5 },
              maintainability: { score: maintScore, max: 10 },
              performance: { score: perfScore, max: 5 }
            },
            healthScore: analysis.healthScore,
            securityVulnerabilities: parsedSec.vulnerabilities.length,
            accessibilityViolations: parsedA11y.violations.length
          }, null, 2)
        }]
      };
    }

    case 'samrey_generate_page': {
      const name = String(args.name || '').trim();
      const nameError = validateArtifactName(name);
      if (nameError) {
        return {
          content: [{ type: 'text', text: nameError }],
          isError: true
        };
      }
      const code = `import { template } from '@samrey/runtime';

const _tmpl = template(\`
  <div class="page-container">
    <header><h1>${name}</h1></header>
    <main><p>Page content for ${name}</p></main>
  </div>
\`);

export function ${name}() {
  return _tmpl();
}
`;
      if (args.targetPath) {
        const pathValidation = validateTargetPath(args.targetPath, root, Boolean(args.overwrite));
        if (!pathValidation.valid || !pathValidation.resolvedPath) {
          return {
            content: [{ type: 'text', text: pathValidation.error || 'Invalid target path.' }],
            isError: true
          };
        }
        const dest = pathValidation.resolvedPath;
        try {
          safeWriteFile(dest, code, root, Boolean(args.overwrite));
        } catch (err: any) {
          return {
            content: [{ type: 'text', text: err?.message || String(err) }],
            isError: true
          };
        }
        return {
          content: [{ type: 'text', text: `Generated page view "${name}" at ${args.targetPath}:\n\n${code}` }]
        };
      }
      return { content: [{ type: 'text', text: code }] };
    }

    case 'samrey_generate_route': {
      const componentName = String(args.componentName || '').trim();
      const nameError = validateArtifactName(componentName);
      if (nameError) {
        return {
          content: [{ type: 'text', text: nameError }],
          isError: true
        };
      }
      const routePath = typeof args.path === 'string' ? args.path.trim() : '';
      if (!routePath || /[\r\n\0]/.test(routePath) || !routePath.startsWith('/') && routePath !== '*') {
        return {
          content: [{ type: 'text', text: 'Invalid route path: must be a non-empty route starting with "/" (or "*") without control characters.' }],
          isError: true
        };
      }
      const routeSnippet = `{ path: ${JSON.stringify(routePath)}, component: ${componentName} }`;
      return {
        content: [{ type: 'text', text: routeSnippet }]
      };
    }

    case 'samrey_validate_code': {
      const result = validateSamreyCode(args.code || '', { filename: args.filename });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }

    case 'samrey_check_compatibility': {
      const report = await runCompatibilitySuite({ platform: 'mcp-server' });
      return {
        content: [{ type: 'text', text: JSON.stringify(report, null, 2) }]
      };
    }

    case 'samrey_run_tests': {
      const canExec = Boolean(
        ctx.allowExec ||
        process.env.SAMREY_MCP_ALLOW_EXEC === '1' ||
        process.env.SAMREY_MCP_ALLOW_EXEC === 'true'
      );
      if (!canExec) {
        return {
          content: [{
            type: 'text',
            text: 'Execution disabled: Running tests executes project code. To enable, set SAMREY_MCP_ALLOW_EXEC=1 in your environment or pass allowExec: true to the MCP server.'
          }],
          isError: true
        };
      }
      try {
        const testArgs = ['test'];
        if (args.testPath) {
          testArgs.push(resolveSafePath(root, args.testPath));
        }
        const res = await executeSafeCommand('npm', testArgs, root);
        return {
          content: [
            {
              type: 'text',
              text: redactSecrets(`Test Exit Code: ${res.exitCode}\n\n${res.stdout}\n${res.stderr}`)
            }
          ]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Test execution failed: ${err?.message || err}` }],
          isError: true
        };
      }
    }

    case 'samrey_build_project': {
      const canExec = Boolean(
        ctx.allowExec ||
        process.env.SAMREY_MCP_ALLOW_EXEC === '1' ||
        process.env.SAMREY_MCP_ALLOW_EXEC === 'true'
      );
      if (!canExec) {
        return {
          content: [{
            type: 'text',
            text: 'Execution disabled: Running build executes project code and bundler plugins. To enable, set SAMREY_MCP_ALLOW_EXEC=1 in your environment or pass allowExec: true to the MCP server.'
          }],
          isError: true
        };
      }
      try {
        const res = await executeSafeCommand('npm', ['run', 'build'], root);
        return {
          content: [
            {
              type: 'text',
              text: redactSecrets(`Build Exit Code: ${res.exitCode}\n\n${res.stdout}\n${res.stderr}`)
            }
          ]
        };
      } catch (err: any) {
        return {
          content: [{ type: 'text', text: `Build failed: ${err?.message || err}` }],
          isError: true
        };
      }
    }

    case 'samrey_diagnose_errors': {
      const diag = diagnoseError(args.errorMessage || '', args.sourceCode);
      return {
        content: [{ type: 'text', text: JSON.stringify(diag, null, 2) }]
      };
    }

    case 'samrey_workflow_start': {
      const engine = new WorkflowEngine(
        args.taskId,
        args.taskTitle,
        root,
        args.agentId || 'mcp-agent'
      );
      const disc = await engine.discover();
      return {
        content: [{ type: 'text', text: JSON.stringify({ state: engine.getState(), discovery: disc.data }, null, 2) }]
      };
    }

    case 'samrey_workflow_plan': {
      const planner = new ArchitecturePlanner();
      const plan = planner.planApplication({
        appName: args.appName,
        description: args.description,
        features: args.features || []
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }]
      };
    }

    case 'samrey_workflow_status': {
      const engine = new WorkflowEngine(args.taskId, '', root);
      return {
        content: [{ type: 'text', text: JSON.stringify({ state: engine.getState(), trace: engine.getTrace() }, null, 2) }]
      };
    }

    case 'samrey_self_correct': {
      const engine = new SelfCorrectionEngine();
      const correction = engine.diagnoseFailure({
        stage: args.stage || 'BUILD',
        errorMessage: args.errorMessage,
        targetFile: args.targetFile
      }, root);
      return {
        content: [{
          type: 'text',
          text: correction
            ? JSON.stringify({ identified: true, correction }, null, 2)
            : JSON.stringify({ identified: false, message: 'No authoritative root cause identified.' }, null, 2)
        }]
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool "${toolName}".` }],
        isError: true
      };
  }
}
