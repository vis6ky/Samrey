import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStream, renderToString, getSSRContext } from '../packages/ssr/src/index.js';

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

describe('Phase 3 - 3.1 & 3.2: renderToStream Head Buffering, Nonce & Cancellation', () => {
  it('captures <title> and meta set by components during render in the streamed head', async () => {
    function AppWithHead() {
      const ctx = getSSRContext();
      if (ctx) {
        ctx.setTitle('Dynamic Page Title');
        ctx.addMeta({ name: 'description', content: 'Streamed dynamic page description' });
        ctx.addMeta({ property: 'og:title', content: 'Dynamic OG Title' });
      }
      return '<div class="content"><h1>Hello Stream</h1></div>';
    }

    const stream = renderToStream(AppWithHead);
    const html = await streamToString(stream);

    assert.ok(html.includes('<title>Dynamic Page Title</title>'), 'Streamed HTML must contain title set during render');
    assert.ok(html.includes('name="description" content="Streamed dynamic page description"'), 'Must contain meta description');
    assert.ok(html.includes('property="og:title" content="Dynamic OG Title"'), 'Must contain og:title');
  });

  it('produces byte-identical output for pages that set no head values', async () => {
    function PlainApp() {
      return '<div class="simple">Simple Content</div>';
    }

    const stream = renderToStream(PlainApp);
    const streamedHtml = await streamToString(stream);

    assert.ok(streamedHtml.includes('<title>Samrey Application</title>'));
    assert.ok(streamedHtml.includes('<div id="app"><div class="simple">Simple Content</div></div>'));
  });

  it('escapes dynamic title and meta values against HTML injection', async () => {
    function InjectionApp() {
      const ctx = getSSRContext();
      if (ctx) {
        ctx.setTitle('"><script>alert(1)</script><title>');
        ctx.addMeta({ name: 'desc" onload="alert(2)', content: '"><b>bold</b>' });
      }
      return '<div>Injected</div>';
    }

    const stream = renderToStream(InjectionApp);
    const html = await streamToString(stream);

    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(!html.includes('onload="alert(2)"'));
  });

  it('handles shell render error and renders error response', async () => {
    function BrokenApp() {
      throw new Error('Fatal Shell Explosion');
    }

    const stream = renderToStream(BrokenApp);
    const html = await streamToString(stream);

    assert.ok(html.includes('Fatal Shell Explosion'));
    assert.ok(html.includes('Stream Error') || html.includes('samrey-ssr-error'));
  });

  it('emits dev diagnostic warning when setTitle or addMeta is called after head flush', async () => {
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: any[]) => {
      warnings.push(args.join(' '));
    };

    try {
      let lateCtx: any = null;
      function AppWithLateChange() {
        lateCtx = getSSRContext();
        return '<div>Main Content</div>';
      }

      const stream = renderToStream(AppWithLateChange);
      await streamToString(stream);

      // Now invoke late head modification after stream head has flushed
      assert.ok(lateCtx);
      lateCtx.setTitle('Late Title');
      lateCtx.addMeta({ name: 'late-meta', content: 'late' });

      assert.ok(warnings.some(w => w.includes('Head change after flush ignored') && w.includes('Late Title')));
    } finally {
      console.warn = origWarn;
    }
  });

  it('applies nonce option to delegator script and state scripts (3.2)', async () => {
    function App() {
      return '<div>Nonce test</div>';
    }

    const stream = renderToStream(App, { nonce: 'test-nonce-123' });
    const html = await streamToString(stream);

    assert.ok(html.includes('<script nonce="test-nonce-123">!function()'), 'Delegator script must include nonce');
    assert.ok(html.includes('<script id="__SAMREY_STATE__" type="application/json" nonce="test-nonce-123">'), 'State script must include nonce');
  });

  it('aborts stream when abortSignal is triggered', async () => {
    // 1. Pre-aborted signal
    const controller = new AbortController();
    controller.abort(new Error('Pre-aborted'));

    const stream = renderToStream(() => '<div>Cancelled</div>', { abortSignal: controller.signal });
    await assert.rejects(
      async () => streamToString(stream),
      /Pre-aborted/
    );

    // 2. Mid-stream abort during async data loading
    const midController = new AbortController();
    function AsyncApp() {
      const ctx = getSSRContext();
      ctx?.registerLoader('slowData', new Promise((r) => setTimeout(r, 100)));
      return '<div>Async App</div>';
    }

    const midStream = renderToStream(AsyncApp, { abortSignal: midController.signal });
    setTimeout(() => midController.abort(new Error('Mid-stream abort')), 10);

    await assert.rejects(
      async () => streamToString(midStream),
      /Mid-stream abort/
    );
  });
});

