---
name: samrey-compiler
description: Ahead-of-Time parsing, AIR intermediate representation, static template hoisting, and diagnostic code resolution in @samrey/compiler.
---

# Samrey Compiler & AIR Toolchain (`samrey-compiler`)

## 1. Skill Description & Activation Criteria
- **Purpose**: Explains the Ahead-of-Time compilation pipeline, AIR optimization, security/accessibility linting, and diagnostic error resolution.
- **Activation Criteria**: Trigger when configuring Vite build plugins, inspecting compiler output, investigating `SAMREY-101` to `SAMREY-202` errors, or writing custom template transforms.

## 2. Framework Concepts
- **Template Parser (`parseTemplate`)**: Converts template syntax into a structured AST with precise source coordinates.
- **AIR Builder (`buildAIR`)**: Categorizes static HTML, dynamic text nodes, event bindings, and directives into an Intermediate Representation.
- **Security Classifier (`classifySecurityNode`)**: Flags dangerous schemes (`javascript:`) and sinks.
- **A11y Linter (`lintAccessibility`)**: Enforces required ARIA labels and alt attributes.
- **Code Generator (`generateCode`)**: Generates optimized JavaScript that directly invokes `@samrey/runtime`.

## 3. Correct API Usage
```ts
import { parseTemplate, buildAIR, generateCode, lintAccessibility } from '@samrey/compiler';

const source = '<div class="banner"><h1>Hello</h1></div>';
const ast = parseTemplate(source);
const air = buildAIR(ast);
const a11yErrors = lintAccessibility(air);
const jsCode = generateCode(air);
```

## 4. Verified Code Example
```ts
import { compileTemplate, SamreyCompilerError } from '@samrey/compiler';

try {
  const result = compileTemplate('<button ref="btn">Click me</button>');
  console.log('Compiled code:', result.code);
} catch (err) {
  if (err instanceof SamreyCompilerError) {
    console.error(`Compiler error [${err.code}] at line ${err.line}:${err.column}`);
    console.error(`Explanation: ${err.explanation}`);
    console.error(`Suggested fix: ${err.suggestion}`);
  }
}
```

## 5. Common Mistakes
- **Mistake**: Forgetting closing tags in multi-line template strings.
  - *Correction*: Inspect the line and column reported in `SAMREY-101` error frame.
- **Mistake**: Using duplicate `ref="..."` within the same template string.
  - *Correction*: Ensure each `ref` name is distinct per template (`SAMREY-109`).

## 6. Forbidden Patterns
- ❌ Do NOT emit inline script execution attributes (e.g. `onclick="doSomething()"`).
- ❌ Do NOT use dangerous URI schemes like `href="javascript:..."` (`SAMREY-201`).

## 7. Validation Procedures
1. Run `npx @samrey/cli audit` to verify template security and accessibility.
2. Run `npx @samrey/cli build` to test Vite compiler integration.

## 8. Authoritative Documentation
- [ai/COMPILER_RULES.md](../../COMPILER_RULES.md)
- [ai/ERROR_REFERENCE.md](../../ERROR_REFERENCE.md)
