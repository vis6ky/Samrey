/**
 * @license Apache-2.0
 * @samrey/runtime - Static HTML Template Hoisting, Cloning & References
 */

import { TrustedTypesPolicy } from '@samrey/security';
import { getOwner, onCleanup } from '@samrey/reactivity';
import { parseHtmlToHeadlessFragment } from './headless-dom.js';

export type TagNameToElement<T extends string> =
  T extends keyof HTMLElementTagNameMap
    ? HTMLElementTagNameMap[T]
    : T extends keyof SVGElementTagNameMap
      ? SVGElementTagNameMap[T]
      : HTMLElement;

type Whitespace = ' ' | '\t' | '\n' | '\r';

type TrimLeft<S extends string> = S extends `${Whitespace}${infer Rest}` ? TrimLeft<Rest> : S;
type TrimRight<S extends string> = S extends `${infer Rest}${Whitespace}` ? TrimRight<Rest> : S;
type Trim<S extends string> = TrimRight<TrimLeft<S>>;

// Extract tag name deterministically up to first whitespace, '/', or '>' (prevents Whitespace union distribution)
type ExtractTagName<S extends string, Acc extends string = ''> =
  S extends `${infer C}${infer Rest}`
    ? C extends Whitespace | '/' | '>'
      ? [Acc, `${C}${Rest}`]
      : ExtractTagName<Rest, `${Acc}${C}`>
    : [Acc, ''];

// Quote-aware scan to the closing '>' of an opening tag
type ScanTagEnd<
  S extends string,
  Quote extends string = '',
  Acc extends string = ''
> =
  S extends `${infer C}${infer Rest}`
    ? Quote extends ''
      ? C extends '"' | "'"
        ? ScanTagEnd<Rest, C, `${Acc}${C}`>
        : C extends '>'
          ? [Acc, Rest]
          : ScanTagEnd<Rest, '', `${Acc}${C}`>
      : C extends Quote
        ? ScanTagEnd<Rest, '', `${Acc}${C}`>
        : ScanTagEnd<Rest, Quote, `${Acc}${C}`>
    : [Acc, ''];

type ReadAttrName<S extends string, Acc extends string = ''> =
  S extends `${infer C}${infer Rest}`
    ? C extends Whitespace | '=' | '/'
      ? [Acc, `${C}${Rest}`]
      : ReadAttrName<Rest, `${Acc}${C}`>
    : [Acc, ''];

type SkipAttrValue<S extends string> =
  TrimLeft<S> extends `=${infer AfterEq}`
    ? TrimLeft<AfterEq> extends `"${string}"${infer Rest}`
      ? Rest
      : TrimLeft<AfterEq> extends `'${string}'${infer Rest}`
        ? Rest
        : TrimLeft<AfterEq> extends `${string}${Whitespace}${infer Rest}`
          ? Rest
          : ''
    : S;

type ReadAttrValue<S extends string> =
  TrimLeft<S> extends `=${infer AfterEq}`
    ? TrimLeft<AfterEq> extends `"${infer Val}"${infer Rest}`
      ? [Val, Rest]
      : TrimLeft<AfterEq> extends `'${infer Val}'${infer Rest}`
        ? [Val, Rest]
        : TrimLeft<AfterEq> extends `${infer Val}${Whitespace}${infer Rest}`
          ? [Val, Rest]
          : [TrimLeft<AfterEq>, '']
    : ['', S];

type SkipWhitespaceAndSlashes<S extends string> =
  S extends `${infer C}${infer Rest}`
    ? C extends Whitespace | '/'
      ? SkipWhitespaceAndSlashes<Rest>
      : S
    : '';

type ParseRefFromAttrs<Tag extends string, Attrs extends string> =
  SkipWhitespaceAndSlashes<Attrs> extends ''
    ? unknown
    : ReadAttrName<SkipWhitespaceAndSlashes<Attrs>> extends [infer Name extends string, infer AfterName extends string]
      ? Name extends ''
        ? unknown
        : Lowercase<Name> extends 'ref'
          ? ReadAttrValue<AfterName> extends [infer RefVal extends string, infer RestAttrs extends string]
            ? (Trim<RefVal> extends ''
                ? unknown
                : { [K in Trim<RefVal>]: TagNameToElement<Lowercase<Tag>> }) &
              ParseRefFromAttrs<Tag, RestAttrs>
            : unknown
          : ParseRefFromAttrs<Tag, SkipAttrValue<AfterName>>
      : unknown;

type EmptyRefs = Record<never, never>;

type ExtractRefsInner<S extends string> =
  string extends S
    ? Record<string, HTMLElement>
    : S extends `${string}<${infer Rest}`
      ? Rest extends `!--${string}-->${infer AfterComment}`
        ? ExtractRefsInner<AfterComment>
        : Rest extends `/${string}>${infer AfterClose}`
          ? ExtractRefsInner<AfterClose>
          : Rest extends `!${string}>${infer AfterDecl}`
            ? ExtractRefsInner<AfterDecl>
            : ExtractTagName<TrimLeft<Rest>> extends [infer Tag extends string, infer AfterTag extends string]
              ? Tag extends ''
                ? ExtractRefsInner<AfterTag>
                : ScanTagEnd<AfterTag> extends [infer Attrs extends string, infer Remainder extends string]
                  ? ParseRefFromAttrs<Tag, Attrs> & ExtractRefsInner<Remainder>
                  : EmptyRefs
              : EmptyRefs
      : EmptyRefs;