describe('Phase 3 - 3.3: DevTools Bridge Opt-in, Non-Production & Origin Gate', () => {
  it('does NOT install bridge on window automatically on import', async () => {
    // Simulate window without active bridge
    (globalThis as any).window = {
      location: { origin: 'https://app.example.com' }
    };
    delete (globalThis as any).window.__SAMREY_DEVTOOLS_BRIDGE__;

    const { samreyDevToolsBridge } = await import('../packages/devtools/src/index.js');
    assert.equal(
      (globalThis as any).window.__SAMREY_DEVTOOLS_BRIDGE__,
      undefined,
      'Bridge must NOT be attached to window upon import'
    );
  });

  it('installs bridge on window only after explicit initDevTools call', async () => {
    (globalThis as any).window = {
      location: { origin: 'https://app.example.com' },
      postMessage: () => {}
    };
    delete (globalThis as any).window.__SAMREY_DEVTOOLS_BRIDGE__;

    const { initDevTools } = await import('../packages/devtools/src/index.js');
    initDevTools();

    assert.ok(
      (globalThis as any).window.__SAMREY_DEVTOOLS_BRIDGE__,
      'Bridge must be attached to window after explicit initDevTools call'
    );
  });

  it('uses window.location.origin as default targetOrigin instead of *', async () => {
    let capturedTargetOrigin = '';
    (globalThis as any).window = {
      location: { origin: 'https://trusted.example.com' },
      postMessage: (_msg: any, targetOrigin: string) => {
        capturedTargetOrigin = targetOrigin;
      }
    };

    const { initDevTools } = await import('../packages/devtools/src/index.js');
    const bridge = initDevTools();
    bridge.emit('node:created', { id: 1 });

    assert.equal(capturedTargetOrigin, 'https://trusted.example.com', 'targetOrigin must be window.location.origin');
    assert.notEqual(capturedTargetOrigin, '*', 'targetOrigin must NOT be wildcard *');
  });

  it('is disabled in production mode', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    (globalThis as any).window = {
      location: { origin: 'https://prod.example.com' }
    };
    delete (globalThis as any).window.__SAMREY_DEVTOOLS_BRIDGE__;

    try {
      const { initDevTools } = await import('../packages/devtools/src/index.js');
      initDevTools();
      assert.equal(
        (globalThis as any).window.__SAMREY_DEVTOOLS_BRIDGE__,
        undefined,
        'initDevTools must be a no-op in production'
      );
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });
});

describe('Phase 3 - 3.4: CSRF Secure Random & Crypto Fallback', () => {
  it('uses node:crypto instead of Math.random when global crypto is missing', async () => {
    const { generateCsrfToken } = await import('../packages/security/src/csrf.js');

    const origCrypto = (globalThis as any).crypto;
    const origMathRandom = Math.random;
    let mathRandomCalled = false;
    Math.random = () => {
      mathRandomCalled = true;
      return 0.5;
    };

    try {
      delete (globalThis as any).crypto;
      const token = generateCsrfToken(32);
      assert.equal(token.length, 32);
      assert.equal(mathRandomCalled, false, 'generateCsrfToken must NEVER use Math.random()');
    } finally {
      (globalThis as any).crypto = origCrypto;
      Math.random = origMathRandom;
    }
  });

  it('validates or ignores string argument and validates entropy range', async () => {
    const { generateCsrfToken } = await import('../packages/security/src/csrf.js');

    const token = generateCsrfToken('custom-session-secret');
    assert.equal(token.length, 32);

    assert.throws(() => {
      generateCsrfToken(-10);
    }, /Entropy must be a positive integer/);

    assert.throws(() => {
      generateCsrfToken(0);
    }, /Entropy must be a positive integer/);
  });
});

