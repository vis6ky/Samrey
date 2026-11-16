/**
 * @license Apache-2.0
 * @samrey/cli - Error Code & Diagnostic Explainer
 */

import { ERROR_REGISTRY } from '@samrey/compiler';
import { diagnoseError } from '@samrey/ai';
import { CommandResult } from './create.js';

export interface ExplainOptions {
  query: string;
  json?: boolean;
}

export function runExplainCommand(options: ExplainOptions): CommandResult {
  const query = options.query.trim();

  // 1. Direct registry lookup
  const upper = query.toUpperCase();
  const def = ERROR_REGISTRY[upper];

  if (def) {
    if (options.json) {
      return {
        success: true,
        message: JSON.stringify({
          code: def.code,
          title: def.title,
          severity: def.severity,
          rootCause: def.rootCause,
          explanation: def.defaultExplanation,
          suggestion: def.defaultSuggestion,
          documentationLink: def.documentationLink
        }, null, 2),
        exitCode: 0
      };
    }

    const text = `
▲ [${def.code}] ${def.title}
Severity:    ${def.severity.toUpperCase()}
Root Cause:  ${def.rootCause}
Explanation: ${def.defaultExplanation}
Suggestion:  ${def.defaultSuggestion}
Docs:        ${def.documentationLink}
`;
    return { success: true, message: text.trim(), exitCode: 0 };
  }

  // 2. Fuzzy AI diagnosis
  const diag = diagnoseError(query);

  if (options.json) {
    return {
      success: true,
      message: JSON.stringify(diag, null, 2),
      exitCode: 0
    };
  }

  const text = `
▲ ${diag.title} ${diag.code ? `[${diag.code}]` : ''}
Explanation: ${diag.explanation}
Suggestion:  ${diag.suggestion}
${diag.suggestedFix ? `Fix:\n${diag.suggestedFix}\n` : ''}
${diag.documentationLink ? `Docs: ${diag.documentationLink}` : ''}
`;

  return { success: true, message: text.trim(), exitCode: 0 };
}
