/**
 * @license Apache-2.0
 * @gati/compiler - Main Entry Point
 */

export * from './air.js';
export * from './security-classifier.js';
export * from './a11y-linter.js';
export * from './codegen.js';
export * from './parser.js';
export * from './static-analyzer.js';
export * from './errors.js';

import { TemplateParser, buildAIRFromAST, ParseOptions } from './parser.js';
import { generateModuleCode } from './codegen.js';
import { classifyBindingContext } from './security-classifier.js';
import { lintA11y } from './a11y-linter.js';

export function parseTemplate(source: string, options?: ParseOptions) {
  return new TemplateParser(source, options).parse();
}

export const buildAIR = buildAIRFromAST;
export const generateCode = generateModuleCode;
export const classifySecurityNode = classifyBindingContext;
export const lintAccessibility = lintA11y;
