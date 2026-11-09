/**
 * @license Apache-2.0
 * @samrey/runtime - Static HTML Template Hoisting & Cloning
 */

import { TrustedTypesPolicy } from '@samrey/security';

function patchMultiRootFragment(fragment: Node): Node {
  const frag = fragment as any;
  const rootNodes: any[] = Array.from(frag.childNodes || []);

  function getActiveRoots(): any[] {
    return rootNodes.length > 0 ? rootNodes : Array.from(frag.childNodes || []);
  }

  if (!frag.classList) {
    frag.classList = {
      add: (...tokens: string[]) => {
        const nodes = getActiveRoots();
        for (let i = 0; i < nodes.length; i++) {
          const child = nodes[i];
          if (child.nodeType === 1 && child.classList) {
            child.classList.add(...tokens);
          }
        }
      },
      remove: (...tokens: string[]) => {
        const nodes = getActiveRoots();
        for (let i = 0; i < nodes.length; i++) {
          const child = nodes[i];
          if (child.nodeType === 1 && child.classList) {
            child.classList.remove(...tokens);
          }
        }
      },
      toggle: (token: string, force?: boolean) => {
        let res = false;
        const nodes = getActiveRoots();
        for (let i = 0; i < nodes.length; i++) {
          const child = nodes[i];
          if (child.nodeType === 1 && child.classList) {
            res = child.classList.toggle(token, force) || res;
          }
        }
        return res;
      },
      contains: (token: string) => {
        const nodes = getActiveRoots();
        for (let i = 0; i < nodes.length; i++) {
          const child = nodes[i];
          if (child.nodeType === 1 && child.classList && child.classList.contains(token)) {
            return true;
          }
        }
        return false;
      }
    };
  }

  if (!frag.setAttribute) {
    frag.setAttribute = (name: string, value: string) => {
      const nodes = getActiveRoots();
      for (let i = 0; i < nodes.length; i++) {
        const child = nodes[i];
        if (child.nodeType === 1 && child.setAttribute) {
          child.setAttribute(name, value);
        }
      }
    };
  }

  if (!frag.getAttribute) {
    frag.getAttribute = (name: string) => {
      const nodes = getActiveRoots();
      for (let i = 0; i < nodes.length; i++) {
        const child = nodes[i];
        if (child.nodeType === 1 && child.getAttribute) {
          return child.getAttribute(name);
        }
      }
      return null;
    };
  }

  if (!frag.removeAttribute) {
    frag.removeAttribute = (name: string) => {
      const nodes = getActiveRoots();
      for (let i = 0; i < nodes.length; i++) {
        const child = nodes[i];
        if (child.nodeType === 1 && child.removeAttribute) {
          child.removeAttribute(name);
        }
      }
    };
  }

  if (!frag.hasAttribute) {
    frag.hasAttribute = (name: string) => {
      const nodes = getActiveRoots();
      for (let i = 0; i < nodes.length; i++) {
        const child = nodes[i];
        if (child.nodeType === 1 && child.hasAttribute) {
          return child.hasAttribute(name);
        }
      }
      return false;
    };
  }

  if (!frag.style) {
    frag.style = new Proxy({} as any, {
      get(_target, prop: string | symbol) {
        if (typeof prop === 'string') {
          const nodes = getActiveRoots();
          for (let i = 0; i < nodes.length; i++) {
            const child = nodes[i];
            if (child.nodeType === 1 && child.style && prop in child.style) {
              return child.style[prop];
            }
          }
        }
        return '';
      },
      set(_target, prop: string | symbol, value: any) {
        if (typeof prop === 'string') {
          const nodes = getActiveRoots();
          for (let i = 0; i < nodes.length; i++) {
            const child = nodes[i];
            if (child.nodeType === 1 && child.style) {
              child.style[prop] = value;
            }
          }
        }
        return true;
      }
    });
  }

  if (!frag.querySelector) {
    frag.querySelector = (selector: string) => {
      const nodes = getActiveRoots();
      for (let i = 0; i < nodes.length; i++) {
        const child = nodes[i];
        if (child.nodeType === 1) {
          if (child.matches && child.matches(selector)) return child;
          if (child.querySelector) {
            const found = child.querySelector(selector);
            if (found) return found;
          }
        }
      }
      return null;
    };
  }

  if (!frag.querySelectorAll) {
    frag.querySelectorAll = (selector: string) => {
      const results: any[] = [];
      const nodes = getActiveRoots();
      for (let i = 0; i < nodes.length; i++) {
        const child = nodes[i];
        if (child.nodeType === 1) {
          if (child.matches && child.matches(selector)) results.push(child);
          if (child.querySelectorAll) {
            results.push(...Array.from(child.querySelectorAll(selector)));
          }
        }
      }
      return results;
    };
  }

  return frag;
}

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
        removeAttribute: () => {},
        hasAttribute: () => false,
        classList: {
          add: () => {},
          remove: () => {},
          toggle: () => false,
          contains: () => false
        },
        style: {},
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
    return patchMultiRootFragment(clone);
  };
}
