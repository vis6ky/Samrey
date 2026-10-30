import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { bindText } from '../packages/runtime/src/index.js';
import { signal } from '../packages/reactivity/src/index.js';

class MockNode {
  public nodeType: number;
  public nodeName: string;
  public textContent: string = '';
  public parentNode: MockNode | null = null;
  public childNodes: MockNode[] = [];

  constructor(type: number, name: string, text = '') {
    this.nodeType = type;
    this.nodeName = name;
    this.textContent = text;
  }

  appendChild(child: MockNode) {
    if (child.parentNode) child.parentNode.removeChild(child);
    this.childNodes.push(child);
    child.parentNode = this;
    return child;
  }

  replaceChild(newChild: MockNode, oldChild: MockNode) {
    const idx = this.childNodes.indexOf(oldChild);
    if (idx !== -1) {
      if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
      this.childNodes.splice(idx, 1, newChild);
      oldChild.parentNode = null;
      newChild.parentNode = this;
    }
    return oldChild;
  }

  removeChild(child: MockNode) {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) {
      this.childNodes.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }
}

(globalThis as any).document = {
  createTextNode: (t: string) => new MockNode(3, '#text', t),
  createComment: (t: string) => new MockNode(8, '#comment', t)
};

describe('Phase 1 - 1.1: Dynamic text placeholder visibility', () => {
  it('converts/replaces comment placeholder into a visible text node with textContent', () => {
    const h2 = new MockNode(1, 'H2');
    const label = new MockNode(3, '#text', 'Count: ');
    const commentPlaceholder = new MockNode(8, '#comment', 'dynamic-slot');
    h2.appendChild(label);
    h2.appendChild(commentPlaceholder);

    assert.equal(h2.childNodes[1].nodeType, 8, 'Initially child is a comment placeholder');

    const count = signal(0);
    bindText(commentPlaceholder as unknown as Node, () => count.value);

    // After bindText, the child in h2 must be replaced by a visible Text node (nodeType 3)
    assert.equal(h2.childNodes[1].nodeType, 3, 'Placeholder must become a real text node');
    assert.equal(h2.childNodes[1].textContent, '0');

    count.value = 1;
    assert.equal(h2.childNodes[1].textContent, '1');
  });
});

describe('Phase 1 - 1.2 & 1.3: Generated DOM paths for single-root and multi-root templates', () => {
  it('generates correct paths for single-root template (root element itself and children)', async () => {
    const { compileTemplate } = await import('../packages/compiler/src/index.js');
    const result = compileTemplate('<div class="c"><h2>Count: {count.value}</h2><button onClick={() => count.value++}>+</button></div>');
    const code = result.generatedCode;

    // Single root element returned by template() is the <div class="c">.
    // Child 0 is <h2>, child 1 is <button>.
    // Dynamic text inside <h2> must be root.childNodes[0].childNodes[1], NOT root.childNodes[0].childNodes[0].childNodes[1]!
    assert.ok(
      code.includes('root.childNodes[0].childNodes[1]'),
      `Expected code to target root.childNodes[0].childNodes[1] for h2 text, got:\n${code}`
    );
    assert.ok(
      !code.includes('root.childNodes[0].childNodes[0].childNodes[1]'),
      `Code must not have off-by-one container index: \n${code}`
    );

    // Event on button (child 1 of div) must target root.childNodes[1], NOT root.childNodes[0].childNodes[1]
    assert.ok(
      code.includes('root.childNodes[1]'),
      `Expected button click to target root.childNodes[1], got:\n${code}`
    );
  });

  it('binds dynamic attributes to the element itself, not the root', async () => {
    const { compileTemplate } = await import('../packages/compiler/src/index.js');
    const result = compileTemplate('<div id="root-div"><span class={spanClass.value}>Text</span></div>');
    const code = result.generatedCode;

    // The span is child 0 of root-div, so class must bind to root.childNodes[0], NOT root
    assert.ok(
      code.includes('bindAttr(root.childNodes[0], "class"'),
      `Expected span attribute to target root.childNodes[0], got:\n${code}`
    );
  });

  it('generates correct paths for multi-root fragment templates', async () => {
    const { compileTemplate } = await import('../packages/compiler/src/index.js');
    const result = compileTemplate('<h1>{title.value}</h1><p>{body.value}</p>');
    const code = result.generatedCode;

    // In a multi-root template, template() returns a DocumentFragment.
    // h1 is child 0, p is child 1.
    // Dynamic text in h1 targets root.childNodes[0].childNodes[0]
    // Dynamic text in p targets root.childNodes[1].childNodes[0]
    assert.ok(
      code.includes('root.childNodes[0].childNodes[0]'),
      `Expected h1 text to target root.childNodes[0].childNodes[0], got:\n${code}`
    );
    assert.ok(
      code.includes('root.childNodes[1].childNodes[0]'),
      `Expected p text to target root.childNodes[1].childNodes[0], got:\n${code}`
    );
  });
});