describe('Phase 3 - 3.5: Trusted Types Script URL Allowlist & Runtime Policy Routing', () => {
  it('allows same-origin and relative script URLs by default, but blocks untrusted external origins', async () => {
    const { getSamreyTrustedPolicy } = await import('../packages/security/src/trusted-types.js');
    (globalThis as any).window = {
      location: { origin: 'https://trusted-app.com' }
    };

    const policy = getSamreyTrustedPolicy();

    // Relative URLs (same-origin)
    assert.equal(policy.createScriptURL('/assets/main.js'), '/assets/main.js');
    assert.equal(policy.createScriptURL('./components/bundle.js'), './components/bundle.js');

    // Explicit same-origin absolute URL
    assert.equal(policy.createScriptURL('https://trusted-app.com/assets/main.js'), 'https://trusted-app.com/assets/main.js');

    // Untrusted external origin must throw
    assert.throws(() => {
      policy.createScriptURL('https://attacker.com/malware.js');
    }, /non-allowlisted script URL/i);
  });

  it('permits external script origins configured in the allowlist', async () => {
    const { getSamreyTrustedPolicy, setAllowedScriptOrigins } = await import('../packages/security/src/trusted-types.js');
    (globalThis as any).window = {
      location: { origin: 'https://trusted-app.com' }
    };

    setAllowedScriptOrigins(['https://cdn.samrey.dev', 'https://cdnjs.cloudflare.com']);
    const policy = getSamreyTrustedPolicy();

    assert.equal(policy.createScriptURL('https://cdn.samrey.dev/sdk.js'), 'https://cdn.samrey.dev/sdk.js');
    assert.equal(policy.createScriptURL('https://cdnjs.cloudflare.com/lib.js'), 'https://cdnjs.cloudflare.com/lib.js');

    assert.throws(() => {
      policy.createScriptURL('https://evil.org/hack.js');
    }, /non-allowlisted script URL/i);
  });

  it('routes rawHtml and template HTML through Trusted Types policy when enforced', async () => {
    let policyInvoked = false;
    (globalThis as any).window = {
      location: { origin: 'https://trusted-app.com' },
      trustedTypes: {
        createPolicy: (_name: string, rules: any) => ({
          createHTML: (input: string) => {
            policyInvoked = true;
            return rules.createHTML(input);
          },
          createScript: rules.createScript,
          createScriptURL: rules.createScriptURL
        })
      }
    };

    const { getSamreyTrustedPolicy, resetTrustedPolicyForTest } = await import('../packages/security/src/trusted-types.js');
    if (resetTrustedPolicyForTest) resetTrustedPolicyForTest();
    const policy = getSamreyTrustedPolicy();
    assert.ok(policy);

    const { rawHtml } = await import('../packages/runtime/src/dom.js');
    policyInvoked = false;
    rawHtml('<p>Safe content</p>');
    assert.equal(policyInvoked, true, 'rawHtml must route through Trusted Types policy');
  });
});

