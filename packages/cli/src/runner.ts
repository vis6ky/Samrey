/**
 * @license Apache-2.0
 * @samrey/cli - CLI Command Line Dispatcher & Runner
 */

import { runCreateCommand } from './commands/create.js';
import { runDevCommand } from './commands/dev.js';
import { runBuildCommand } from './commands/build.js';
import { runPreviewCommand } from './commands/preview.js';
import { runTestCommand } from './commands/test.js';
import { runAuditCommand } from './commands/audit.js';
import { runAnalyzeCommand } from './commands/analyze.js';
import { runGenerateCommand, GenerateArtifactType } from './commands/generate.js';
import { CommandResult } from './commands/create.js';

export const CLI_VERSION = '1.0.0';

export const HELP_TEXT = `
Samrey Framework CLI v${CLI_VERSION}
High-performance reactive web framework tooling.

USAGE:
  $ samrey <command> [options]

COMMANDS:
  create <name>        Initialize a new production Samrey starter project
  dev                  Start the local dev server
  build                Compile and bundle Samrey application using project Vite
  preview              Serve production bundle locally using project Vite preview
  test                 Execute application test suites using project test runner
  audit                Run small static checks (img alt, javascript: URIs, inline handlers, <script>)
  analyze              Inspect real build artifact file sizes (raw and gzip)
  generate <type> <n>  Scaffold components, routes, stores, or async resources

OPTIONS:
  -h, --help           Display help information
  -v, --version        Display CLI version
  --template <type>    Starter template (ssr, spa, minimal, ssg) [default: ssr]
  --port <number>      Port number for dev and preview servers [default: 3000]
  --host               Expose server to local network (0.0.0.0)
  --outDir <path>      Output directory for build artifacts [default: dist]
  --warn-only          Report audit violations without non-zero exit code
  --dry-run            Simulate command execution without writing to disk
  --json               Output machine-readable JSON format (where supported)

EXAMPLES:
  $ samrey create my-app --template ssr
  $ samrey build
  $ samrey preview --port 4173
  $ samrey test
  $ samrey audit --warn-only
  $ samrey analyze --json
  $ samrey generate component UserProfile
`;

export async function runCLI(args: string[], cliOptions: { cwd?: string } = {}): Promise<CommandResult> {
  if (args.length === 0 || args.includes('-h') || args.includes('--help') || args[0] === 'help') {
    return {
      success: true,
      message: HELP_TEXT.trim(),
      exitCode: 0
    };
  }

  if (args.includes('-v') || args.includes('--version') || args[0] === 'version') {
    return {
      success: true,
      message: `samrey v${CLI_VERSION}`,
      exitCode: 0
    };
  }

  const command = args[0];
  const dryRun = args.includes('--dry-run');
  const cwd = cliOptions.cwd || process.cwd();

  switch (command) {
    case 'create': {
      const templateIdx = args.indexOf('--template');
      const templateVal = templateIdx !== -1 && args[templateIdx + 1] ? args[templateIdx + 1] : 'ssr';
      const validTemplates = ['ssr', 'spa', 'minimal', 'ssg'];
      if (!validTemplates.includes(templateVal)) {
        return {
          success: false,
          message: `[Samrey Create Error] Invalid template "${templateVal}". Valid templates are: ${validTemplates.join(', ')}.`,
          exitCode: 1
        };
      }

      // Collect positional arguments that are not flags or flag arguments
      const positionalArgs: string[] = [];
      for (let i = 1; i < args.length; i++) {
        if (args[i].startsWith('-')) {
          if (args[i] === '--template' || args[i] === '--targetDir') {
            i++; // skip value
          }
        } else {
          positionalArgs.push(args[i]);
        }
      }

      const name = positionalArgs[0];
      if (!name) {
        return {
          success: false,
          message: '[Samrey Create Error] Project name is required.\nUsage: samrey create <project-name> [--template ssr|spa|minimal|ssg]',
          exitCode: 1
        };
      }

      return runCreateCommand({ name, template: templateVal as 'ssr' | 'spa' | 'minimal' | 'ssg', dryRun, targetDir: cwd });
    }

    case 'dev': {
      const portIdx = args.indexOf('--port');
      const port = portIdx !== -1 && args[portIdx + 1] ? parseInt(args[portIdx + 1]!, 10) : 3000;
      const host = args.includes('--host');
      return runDevCommand({ port, host, dryRun });
    }

    case 'build': {
      const ssr = args.includes('--ssr');
      const outDirIdx = args.indexOf('--outDir');
      const outDir = outDirIdx !== -1 && args[outDirIdx + 1] ? args[outDirIdx + 1] : 'dist';
      return runBuildCommand({ cwd, ssr, outDir, dryRun });
    }

    case 'preview': {
      const portIdx = args.indexOf('--port');
      const port = portIdx !== -1 && args[portIdx + 1] ? parseInt(args[portIdx + 1]!, 10) : 4173;
      const host = args.includes('--host');
      const outDirIdx = args.indexOf('--outDir');
      const outDir = outDirIdx !== -1 && args[outDirIdx + 1] ? args[outDirIdx + 1] : 'dist';
      return runPreviewCommand({ cwd, port, host, outDir, dryRun });
    }

    case 'test': {
      const watch = args.includes('--watch');
      const coverage = args.includes('--coverage');
      return runTestCommand({ cwd, watch, coverage, dryRun });
    }

    case 'audit': {
      const strict = args.includes('--strict');
      const warnOnly = args.includes('--warn-only');
      const fix = args.includes('--fix');
      return runAuditCommand({ cwd, strict, warnOnly, fix });
    }

    case 'analyze': {
      const json = args.includes('--json');
      const outDirIdx = args.indexOf('--outDir');
      const outDir = outDirIdx !== -1 && args[outDirIdx + 1] ? args[outDirIdx + 1] : 'dist';
      return runAnalyzeCommand({ cwd, outDir, json });
    }

    case 'generate': {
      const type = args[1] as GenerateArtifactType;
      const name = args[2];
      if (!type || !name) {
        return {
          success: false,
          message: '[Samrey Generate Error] Type and name are required.\nUsage: samrey generate <component|route|store|resource> <Name>',
          exitCode: 1
        };
      }
      return runGenerateCommand({ type, name, dryRun });
    }

    default: {
      return {
        success: false,
        message: `[Samrey Error] Unknown command "${command}". Run "samrey --help" to view available commands.`,
        exitCode: 1
      };
    }
  }
}
