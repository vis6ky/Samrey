/**
 * @license Apache-2.0
 * @samrey/monorepo - SF-06 Ambient Type Declarations Acceptance Test
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import ts from 'typescript';

describe('SF-06: Ambient TypeScript Declarations for *.samrey Templates', () => {
  it('provides ambient module declaration for *.samrey templates in @samrey/runtime', () => {
    const runtimePkgPath = path.resolve('packages/runtime/package.json');
    const pkg = JSON.parse(fs.readFileSync(runtimePkgPath, 'utf8'));

    // Check package exports ambient module
    assert.ok(
      pkg.exports['./ambient'] || pkg.exports['./client'],
      '@samrey/runtime package.json must export ./ambient or ./client declaration'
    );
  });

  it('allows importing *.samrey modules in TypeScript without ts(2307) error', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-ambient-test-'));
    try {
      const tsConfigPath = path.join(tempDir, 'tsconfig.json');
      const testFilePath = path.join(tempDir, 'consumer.ts');

      // Write test TypeScript consumer file importing a .samrey template
      fs.writeFileSync(
        testFilePath,
        `import AppTemplate from './TestComponent.samrey';
const el: HTMLElement = AppTemplate({ title: 'Hello' });
`,
        'utf8'
      );

      // Create TS program pointing to @samrey/runtime types
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        strict: true,
        noEmit: true,
        baseUrl: process.cwd(),
        paths: {
          '@samrey/runtime': [path.resolve('packages/runtime/dist/index.d.ts')],
          '@samrey/runtime/ambient': [path.resolve('packages/runtime/dist/ambient.d.ts')]
        }
      };

      // Reference ambient declaration in the file or compiler options
      const fileWithRef = `/// <reference path="${path.resolve('packages/runtime/dist/ambient.d.ts')}" />
import AppTemplate from './TestComponent.samrey';
const el: HTMLElement = AppTemplate({ title: 'Hello' });
`;
      fs.writeFileSync(testFilePath, fileWithRef, 'utf8');

      const program = ts.createProgram([testFilePath], options);
      const diagnostics = ts.getPreEmitDiagnostics(program);

      // Must have zero diagnostics (specifically no TS2307 "Cannot find module")
      const relevantDiags = diagnostics.filter((d) => d.file?.fileName === testFilePath);
      const messages = relevantDiags.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));

      assert.deepStrictEqual(
        messages,
        [],
        `TypeScript should compile .samrey import with zero errors, got: ${messages.join(', ')}`
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
