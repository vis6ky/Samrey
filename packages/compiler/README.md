# @samrey/compiler

Ahead-of-Time template compiler, Samrey Intermediate Representation (AIR) generator, contextual security classifier, accessibility linter, and code generation.

## Purpose

`@samrey/compiler` analyzes JSX and template markup at build time. It splits static HTML subtrees into hoisted cloneable templates and isolates dynamic expressions into surgical signal bindings targeting `@samrey/runtime`.

## Installation

```bash
npm install -D @samrey/compiler
```

## Quick Example

```ts
import { compileTemplate, parseTemplate, buildAIR, generateCode } from '@samrey/compiler';

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
- `parseTemplate(source: string, options?: ParseOptions)` — Parses template syntax into an Samrey AST.
- `buildAIR(ast: SamreyAST, options?: AIROptions)` — Transforms AST into Samrey Intermediate Representation (AIR).
- `generateCode(air: AIRTree, options?: CodegenOptions)` — Emits production JavaScript code with cloneNode calls and targeted signal bindings.
- `classifySecurityNode(node: ASTNode)` — Classifies AST nodes for dynamic security risks.
- `lintAccessibility(ast: SamreyAST)` — Audits AST nodes against WCAG AA accessibility standards.
- `SamreyCompilerError` — Structured compiler error class with source frames.
- `generateSourceFrame(source: string, line: number, col: number): string` — Generates a terminal-friendly visual code pointer frame.
- `ERROR_REGISTRY` — Catalog of compiler and framework error definitions.

## Environment

Node.js (>= 18.0.0), Bun, or any modern JavaScript build toolchain (Vite, Rollup, esbuild, Webpack).

## Security

Performs build-time AST classification for dangerous URI schemes (`javascript:`), unescaped innerHTML attributes, and invalid event handlers.

## Related Packages

- `@samrey/cli` — Bundler and Vite plugin utilizing `@samrey/compiler`.
- `@samrey/runtime` — Target execution runtime for compiled code.

