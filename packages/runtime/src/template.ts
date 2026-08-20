/**
 * @license Apache-2.0
 * @aether/runtime - Static HTML Template Hoisting & Cloning
 */

/**
 * Creates a template factory that clones pre-parsed HTML strings via native C++ cloneNode(true).
 */
export function template(htmlString: string): () => Node {
  let templateElement: HTMLTemplateElement | null = null;

  return function createNode(): Node {
    if (typeof document === 'undefined') {
      // Mock Node for SSR/headless environments with outerHTML support
      return {
        nodeType: 1,
        textContent: '',
        outerHTML: htmlString,
        innerHTML: htmlString,
        childNodes: [],
        firstChild: null,
        nextSibling: null,
        setAttribute: () => {},
        getAttribute: () => null,
        addEventListener: () => {},
        removeEventListener: () => {}
      } as unknown as Node;
    }

    if (!templateElement) {
      templateElement = document.createElement('template');
      templateElement.innerHTML = htmlString;
    }

    const clone = templateElement.content.cloneNode(true);
    return clone.firstChild || clone;
  };
}
