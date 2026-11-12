/**
 * @license Apache-2.0
 * @samrey/cli - CLI Command Line Dispatcher & Runner
 */

import * as path from 'node:path';
import { runCreateCommand } from './commands/create.js';
import { runDevCommand } from './commands/dev.js';
import { runBuildCommand } from './commands/build.js';
import { runPreviewCommand } from './commands/preview.js';
import { runTestCommand } from './commands/test.js';
import { runAuditCommand } from './commands/audit.js';
import { runAnalyzeCommand } from './commands/analyze.js';
import { runGenerateCommand, GenerateArtifactType } from './commands/generate.js';
import { CommandResult } from './commands/create.js';

export const CLI_VERSION = '2.1.0';

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
  ai <subcommand>      Universal AI development integration, doctor, and MCP server

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

function isFlagToken(token: string | undefined): boolean {
  return typeof token === 'string' && token.length > 1 && token.startsWith('-') && !/^-\d+(\.\d+)?$/.test(token);
}

function optionValueError(flagName: string): CommandResult {
  return {
    success: false,
    message: `[Samrey CLI Error] Option "${flagName}" requires a value.`,
    exitCode: 1
  };
}

function consumeOptionValue(
  args: string[],
  index: number,
  flagName: string
): { value: string; nextIndex: number } | { error: CommandResult } {
  const arg = args[index]!;
  if (arg.startsWith(`${flagName}=`)) {
    const val = arg.slice(flagName.length + 1);
    if (!val) {
      return { error: optionValueError(flagName) };
    }
    return { value: val, nextIndex: index };
  }
  const next = args[index + 1];
  if (next === undefined || next === '' || isFlagToken(next)) {
    return { error: optionValueError(flagName) };
  }
  return { value: next, nextIndex: index + 1 };
}

