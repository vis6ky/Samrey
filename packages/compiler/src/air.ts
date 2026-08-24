/**
 * @license Apache-2.0
 * @gati/compiler - Gati Intermediate Representation (AIR) AST Definitions
 */

export * from './ast.js';

export type SecurityContext = 'html-text' | 'uri-attr' | 'safe-attr' | 'trusted-html' | 'style-attr';

export interface AIRStaticNode {
  type: 'static-element';
  tag: string;
  attributes: Record<string, string>;
  children: AIRNode[];
}

export interface AIRDynamicTextNode {
  type: 'dynamic-text';
  expression: string;
  path: number[];
  securityContext: SecurityContext;
}

export interface AIRDynamicAttrNode {
  type: 'dynamic-attr';
  name: string;
  expression: string;
  path: number[];
  securityContext: SecurityContext;
}

export interface AIRDynamicEventNode {
  type: 'dynamic-event';
  eventName: string;
  handlerExpression: string;
  path: number[];
}

export interface AIRControlFlowSlotNode {
  type: 'control-flow-slot';
  flowType: 'Show' | 'For';
  expression: string;
  path: number[];
  helperCode: string;
}

export type AIRNode = AIRStaticNode | AIRDynamicTextNode | AIRDynamicAttrNode | AIRDynamicEventNode | AIRControlFlowSlotNode;

export interface AIRTemplateUnit {
  id: string;
  staticHtml: string;
  dynamicSlots: (AIRDynamicTextNode | AIRDynamicAttrNode | AIRDynamicEventNode | AIRControlFlowSlotNode)[];
}

export interface AIRCompilationResult {
  ast?: import('./ast.js').ASTRootNode;
  templates: AIRTemplateUnit[];
  generatedCode: string;
  diagnostics: string[];
}

