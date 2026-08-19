/**
 * @license Apache-2.0
 * @aether/compiler - Template Parser & AIR Builder
 */

import { AIRCompilationResult, AIRTemplateUnit } from './air.js';
import { classifyBindingContext } from './security-classifier.js';
import { generateModuleCode } from './codegen.js';

/**
 * Compiles an Aether JSX/template string into AIR and standalone JS code.
 */
export function compileTemplate(rawSource: string): AIRCompilationResult {
  const diagnostics: string[] = [];

  // Minimal standard compiler pass: extracts static HTML skeleton and dynamic curly slots
  const slotMatches: string[] = [];
  const staticHtml = rawSource.replace(/\{([^}]+)\}/g, (_, expression) => {
    slotMatches.push(expression.trim());
    return '<!-- dynamic-slot -->';
  });

  const templateUnit: AIRTemplateUnit = {
    id: '_tmpl$1',
    staticHtml,
    dynamicSlots: slotMatches.map((expr, idx) => ({
      type: 'dynamic-text',
      expression: expr,
      path: [0, idx],
      securityContext: classifyBindingContext('text')
    }))
  };

  const bindings = slotMatches.map((expr, idx) => {
    return `bindText(root.childNodes[${idx}], () => (${expr}));`;
  }).join('\n  ');

  const generatedCode = generateModuleCode([templateUnit], bindings);

  return {
    templates: [templateUnit],
    generatedCode,
    diagnostics
  };
}
