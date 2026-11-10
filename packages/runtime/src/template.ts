/**
 * @license Apache-2.0
 * @samrey/runtime - Static HTML Template Hoisting, Cloning & References
 */

import { TrustedTypesPolicy } from '@samrey/security';
import { getOwner, onCleanup } from '@samrey/reactivity';

export type TagNameToElement<T extends string> =
  T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : HTMLElement;

type Whitespace = ' ' | '\t' | '\n' | '\r';

type TrimLeft<S extends string> = S extends `${Whitespace}${infer Rest}` ? TrimLeft<Rest> : S;

type FindTagEnd<S extends string> =
  S extends `${infer Before}/>${infer After}`
    ? S extends `${infer Before2}>${infer After2}`
      ? Before extends `${infer _BeforeShort}>${string}`
        ? [Before2, After2]
        : [Before, `/${After}`]
      : [Before, `/${After}`]
    : S extends `${infer Before}>${infer After}`
    ? [Before, After]
    : [S, ''];

export type ExtractRefs<S extends string> =
  string extends S
    ? Record<string, HTMLElement>
    : S extends `${string}<${infer Rest}`
    ? Rest extends `/${string}`
      ? ExtractRefs<Rest>
      : Rest extends `!${string}`
      ? ExtractRefs<Rest>
      : ProcessTag<TrimLeft<Rest>>
    : Record<string, never>;

type ProcessTag<S extends string> =
  S extends `${infer TagName}${Whitespace}${infer AttrsAndRest}`
    ? FindTagEnd<AttrsAndRest> extends [infer Attrs extends string, infer Remainder extends string]
      ? ParseRef<TagName, Attrs> & ExtractRefs<Remainder>
      : Record<string, never>
    : S extends `${string}>${infer Remainder}`
    ? ExtractRefs<Remainder>
    : Record<string, never>;

type ParseRef<Tag extends string, Attrs extends string> =
  Attrs extends `${string}ref="${infer Name}"${string}`
    ? { [K in Name]: TagNameToElement<Lowercase<Tag>> }
    : Attrs extends `${string}ref='${infer Name}'${string}`
    ? { [K in Name]: TagNameToElement<Lowercase<Tag>> }
    : Record<string, never>;

type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type TemplateRefs<S extends string = string> =
  string extends S
    ? Record<string, HTMLElement>
    : Prettify<ExtractRefs<S>>;

export type TemplateRoot<S extends string = string> = (HTMLElement | DocumentFragment) & {
  refs: TemplateRefs<S>;
  ref<K extends keyof TemplateRefs<S>>(name: K): TemplateRefs<S>[K];
  ref<E extends HTMLElement = HTMLElement>(name: string): E | undefined;
  disposeRefs(): void;
};

export interface TemplateFactory<S extends string = string> {
  (): TemplateRoot<S>;
  clone(): TemplateRoot<S>;
}

const VALID_REF_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

interface RefDescriptor {
  name: string;
  path: number[];
}

function extractRefDescriptors(content: DocumentFragment): RefDescriptor[] {
  const descriptors: RefDescriptor[] = [];
  const seenRefs = new Set<string>();

  function collectFromNode(node: Node, path: number[]): void {
    if (node.nodeType === 1) {
      const el = node as HTMLElement;
      let refName: string | null = null;
      if (typeof el.getAttribute === 'function') {
        refName = el.getAttribute('ref');
      } else if ((el as any).attributes && (el as any).attributes.ref) {
        refName = (el as any).attributes.ref;
      }

      if (refName) {
        if (!VALID_REF_REGEX.test(refName)) {
          if (typeof process === 'undefined' || process.env.NODE_ENV !== 'production') {
            console.warn(
              `[Samrey Warning] Invalid template ref identifier "${refName}". Reference identifiers must match /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.`
            );
          }
        }
        if (seenRefs.has(refName)) {
          if (typeof process === 'undefined' || process.env.NODE_ENV !== 'production') {
            console.warn(
              `[Samrey Warning] Duplicate template ref "${refName}" detected in template. Duplicate names can lead to ambiguous element access.`
            );
          }
        }
        seenRefs.add(refName);
        descriptors.push({ name: refName, path });
      }
    }

    const children = node.childNodes;
    if (children && children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        collectFromNode(children[i], path.concat(i));
      }
    }
  }

  if (content.childNodes.length === 1) {
    const rootNode = content.firstChild!;
    if (rootNode.nodeType === 1) {
      const el = rootNode as HTMLElement;
      let refName: string | null = null;
      if (typeof el.getAttribute === 'function') {
        refName = el.getAttribute('ref');
      } else if ((el as any).attributes && (el as any).attributes.ref) {
        refName = (el as any).attributes.ref;
      }
      if (refName) {
        if (!VALID_REF_REGEX.test(refName)) {
          if (typeof process === 'undefined' || process.env.NODE_ENV !== 'production') {
            console.warn(`[Samrey Warning] Invalid template ref identifier "${refName}".`);
          }
        }
        seenRefs.add(refName);
        descriptors.push({ name: refName, path: [] });
      }
    }
    const children = rootNode.childNodes;
    if (children && children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        collectFromNode(children[i], [i]);
      }
    }
  } else {
    const children = content.childNodes;
    for (let i = 0; i < children.length; i++) {
      collectFromNode(children[i], [i]);
    }
  }

  return descriptors;
}

