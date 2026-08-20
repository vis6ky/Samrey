/**
 * @license Apache-2.0
 * @aether/cli - CLI Command Line Dispatcher & Runner
 */

import { runCreateCommand } from './commands/create.js';
import { runDevCommand } from './commands/dev.js';
import { runBuildCommand } from './commands/build.js';
import { runTestCommand } from './commands/test.js';
import { runAuditCommand } from './commands/audit.js';
import { runAnalyzeCommand } from './commands/analyze.js';
import { runGenerateCommand, GenerateArtifactType } from './commands/generate.js';
import { CommandResult } from './commands/create.js';

export const CLI_VERSION = '0.1.0';

export const HELP_TEXT = `
Aether Framework CLI v${CLI_VERSION}
High-performance reactive web framework tooling.

USAGE:
  $ aether <command> [options]

COMMANDS:
  create <name>        Initialize a new production Aether starter project
  dev                  Start the high-performance local dev server with DevTools
  build                Compile and bundle Aether application for production
  test                 Execute application test suites
  audit                Run static security, CSP & a11y accessibility audit
  analyze              Inspect reactive graph, static hoisting & bundle metrics
  generate <type> <n>  Scaffold components, routes, stores, or async resources

OPTIONS:
  -h, --help           Display help information
  -v, --version        Display CLI version
  --dry-run            Simulate command execution without writing to disk
  --json               Output machine-readable JSON format (where supported)

EXAMPLES:
  $ aether create my-app --template ssr
  $ aether dev --port 3000
  $ aether build --ssr
  $ aether audit --strict
  $ aether generate component UserProfile
`;

export async function runCLI(args: string[]): Promise<CommandResult> {
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
      message: `aether v${CLI_VERSION}`,
      exitCode: 0
    };
  }

  const command = args[0];
  const dryRun = args.includes('--dry-run');

  switch (command) {
    case 'create': {
      const name = args[1];
      if (!name) {
        return {
          success: false,
          message: '[Aether Create Error] Project name is required.\nUsage: aether create <project-name> [--template ssr|spa]',
          exitCode: 1
        };
      }
      const templateIdx = args.indexOf('--template');
      const template = templateIdx !== -1 && args[templateIdx + 1] ? (args[templateIdx + 1] as 'ssr' | 'spa') : 'ssr';
      return runCreateCommand({ name, template, dryRun });
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
      return runBuildCommand({ ssr, outDir, dryRun });
    }

    case 'test': {
      const watch = args.includes('--watch');
      const coverage = args.includes('--coverage');
      return runTestCommand({ watch, coverage, dryRun });
    }

    case 'audit': {
      const strict = args.includes('--strict');
      const fix = args.includes('--fix');
      return runAuditCommand({ strict, fix });
    }

    case 'analyze': {
      const json = args.includes('--json');
      return runAnalyzeCommand({ json });
    }

    case 'generate': {
      const type = args[1] as GenerateArtifactType;
      const name = args[2];
      if (!type || !name) {
        return {
          success: false,
          message: '[Aether Generate Error] Type and name are required.\nUsage: aether generate <component|route|store|resource> <Name>',
          exitCode: 1
        };
      }
      return runGenerateCommand({ type, name, dryRun });
    }

    default: {
      return {
        success: false,
        message: `[Aether Error] Unknown command "${command}". Run "aether --help" to view available commands.`,
        exitCode: 1
      };
    }
  }
}
