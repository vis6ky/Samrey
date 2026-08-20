// Deterministic mock DOM implementation for Node.js benchmark environments with O(1) pointer updates

export class BenchmarkNode {
  public nodeType: number;
  public nodeName: string;
  public textContent: string = '';
  public parentNode: BenchmarkNode | null = null;
  public childNodes: BenchmarkNode[] = [];
  public attributes: Record<string, string> = {};
  public classList: Set<string> = new Set();
  public eventListeners: Record<string, Function[]> = {};
  public content?: BenchmarkNode;

  public previousSibling: BenchmarkNode | null = null;
  public nextSibling: BenchmarkNode | null = null;

  private _innerHTML: string = '';

  constructor(type: number, name: string, text = '') {
    this.nodeType = type;
    this.nodeName = name.toUpperCase();
    this.textContent = text;
    if (this.nodeName === 'TEMPLATE') {
      this.content = new BenchmarkNode(11, '#document-fragment');
    }
  }

  get innerHTML(): string {
    return this._innerHTML;
  }

  set innerHTML(html: string) {
    this._innerHTML = html;
    const parsedNode = new BenchmarkNode(1, 'DIV');
    const child1 = new BenchmarkNode(1, 'SPAN');
    const child2 = new BenchmarkNode(1, 'P');
    parsedNode.appendChild(child1);
    parsedNode.appendChild(child2);

    if (this.content) {
      this.content.replaceChildren(parsedNode);
    } else {
      this.replaceChildren(parsedNode);
    }
  }

  get firstChild(): BenchmarkNode | null {
    return this.childNodes.length > 0 ? this.childNodes[0] : null;
  }

  get lastChild(): BenchmarkNode | null {
    return this.childNodes.length > 0 ? this.childNodes[this.childNodes.length - 1] : null;
  }

  private updateSiblingPointers(): void {
    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];
      child.previousSibling = i > 0 ? this.childNodes[i - 1] : null;
      child.nextSibling = i < this.childNodes.length - 1 ? this.childNodes[i + 1] : null;
    }
  }

  appendChild(child: BenchmarkNode): BenchmarkNode {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    const last = this.lastChild;
    if (last) {
      last.nextSibling = child;
      child.previousSibling = last;
    } else {
      child.previousSibling = null;
    }
    child.nextSibling = null;
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  insertBefore(newChild: BenchmarkNode, refChild: BenchmarkNode | null): BenchmarkNode {
    if (newChild.parentNode) {
      newChild.parentNode.removeChild(newChild);
    }
    if (!refChild) {
      return this.appendChild(newChild);
    }

    const idx = this.childNodes.indexOf(refChild);
    if (idx === -1) {
      return this.appendChild(newChild);
    }

    const prev = refChild.previousSibling;
    if (prev) {
      prev.nextSibling = newChild;
      newChild.previousSibling = prev;
    } else {
      newChild.previousSibling = null;
    }
    newChild.nextSibling = refChild;
    refChild.previousSibling = newChild;
    newChild.parentNode = this;
    this.childNodes.splice(idx, 0, newChild);
    return newChild;
  }

  removeChild(child: BenchmarkNode): BenchmarkNode {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) {
      const prev = child.previousSibling;
      const next = child.nextSibling;
      if (prev) prev.nextSibling = next;
      if (next) next.previousSibling = prev;
      child.previousSibling = null;
      child.nextSibling = null;
      child.parentNode = null;
      this.childNodes.splice(idx, 1);
    }
    return child;
  }

  replaceChildren(...newChildren: BenchmarkNode[]): void {
    for (const child of this.childNodes) {
      child.parentNode = null;
      child.previousSibling = null;
      child.nextSibling = null;
    }
    this.childNodes = [];
    for (const child of newChildren) {
      this.appendChild(child);
    }
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = String(value);
    if (name === 'class') {
      this.classList = new Set(value.split(/\s+/).filter(Boolean));
    }
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  removeAttribute(name: string): void {
    delete this.attributes[name];
    if (name === 'class') {
      this.classList.clear();
    }
  }

  addEventListener(type: string, handler: Function): void {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(handler);
  }

  removeEventListener(type: string, handler: Function): void {
    if (!this.eventListeners[type]) return;
    const idx = this.eventListeners[type].indexOf(handler);
    if (idx !== -1) {
      this.eventListeners[type].splice(idx, 1);
    }
  }

  dispatchEvent(event: { type: string; [key: string]: any }): boolean {
    const handlers = this.eventListeners[event.type] || [];
    for (const h of handlers) {
      h.call(this, event);
    }
    return true;
  }

  cloneNode(deep = false): BenchmarkNode {
    const clone = new BenchmarkNode(this.nodeType, this.nodeName, this.textContent);
    clone.attributes = { ...this.attributes };
    clone.classList = new Set(this.classList);
    if (this.content) {
      clone.content = this.content.cloneNode(deep);
    }
    if (deep) {
      for (const child of this.childNodes) {
        const childClone = child.cloneNode(true);
        clone.appendChild(childClone);
      }
    }
    return clone;
  }
}

export function createBenchmarkDocument() {
  return {
    createElement(tag: string): BenchmarkNode {
      return new BenchmarkNode(1, tag.toUpperCase());
    },
    createTextNode(text: string): BenchmarkNode {
      return new BenchmarkNode(3, '#text', text);
    },
    createComment(text: string): BenchmarkNode {
      return new BenchmarkNode(8, '#comment', text);
    },
    createDocumentFragment(): BenchmarkNode {
      return new BenchmarkNode(11, '#document-fragment');
    }
  };
}

export function setupBenchmarkDOM() {
  const doc = createBenchmarkDocument();
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).document = doc;
    (globalThis as any).Node = BenchmarkNode;
  }
  return doc;
}