export async function runCLI(args: string[], cliOptions: { cwd?: string } = {}): Promise<CommandResult> {
  const cwd = cliOptions.cwd || process.cwd();

  if (args[0] === 'ai') {
    const { runAiCommand } = await import('./commands/ai.js');
    return runAiCommand(args, { cwd });
  }

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

  switch (command) {
    case 'create': {
      let templateVal = 'ssr';
      let targetDirVal: string | undefined;
      const positionalArgs: string[] = [];

      for (let i = 1; i < args.length; i++) {
        const arg = args[i]!;
        if (arg === '--template' || arg.startsWith('--template=')) {
          const res = consumeOptionValue(args, i, '--template');
          if ('error' in res) return res.error;
          templateVal = res.value;
          i = res.nextIndex;
        } else if (arg === '--targetDir' || arg.startsWith('--targetDir=')) {
          const res = consumeOptionValue(args, i, '--targetDir');
          if ('error' in res) return res.error;
          targetDirVal = res.value;
          i = res.nextIndex;
        } else if (!arg.startsWith('-')) {
          positionalArgs.push(arg);
        }
      }

      const validTemplates = ['ssr', 'spa', 'minimal', 'ssg'];
      if (!validTemplates.includes(templateVal)) {
        return {
          success: false,
          message: `[Samrey Create Error] Invalid template "${templateVal}". Valid templates are: ${validTemplates.join(', ')}.`,
          exitCode: 1
        };
      }

      const name = positionalArgs[0];
      if (!name) {
        return {
          success: false,
          message: '[Samrey Create Error] Project name is required.\nUsage: samrey create <project-name> [--template ssr|spa|minimal|ssg]',
          exitCode: 1
        };
      }

      const targetDir = targetDirVal ? path.resolve(cwd, targetDirVal) : path.resolve(cwd, name);

      return runCreateCommand({ name, template: templateVal as 'ssr' | 'spa' | 'minimal' | 'ssg', dryRun, targetDir });
    }

    case 'dev': {
      let port = 3000;
      const host = args.includes('--host');
      for (let i = 1; i < args.length; i++) {
        const arg = args[i]!;
        if (arg === '--port' || arg.startsWith('--port=')) {
          const res = consumeOptionValue(args, i, '--port');
          if ('error' in res) return res.error;
          port = parseInt(res.value, 10);
          i = res.nextIndex;
        }
      }
      return runDevCommand({ port, host, dryRun });
    }

    case 'build': {
      let buildCwd = cwd;
      let ssr: boolean | string = false;
      let minify: boolean | 'esbuild' | 'terser' | undefined;
      let sourcemap: boolean | 'inline' | 'hidden' | undefined;
      let outDir = 'dist';

      for (let i = 1; i < args.length; i++) {
        const arg = args[i]!;
        if (arg === '--ssr') {
          const next = args[i + 1];
          if (next === 'false') {
            ssr = false;
            i++;
          } else if (next === 'true') {
            ssr = true;
            i++;
          } else if (next && !isFlagToken(next)) {
            ssr = next;
            i++;
          } else {
            ssr = true;
          }
        } else if (arg.startsWith('--ssr=')) {
          const val = arg.slice('--ssr='.length);
          if (!val) return optionValueError('--ssr');
          if (val === 'false') ssr = false;
          else if (val === 'true') ssr = true;
          else ssr = val;
        } else if (arg === '--outDir' || arg.startsWith('--outDir=')) {
          const res = consumeOptionValue(args, i, '--outDir');
          if ('error' in res) return res.error;
          outDir = res.value;
          i = res.nextIndex;
        } else if (arg === '--targetDir' || arg.startsWith('--targetDir=')) {
          const res = consumeOptionValue(args, i, '--targetDir');
          if ('error' in res) return res.error;
          buildCwd = path.resolve(cwd, res.value);
          i = res.nextIndex;
        } else if (arg === '--no-minify') {
          minify = false;
        } else if (arg === '--minify') {
          const next = args[i + 1];
          if (next === 'false') {
            minify = false;
            i++;
          } else if (next === 'esbuild' || next === 'terser' || next === 'true') {
            minify = next === 'true' ? true : next;
            i++;
          } else {
            minify = true;
          }
        } else if (arg.startsWith('--minify=')) {
          const val = arg.slice('--minify='.length);
          if (!val) return optionValueError('--minify');
          if (val === 'false') minify = false;
          else if (val === 'esbuild' || val === 'terser') minify = val;
          else if (val === 'true') minify = true;
        } else if (arg === '--sourcemap') {
          const next = args[i + 1];
          if (next === 'inline' || next === 'hidden') {
            sourcemap = next;
            i++;
          } else if (next === 'false') {
            sourcemap = false;
            i++;
          } else {
            sourcemap = true;
            if (next === 'true') i++;
          }
        } else if (arg.startsWith('--sourcemap=')) {
          const val = arg.slice('--sourcemap='.length);
          if (!val) return optionValueError('--sourcemap');
          if (val === 'inline' || val === 'hidden') sourcemap = val;
          else if (val === 'false') sourcemap = false;
          else if (val === 'true') sourcemap = true;
        }
      }

      return runBuildCommand({ cwd: buildCwd, ssr, minify, sourcemap, outDir, dryRun });
    }

    case 'preview': {
      let port = 4173;
      const host = args.includes('--host');
      let outDir = 'dist';
      for (let i = 1; i < args.length; i++) {
        const arg = args[i]!;
        if (arg === '--port' || arg.startsWith('--port=')) {
          const res = consumeOptionValue(args, i, '--port');
          if ('error' in res) return res.error;
          port = parseInt(res.value, 10);
          i = res.nextIndex;
        } else if (arg === '--outDir' || arg.startsWith('--outDir=')) {
          const res = consumeOptionValue(args, i, '--outDir');
          if ('error' in res) return res.error;
          outDir = res.value;
          i = res.nextIndex;
        }
      }
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
      const json = args.includes('--json');

      const ignore: string[] = [];
      let auditCwd = cwd;
      let seenPositional = false;

      for (let i = 1; i < args.length; i++) {
        const arg = args[i]!;
        if (arg === '--ignore' || arg.startsWith('--ignore=')) {
          const res = consumeOptionValue(args, i, '--ignore');
          if ('error' in res) return res.error;
          ignore.push(res.value);
          i = res.nextIndex;
        } else if (!arg.startsWith('-') && !seenPositional) {
          auditCwd = path.resolve(cwd, arg);
          seenPositional = true;
        }
      }

      return runAuditCommand({ cwd: auditCwd, strict, warnOnly, fix, ignore, json });
    }

    case 'analyze': {
      const json = args.includes('--json');
      let outDir = 'dist';
      for (let i = 1; i < args.length; i++) {
        const arg = args[i]!;
        if (arg === '--outDir' || arg.startsWith('--outDir=')) {
          const res = consumeOptionValue(args, i, '--outDir');
          if ('error' in res) return res.error;
          outDir = res.value;
          i = res.nextIndex;
        }
      }
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

    case 'ai': {
      const { runAiCommand } = await import('./commands/ai.js');
      return runAiCommand(args, { cwd });
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
