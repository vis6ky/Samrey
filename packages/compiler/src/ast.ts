/**
 * @license Apache-2.0
 * @samrey/compiler - Abstract Syntax Tree (AST) Definitions
 */

import { SecurityContext } from './air.js';

export interface Position {
  line: number;
  column: number;
  offset: number;
}

export interface SourceLocation {
  start: Position;
  end: Position;
}

export interface ASTAttributeNode {
  type: 'Attribute';
  name: string;
  value: string | null;
  isDynamic: boolean;
  isEvent: boolean;
  eventName?: string;
  expression?: string;
  securityContext: SecurityContext;
  loc: SourceLocation;
}

export interface ASTTextNode {
  type: 'Text';
  value: string;
  loc: SourceLocation;
}

export interface ASTInterpolationNode {
  type: 'Interpolation';
  expression: string;
  securityContext: SecurityContext;
  loc: SourceLocation;
}

export interface ASTElementNode {
  type: 'Element';
  tag: string;
  attributes: ASTAttributeNode[];
  children: ASTNode[];
  isSelfClosing: boolean;
  loc: SourceLocation;
}

export interface ASTComponentNode {
  type: 'Component';
  name: string;
  props: ASTAttributeNode[];
  children: ASTNode[];
  isSelfClosing: boolean;
  loc: SourceLocation;
}

export interface ASTShowNode {
  type: 'Show';
  when: string;
  fallback?: ASTNode[];
  fallbackExpression?: string;
  children: ASTNode[];
  loc: SourceLocation;
}

export interface ASTForNode {
  type: 'For';
  each: string;
  key?: string;
  itemParam?: string;
  indexParam?: string;
  fallback?: ASTNode[];
  fallbackExpression?: string;
  children: ASTNode[];
  loc: SourceLocation;
}

export interface ASTRootNode {
  type: 'Root';
  children: ASTNode[];
  loc: SourceLocation;
}

export type ASTNode =
  | ASTTextNode
  | ASTInterpolationNode
  | ASTElementNode
  | ASTComponentNode
  | ASTShowNode
  | ASTForNode
  | ASTRootNode;
