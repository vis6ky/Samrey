/**
 * @license Apache-2.0
 * @samrey/compiler - Contextual Security Classifier
 */

import { URL_ATTRIBUTES, SRCSET_ATTRIBUTES } from '@samrey/security';
import { SecurityContext } from './air.js';

export function classifyBindingContext(targetType: 'text' | 'attr', attrName?: string): SecurityContext {
  if (targetType === 'text') {
    return 'html-text';
  }

  if (attrName) {
    const lower = attrName.toLowerCase();
    if (URL_ATTRIBUTES.has(lower) || SRCSET_ATTRIBUTES.has(lower)) {
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
