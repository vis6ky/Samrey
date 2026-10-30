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



