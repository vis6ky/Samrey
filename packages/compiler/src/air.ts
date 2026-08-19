/**
 * @license Apache-2.0
 * @aether/compiler - Aether Intermediate Representation (AIR) AST Definitions
 */

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

export type AIRNode = AIRStaticNode | AIRDynamicTextNode | AIRDynamicAttrNode | AIRDynamicEventNode;

export interface AIRTemplateUnit {
  id: string;
  staticHtml: string;
  dynamicSlots: (AIRDynamicTextNode | AIRDynamicAttrNode | AIRDynamicEventNode)[];
}

export interface AIRCompilationResult {
  templates: AIRTemplateUnit[];
  generatedCode: string;
  diagnostics: string[];
}
