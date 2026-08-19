/**
 * @license Apache-2.0
 * @aether/compiler - Contextual Security Classifier
 */

import { SecurityContext } from './air.js';

export function classifyBindingContext(targetType: 'text' | 'attr', attrName?: string): SecurityContext {
  if (targetType === 'text') {
    return 'html-text';
  }

  if (attrName) {
    const lower = attrName.toLowerCase();
    if (lower === 'href' || lower === 'src' || lower === 'action' || lower === 'formaction') {
      return 'uri-attr';
    }
    if (lower === 'style') {
      return 'style-attr';
    }
    if (lower === 'innerhtml' || lower === 'dangerouslysetinnerhtml') {
      return 'trusted-html';
    }
  }

  return 'safe-attr';
}
