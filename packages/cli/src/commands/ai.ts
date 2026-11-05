/**
 * @license Apache-2.0
 * @samrey/cli - AI Integration & Tooling Command Handler
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  writeAllInstructions,
  installSkills,
  searchDocs,
  getDocumentation,
  analyzeProject,
  validateSamreyCode,
  discoverSamreyProject,
  SAMREY_SKILLS
} from '@samrey/ai';
import { SamreyMcpServer } from '@samrey/mcp-server';
import { CommandResult } from './create.js';

export const AI_HELP_TEXT = `
Samrey AI — Universal AI Development Integration Tooling

USAGE:
  $ samrey ai <subcommand> [options]

SUBCOMMANDS:
  init          Configure the project with AI instructions (AGENTS.md, GEMINI.md, CLAUDE.md, etc.) and skills
  install       Install portable agent skills or MCP config templates
  doctor        Inspect project health, Samrey version, and AI assistant readiness
  docs [query]  Search official Samrey documentation directly in terminal
  validate <f>  Validate Samrey component or template using @samrey/compiler and anti-pattern linter
  mcp           Start Model Context Protocol (MCP) server over stdio for Cursor, Claude, or Gemini
  skills        List or manage portable agent skills

OPTIONS:
  --force       Overwrite existing configuration or instruction files
  --agent <a   Target specific agent: gemini, claude, cursor, copilot, chatgpt, windsurf
  --json        Output machine-readable JSON format
  --help        Show this help message

EXAMPLES:
  $ samrey ai init
  $ samrey ai doctor
  $ samrey ai docs "signals"
  $ samrey ai validate src/components/Counter.ts
  $ samrey ai mcp
  $ samrey ai skills --list
`;

export async function runAiCommand(args: string[], options: { cwd?: string } = {}): Promise<CommandResult> {
  const cwd = options.cwd || process.cwd();
  const subcommand = args[1];

  if (!subcommand || subcommand === '--help' || subcommand === '-h' || subcommand === 'help') {
    return {
      success: true,
      message: AI_HELP_TEXT.trim(),
      exitCode: 0
    };
  }

  const force = args.includes('--force');
  const isJson = args.includes('--json');

  switch (subcommand) {
    case 'init': {
      console.log('⚡ Initializing Samrey AI integration ecosystem...\n');
      const instructions = writeAllInstructions(cwd, force);
      const skillsDir = path.join(cwd, 'skills');
      const skills = installSkills(skillsDir, force);

      // Scaffold .cursor/mcp.json if not present
      const cursorMcpDir = path.join(cwd, '.cursor');
      const cursorMcpFile = path.join(cursorMcpDir, 'mcp.json');
      if (!fs.existsSync(cursorMcpFile) || force) {
        fs.mkdirSync(cursorMcpDir, { recursive: true });
        fs.writeFileSync(
          cursorMcpFile,
          JSON.stringify(
            {
              mcpServers: {
                samrey: {
                  command: 'npx',
                  args: ['-y', '@samrey/mcp-server']
                }
              }
            },
            null,
            2
          ) + '\n',
          'utf8'
        );
        instructions.push(cursorMcpFile);
      }

      if (isJson) {
        return {
          success: true,
          message: JSON.stringify({ success: true, instructions, skillsCount: skills.length }),
          exitCode: 0
        };
      }

      return {
        success: true,
        message: `✅ Samrey AI initialized successfully!
- Instruction files configured:
${instructions.map((f) => `  • ${path.relative(cwd, f)}`).join('\n')}
- Portable agent skills installed (${skills.length}):
${skills.map((s) => `  • ${path.relative(cwd, s)}`).join('\n')}
- MCP Server configuration created at .cursor/mcp.json

Next Steps:
1. Open your project in Cursor, Claude Code, or Gemini CLI.
2. The AI assistant will automatically discover AGENTS.md, skills, and the Samrey MCP server.`,
        exitCode: 0
      };
    }

    case 'doctor': {
      const report = analyzeProject(cwd);
      if (isJson) {
        return {
          success: true,
          message: JSON.stringify(report, null, 2),
          exitCode: 0
        };
      }

      const p = report.project;
      const issuesCount = report.issues.length;

      let msg = `=====================================================
🔍 Samrey AI Doctor — Environment & Project Inspection
=====================================================

Project:           ${p.projectName} (v${p.projectVersion})
Samrey Version:    ${p.frameworkVersion} (${p.isSamreyProject ? 'Valid Samrey Project' : 'Non-Samrey Project'})
Health Score:      ${report.healthScore}/100
Components Found:  ${report.discoveredComponents.length}
Routes Found:      ${report.discoveredRoutes.length}
Source Dirs:       ${p.sourceDirs.join(', ') || 'none'}
Config Files:      ${p.configFiles.join(', ') || 'none'}

Features Detected:
- SSR:             ${p.features.ssr ? '✅ Enabled' : '⚪ Not configured'}
- Routing:         ${p.features.routing ? '✅ Enabled' : '⚪ Not configured'}
- Forms:           ${p.features.forms ? '✅ Enabled' : '⚪ Not configured'}
- HTTP Resources:  ${p.features.http ? '✅ Enabled' : '⚪ Not configured'}
- Testing:         ${p.features.testing ? '✅ Enabled' : '⚪ Not configured'}
- Security:        ${p.features.security ? '✅ Enabled' : '⚪ Not configured'}

Issues (${issuesCount}):
${
  issuesCount === 0
    ? '  ✅ No architectural anti-patterns or foreign framework imports detected.'
    : report.issues
        .map(
          (iss) =>
            `  • [${iss.severity.toUpperCase()}] ${iss.filePath}:${iss.line} - ${iss.message}\n    Fix: ${iss.suggestedFix}`
        )
        .join('\n')
}

Recommendations:
${report.recommendations.map((r) => `  👉 ${r}`).join('\n')}
`;
      return {
        success: report.healthScore >= 70,
        message: msg.trim(),
        exitCode: report.healthScore >= 70 ? 0 : 1
      };
    }

    case 'docs': {
      const query = args.slice(2).filter((a) => !a.startsWith('-')).join(' ').trim();
      if (!query) {
        return {
          success: true,
          message: 'Please provide a documentation search query, e.g.: "samrey ai docs signals".',
          exitCode: 0
        };
      }

      const results = searchDocs(query, { limit: 4 });
      if (results.length === 0) {
        return {
          success: true,
          message: `No documentation matches found for "${query}". Try searching for "signals", "components", "Show", or "router".`,
          exitCode: 0
        };
      }

      let msg = `Found ${results.length} documentation match(es) for "${query}":\n\n`;
      for (const res of results) {
        msg += `### ${res.title} (${res.category}${res.package ? ` • ${res.package}` : ''})\n`;
        msg += `${res.snippet}\n\n`;
      }
      return {
        success: true,
        message: msg.trim(),
        exitCode: 0
      };
    }

    case 'validate': {
      const codeIdx = args.indexOf('--code');
      let content = '';
      let targetName = '';

      if (codeIdx !== -1 && args[codeIdx + 1]) {
        content = args[codeIdx + 1];
        targetName = '<inline code>';
      } else {
        const fileArg = args[2];
        if (!fileArg || fileArg.startsWith('-')) {
          return {
            success: false,
            message: 'Error: Please specify a file path or --code to validate, e.g.: "samrey ai validate src/components/Counter.ts" or "samrey ai validate --code \'...\'".',
            exitCode: 1
          };
        }

        const filePath = path.resolve(cwd, fileArg);
        if (!fs.existsSync(filePath)) {
          return {
            success: false,
            message: `Error: File not found at "${filePath}".`,
            exitCode: 1
          };
        }

        content = fs.readFileSync(filePath, 'utf8');
        targetName = path.relative(cwd, filePath);
      }

      const result = validateSamreyCode(content, { filename: targetName });

      if (isJson) {
        return {
          success: result.valid,
          message: JSON.stringify(result, null, 2),
          exitCode: result.valid ? 0 : 1
        };
      }

      if (result.valid) {
        return {
          success: true,
          message: `✅ File "${targetName}" is valid native Samrey code!
- Compiles cleanly: ${result.compiles ? 'Yes' : 'No (pure TS logic)'}
- Detected APIs: ${result.detectedApis.join(', ') || 'none'}
${result.warnings.length > 0 ? `Warnings:\n${result.warnings.map((w) => `  ⚠️ Line ${w.line ?? '?'}: ${w.message}`).join('\n')}` : ''}`,
          exitCode: 0
        };
      }

      return {
        success: false,
        message: `❌ Validation failed for "${targetName}":
${result.errors.map((e) => `  • Error${e.code ? ` [${e.code}]` : ''}${e.line ? ` (line ${e.line})` : ''}: ${e.message}\n    Suggestion: ${e.suggestion || 'Review Samrey documentation'}`).join('\n')}`,
        exitCode: 1
      };
    }

    case 'mcp': {
      console.log('⚡ Starting Samrey Model Context Protocol (MCP) server over stdio...\n');
      const server = new SamreyMcpServer({ projectRoot: cwd });
      server.startStdio();
      // Keep process alive
      return new Promise(() => {});
    }

    case 'skills': {
      if (args.includes('--install') || args.includes('install')) {
        const dest = path.join(cwd, 'skills');
        const files = installSkills(dest, force);
        return {
          success: true,
          message: `Installed ${files.length} portable agent skills to ${path.relative(cwd, dest)}.`,
          exitCode: 0
        };
      }

      let msg = `Available Samrey Agent Skills (${SAMREY_SKILLS.length}):\n\n`;
      for (const skill of SAMREY_SKILLS) {
        msg += `• ${skill.id.padEnd(26)} - ${skill.description}\n`;
      }
      msg += `\nInstall all skills into current project with: "samrey ai skills --install"`;

      return {
        success: true,
        message: msg.trim(),
        exitCode: 0
      };
    }

    default:
      return {
        success: false,
        message: `Unknown subcommand "samrey ai ${subcommand}". Run "samrey ai --help" for available commands.`,
        exitCode: 1
      };
  }
}