describe('Phase 1 - 1.4: Compiler Control Flow & Component Tags Diagnostic', () => {
  it('throws SamreyCompilerError when <Show> tag is used in template', async () => {
    const { compileTemplate, SamreyCompilerError } = await import('../packages/compiler/src/index.js');
    assert.throws(
      () => compileTemplate('<Show when={x.value}><span>Hi</span></Show>', { filename: 'App.samrey' }),
      (err: any) => {
        assert.ok(err instanceof SamreyCompilerError);
        assert.equal(err.filename, 'App.samrey');
        assert.ok(err.message.includes('<Show>'));
        assert.ok(err.message.includes('runtime Show()'));
        return true;
      }
    );
  });

  it('throws SamreyCompilerError when <For> tag is used in template', async () => {
    const { compileTemplate, SamreyCompilerError } = await import('../packages/compiler/src/index.js');
    assert.throws(
      () => compileTemplate('<For each={items.value}>{item => <li>{item}</li>}</For>'),
      (err: any) => {
        assert.ok(err instanceof SamreyCompilerError);
        assert.ok(err.message.includes('<For>'));
        assert.ok(err.message.includes('runtime For()'));
        return true;
      }
    );
  });

  it('throws SamreyCompilerError when capitalized component tag is used in template', async () => {
    const { compileTemplate, SamreyCompilerError } = await import('../packages/compiler/src/index.js');
    assert.throws(
      () => compileTemplate('<UserProfile name="Alice" />'),
      (err: any) => {
        assert.ok(err instanceof SamreyCompilerError);
        assert.ok(err.message.includes('<UserProfile>'));
        assert.ok(err.message.includes('createComponent'));
        return true;
      }
    );
  });

  it('throws SamreyCompilerError for <Switch>, <Dynamic>, <Portal>', async () => {
    const { compileTemplate, SamreyCompilerError } = await import('../packages/compiler/src/index.js');
    for (const tag of ['Switch', 'Dynamic', 'Portal']) {
      assert.throws(
        () => compileTemplate(`<${tag} />`),
        (err: any) => {
          assert.ok(err instanceof SamreyCompilerError);
          assert.ok(err.message.includes(`<${tag}>`));
          return true;
        }
      );
    }
  });
});

describe('Phase 1 - 1.5: Static dangerous attributes rejection and stripping', () => {
  it('strips or rejects static inline on* event handler attributes', async () => {
    const { compileTemplate } = await import('../packages/compiler/src/index.js');
    const result = compileTemplate('<button onclick="alert(1)" onload="evil()" class="btn">Click</button>');
    const html = result.templates[0].staticHtml;
    assert.ok(!html.includes('onclick'), `Expected staticHtml to strip onclick, got:\n${html}`);
    assert.ok(!html.includes('onload'), `Expected staticHtml to strip onload, got:\n${html}`);
    assert.ok(html.includes('class="btn"'), 'Safe attributes must remain');
  });

  it('strips or rejects static srcdoc attribute', async () => {
    const { compileTemplate } = await import('../packages/compiler/src/index.js');
    const result = compileTemplate('<iframe srcdoc="<script>alert(1)</script>" class="frame"></iframe>');
    const html = result.templates[0].staticHtml;
    assert.ok(!html.includes('srcdoc'), `Expected staticHtml to strip srcdoc, got:\n${html}`);
  });

  it('sanitizes or strips javascript: in <object data="...">', async () => {
    const { compileTemplate } = await import('../packages/compiler/src/index.js');
    const result = compileTemplate('<object data="javascript:alert(1)"></object>');
    const html = result.templates[0].staticHtml;
    assert.ok(!html.includes('javascript:'), `Expected staticHtml to sanitize javascript:, got:\n${html}`);
    assert.ok(html.includes('about:blank') || !html.includes('data='), 'Must be sanitized to about:blank or stripped');
  });
});

describe('Phase 1 - 1.6: evaluateConstantExpression string escape decoding', () => {
  it('decodes newline and tab escapes in single-quoted string literals', async () => {
    const { evaluateConstantExpression } = await import('../packages/compiler/src/index.js');
    const res = evaluateConstantExpression("'a\\nb'");
    assert.equal(res.isConstant, true);
    assert.equal(res.value, 'a\nb');

    const tabRes = evaluateConstantExpression("'hello\\tworld'");
    assert.equal(tabRes.isConstant, true);
    assert.equal(tabRes.value, 'hello\tworld');
  });

  it('decodes carriage returns, quotes, and backslashes in single-quoted literals', async () => {
    const { evaluateConstantExpression } = await import('../packages/compiler/src/index.js');
    const crlfRes = evaluateConstantExpression("'\\r\\n'");
    assert.equal(crlfRes.isConstant, true);
    assert.equal(crlfRes.value, '\r\n');

    const quoteRes = evaluateConstantExpression("'quote: \\' and slash: \\\\'");
    assert.equal(quoteRes.isConstant, true);
    assert.equal(quoteRes.value, "quote: ' and slash: \\");
  });

  it('decodes escapes in template literals without interpolation', async () => {
    const { evaluateConstantExpression } = await import('../packages/compiler/src/index.js');
    const res = evaluateConstantExpression("`line1\\nline2`");
    assert.equal(res.isConstant, true);
    assert.equal(res.value, 'line1\nline2');
  });
});




