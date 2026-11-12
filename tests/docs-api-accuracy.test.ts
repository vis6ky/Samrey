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

  it('Item 10 regression: ensures active docs, package READMEs, and src/data contain zero stale AETH-*/removed APIs and PUBLIC_API.md matches real TS exports', async () => {
    const activeDocFiles = [
      'docs/ERROR_CODES.md',
      'docs/PUBLIC_API.md',
      'docs/SECURITY_MODEL.md',
      'docs/TROUBLESHOOTING.md',
      'docs/GETTING_STARTED.md',
      'docs/DEVELOPER_ASSISTANT_VALIDATION.md',
      'docs/REACTIVITY_AND_CONTROL_FLOW.md',
      'docs/TEMPLATES_AND_COMPONENTS.md',
      'docs/FORMS_AND_VALIDATION.md',
      'docs/ROUTER_AND_HTTP.md',
      'docs/SSR_AND_HYDRATION.md',
      'docs/TESTING_AND_TOOLING.md',
      'docs/CLI_AND_TOOLING.md',
      'docs/MIGRATION_GUIDE.md',
      'docs/DEPLOYMENT_AND_PACKAGING.md',
      'docs/SECURITY.md'
    ].filter(f => fs.existsSync(f));

    const activeFiles = [...new Set([
      ...activeDocFiles,
      ...findFiles('skills', ['.md']),
      ...findFiles('docs/ai', ['.md']),
      ...PACKAGES.map(p => path.join('packages', p, 'README.md')),
      'README.md',
      'AGENTS.md',
      'GEMINI.md',
      'CLAUDE.md',
      '.github/copilot-instructions.md',
      '.cursor/rules/samrey.mdc',
      'src/data/searchIndex.ts',
      'src/data/assistantKnowledge.ts',
      'src/data/recipeCatalog.ts',
      'src/data/packagesData.ts',
      'src/components/AssistantView.ts',
      'src/lib/assistantProvider.ts'
    ])].filter(f => fs.existsSync(f));

    const forbiddenPatterns: Array<{ label: string; regex: RegExp }> = [
      { label: 'removed peek() API', regex: /(?:\.peek\s*\(|\bpeek\s*\(\))/ },
      { label: 'removed .subscribe() API', regex: /\.subscribe\s*\(/ },
      { label: 'removed getAriaProps API', regex: /\bgetAriaProps\b/ },
      { label: 'removed deriveAriaAttributes API', regex: /\bderiveAriaAttributes\b/ },
      { label: 'removed standardSchemaValidator API', regex: /\bstandardSchemaValidator\b/ },
      { label: 'removed validateStandardSchema API', regex: /\bvalidateStandardSchema\b/ },
      { label: 'wrong-case createSsrContext API', regex: /\bcreateSsrContext\b/ },
      { label: 'removed hydrateState API', regex: /\bhydrateState\b/ },
      { label: 'removed useAetherRouter API', regex: /\buseAetherRouter\b/ },
      { label: 'removed AETHER_EVENTS API', regex: /\bAETHER_EVENTS\b/ },
      { label: 'removed generateHydrationScript API', regex: /\bgenerateHydrationScript\b/ },
      { label: 'removed createStaticCollector API', regex: /\bcreateStaticCollector\b/ },
      { label: 'removed mountTestComponent API', regex: /\bmountTestComponent\b/ },
      { label: 'removed createTestHarness API', regex: /\bcreateTestHarness\b/ },
      { label: 'legacy AETH diagnostic code', regex: /\bAETH-(?:\d{3}|xxx|(?:SEC|REC|RTR|SSR)-\d+)\b/ },
      { label: 'stale serializeState(key, data) call', regex: /\bserializeState\s*\(\s*['"][^'"]+['"]\s*,/ },
      { label: 'stale createField(form, name) call', regex: /\bcreateField\s*(?:<[^>]+>)?\s*\(\s*form\b/ },
      { label: 'stale tuple createStore destructuring', regex: /const\s*\[\s*state\s*,\s*setState\s*\]\s*=\s*createStore\b/ }
    ];

    const issues: string[] = [];
    for (const file of activeFiles) {
      const content = fs.readFileSync(file, 'utf8');
      for (const { label, regex } of forbiddenPatterns) {
        if (regex.test(content)) {
          issues.push(`[${file}] contains ${label}`);
        }
      }
    }

    // Verify PUBLIC_API.md table entries & interface snippets match real package exports
    const publicApi = fs.readFileSync('docs/PUBLIC_API.md', 'utf8');
    if (publicApi.includes('ResourceReturn<T>')) {
      issues.push('[docs/PUBLIC_API.md] documents stale interface name ResourceReturn<T> instead of Resource<T>');
    }
    if (!/interface Signal<T>[\s\S]*?set\([\s\S]*?update\(/.test(publicApi)) {
      issues.push('[docs/PUBLIC_API.md] Signal<T> snippet must document real set() and update() methods');
    }

    const sectionRegex = /^##\s+\d+\.\s+`(@samrey\/[a-z0-9-]+)`([\s\S]*?)(?=^##\s+\d+\.|(?![\s\S]))/gm;
    let secMatch: RegExpExecArray | null;
    while ((secMatch = sectionRegex.exec(publicApi)) !== null) {
      const pkgName = secMatch[1];
      const pkgFolder = pkgName.replace('@samrey/', '');
      const mod = await import(`../packages/${pkgFolder}/src/index.ts`);
      const body = secMatch[2];
      const rowRegex = /^\|\s*`([^`]+)`\s*\|/gm;
      let rowMatch: RegExpExecArray | null;
      while ((rowMatch = rowRegex.exec(body)) !== null) {
        const cell = rowMatch[1];
        const parts = cell.split('/').map(s => s.trim());
        for (const part of parts) {
          const symMatch = part.match(/^([A-Za-z_$][A-Za-z0-9_$]*)/);
          if (!symMatch) continue;
          const sym = symMatch[1];
          if (!(sym in mod)) {
            issues.push(`[docs/PUBLIC_API.md] symbol "${sym}" is not exported by ${pkgName}`);
          }
        }
      }
    }

    // Verify all packages/*/README.md ## API symbol bullets exist in the corresponding package exports
    for (const pkgName of PACKAGES) {
      const readmePath = path.join('packages', pkgName, 'README.md');
      if (!fs.existsSync(readmePath)) continue;
      const pkgMod = await import(`../packages/${pkgName}/src/index.ts`);
      const readmeTxt = fs.readFileSync(readmePath, 'utf8');
      const apiSection = readmeTxt.match(/^## API\r?\n([\s\S]*?)(?:\r?\n## |$)/m)?.[1] || '';
      if (!apiSection) continue;
      for (const m of apiSection.matchAll(/^- `([A-Za-z_$][A-Za-z0-9_$]*)/gm)) {
        const sym = m[1];
        if (!(sym in pkgMod)) {
          issues.push(`[${readmePath}] documented API "${sym}" is not exported by @samrey/${pkgName}`);
        }
      }
    }

    // Verify serializeState*() output is not double-wrapped inside <script> tags
    for (const ssrFile of ['src/data/assistantKnowledge.ts', 'src/data/recipeCatalog.ts']) {
      const content = fs.readFileSync(ssrFile, 'utf8');
      if (/<script[^>]*>\\?\$\{(?:stateJson|safeState)\}<\/script>/.test(content)) {
        issues.push(`[${ssrFile}] double-wraps serializeState*() HTML output inside another <script> tag`);
      }
    }

    assert.strictEqual(
      issues.length,
      0,
      `Found ${issues.length} Item 10 documentation / knowledge sync issue(s):\n  - ${issues.join('\n  - ')}`
    );
  });

  it('Batch 4 regression: validates every KNOWLEDGE_BASE example, RECIPES implementation, and Markdown @samrey/* code block with zero errors', async () => {
    const { KNOWLEDGE_BASE } = await import('../src/data/assistantKnowledge.js');
    const { RECIPES } = await import('../src/data/recipeCatalog.js');
    const issues: string[] = [];

    for (const entry of KNOWLEDGE_BASE) {
      const aiRes = validateAiCode(entry.tsCodeExample);
      for (const e of aiRes.errors) issues.push(`[KNOWLEDGE_BASE:${entry.id} AI] ${e.message}`);
      for (const w of aiRes.warnings) issues.push(`[KNOWLEDGE_BASE:${entry.id} AI WARN] ${w.message}`);
      const webRes = validateWebCode(entry.tsCodeExample);
      for (const e of webRes.errors) issues.push(`[KNOWLEDGE_BASE:${entry.id} WEB] ${e}`);
      for (const f of webRes.foreignApis) issues.push(`[KNOWLEDGE_BASE:${entry.id} WEB FOREIGN] ${f.name}`);
    }

    for (const recipe of RECIPES) {
      const aiRes = validateAiCode(recipe.implementation);
      for (const e of aiRes.errors) issues.push(`[RECIPES:${recipe.id} AI] ${e.message}`);
      for (const w of aiRes.warnings) issues.push(`[RECIPES:${recipe.id} AI WARN] ${w.message}`);
      const webRes = validateWebCode(recipe.implementation);
      for (const e of webRes.errors) issues.push(`[RECIPES:${recipe.id} WEB] ${e}`);
      for (const f of webRes.foreignApis) issues.push(`[RECIPES:${recipe.id} WEB FOREIGN] ${f.name}`);
    }

    const mdFiles = [
      ...PACKAGES.map((p) => path.join('packages', p, 'README.md')),
      ...(fs.existsSync('docs')
        ? fs.readdirSync('docs').filter((f) => f.endsWith('.md')).map((f) => path.join('docs', f))
        : []),
      ...(fs.existsSync('skills')
        ? fs.readdirSync('skills').map((s) => path.join('skills', s, 'SKILL.md'))
        : [])
    ].filter((f) => fs.existsSync(f));

    for (const mdFile of mdFiles) {
      const raw = fs.readFileSync(mdFile, 'utf8');
      const blocks = [...raw.matchAll(/```(?:ts|tsx|typescript)\r?\n([\s\S]*?)\r?\n```/g)];
      blocks.forEach((m, idx) => {
        const snippet = m[1];
        if (!snippet.includes('@samrey/')) return;
        const aiRes = validateAiCode(snippet);
        for (const e of aiRes.errors) issues.push(`[${mdFile}#${idx} AI] ${e.message}`);
        const webRes = validateWebCode(snippet);
        for (const e of webRes.errors) issues.push(`[${mdFile}#${idx} WEB] ${e}`);
      });
    }

    assert.strictEqual(
      issues.length,
      0,
      `Found ${issues.length} Batch 4 code example validation issue(s):\n  - ${issues.join('\n  - ')}`
    );
  });
});
