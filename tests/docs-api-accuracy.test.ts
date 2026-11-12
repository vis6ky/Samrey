/**
 * @license Apache-2.0
 * @samrey/monorepo - AI Docs, Skills & Example Engine API Accuracy Test
 *
 * Verifies that EVERY import from '@samrey/*' in:
 * - skills/**
 * - docs/ai/**
 * - packages/ai/src/documentation-engine.ts
 * - packages/ai/src/example-engine.ts
 * - packages/ai/src/instructions.ts
 * - packages/ai/src/skills.ts
 * - AGENTS.md, GEMINI.md, CLAUDE.md, .github/copilot-instructions.md, .cursor/rules/samrey.mdc
 * exists as an actual export in the corresponding package.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import { SAMREY_EXAMPLES } from '../packages/ai/src/example-engine.js';
import { validateSamreyCode as validateAiCode } from '../packages/ai/src/code-validator.js';
import { validateSamreyCode as validateWebCode } from '../src/lib/codeValidator.js';

const PACKAGES = [
  'reactivity',
  'runtime',
  'compiler',
  'router',
  'forms',
  'http',
  'ssr',
  'testing',
  'devtools',
  'security',
  'cli',
  'ai',
  'mcp-server'
];

function findFiles(dir: string, exts: string[]): string[] {
  let res: string[] = [];
  if (!fs.existsSync(dir)) return res;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        res = res.concat(findFiles(full, exts));
      }
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      res.push(full);
    }
  }
  return res;
}

describe('AI Docs, Skills & Example Engine API Accuracy Audit', () => {
  it('extracts every import from @samrey/* and fails if any imported name is not exported', async () => {
    // 1. Build authoritative export + type registry using TypeScript Compiler API + ESM module keys
    const repoRoot = process.cwd();
    const tsconfigPath = ts.findConfigFile(repoRoot, ts.sys.fileExists, 'tsconfig.json');
    assert.ok(tsconfigPath, 'tsconfig.json must exist');
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, repoRoot);
    const entryFiles = PACKAGES.map(p => path.join(repoRoot, 'packages', p, 'src', 'index.ts'));
    const tsProgram = ts.createProgram(entryFiles, { ...parsedConfig.options, noEmit: true });
    const checker = tsProgram.getTypeChecker();

    const exportMap: Record<string, Set<string>> = {};
    const knownTypeExports: Record<string, Set<string>> = {};
    for (const p of PACKAGES) {
      const mod = await import(`../packages/${p}/src/index.ts`);
      const runtimeKeys = new Set(Object.keys(mod).filter(k => k !== '__esModule'));
      exportMap[`@samrey/${p}`] = runtimeKeys;
      const entry = path.join(repoRoot, 'packages', p, 'src', 'index.ts');
      const sf = tsProgram.getSourceFile(entry);
      assert.ok(sf, `SourceFile missing for @samrey/${p}`);
      const modSym = checker.getSymbolAtLocation(sf);
      assert.ok(modSym, `Module symbol missing for @samrey/${p}`);
      const allTsSymbols = checker.getExportsOfModule(modSym).map(s => s.getName());
      knownTypeExports[`@samrey/${p}`] = new Set(
        allTsSymbols.filter(name => name !== 'default' && !runtimeKeys.has(name))
      );
    }

    // 2. Collect all AI instruction, documentation, skill, README, and engine files
    const targetFiles = [...new Set([
      ...findFiles('skills', ['.md']),
      ...findFiles('docs', ['.md']),
      ...findFiles('examples/universal-ai-sample/skills', ['.md']),
      ...PACKAGES.map(p => path.join('packages', p, 'README.md')),
      'README.md',
      'packages/ai/src/diagnostics.ts',
      'packages/ai/src/documentation-engine.ts',
      'packages/ai/src/example-engine.ts',
      'packages/ai/src/instructions.ts',
      'packages/ai/src/skills.ts',
      'AGENTS.md',
      'GEMINI.md',
      'CLAUDE.md',
      '.github/copilot-instructions.md',
      '.cursor/rules/samrey.mdc',
      'examples/universal-ai-sample/AGENTS.md',
      'examples/universal-ai-sample/GEMINI.md',
      'examples/universal-ai-sample/CLAUDE.md',
      'examples/universal-ai-sample/.github/copilot-instructions.md'
    ])].filter(f => fs.existsSync(f));

    assert.ok(targetFiles.length >= 10, `Expected at least 10 files to audit, found ${targetFiles.length}`);

    const importRegex = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"](@samrey\/[a-z0-9-]+)['"]/g;
    const errors: Array<{ file: string; pkg: string; symbol: string; error: string }> = [];

    for (const file of targetFiles) {
      const content = fs.readFileSync(file, 'utf8');
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(content)) !== null) {
        const isTypeImportStatement = match[0].startsWith('import type');
        const rawNames = match[1];
        const pkg = match[2];

        const validExports = exportMap[pkg];
        if (!validExports) {
          errors.push({
            file,
            pkg,
            symbol: '*',
            error: `Package "${pkg}" is not a recognized Samrey monorepo package`
          });
          continue;
        }

        const names = rawNames
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

        for (const rawName of names) {
          const isInlineType = rawName.startsWith('type ');
          const cleanName = rawName.replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
          if (!cleanName) continue;

          const isTypeOnly = isTypeImportStatement || isInlineType;
          if (isTypeOnly) {
            const typesForPkg = knownTypeExports[pkg];
            if (typesForPkg && typesForPkg.has(cleanName)) {
              continue;
            }
          }

          if (!validExports.has(cleanName)) {
            errors.push({
              file,
              pkg,
              symbol: cleanName,
              error: `Symbol "${cleanName}" is not exported by "${pkg}". Valid exports: ${[...validExports].sort().join(', ')}`
            });
          }
        }
      }
    }

    if (errors.length > 0) {
      const summary = errors.map(e => `  - [${e.file}] ${e.pkg}: "${e.symbol}" (${e.error})`).join('\n');
      assert.fail(`Found ${errors.length} non-existent or hallucinated API import(s):\n${summary}`);
    }
  });

  it('typechecks and validates every SAMREY_EXAMPLES entry with zero TS diagnostics and zero validator errors', () => {
    const repoRoot = process.cwd();
    const tsconfigPath = ts.findConfigFile(repoRoot, ts.sys.fileExists, 'tsconfig.json');
    assert.ok(tsconfigPath, 'tsconfig.json must exist');
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, repoRoot);

    const compilerOptions: ts.CompilerOptions = {
      ...parsedConfig.options,
      noEmit: true,
      skipLibCheck: true,
      types: ['node']
    };

    const issues: string[] = [];
    const virtualFiles = new Map<string, string>();
    const virtualDirs = new Set<string>();
    const allTsEntries: Array<{ exId: string; exRoot: string; absPath: string; relPath: string }> = [];

    for (const ex of SAMREY_EXAMPLES) {
      const exRoot = path.join(repoRoot, `.virtual-examples-${ex.id}`);
      virtualDirs.add(path.resolve(exRoot));

      for (const file of ex.files) {
        if (!file.filename.endsWith('.ts') && !file.filename.endsWith('.tsx') && !file.filename.endsWith('.js')) continue;
        if (file.filename.endsWith('.ts') || file.filename.endsWith('.tsx')) {
          const abs = path.resolve(exRoot, file.filename);
          virtualFiles.set(abs, file.code);
          let dir = path.dirname(abs);
          while (dir.startsWith(repoRoot) && !virtualDirs.has(dir)) {
            virtualDirs.add(dir);
            dir = path.dirname(dir);
          }
          allTsEntries.push({ exId: ex.id, exRoot, absPath: abs, relPath: file.filename });
        }

        const aiRes = validateAiCode(file.code);
        for (const err of aiRes.errors) {
          issues.push(`[AI Validator ERROR ${ex.id}/${file.filename}] ${err.message}`);
        }
        for (const warn of aiRes.warnings) {
          issues.push(`[AI Validator WARN ${ex.id}/${file.filename}] ${warn.message}`);
        }
        const webRes = validateWebCode(file.code);
        for (const err of webRes.errors) {
          issues.push(`[Web Validator ERROR ${ex.id}/${file.filename}] ${err}`);
        }
        for (const fapi of webRes.foreignApis) {
          issues.push(`[Web Validator FOREIGN ${ex.id}/${file.filename}] ${fapi.name}`);
        }
      }
    }

    if (allTsEntries.length > 0) {
      const baseHost = ts.createCompilerHost(compilerOptions, true);
      const customHost: ts.CompilerHost = {
        ...baseHost,
        fileExists: (fileName) => {
          const norm = path.resolve(fileName);
          return virtualFiles.has(norm) || baseHost.fileExists(fileName);
        },
        directoryExists: (dirName) => {
          const norm = path.resolve(dirName);
          return virtualDirs.has(norm) || (baseHost.directoryExists ? baseHost.directoryExists(dirName) : false);
        },
        readFile: (fileName) => {
          const norm = path.resolve(fileName);
          if (virtualFiles.has(norm)) return virtualFiles.get(norm);
          return baseHost.readFile(fileName);
        },
        getSourceFile: (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
          const norm = path.resolve(fileName);
          if (virtualFiles.has(norm)) {
            return ts.createSourceFile(norm, virtualFiles.get(norm)!, languageVersion);
          }
          return baseHost.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
        }
      };

      const program = ts.createProgram(
        allTsEntries.map((e) => e.absPath),
        compilerOptions,
        customHost
      );

      for (const entry of allTsEntries) {
        const sf = program.getSourceFile(entry.absPath);
        if (!sf) continue;
        const diags = [
          ...program.getSyntacticDiagnostics(sf),
          ...program.getSemanticDiagnostics(sf)
        ];
        for (const d of diags) {
          const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
          issues.push(`[TS ${entry.exId}/${entry.relPath}] TS${d.code}: ${msg}`);
        }
      }
    }

    assert.strictEqual(
      issues.length,
      0,
      `Found ${issues.length} issue(s) across SAMREY_EXAMPLES:\n  - ${issues.join('\n  - ')}`
    );
  });

  it('validates positive TS code fences across docs, skills, instructions, and package READMEs', () => {
    const markdownFiles = [...new Set([
      ...findFiles('skills', ['.md']),
      ...findFiles('docs', ['.md']),
      ...findFiles('examples/universal-ai-sample/skills', ['.md']),
      ...PACKAGES.map(p => path.join('packages', p, 'README.md')),
      'README.md',
      'AGENTS.md',
      'GEMINI.md',
      'CLAUDE.md',
      '.github/copilot-instructions.md',
      '.cursor/rules/samrey.mdc',
      'examples/universal-ai-sample/AGENTS.md',
      'examples/universal-ai-sample/GEMINI.md',
      'examples/universal-ai-sample/CLAUDE.md',
      'examples/universal-ai-sample/.github/copilot-instructions.md'
    ])].filter(f => fs.existsSync(f));

    const fenceRegex = /```(?:ts|typescript)\r?\n([\s\S]*?)```/g;
    const negativeMarkerRegex = /(?:❌|BAD\b|WRONG\b|NEVER\b|PROHIBITED|Anti-Pattern|Rejected|SAMREY-\d+|triggers compiler error|Foreign React|React equivalent|Before \(|broken example)/i;
    const issues: string[] = [];

    for (const file of markdownFiles) {
      const content = fs.readFileSync(file, 'utf8');
      let match: RegExpExecArray | null;
      let blockIdx = 0;
      while ((match = fenceRegex.exec(content)) !== null) {
        blockIdx++;
        const code = match[1];
        const prefixContext = content.slice(Math.max(0, match.index - 220), match.index);
        if (negativeMarkerRegex.test(prefixContext) || negativeMarkerRegex.test(code)) {
          continue;
        }

        const aiRes = validateAiCode(code);
        for (const err of aiRes.errors) {
          issues.push(`[AI ${file}#block${blockIdx}] ${err.message}`);
        }

        const webRes = validateWebCode(code);
        for (const err of webRes.errors) {
          issues.push(`[Web ${file}#block${blockIdx}] ${err}`);
        }
        for (const fapi of webRes.foreignApis) {
          issues.push(`[Web Foreign ${file}#block${blockIdx}] ${fapi.name}`);
        }
      }
    }

    assert.strictEqual(
      issues.length,
      0,
      `Found ${issues.length} issue(s) in positive documentation TS code fences:\n  - ${issues.join('\n  - ')}`
    );
  });
});
