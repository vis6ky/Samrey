/**
 * @license Apache-2.0
 * @samrey/compiler - Compile-Time Static Analysis & Constant Folding
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
  if (/^"(?:[^"\\]|\\.)*"$/.test(trimmed)) {
    try {
      return { isConstant: true, value: JSON.parse(trimmed) };
    } catch {
      return { isConstant: true, value: trimmed.slice(1, -1) };
    }
  }

  if (/^'(?:[^'\\]|\\.)*'$/.test(trimmed)) {
    const rawInner = trimmed.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    return { isConstant: true, value: rawInner };
  }

  if (/^`(?:\\[\s\S]|[^`\\])*`$/.test(trimmed)) {
    if (!trimmed.includes('${')) {
      return { isConstant: true, value: trimmed.slice(1, -1) };
    }
  }

  // 2. Boolean & Null & Undefined literals
  if (trimmed === 'null' || trimmed === 'undefined' || trimmed === 'false' || trimmed === 'true') {
    return { isConstant: true, value: trimmed };
  }

  // 3. Number literals: integer, float, hex, negative
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
