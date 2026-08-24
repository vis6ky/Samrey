# @aether/compiler

Ahead-of-Time template compiler, Aether Intermediate Representation (AIR) generator, contextual security classifier, accessibility linter, and code generation.

## Purpose

`@aether/compiler` analyzes JSX and template markup at build time. It splits static HTML subtrees into hoisted cloneable templates and isolates dynamic expressions into surgical signal bindings targeting `@aether/runtime`.

## Installation

```bash
npm install -D @aether/compiler
```

## Quick Example

```ts
import { compileTemplate, parseTemplate, buildAIR, generateCode } from '@aether/compiler';

const source = `<div class="user-card">
  <h2>{user.name}</h2>
  <button onClick={handleClick}>Vote</button>
</div>`;

// 1. One-step compilation
const result = compileTemplate(source);
console.log(result.code);

// 2. Multi-stage pipeline
const ast = parseTemplate(source);
const air = buildAIR(ast);
const output = generateCode(air);
```

## API

- `compileTemplate(source: string, options?: CompileOptions)` — Compiles template syntax into optimized JavaScript code.
- `parseTemplate(source: string, options?: ParseOptions)` — Parses template syntax into an Aether AST.
- `buildAIR(ast: AetherAST, options?: AIROptions)` — Transforms AST into Aether Intermediate Representation (AIR).
- `generateCode(air: AIRTree, options?: CodegenOptions)` — Emits production JavaScript code with cloneNode calls and targeted signal bindings.
- `classifySecurityNode(node: ASTNode)` — Classifies AST nodes for dynamic security risks.
- `lintAccessibility(ast: AetherAST)` — Audits AST nodes against WCAG AA accessibility standards.
- `AetherCompilerError` — Structured compiler error class with source frames.
- `generateSourceFrame(source: string, line: number, col: number): string` — Generates a terminal-friendly visual code pointer frame.
- `ERROR_REGISTRY` — Catalog of compiler and framework error definitions.

## Environment

Node.js (>= 18.0.0), Bun, or any modern JavaScript build toolchain (Vite, Rollup, esbuild, Webpack).

## Security

Performs build-time AST classification for dangerous URI schemes (`javascript:`), unescaped innerHTML attributes, and invalid event handlers.

## Related Packages

- `@aether/cli` — Bundler and Vite plugin utilizing `@aether/compiler`.
- `@aether/runtime` — Target execution runtime for compiled code.

