/**
 * @license Apache-2.0
 * @samrey/runtime - Static HTML Template Hoisting & Cloning
 */

import { TrustedTypesPolicy } from '@samrey/security';

/**
 * Creates a template factory that clones pre-parsed HTML strings via native C++ cloneNode(true).
 */
export function template(htmlString: string): () => Node {
  let templateElement: HTMLTemplateElement | null = null;
  return function createNode(): Node {
    const trimmed = htmlString.trim();

    if (typeof document === 'undefined') {
      // Mock Node for SSR/headless environments with outerHTML support
      return {
        nodeType: 1,
        textContent: '',
        outerHTML: trimmed,
        innerHTML: trimmed,
        childNodes: [],
        firstChild: null,
        nextSibling: null,
        setAttribute: () => {},
        getAttribute: () => null,
        addEventListener: () => {},
        removeEventListener: () => {},
        querySelector: () => null,
        querySelectorAll: () => []
      } as unknown as Node;
    }

    if (!templateElement) {
      templateElement = document.createElement('template');
      templateElement.innerHTML = TrustedTypesPolicy.createTemplateHTML(trimmed) as unknown as string;
    }

    const clone = templateElement.content.cloneNode(true);
    if (clone.childNodes.length === 1) {
      return clone.firstChild!;
    }
    return clone;
  };
}
