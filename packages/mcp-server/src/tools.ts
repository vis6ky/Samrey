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
  writeAllInstructions,
  installSkills
} from '@samrey/ai';
import { McpToolDefinition, ToolCallResult } from './protocol.js';
import { resolveSafePath, executeSafeCommand, redactSecrets } from './security.js';

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

const ALLOWED_DIR_PREFIXES = ['src/', 'examples/', 'tests/'];
const FORBIDDEN_FILE_PATTERNS = [
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
  const cleanRel = targetPath.replace(/\\/g, '/').replace(/^\.\//, '');

  for (const pattern of FORBIDDEN_FILE_PATTERNS) {
    if (pattern.test(cleanRel)) {
      return { valid: false, error: `Refusing to write to protected file: "${targetPath}".` };
    }
  }

  const isAllowedPrefix = ALLOWED_DIR_PREFIXES.some((prefix) => cleanRel.startsWith(prefix));
  if (!isAllowedPrefix) {
    return {
      valid: false,
      error: `Target path "${targetPath}" must be located within one of the allowed directories: src/, examples/, tests/.`
    };
  }

  let resolved: string;
  try {
    resolved = resolveSafePath(root, targetPath);
  } catch (err: any) {
    return { valid: false, error: err?.message || String(err) };
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
  // 1. samrey_search_docs
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

  // 2. samrey_get_documentation
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

  // 3. samrey_get_api_reference
  {
    name: 'samrey_get_api_reference',
    description: 'Retrieve detailed API signature, parameters, return type, and example for a specific Samrey function.',
    inputSchema: {
      type: 'object',
      properties: {
        apiName: { type: 'string', description: 'Name of the API (e.g. "signal", "computed", "effect", "template", "Show", "For", "createResource")' }
      },
      required: ['apiName']
    }
  },

  // 4. samrey_get_examples
  {
    name: 'samrey_get_examples',
    description: 'Retrieve verified, production-grade native Samrey code examples for common application patterns.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain category (e.g. "reactivity", "components", "control-flow", "routing", "forms", "http", "ssr", "full-app")' },
        exampleId: { type: 'string', description: 'Optional specific example ID (e.g. "reactive-counter", "saas-dashboard", "keyed-list-for")' }
      }
    }
  },

  // 5. samrey_get_best_practices
  {
    name: 'samrey_get_best_practices',
    description: 'Retrieve official Samrey best practices, architectural rules, and prohibited anti-patterns.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // 6. samrey_analyze_project
  {
    name: 'samrey_analyze_project',
    description: 'Inspect the current Samrey project, discover components, routes, and scan for anti-patterns or React hooks.',
    inputSchema: {
      type: 'object',
      properties: {
        subPath: { type: 'string', description: 'Optional subpath within project to analyze' }
      }
    }
  },

  // 7. samrey_detect_version
  {
    name: 'samrey_detect_version',
    description: 'Detect the installed Samrey version and framework feature compatibility in the current project.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // 8. samrey_detect_packages
  {
    name: 'samrey_detect_packages',
    description: 'List all official @samrey/* packages installed in the project dependencies and devDependencies.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // 9. samrey_inspect_structure
  {
    name: 'samrey_inspect_structure',
    description: 'Inspect the project directory layout, configuration files, and source code entrypoints.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // 10. samrey_init_project
  {
    name: 'samrey_init_project',
    description: 'Configure the current project with AI instruction files (AGENTS.md, GEMINI.md, CLAUDE.md, etc.) and skills.',
    inputSchema: {
      type: 'object',
      properties: {
        force: { type: 'boolean', description: 'Whether to overwrite existing instruction files (default: false)' }
      }
    }
  },

  // 11. samrey_generate_component
  {
    name: 'samrey_generate_component',
    description: 'Generate a new idiomatic Samrey component with static template and reactive signal bindings.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Component name (PascalCase, e.g. UserCard, HeaderNav)' },
        targetPath: { type: 'string', description: 'Relative path to write file (e.g. "src/components/UserCard.ts")' },
        withProps: { type: 'boolean', description: 'Whether to scaffold typed props interface (default: true)' }
      },
      required: ['name']
    }
  },

  // 12. samrey_generate_page
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

  // 13. samrey_generate_route
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

  // 14. samrey_validate_code
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

  // 15. samrey_check_compatibility
  {
    name: 'samrey_check_compatibility',
    description: 'Run the automated 13-task Samrey compatibility suite assessing compile and runtime readiness.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // 16. samrey_run_tests
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

  // 17. samrey_build_project
  {
    name: 'samrey_build_project',
    description: 'Compile and bundle the Samrey project for production via Vite. Note: executes project code. Requires SAMREY_MCP_ALLOW_EXEC=1 or allowExec server option.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // 18. samrey_diagnose_errors
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
  }
];

export async function handleToolCall(
  toolName: string,
  args: Record<string, any> = {},
  ctx: ToolContext
): Promise<ToolCallResult> {
  const root = ctx.projectRoot || process.cwd();

  switch (toolName) {
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
      const bp = getBestPractices();
      return {
        content: [{ type: 'text', text: bp?.content || 'Best practices guide not found.' }]
      };
    }

    case 'samrey_analyze_project': {
      const targetDir = args.subPath ? resolveSafePath(root, args.subPath) : root;
      const report = analyzeProject(targetDir);
      return {
        content: [{ type: 'text', text: JSON.stringify(report, null, 2) }]
      };
    }

    case 'samrey_detect_version': {
      const project = discoverSamreyProject(root);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                projectName: project.projectName,
                frameworkVersion: project.frameworkVersion,
                isSamreyProject: project.isSamreyProject,
                features: project.features
              },
              null,
              2
            )
          }
        ]
      };
    }

    case 'samrey_detect_packages': {
      const project = discoverSamreyProject(root);
      return {
        content: [{ type: 'text', text: JSON.stringify(project.installedPackages, null, 2) }]
      };
    }

    case 'samrey_inspect_structure': {
      const project = discoverSamreyProject(root);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                sourceDirs: project.sourceDirs,
                entryFiles: project.entryFiles,
                configFiles: project.configFiles,
                componentCount: project.componentCount
              },
              null,
              2
            )
          }
        ]
      };
    }

    case 'samrey_init_project': {
      const written = writeAllInstructions(root, Boolean(args.force));
      const skills = installSkills(path.join(root, 'skills'), Boolean(args.force));
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                instructionFiles: written,
                skillsInstalled: skills.length
              },
              null,
              2
            )
          }
        ]
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

      const code = `import { signal } from '@samrey/reactivity';
import { template, on, bindText } from '@samrey/runtime';

${args.withProps !== false ? `export interface ${name}Props {\n  title?: string;\n}\n` : ''}
const _tmpl = template('<div class="${name.toLowerCase()}-box"><h3 class="title"></h3><button class="btn">Action</button></div>');

export function ${name}(${args.withProps !== false ? `props: ${name}Props = {}` : ''}) {
  const root = _tmpl() as HTMLElement;
  ${args.withProps !== false ? `bindText(root.querySelector('.title')!, () => props.title || '${name}');` : ''}

  on(root.querySelector('.btn')!, 'click', () => {
    console.log('${name} button clicked');
  });

  return root;
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
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, code, 'utf8');
        return {
          content: [
            {
              type: 'text',
              text: `Generated component "${name}" at ${args.targetPath}:\n\n${code}`
            }
          ]
        };
      }
      return {
        content: [{ type: 'text', text: code }]
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

const _tmpl = template('<main class="page-container p-6"><h2>${name}</h2><p>Page loaded successfully.</p></main>');

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
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, code, 'utf8');
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
      const routeSnippet = `{ path: '${args.path}', component: ${componentName} }`;
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

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool "${toolName}".` }],
        isError: true
      };
  }
}

