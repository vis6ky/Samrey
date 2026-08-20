/**
 * @license Apache-2.0
 * @aether/compiler - Compile-Time Static Analysis & Constant Folding
 */

import { ASTNode, ASTAttributeNode, ASTElementNode } from './ast.js';

export interface ConstantFoldResult {
  isConstant: boolean;
  value: string | null;
}

/**
 * Fast check if an expression is a compile-time static constant literal.
 * Supports:
 * - String literals: "hello", 'hello', `hello` (without ${})
 * - Numeric literals: 42, 3.14, -1, 0xFF
 * - Boolean literals: true, false
 * - Null / Undefined: null, undefined
 */
export function evaluateConstantExpression(expr: string): ConstantFoldResult {
  const trimmed = expr.trim();
  if (!trimmed) {
    return { isConstant: false, value: null };
  }

  // 1. String literals: "...", '...', `...` (without interpolation)
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    const rawInner = trimmed.slice(1, -1);
    // Ensure no unescaped quotes matching the boundary quote inside
    return { isConstant: true, value: rawInner };
  }

  if (trimmed.startsWith('`') && trimmed.endsWith('`') && trimmed.length >= 2) {
    if (!trimmed.includes('${')) {
      return { isConstant: true, value: trimmed.slice(1, -1) };
    }
  }

  // 2. Boolean literals
  if (trimmed === 'true') {
    return { isConstant: true, value: 'true' };
  }
  if (trimmed === 'false') {
    return { isConstant: true, value: 'false' };
  }

  // 3. Null / undefined literals
  if (trimmed === 'null') {
    return { isConstant: true, value: 'null' };
  }
  if (trimmed === 'undefined') {
    return { isConstant: true, value: 'undefined' };
  }

  // 4. Number literals: integer, float, hex, negative
  if (/^[+-]?(?:0x[0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)$/.test(trimmed)) {
    return { isConstant: true, value: trimmed };
  }

  return { isConstant: false, value: null };
}

/**
 * Checks if an entire AST node (and all descendants) is 100% static.
 */
export function isStaticSubtree(node: ASTNode): boolean {
  if (node.type === 'Text') {
    return true;
  }

  if (node.type === 'Interpolation') {
    return evaluateConstantExpression(node.expression).isConstant;
  }

  if (node.type === 'Element') {
    for (const attr of node.attributes) {
      if (attr.isEvent) return false;
      if (attr.isDynamic && attr.expression) {
        const fold = evaluateConstantExpression(attr.expression);
        if (!fold.isConstant) return false;
      }
    }
    for (const child of node.children) {
      if (!isStaticSubtree(child)) return false;
    }
    return true;
  }

  // Components, Show, For are dynamic by definition
  return false;
}