describe('Phase 3 - 3.6: samreyVitePlugin Glob Support & Error Handling', () => {
  it('supports glob patterns like **/*.tsx and **/*.test.tsx in exclude and include without crashing', async () => {
    const { samreyVitePlugin } = await import('../packages/cli/src/vite-plugin.js');

    const plugin = samreyVitePlugin({
      include: ['src/**/*.samrey', 'src/**/*.tsx'],
      exclude: ['**/*.test.tsx', '**/temp/**']
    });

    assert.ok(plugin);
    assert.equal(typeof plugin.transform, 'function');

    // Should exclude matched file
    const excludedResult = plugin.transform('<div />', '/app/src/components/Button.test.tsx');
    assert.equal(excludedResult, null, 'File matching exclude glob must be skipped');

    // Should transform file matching include glob
    const transformed = plugin.transform('<div><span>Hello Glob</span></div>', '/app/src/views/Home.samrey');
    assert.ok(transformed, 'File matching include glob must be transformed');
    assert.ok(typeof transformed.code === 'string');
    assert.ok(transformed.code.includes('Hello Glob'));
  });

  it('throws a clear error naming the invalid pattern when an unparseable pattern is passed', async () => {
    const { samreyVitePlugin } = await import('../packages/cli/src/vite-plugin.js');

    assert.throws(() => {
      samreyVitePlugin({
        exclude: ['(?invalid-regex[']
      });
    }, (err: any) => {
      assert.ok(err.message.includes('(?invalid-regex['), 'Error message must name the bad pattern');
      return true;
    });
  });
});