function createMockElement(tagName = 'DIV', html = ''): any {
  const listeners: Record<string, Function[]> = {};
  const attrs: Record<string, string> = {};
  const classes = new Set<string>();

  return {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    nodeName: tagName.toUpperCase(),
    textContent: '',
    outerHTML: html,
    innerHTML: html,
    childNodes: [],
    firstChild: null,
    nextSibling: null,
    parentNode: null,
    setAttribute: (name: string, val: string) => {
      attrs[name] = val;
    },
    getAttribute: (name: string) => attrs[name] ?? null,
    removeAttribute: (name: string) => {
      delete attrs[name];
    },
    hasAttribute: (name: string) => name in attrs,
    classList: {
      add: (...tokens: string[]) => tokens.forEach((t) => classes.add(t)),
      remove: (...tokens: string[]) => tokens.forEach((t) => classes.delete(t)),
      toggle: (token: string, force?: boolean) => {
        if (force === true) { classes.add(token); return true; }
        if (force === false) { classes.delete(token); return false; }
        if (classes.has(token)) { classes.delete(token); return false; }
        classes.add(token); return true;
      },
      contains: (token: string) => classes.has(token)
    },
    style: {},
    addEventListener: (type: string, handler: Function) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(handler);
    },
    removeEventListener: (type: string, handler: Function) => {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter((h) => h !== handler);
      }
    },
    dispatchEvent: (event: any) => {
      const type = event?.type;
      if (listeners[type]) {
        listeners[type].forEach((h) => h(event));
      }
      return true;
    },
    querySelector: () => null,
    querySelectorAll: () => []
  };
}

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
 * Returns a factory function with a `.clone()` method and fine-grained template references (`root.refs`).
 */
export function template<S extends string = string>(htmlString: S): TemplateFactory<S> {
  let templateElement: HTMLTemplateElement | null = null;
  let refDescriptors: RefDescriptor[] | null = null;
  const hasRefAttr = htmlString.includes('ref=');

  const createNode = function createNode(): TemplateRoot<S> {
    const trimmed = htmlString.trim();

    if (typeof document === 'undefined') {
      const refs: Record<string, any> = {};
      const seenRefs = new Set<string>();
      if (hasRefAttr) {
        const regex = /<([a-zA-Z0-9-]+)[^>]*?\bref=["']([^"']+)["']/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(trimmed)) !== null) {
          const tagName = match[1].toUpperCase();
          const refName = match[2];
          if (!VALID_REF_REGEX.test(refName)) {
            if (typeof process === 'undefined' || process.env.NODE_ENV !== 'production') {
              console.warn(`[Samrey Warning] Invalid template ref identifier "${refName}".`);
            }
          }
          if (seenRefs.has(refName)) {
            if (typeof process === 'undefined' || process.env.NODE_ENV !== 'production') {
              console.warn(`[Samrey Warning] Duplicate template ref "${refName}" detected in template.`);
            }
          }
          seenRefs.add(refName);
          refs[refName] = createMockElement(tagName, '');
        }
      }

      // Root tag match if single root
      const rootMatch = trimmed.match(/^<([a-zA-Z0-9-]+)[^>]*>/);
      const rootTag = rootMatch ? rootMatch[1].toUpperCase() : 'DIV';
      const rootRefMatch = rootMatch ? rootMatch[0].match(/\bref=["']([^"']+)["']/) : null;
      const rootRefName = rootRefMatch ? rootRefMatch[1] : null;

      const mockRoot = createMockElement(rootTag, trimmed);
      if (rootRefName && refs[rootRefName]) {
        refs[rootRefName] = mockRoot;
      }

      Object.defineProperty(mockRoot, 'refs', {
        value: refs,
        writable: false,
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(mockRoot, 'ref', {
        value: function ref(name: string) {
          return refs[name];
        },
        writable: false,
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(mockRoot, 'disposeRefs', {
        value: function disposeRefs() {
          for (const k of Object.keys(refs)) {
            delete refs[k];
          }
        },
        writable: false,
        enumerable: false,
        configurable: true
      });

      const activeOwner = getOwner();
      if (activeOwner) {
        onCleanup(() => {
          mockRoot.disposeRefs();
        });
      }

      return mockRoot as unknown as TemplateRoot<S>;
    }

    if (!templateElement) {
      templateElement = document.createElement('template');
      templateElement.innerHTML = TrustedTypesPolicy.createTemplateHTML(trimmed) as unknown as string;
      refDescriptors = hasRefAttr ? extractRefDescriptors(templateElement.content) : [];
    }

    const clone = templateElement.content.cloneNode(true);
    const root: any = clone.childNodes.length === 1 ? clone.firstChild! : patchMultiRootFragment(clone);

    const refs: Record<string, any> = {};
    if (refDescriptors && refDescriptors.length > 0) {
      for (let d = 0; d < refDescriptors.length; d++) {
        const desc = refDescriptors[d];
        let curr: any = root;
        const path = desc.path;
        for (let p = 0; p < path.length; p++) {
          if (curr && curr.childNodes) {
            curr = curr.childNodes[path[p]];
          } else {
            curr = undefined;
            break;
          }
        }
        if (curr) {
          refs[desc.name] = curr;
        }
      }
    }

    Object.defineProperty(root, 'refs', {
      value: refs,
      writable: false,
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(root, 'ref', {
      value: function ref(name: string) {
        return refs[name];
      },
      writable: false,
      enumerable: true,
      configurable: true
    });

    Object.defineProperty(root, 'disposeRefs', {
      value: function disposeRefs() {
        for (const k of Object.keys(refs)) {
          delete refs[k];
        }
      },
      writable: false,
      enumerable: false,
      configurable: true
    });

    const activeOwner = getOwner();
    if (activeOwner) {
      onCleanup(() => {
        root.disposeRefs();
      });
    }

    return root as TemplateRoot<S>;
  };

  createNode.clone = () => createNode();

  return createNode as TemplateFactory<S>;
}
