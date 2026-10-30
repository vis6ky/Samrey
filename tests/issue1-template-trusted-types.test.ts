import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { template, rawHtml, bindText, bindEvent } from '../packages/runtime/src/index.js';
import { signal, computed } from '../packages/reactivity/src/index.js';

// Minimal mock DOM environment for testing template() in Node
class MockElement {
  public nodeType = 1;
  public tagName: string;
  public childNodes: any[] = [];
  public attributes: Record<string, string> = {};
  public textContent = '';
  public eventListeners: Record<string, ((e: any) => void)[]> = {};

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  get firstChild() {
    return this.childNodes[0] || null;
  }

  appendChild(child: any) {
    this.childNodes.push(child);
    return child;
  }

  cloneNode(deep = true) {
    const clone = new MockElement(this.tagName);
    clone.textContent = this.textContent;
    clone.attributes = { ...this.attributes };
    if (deep) {
      for (const c of this.childNodes) {
        clone.childNodes.push(c.cloneNode ? c.cloneNode(true) : { ...c });
      }
    }
    return clone;
  }

  addEventListener(event: string, listener: (e: any) => void) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(listener);
  }

  dispatchEvent(event: { type: string }) {
    const listeners = this.eventListeners[event.type] || [];
    for (const l of listeners) l(event);
  }

  querySelector(selector: string) {
    const s = selector.toUpperCase();
    for (const c of this.childNodes) {
      if (c.tagName === s) return c;
      if (c.querySelector) {
        const nested = c.querySelector(selector);
        if (nested) return nested;
      }
    }
    return null;
  }

  querySelectorAll(selector: string) {
    const res: any[] = [];
    const s = selector.toUpperCase();
    for (const c of this.childNodes) {
      if (c.tagName === s) res.push(c);
      if (c.querySelectorAll) {
        res.push(...c.querySelectorAll(selector));
      }
    }
    return res;
  }
}

// Simple parser for HTML in MockTemplateElement
class MockTemplateElement extends MockElement {
  public content: any;
  private _innerHTML = '';

  constructor() {
    super('TEMPLATE');
    this.content = {
      nodeType: 11,
      childNodes: [],
      cloneNode: (deep = true) => {
        const frag = {
          nodeType: 11,
          childNodes: this.content.childNodes.map((c: any) => c.cloneNode ? c.cloneNode(deep) : { ...c }),
          get firstChild() { return this.childNodes[0] || null; }
        };
        return frag;
      }
    };
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(html: string) {
    this._innerHTML = html;
    this.content.childNodes = parseMockHtml(html);
  }
}

function parseMockHtml(html: string): any[] {
  const nodes: any[] = [];
  const tagRegex = /<([a-z0-9-]+)([^>]*)>(.*?)<\/\1>|<([a-z0-9-]+)([^>]*)\/?>/gis;
  let match;
  let lastIdx = 0;

  while ((match = tagRegex.exec(html)) !== null) {
    const tagName = (match[1] || match[4]).toUpperCase();
    const inner = match[3] || '';
    const el = new MockElement(tagName);
    if (inner) {
      const children = parseMockHtml(inner);
      if (children.length > 0) {
        el.childNodes = children;
      } else {
        el.textContent = inner;
      }
    }
    nodes.push(el);
    lastIdx = tagRegex.lastIndex;
  }
  return nodes;
}

(globalThis as any).document = {
  createElement: (tag: string) => {
    if (tag.toLowerCase() === 'template') return new MockTemplateElement();
    return new MockElement(tag);
  },
  createTextNode: (text: string) => ({
    nodeType: 3,
    textContent: text,
    cloneNode: () => ({ nodeType: 3, textContent: text })
  })
};

describe('Issue 1: template() Trusted Types policy and HTML preservation', () => {
  it('template() containing button, input, form, textarea, label, select keeps every element', () => {
    const tmpl = template(`
      <form class="my-form">
        <label>Name</label>
        <input type="text" />
        <textarea></textarea>
        <select><option>1</option></select>
        <button type="submit">Submit</button>
      </form>
    `);

    const root = tmpl() as any;
    assert.equal(root.tagName, 'FORM', 'Form tag must be preserved');
    assert.ok(root.querySelector('label'), 'Label must be preserved');
    assert.ok(root.querySelector('input'), 'Input must be preserved');
    assert.ok(root.querySelector('textarea'), 'Textarea must be preserved');
    assert.ok(root.querySelector('select'), 'Select must be preserved');
    assert.ok(root.querySelector('button'), 'Button must be preserved');
  });

  it('README counter example (nested button with onClick) runs and updates on click', () => {
    const count = signal(0);
    const double = computed(() => count.value * 2);

    const tmpl = template(`
      <div class="counter-card">
        <h2>Count: <span>0</span></h2>
        <p>Doubled: <span>0</span></p>
        <button>Increment</button>
      </div>
    `);

    const root = tmpl() as any;
    assert.equal(root.tagName, 'DIV');
    const spans = root.querySelectorAll('span');
    const button = root.querySelector('button');

    assert.ok(button, 'Button element must exist in cloned template');
    assert.equal(spans.length, 2, 'Two spans must exist in cloned template');

    bindText(spans[0], () => count.value);
    bindText(spans[1], () => double.value);
    bindEvent(button, 'click', () => count.value++);

    assert.equal(spans[0].textContent, '0');
    assert.equal(spans[1].textContent, '0');

    // Click button
    button.dispatchEvent({ type: 'click' });
    assert.equal(count.value, 1);
    assert.equal(spans[0].textContent, '1');
    assert.equal(spans[1].textContent, '2');
  });

  it('rawHtml still strips dangerous / restricted tags (button, input, form, textarea, style, link, meta)', () => {
    const untrusted = '<p>Safe</p><button>Click</button><input value="test" /><form></form><textarea></textarea><style></style>';
    const node = rawHtml(untrusted) as any;
    assert.equal(node.tagName, 'SPAN');
    // In rawHtml, innerHTML is sanitized by TrustedTypesPolicy.createHTML
    assert.ok(!node.innerHTML.includes('<button'), 'rawHtml must strip button');
    assert.ok(!node.innerHTML.includes('<input'), 'rawHtml must strip input');
    assert.ok(!node.innerHTML.includes('<form'), 'rawHtml must strip form');
    assert.ok(!node.innerHTML.includes('<textarea'), 'rawHtml must strip textarea');
    assert.ok(!node.innerHTML.includes('<style'), 'rawHtml must strip style');
    assert.ok(node.innerHTML.includes('<p>Safe</p>'), 'rawHtml preserves safe p tag');
  });
});