type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type ExtractRefs<S extends string> =
  string extends S
    ? Record<string, HTMLElement>
    : Prettify<ExtractRefsInner<S>>;

export type TemplateRefs<S extends string = string> =
  string extends S
    ? Record<string, HTMLElement>
    : Prettify<ExtractRefs<S>>;

export type TemplateRoot<S extends string = string> = (HTMLElement | DocumentFragment) & {
  refs: TemplateRefs<S>;
  ref<K extends keyof TemplateRefs<S>>(name: K): TemplateRefs<S>[K];
  ref<E extends Element = HTMLElement>(name: string): E | undefined;
  disposeRefs(): void;
};

export interface TemplateFactory<S extends string = string> {
  (): TemplateRoot<S>;
  clone(): TemplateRoot<S>;
}

const VALID_REF_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

type PathStep = number | 'content';

interface RefDescriptor {
  name: string;
  path: PathStep[];
}

function getRefAttr(el: any): string | null {
  if (typeof el.getAttribute === 'function') {
    const direct = el.getAttribute('ref') || el.getAttribute('REF') || el.getAttribute('Ref');
    if (direct) return direct;
  }
  if (el.attributes) {
    if (typeof el.attributes.length === 'number') {
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        if (attr && typeof attr.name === 'string' && attr.name.toLowerCase() === 'ref') {
          return attr.value || null;
        }
      }
    } else {
      for (const [key, value] of Object.entries(el.attributes)) {
        if (key.toLowerCase() === 'ref' && typeof value === 'string' && value.length > 0) {
          return value;
        }
      }
    }
  }
  return null;
}

function extractRefDescriptors(content: DocumentFragment): RefDescriptor[] {
  const descriptors: RefDescriptor[] = [];
  const seenRefs = new Set<string>();

  function collectFromNode(node: Node, path: PathStep[]): void {
    if (node.nodeType === 1) {
      const el = node as HTMLElement;
      const refName = getRefAttr(el);

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

      const templateContent = (el as unknown as { content?: DocumentFragment }).content;
      if (templateContent && templateContent.childNodes && templateContent.childNodes.length > 0) {
        for (let i = 0; i < templateContent.childNodes.length; i++) {
          collectFromNode(templateContent.childNodes[i], path.concat('content', i));
        }
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
      const refName = getRefAttr(el);
      if (refName) {
        if (!VALID_REF_REGEX.test(refName)) {
          if (typeof process === 'undefined' || process.env.NODE_ENV !== 'production') {
            console.warn(`[Samrey Warning] Invalid template ref identifier "${refName}".`);
          }
        }
        seenRefs.add(refName);
        descriptors.push({ name: refName, path: [] });
      }
      const rootContent = (el as unknown as { content?: DocumentFragment }).content;
      if (rootContent && rootContent.childNodes && rootContent.childNodes.length > 0) {
        for (let i = 0; i < rootContent.childNodes.length; i++) {
          collectFromNode(rootContent.childNodes[i], ['content', i]);
        }
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
  let browserRefDescriptors: RefDescriptor[] | null = null;
  let headlessFragment: DocumentFragment | null = null;
  let headlessRefDescriptors: RefDescriptor[] | null = null;
  const hasRefAttr = /(?:^|[\s/])ref\s*=/i.test(htmlString);

  const createNode = function createNode(): TemplateRoot<S> {
    const trimmed = htmlString.trim();
    let clone: DocumentFragment;
    let activeDescriptors: RefDescriptor[];

    if (typeof document === 'undefined') {
      if (!headlessFragment) {
        const safeHtml = String(TrustedTypesPolicy.createTemplateHTML(trimmed) ?? '');
        headlessFragment = parseHtmlToHeadlessFragment(safeHtml) as DocumentFragment;
        headlessRefDescriptors = hasRefAttr ? extractRefDescriptors(headlessFragment) : [];
      }
      clone = headlessFragment.cloneNode(true) as DocumentFragment;
      activeDescriptors = headlessRefDescriptors || [];
    } else {
      if (!templateElement) {
        templateElement = document.createElement('template');
        templateElement.innerHTML = TrustedTypesPolicy.createTemplateHTML(trimmed) as unknown as string;
        browserRefDescriptors = hasRefAttr ? extractRefDescriptors(templateElement.content) : [];
      }
      clone = templateElement.content.cloneNode(true) as DocumentFragment;
      activeDescriptors = browserRefDescriptors || [];
    }

    const root: any = clone.childNodes.length === 1 ? clone.firstChild! : patchMultiRootFragment(clone);

    const refs: Record<string, any> = Object.create(null);
    if (activeDescriptors.length > 0) {
      for (let d = 0; d < activeDescriptors.length; d++) {
        const desc = activeDescriptors[d];
        let curr: any = root;
        const path = desc.path;
        for (let p = 0; p < path.length; p++) {
          const step = path[p];
          if (step === 'content') {
            if (curr && curr.content) {
              curr = curr.content;
            } else {
              curr = undefined;
              break;
            }
          } else if (curr && curr.childNodes) {
            curr = curr.childNodes[step];
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
