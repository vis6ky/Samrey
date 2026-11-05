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
    // 1. Build authoritative export registry for all official packages
    const exportMap: Record<string, Set<string>> = {};
    for (const p of PACKAGES) {
      const mod = await import(`../packages/${p}/src/index.ts`);
      exportMap[`@samrey/${p}`] = new Set(Object.keys(mod));
    }

    // Known exported TypeScript interfaces/types from types.ts
    const knownTypeExports: Record<string, Set<string>> = {
      '@samrey/reactivity': new Set(['Signal', 'ReadonlySignal', 'Subscriber', 'Dependency', 'Owner', 'Dispose', 'Context']),
      '@samrey/router': new Set(['RouteConfig', 'RouterOptions', 'RouteMatch', 'NavigateOptions', 'HistoryLocation', 'RouteParams']),
      '@samrey/forms': new Set(['FormConfig', 'FieldConfig', 'ValidationResult', 'FieldState', 'FormState']),
      '@samrey/runtime': new Set(['Component', 'Props', 'Accessor', 'Setter'])
    };

    // 2. Collect all AI instruction, documentation, skill, and engine files
    const targetFiles = [
      ...findFiles('skills', ['.md']),
      ...findFiles('docs/ai', ['.md']),
      ...findFiles('examples/universal-ai-sample/skills', ['.md']),
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
    ].filter(f => fs.existsSync(f));

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
});