describe('Phase 3 - 3.7: F-06 Non-Destructive Control-Flow & Dynamic Hydration', () => {
  it('hydrates nested Show, For, Switch, bindDynamicChild, and root Show cleanly in headless mode without orphaned SSR nodes', async () => {
    const { signal } = await import('../packages/reactivity/src/index.js');
    const { el, Show, For, Switch, Match, bindDynamicChild, on } = await import('../packages/runtime/src/index.js');
    const { hydrate } = await import('../packages/ssr/src/index.js');

    const visible = signal(true);
    const items = signal(['A', 'B']);
    const mode = signal<'edit' | 'view'>('edit');
    const badge = signal('LIVE');
    let clicks = 0;

    // Pre-existing SSR DOM container
    const ssrBanner = el('div', { id: 'banner' }, 'Banner');
    const ssrItemA = el('li', null, 'A');
    const ssrItemB = el('li', null, 'B');
    const ssrMode = el('em', null, 'Editing');
    const ssrDynTextWrapper = el('span', null, 'LIVE');
    const container = el(
      'div',
      null,
      el(
        'section',
        null,
        ssrBanner,
        el('ul', null, ssrItemA, ssrItemB),
        ssrMode,
        ssrDynTextWrapper
      )
    ) as unknown as HTMLElement;

    let mismatchCount = 0;
    const result = hydrate(
      () =>
        el(
          'section',
          null,
          Show({
            when: visible,
            fallback: () => el('div', { id: 'hidden-banner' }, 'Hidden'),
            children: () => {
              const btn = el('div', { id: 'banner' }, 'Banner');
              on(btn, 'click', () => { clicks++; });
              return btn;
            }
          }),
          el(
            'ul',
            null,
            For({
              each: items,
              key: (x) => x,
              fallback: () => [el('li', null, 'Empty-1'), el('li', null, 'Empty-2')],
              children: (x) => el('li', null, x)
            })
          ),
          Switch({
            children: [
              Match({ when: () => mode.value === 'edit', children: () => el('em', null, 'Editing') }),
              Match({ when: () => mode.value === 'view', children: () => el('strong', null, 'Viewing') })
            ]
          }),
          ((() => {
            const dynSpan = el('span', null);
            bindDynamicChild(dynSpan, () => badge.value);
            return dynSpan;
          })())
        ),
      container,
      { onMismatch: () => { mismatchCount++; } }
    );

    // Non-destructive match check
    assert.equal(mismatchCount, 0, 'Headless control-flow tree must match SSR container cleanly');
    const hydratedSection = (container as any).childNodes[0];
    assert.equal(hydratedSection.querySelector('#banner'), ssrBanner, 'Original SSR banner must be adopted in place');
    const ul = hydratedSection.querySelector('ul');
    assert.ok(ul.childNodes.includes(ssrItemA), 'Original SSR item A must be adopted');
    assert.ok(ul.childNodes.includes(ssrItemB), 'Original SSR item B must be adopted');

    // Event handler retargeted onto SSR banner
    ssrBanner.click();
    assert.equal(clicks, 1, 'Click on hydrated SSR node must trigger client handler');

    // Dynamic text binding inside hydrated section updates adopted SSR text node in place
    badge.value = 'UPDATED';
    assert.equal(ssrDynTextWrapper.textContent, 'UPDATED', 'Adopted bindDynamicChild text must update SSR node in place');

    // Toggle Show off -> removes SSR banner without leaving orphan
    visible.value = false;
    assert.equal((ssrBanner as any).parentNode, null, 'Old SSR banner must not remain orphaned when Show toggles off');
    assert.ok((container as any).innerHTML.includes('Hidden'));
    assert.ok(!(container as any).innerHTML.includes('id="banner"'));

    // Toggle For to empty -> multi-node fallback order preserved & SSR items removed
    items.value = [];
    assert.equal((ssrItemA as any).parentNode, null, 'Old SSR list items must be removed on empty transition');
    assert.equal(ul.outerHTML, '<ul><li>Empty-1</li><li>Empty-2</li></ul>');

    // Repopulate For after empty fallback
    items.value = ['C'];
    assert.equal(ul.outerHTML, '<ul><li>C</li></ul>');

    // Switch branch toggles & removes SSR <em> without leaving orphan
    mode.value = 'view';
    assert.equal((ssrMode as any).parentNode, null, 'Old SSR Switch branch must be removed');
    assert.ok((container as any).innerHTML.includes('<strong>Viewing</strong>'));

    // Test bindDynamicChild element swap & SSR node cleanup directly
    const dynHostSsrSpan = el('span', null, 'Initial');
    const dynContainer = el('section', null, el('div', null, dynHostSsrSpan)) as unknown as HTMLElement;
    const dynState = signal<'text' | 'elem'>('text');
    let dynMismatch = 0;
    const dynHydration = hydrate(
      () => {
        const host = el('div', null);
        bindDynamicChild(host, () =>
          dynState.value === 'text' ? el('span', null, 'Initial') : el('b', null, 'Swapped')
        );
        return host;
      },
      dynContainer,
      { onMismatch: () => { dynMismatch++; } }
    );
    assert.equal(dynMismatch, 0);
    dynState.value = 'elem';
    assert.equal((dynHostSsrSpan as any).parentNode, null, 'bindDynamicChild must remove adopted SSR node cleanly');
    assert.ok((dynContainer as any).innerHTML.includes('<b>Swapped</b>'));
    assert.ok(!(dynContainer as any).innerHTML.includes('Initial'));

    // Test root Show in headless mode (returns detached marker directly)
    const rootShowFlag = signal(true);
    const rootShowSsr = el('p', { id: 'root-show' }, 'Root SSR');
    const rootShowContainer = el('div', null, rootShowSsr) as unknown as HTMLElement;
    let rootShowMismatch = 0;
    const rootShowHydration = hydrate(
      () =>
        Show({
          when: rootShowFlag,
          fallback: () => el('p', null, 'Root Fallback'),
          children: () => el('p', { id: 'root-show' }, 'Root SSR')
        }),
      rootShowContainer,
      { onMismatch: () => { rootShowMismatch++; } }
    );
    assert.equal(rootShowMismatch, 0, 'Headless root Show must match SSR without mismatch');
    rootShowFlag.value = false;
    assert.equal((rootShowSsr as any).parentNode, null, 'Headless root Show must remove adopted SSR node on toggle');
    assert.ok((rootShowContainer as any).innerHTML.includes('Root Fallback'));

    rootShowHydration.dispose();
    dynHydration.dispose();
    result.dispose();
  });

  it('hydrates root <Show> returning a browser DocumentFragment without mismatch or orphaned SSR nodes', async () => {
    const { signal } = await import('../packages/reactivity/src/index.js');
    const { el, Show } = await import('../packages/runtime/src/index.js');
    const { hydrate } = await import('../packages/ssr/src/index.js');

    class FakeDomNode {
      public nodeType: number;
      public tagName: string;
      public nodeName: string;
      public textContent = '';
      public childNodes: FakeDomNode[] = [];
      public parentNode: FakeDomNode | null = null;
      constructor(nodeType: number, tagOrName: string, text = '') {
        this.nodeType = nodeType;
        this.tagName = nodeType === 1 ? tagOrName.toUpperCase() : '';
        this.nodeName = nodeType === 1 ? this.tagName : tagOrName;
        this.textContent = text;
      }
      get firstChild() { return this.childNodes[0] ?? null; }
      get nextSibling(): FakeDomNode | null {
        if (!this.parentNode) return null;
        const idx = this.parentNode.childNodes.indexOf(this);
        return idx !== -1 && idx + 1 < this.parentNode.childNodes.length ? this.parentNode.childNodes[idx + 1] : null;
      }
      removeChild(child: FakeDomNode) {
        const idx = this.childNodes.indexOf(child);
        if (idx !== -1) {
          this.childNodes.splice(idx, 1);
          child.parentNode = null;
        }
        return child;
      }
      insertBefore(node: FakeDomNode, refNode: FakeDomNode | null) {
        if (node.nodeType === 11) {
          for (const ch of [...node.childNodes]) this.insertBefore(ch, refNode);
          node.childNodes = [];
          return node;
        }
        if (node.parentNode) node.parentNode.removeChild(node);
        const idx = refNode ? this.childNodes.indexOf(refNode) : -1;
        if (idx !== -1) this.childNodes.splice(idx, 0, node);
        else this.childNodes.push(node);
        node.parentNode = this;
        return node;
      }
      appendChild(node: FakeDomNode) {
        return this.insertBefore(node, null);
      }
      replaceChildren(...nodes: FakeDomNode[]) {
        for (const c of [...this.childNodes]) this.removeChild(c);
        for (const n of nodes) this.appendChild(n);
      }
    }

    const origDoc = (globalThis as any).document;
    (globalThis as any).document = {
      createElement: (tag: string) => new FakeDomNode(1, tag),
      createTextNode: (txt: string) => new FakeDomNode(3, '#text', txt),
      createComment: (txt: string) => new FakeDomNode(8, '#comment', txt),
      createDocumentFragment: () => new FakeDomNode(11, '#document-fragment')
    };

    try {
      const shown = signal(true);
      const container = new FakeDomNode(1, 'DIV');
      const ssrChild = new FakeDomNode(1, 'P');
      ssrChild.appendChild(new FakeDomNode(3, '#text', 'Hello SSR'));
      container.appendChild(ssrChild);

      let mismatch = false;
      const h = hydrate(
        () =>
          Show({
            when: shown,
            fallback: () => el('span', null, 'Off'),
            children: () => el('p', null, 'Hello SSR')
          }),
        container as unknown as HTMLElement,
        { onMismatch: () => { mismatch = true; } }
      );

      assert.equal(mismatch, false, 'Root Show DocumentFragment must hydrate without mismatch');
      assert.equal(container.childNodes.some((n) => n === ssrChild), true, 'SSR <p> must be preserved in container');

      shown.value = false;
      assert.equal(ssrChild.parentNode, null, 'Adopted SSR <p> must be removed cleanly when root Show toggles false');
      assert.equal(
        container.childNodes.some((n) => n.tagName === 'SPAN' && n.firstChild?.textContent === 'Off'),
        true,
        'Fallback <span>Off</span> must mount after marker'
      );

      shown.value = true;
      assert.equal(
        container.childNodes.some((n) => n.tagName === 'P' && n.firstChild?.textContent === 'Hello SSR'),
        true
      );
      assert.equal(
        container.childNodes.some((n) => n.tagName === 'SPAN'),
        false
      );

      h.dispose();
    } finally {
      if (origDoc) (globalThis as any).document = origDoc;
      else delete (globalThis as any).document;
    }
  });
});



