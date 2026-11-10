import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  template,
  bindText,
  bindEvent,
  bindAttr
} from '../src/index.js';
import { signal, createRoot } from '@samrey/reactivity';

describe('Samrey 2.1.0 — Template References (root.refs & root.ref())', () => {
  it('1. Basic reference collection & all 4 access patterns (headless/SSR)', () => {
    const view = template(`
      <form ref="form">
        <input ref="email" />
        <input ref="password" type="password" />
        <button ref="submit">Login</button>
        <p ref="message"></p>
      </form>
    `);

    const root = view.clone();

    // Access Pattern A: Direct reference collection
    const { form, email, password, submit, message } = root.refs;
    assert.ok(form, 'form ref should exist');
    assert.ok(email, 'email ref should exist');
    assert.ok(password, 'password ref should exist');
    assert.ok(submit, 'submit ref should exist');
    assert.ok(message, 'message ref should exist');

    // Access Pattern B: Destructure the refs collection
    const { refs } = root;
    assert.strictEqual(refs.form, form);
    assert.strictEqual(refs.email, email);
    assert.strictEqual(refs.password, password);
    assert.strictEqual(refs.submit, submit);
    assert.strictEqual(refs.message, message);

    // Access Pattern C: Direct property access
    assert.strictEqual(root.refs.email, email);
    assert.strictEqual(root.refs.submit, submit);
    assert.strictEqual(root.refs.message, message);

    // Access Pattern D: Dynamic reference access
    const emailInput = root.ref('email');
    const passwordInput = root.ref('password');
    assert.strictEqual(emailInput, email);
    assert.strictEqual(passwordInput, password);

    // All four access patterns return the exact same underlying DOM element
    assert.strictEqual(root.ref('email'), root.refs.email);
    assert.strictEqual(root.ref('submit'), root.refs.submit);
  });

  it('2. Multiple independent clones have separate DOM elements and reference registries', () => {
    const view = template(`
      <form ref="form">
        <input ref="email" />
        <button ref="submit">Submit</button>
      </form>
    `);

    const first = view.clone();
    const second = view.clone();

    // Independent instances
    assert.notStrictEqual(first, second, 'Clones must be distinct root objects');
    assert.notStrictEqual(first.refs, second.refs, 'Clone registries must be distinct objects');
    assert.notStrictEqual(first.refs.email, second.refs.email, 'Cloned elements must be distinct');
    assert.notStrictEqual(first.refs.submit, second.refs.submit, 'Cloned elements must be distinct');

    // Internal stability per clone
    assert.strictEqual(first.refs, first.refs, 'Repeated access to first.refs must return stable object');
    assert.strictEqual(second.refs, second.refs, 'Repeated access to second.refs must return stable object');
    assert.strictEqual(first.ref('email'), first.refs.email, 'first.ref() must return first.refs.email');
    assert.strictEqual(second.ref('email'), second.refs.email, 'second.ref() must return second.refs.email');
  });

  it('3. Callable invocation view() produces the same reference capability as view.clone()', () => {
    const view = template(`
      <div ref="container">
        <span ref="text">Hello</span>
      </div>
    `);

    const rootFromCall = view();
    const rootFromClone = view.clone();

    assert.ok(rootFromCall.refs.container, 'view() result must have refs.container');
    assert.ok(rootFromCall.refs.text, 'view() result must have refs.text');
    assert.strictEqual(rootFromCall.ref('text'), rootFromCall.refs.text);

    assert.ok(rootFromClone.refs.container, 'view.clone() result must have refs.container');
    assert.strictEqual(rootFromClone.ref('text'), rootFromClone.refs.text);
  });

  it('4. Dynamic reference lookup returns undefined for unknown reference names', () => {
    const root = template(`
      <div ref="box">
        <button ref="btn">Click</button>
      </div>
    `).clone();

    assert.strictEqual(root.ref('unknown'), undefined, 'Dynamic lookup of unknown ref returns undefined');
    assert.strictEqual((root.refs as any).unknown, undefined, 'Property lookup of unknown ref returns undefined');
  });

  it('5. Duplicate reference names emit a diagnostic warning and deterministically update registry', () => {
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: any[]) => warnings.push(args.join(' '));

    try {
      const root = template(`
        <div>
          <input ref="item" class="first" />
          <input ref="item" class="second" />
        </div>
      `).clone();

      assert.ok(
        warnings.some((w) => w.includes('Duplicate template ref "item"')),
        'Warning must be issued for duplicate ref name'
      );
      assert.ok(root.refs.item !== undefined, 'Ref item must be registered');
    } finally {
      console.warn = origWarn;
    }
  });

  it('6. Invalid reference identifiers emit a diagnostic warning', () => {
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: any[]) => warnings.push(args.join(' '));

    try {
      template(`
        <div>
          <input ref="123-invalid" />
          <button ref="has space">Test</button>
        </div>
      `).clone();

      assert.ok(
        warnings.some((w) => w.includes('Invalid template ref identifier')),
        'Warning must be issued for invalid ref identifier'
      );
    } finally {
      console.warn = origWarn;
    }
  });

  it('7. Deeply nested references in supported DOM hierarchy', () => {
    const root = template(`
      <div ref="rootDiv" class="wrapper">
        <header ref="header">
          <nav ref="nav">
            <ul ref="navList">
              <li ref="navItem">
                <a ref="navLink" href="/home">Home</a>
              </li>
            </ul>
          </nav>
        </header>
        <main ref="main">
          <section ref="section">
            <article ref="article">
              <p ref="para">Content</p>
            </article>
          </section>
        </main>
      </div>
    `).clone();

    const { rootDiv, header, nav, navList, navItem, navLink, main, section, article, para } = root.refs;
    assert.ok(rootDiv);
    assert.ok(header);
    assert.ok(nav);
    assert.ok(navList);
    assert.ok(navItem);
    assert.ok(navLink);
    assert.ok(main);
    assert.ok(section);
    assert.ok(article);
    assert.ok(para);

    assert.strictEqual(root.ref('para'), para);
    assert.strictEqual(root.ref('navLink'), navLink);
  });

  it('8. Integration with bindText, bindEvent, and bindAttr', () => {
    const statusSig = signal('Initial Status');
    const disabledSig = signal(false);
    let clicked = false;

    const root = template(`
      <form ref="form">
        <button ref="submit">Submit</button>
        <p ref="status"></p>
      </form>
    `).clone();

    const { submit, status } = root.refs;

    // Existing bindings
    bindEvent(submit, 'click', () => {
      clicked = true;
    });
    bindText(status, () => statusSig.value);
    bindAttr(submit, 'disabled', () => disabledSig.value);

    // Verify initial values
    assert.strictEqual(status.textContent, 'Initial Status');
    assert.strictEqual(submit.getAttribute('disabled'), null);

    // Trigger event
    if (typeof submit.dispatchEvent === 'function') {
      const evt = typeof Event !== 'undefined' ? new Event('click') : ({ type: 'click' } as any);
      submit.dispatchEvent(evt);
      assert.strictEqual(clicked, true, 'Click handler must execute');
    }

    // Reactive updates
    statusSig.value = 'Updated Status';
    assert.strictEqual(status.textContent, 'Updated Status');

    disabledSig.value = true;
    assert.ok(submit.getAttribute('disabled') !== null, 'Disabled attribute should be set when true');
  });

  it('9. Cleanup and disposal releases reference metadata', () => {
    let disposeRoot: () => void = () => {};
    let rootRef: any = null;

    createRoot((dispose) => {
      disposeRoot = dispose;
      const root = template(`
        <form ref="form">
          <input ref="email" />
          <button ref="submit">Login</button>
        </form>
      `).clone();

      rootRef = root;
      assert.ok(root.refs.form);
      assert.ok(root.refs.email);
      assert.ok(root.refs.submit);
    });

    // Reactive root disposal releases references
    disposeRoot();
    assert.strictEqual(Object.keys(rootRef.refs).length, 0, 'References must be released upon scope disposal');
    assert.strictEqual(rootRef.ref('email'), undefined, 'ref() lookup returns undefined after disposal');
  });

  it('10. Explicit manual disposeRefs() releases metadata', () => {
    const root = template(`
      <div ref="wrapper">
        <span ref="text">Text</span>
      </div>
    `).clone();

    assert.ok(root.refs.wrapper);
    assert.ok(root.refs.text);

    root.disposeRefs();
    assert.strictEqual(Object.keys(root.refs).length, 0, 'References must be released on manual disposeRefs()');
    assert.strictEqual(root.ref('text'), undefined);
  });

  it('11. Multi-root template fragments support references cleanly', () => {
    const root = template(`
      <header ref="header">Top</header>
      <main ref="main">Middle</main>
      <footer ref="footer">Bottom</footer>
    `).clone();

    assert.ok(root.refs.header, 'header ref on multi-root');
    assert.ok(root.refs.main, 'main ref on multi-root');
    assert.ok(root.refs.footer, 'footer ref on multi-root');

    assert.strictEqual(root.ref('header'), root.refs.header);
    assert.strictEqual(root.ref('main'), root.refs.main);
    assert.strictEqual(root.ref('footer'), root.refs.footer);
  });

  it('12. Existing templates without ref attributes work with 0 overhead and empty refs object', () => {
    const root = template('<div class="plain"><p>Just plain text</p></div>').clone();
    assert.ok(root.refs, 'refs object exists');
    assert.strictEqual(Object.keys(root.refs).length, 0, 'refs object is empty');
    assert.strictEqual(root.ref('anything'), undefined);
  });

  it('13. Path-based descriptor resolution in simulated DOM environment', () => {
    // Custom simulated DOM element class
    class MockDomNode {
      public nodeType = 1;
      public tagName: string;
      public attributes: Record<string, string> = {};
      public childNodes: MockDomNode[] = [];
      public parentNode: MockDomNode | null = null;
      public content?: MockDomNode;

      constructor(tagName: string) {
        this.tagName = tagName.toUpperCase();
        if (this.tagName === 'TEMPLATE') {
          this.content = new MockDomNode('#document-fragment');
        }
      }

      getAttribute(name: string) {
        return this.attributes[name] ?? null;
      }

      setAttribute(name: string, value: string) {
        this.attributes[name] = value;
      }

      appendChild(child: MockDomNode) {
        child.parentNode = this;
        this.childNodes.push(child);
        return child;
      }

      get firstChild() {
        return this.childNodes[0] ?? null;
      }

      set innerHTML(_val: string) {
        // Build realistic nested hierarchy:
        // <form ref="form">
        //   <input ref="email" />
        //   <button ref="submit">Login</button>
        //   <div class="nested">
        //     <span ref="status">Ready</span>
        //   </div>
        // </form>
        const form = new MockDomNode('FORM');
        form.setAttribute('ref', 'form');

        const input = new MockDomNode('INPUT');
        input.setAttribute('ref', 'email');
        form.appendChild(input);

        const btn = new MockDomNode('BUTTON');
        btn.setAttribute('ref', 'submit');
        form.appendChild(btn);

        const div = new MockDomNode('DIV');
        const span = new MockDomNode('SPAN');
        span.setAttribute('ref', 'status');
        div.appendChild(span);
        form.appendChild(div);

        if (this.content) {
          this.content.childNodes = [form];
        }
      }

      cloneNode(deep?: boolean): MockDomNode {
        const clone = new MockDomNode(this.tagName);
        clone.attributes = { ...this.attributes };
        if (this.content) {
          clone.content = this.content.cloneNode(deep);
        }
        if (deep) {
          clone.childNodes = this.childNodes.map((c) => c.cloneNode(true));
        }
        return clone;
      }
    }

    const origDoc = (globalThis as any).document;
    (globalThis as any).document = {
      createElement(tag: string) {
        return new MockDomNode(tag);
      }
    };

    try {
      const view = template(`
        <form ref="form">
          <input ref="email" />
          <button ref="submit">Login</button>
          <div class="nested">
            <span ref="status">Ready</span>
          </div>
        </form>
      `);

      const root = view.clone();

      assert.strictEqual(root.refs.form, root, 'Root form ref must resolve to root');
      assert.strictEqual(root.refs.email, (root as any).childNodes[0], 'input ref email must resolve via path [0]');
      assert.strictEqual(root.refs.submit, (root as any).childNodes[1], 'button ref submit must resolve via path [1]');
      assert.strictEqual(root.refs.status, (root as any).childNodes[2].childNodes[0], 'span ref status must resolve via path [2, 0]');

      assert.strictEqual(root.ref('email'), root.refs.email);
      assert.strictEqual(root.ref('status'), root.refs.status);
    } finally {
      (globalThis as any).document = origDoc;
    }
  });

  it('14. Inherited property collision defense: unknown names and prototype names consistently return undefined', () => {
    const root = template(`
      <div ref="panel">
        <span ref="label">Label</span>
      </div>
    `).clone();

    // Built-in Object.prototype properties must return undefined, not Object.prototype methods
    assert.strictEqual(root.refs.constructor, undefined, 'root.refs.constructor must be undefined');
    assert.strictEqual(root.refs.toString, undefined, 'root.refs.toString must be undefined');
    assert.strictEqual(root.refs.valueOf, undefined, 'root.refs.valueOf must be undefined');
    assert.strictEqual((root.refs as any).__proto__, undefined, 'root.refs.__proto__ must be undefined');

    assert.strictEqual(root.ref('constructor'), undefined, 'root.ref("constructor") must return undefined');
    assert.strictEqual(root.ref('toString'), undefined, 'root.ref("toString") must return undefined');
    assert.strictEqual(root.ref('valueOf'), undefined, 'root.ref("valueOf") must return undefined');
    assert.strictEqual(root.ref('unknownProp'), undefined, 'root.ref("unknownProp") must return undefined');
  });

  it('15. Robust discovery of whitespace and casing variations in HTML reference attributes', () => {
    const root = template(`
      <form ref = "authForm">
        <input ref = "user" />
        <button REF="submitBtn">Submit</button>
        <p Ref="disclaimer">Terms</p>
      </form>
    `).clone();

    const { authForm, user, submitBtn, disclaimer } = root.refs;
    assert.ok(authForm, 'authForm ref with spaces around = must be discovered');
    assert.ok(user, 'user ref with spaces around = must be discovered');
    assert.ok(submitBtn, 'submitBtn with uppercase REF attribute must be discovered');
    assert.ok(disclaimer, 'disclaimer with mixed-case Ref attribute must be discovered');

    assert.strictEqual(root.ref('user'), user);
    assert.strictEqual(root.ref('submitBtn'), submitBtn);
    assert.strictEqual(root.ref('disclaimer'), disclaimer);
  });

  it('16. Form input access, mutation, and isolation across independent clones', () => {
    const formTemplate = template(`
      <form ref="loginForm">
        <input ref="username" value="" />
        <input ref="rememberMe" type="checkbox" />
        <button ref="submit">Login</button>
      </form>
    `);

    const clone1 = formTemplate.clone();
    const clone2 = formTemplate.clone();

    // Verify registries are strictly independent objects
    assert.notStrictEqual(clone1.refs, clone2.refs, 'Clone 1 and Clone 2 must have independent ref registries');
    assert.notStrictEqual(clone1.refs.username, clone2.refs.username, 'Clone elements must be distinct');

    // Modify form values on clone1
    (clone1.refs.username as any).value = 'alice@example.com';
    (clone1.refs.rememberMe as any).checked = true;

    assert.strictEqual((clone1.refs.username as any).value, 'alice@example.com');
    assert.strictEqual((clone1.refs.rememberMe as any).checked, true);

    // Verify clone2 is completely isolated and unaffected by clone1 modifications
    assert.strictEqual((clone2.refs.username as any).value ?? '', '');
    assert.strictEqual((clone2.refs.rememberMe as any).checked ?? false, false);
  });

  it('17. Real DOM mock template cloning with full binding and event integration', () => {
    // Realistic browser element mock
    class BrowserElement {
      public nodeType = 1;
      public tagName: string;
      public textContent: string = '';
      public attributes: Record<string, string> = {};
      public childNodes: BrowserElement[] = [];
      public parentNode: BrowserElement | null = null;
      public content?: BrowserElement;
      public eventListeners: Record<string, Function[]> = {};
      public value: string = '';
      public checked: boolean = false;

      constructor(tag: string) {
        this.tagName = tag.toUpperCase();
        if (this.tagName === 'TEMPLATE') {
          this.content = new BrowserElement('#document-fragment');
        }
      }

      getAttribute(name: string) {
        return this.attributes[name.toLowerCase()] ?? null;
      }

      setAttribute(name: string, value: string) {
        this.attributes[name.toLowerCase()] = value;
      }

      removeAttribute(name: string) {
        delete this.attributes[name.toLowerCase()];
      }

      hasAttribute(name: string) {
        return name.toLowerCase() in this.attributes;
      }

      appendChild(child: BrowserElement) {
        child.parentNode = this;
        this.childNodes.push(child);
        return child;
      }

      get firstChild() {
        return this.childNodes[0] ?? null;
      }

      addEventListener(event: string, fn: Function) {
        if (!this.eventListeners[event]) this.eventListeners[event] = [];
        this.eventListeners[event].push(fn);
      }

      dispatchEvent(event: { type: string }) {
        const fns = this.eventListeners[event.type] || [];
        for (const fn of fns) fn(event);
        return true;
      }

      cloneNode(deep?: boolean): BrowserElement {
        const el = new BrowserElement(this.tagName);
        el.attributes = { ...this.attributes };
        el.textContent = this.textContent;
        el.value = this.value;
        el.checked = this.checked;
        if (this.content) {
          el.content = this.content.cloneNode(deep);
        }
        if (deep) {
          el.childNodes = this.childNodes.map((c) => {
            const childClone = c.cloneNode(true);
            childClone.parentNode = el;
            return childClone;
          });
        }
        return el;
      }

      set innerHTML(_val: string) {
        // Build nested form hierarchy
        const form = new BrowserElement('FORM');
        form.setAttribute('ref', 'userForm');

        const input = new BrowserElement('INPUT');
        input.setAttribute('ref', 'email');
        input.value = '';
        form.appendChild(input);

        const btn = new BrowserElement('BUTTON');
        btn.setAttribute('ref', 'submitBtn');
        form.appendChild(btn);

        const p = new BrowserElement('P');
        p.setAttribute('ref', 'statusMsg');
        form.appendChild(p);

        if (this.content) {
          this.content.childNodes = [form];
        }
      }
    }

    const origDoc = (globalThis as any).document;
    (globalThis as any).document = {
      createElement(tag: string) {
        return new BrowserElement(tag);
      }
    };

    try {
      const tmpl = template(`
        <form ref="userForm">
          <input ref="email" />
          <button ref="submitBtn">Submit</button>
          <p ref="statusMsg"></p>
        </form>
      `);

      const root = tmpl.clone();
      const { userForm, email, submitBtn, statusMsg } = root.refs;

      assert.strictEqual(userForm, root);
      assert.ok(email);
      assert.ok(submitBtn);
      assert.ok(statusMsg);

      // Mutate form values
      (email as any).value = 'browser-test@samrey.dev';
      assert.strictEqual((email as any).value, 'browser-test@samrey.dev');

      // Bind text and events
      const statusSig = signal('Pending');
      let submitted = false;

      bindText(statusMsg, () => statusSig.value);
      bindEvent(submitBtn, 'click', () => {
        submitted = true;
      });

      assert.strictEqual(statusMsg.textContent, 'Pending');
      statusSig.value = 'Success';
      assert.strictEqual(statusMsg.textContent, 'Success');

      (submitBtn as any).dispatchEvent({ type: 'click' });
      assert.strictEqual(submitted, true, 'Event binding on ref must trigger handler');

      // Clean up refs
      root.disposeRefs();
      assert.strictEqual(Object.keys(root.refs).length, 0);
      assert.strictEqual(root.ref('email'), undefined);
    } finally {
      (globalThis as any).document = origDoc;
    }
  });
});
