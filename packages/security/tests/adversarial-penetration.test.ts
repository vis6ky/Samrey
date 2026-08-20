import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compileTemplate } from '@aether/compiler';
import { bindAttr, bindText } from '@aether/runtime';
import { signal } from '@aether/reactivity';
import { createRouter } from '@aether/router';
import { serializeStateForHydration, deserializeHydrationState, stripSecrets } from '@aether/ssr';
import { aetherDevToolsBridge } from '@aether/devtools';
import { runCreateCommand } from '@aether/cli/src/commands/create.js';
import { runGenerateCommand } from '@aether/cli/src/commands/generate.js';
import { createForm } from '@aether/forms';
import { 
  sanitizeUri, 
  sanitizeRedirectUri, 
  sanitizeCssStyle, 
  escapeForScriptPayload,
  verifyCsrfToken,
  generateCsrfToken
} from '../src/index.ts';

describe('Aether Adversarial Security & Penetration Testing Suite', () => {
  describe('Vulnerability 1: Compiler Constant-Folding XSS & Attribute Breakout', () => {
    it('properly escapes constant-folded HTML strings in text interpolations', () => {
      const template = '<div>{"<script>alert(1)</script>"}</div>';
      const result = compileTemplate(template);

      // The static skeleton MUST NOT contain unescaped <script> tag
      assert.ok(!result.templates[0].staticHtml.includes('<script>'));
      assert.ok(result.templates[0].staticHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    });

    it('properly escapes constant-folded strings in attribute values against quote breakout', () => {
      const template = '<input value={"\\" onfocus=\\"alert(1)"} />';
      const result = compileTemplate(template);

      // Static skeleton MUST NOT contain unescaped attribute quote breakout
      assert.ok(!result.templates[0].staticHtml.includes('onfocus="alert(1)"'));
      assert.ok(result.templates[0].staticHtml.includes('&quot; onfocus=&quot;alert(1)'));
    });

    it('sanitizes constant-folded URI attributes against javascript: scheme', () => {
      const template = '<a href={"javascript:alert(1)"}>Click</a>';
      const result = compileTemplate(template);

      assert.ok(result.templates[0].staticHtml.includes('href="about:blank"'));
    });
  });

  describe('Vulnerability 2: Runtime Dynamic Attribute & URI Injection', () => {
    it('sanitizes href, src, action, formaction, and xlink:href dynamically', () => {
      const dummyElem = {
        attrs: {} as Record<string, string>,
        setAttribute(name: string, val: string) { this.attrs[name] = val; },
        removeAttribute(name: string) { delete this.attrs[name]; }
      } as unknown as Element;

      const uriSignal = signal('javascript:alert(1)');

      bindAttr(dummyElem, 'href', () => uriSignal.value);
      assert.equal((dummyElem as any).attrs['href'], 'about:blank');

      bindAttr(dummyElem, 'action', () => uriSignal.value);
      assert.equal((dummyElem as any).attrs['action'], 'about:blank');

      bindAttr(dummyElem, 'formaction', () => uriSignal.value);
      assert.equal((dummyElem as any).attrs['formaction'], 'about:blank');

      bindAttr(dummyElem, 'xlink:href', () => uriSignal.value);
      assert.equal((dummyElem as any).attrs['xlink:href'], 'about:blank');

      // Update to safe URL
      uriSignal.value = 'https://example.com';
      assert.equal((dummyElem as any).attrs['href'], 'https://example.com');
    });

    it('refuses to bind dangerous attribute names like innerHTML and inline event handlers', () => {
      const dummyElem = {
        attrs: {} as Record<string, string>,
        setAttribute(name: string, val: string) { this.attrs[name] = val; },
        removeAttribute(name: string) { delete this.attrs[name]; }
      } as unknown as Element;

      bindAttr(dummyElem, 'innerHTML', () => '<img src=x onerror=alert(1)>');
      assert.equal((dummyElem as any).attrs['innerHTML'], undefined);

      bindAttr(dummyElem, 'onclick', () => 'alert(1)');
      assert.equal((dummyElem as any).attrs['onclick'], undefined);

      bindAttr(dummyElem, 'srcdoc', () => '<script>alert(1)</script>');
      assert.equal((dummyElem as any).attrs['srcdoc'], undefined);
    });

    it('sanitizes dynamic CSS style attributes against script execution', () => {
      const dummyElem = {
        attrs: {} as Record<string, string>,
        setAttribute(name: string, val: string) { this.attrs[name] = val; },
        removeAttribute(name: string) { delete this.attrs[name]; }
      } as unknown as Element;

      const styleSignal = signal('background: url(javascript:alert(1)); color: blue;');
      bindAttr(dummyElem, 'style', () => styleSignal.value);

      assert.ok(!(dummyElem as any).attrs['style'].includes('javascript:'));
      assert.ok((dummyElem as any).attrs['style'].includes('color: blue'));
    });
  });

  describe('Vulnerability 3: Router Open Redirects & Malformed Path DoS', () => {
    it('prevents open redirects to external and protocol-relative domains', () => {
      const router = createRouter([
        { path: '/', component: () => ({}) as any },
        { path: '/profile', component: () => ({}) as any }
      ], '/');

      router.navigate('//evil.com/phishing');
      // Router MUST NOT set currentPath to external / protocol-relative destination
      assert.notEqual(router.currentPath.value, '//evil.com/phishing');
      assert.equal(router.currentPath.value, '/');

      router.navigate('https://attacker.com/malicious');
      assert.equal(router.currentPath.value, '/');

      router.navigate('/profile');
      assert.equal(router.currentPath.value, '/profile');
    });

    it('does not crash when encountering malformed URI encoded route paths', () => {
      const router = createRouter([
        { path: '/user/:id', component: () => ({}) as any }
      ]);

      assert.doesNotThrow(() => {
        const match1 = router.match('/user/%E0%A4%9');
        const match2 = router.match('/user/%ZZ');
        const match3 = router.match('/user/%');
      });
    });
  });

  describe('Vulnerability 4: SSR State Script Breakout & Secret Leakage', () => {
    it('neutralizes </script> tags and line separators in SSR JSON state', () => {
      const payload = {
        injection: '</script><script>alert("pwned")</script>',
        sep: '\u2028\u2029'
      };

      const html = serializeStateForHydration(payload);
      assert.ok(!html.includes('</script><script>'));
      assert.ok(html.includes('\\u003c/script\\u003e'));
      assert.ok(html.includes('\\u2028'));
      assert.ok(html.includes('\\u2029'));
    });

    it('strips all sensitive credentials (passwords, tokens, API keys, connection strings)', () => {
      const serverState = {
        user: {
          username: 'admin',
          passwordHash: '$2b$12$e8wJ...',
          apiKey: 'AIzaSyD-SecretKey',
          jwtToken: 'eyJhbGciOiJIUzI1Ni...',
          bearerAuth: 'Bearer 12345',
          database_url: 'postgres://root:secret@db:5432/main'
        },
        publicConfig: {
          appName: 'Aether App'
        }
      };

      const clean = stripSecrets(serverState);
      assert.equal((clean.user as any).username, 'admin');
      assert.equal((clean.user as any).passwordHash, undefined);
      assert.equal((clean.user as any).apiKey, undefined);
      assert.equal((clean.user as any).jwtToken, undefined);
      assert.equal((clean.user as any).bearerAuth, undefined);
      assert.equal((clean.user as any).database_url, undefined);
      assert.equal(clean.publicConfig.appName, 'Aether App');
    });
  });

  describe('Vulnerability 5: Hydration DOM Clobbering Defense', () => {
    it('safely handles shadowed/clobbered script elements in deserialization', () => {
      // Mock clobbered element
      const origGetElementById = typeof document !== 'undefined' ? document.getElementById : null;
      try {
        const mockForm = {
          nodeName: 'FORM',
          textContent: '{"clobbered": true}'
        };
        (globalThis as any).document = {
          getElementById: () => mockForm
        };

        const result = deserializeHydrationState({ id: '__AETHER_STATE__', fallback: { safe: true } });
        // Because nodeName is FORM not SCRIPT, it must return the safe fallback
        assert.deepEqual(result, { safe: true });
      } finally {
        if (!origGetElementById) {
          delete (globalThis as any).document;
        }
      }
    });
  });

  describe('Vulnerability 6: DevTools Origin & Secret Redaction', () => {
    it('redacts sensitive keys before emitting DevTools events', () => {
      let capturedEvent: any = null;
      const unsubscribe = aetherDevToolsBridge.subscribe((ev) => {
        if (ev.type === 'form:submit') {
          capturedEvent = ev;
        }
      });

      aetherDevToolsBridge.emit('form:submit', {
        username: 'alice',
        password: 'SuperSecretPassword123!',
        token: 'secret-token-abc'
      });

      unsubscribe();

      assert.ok(capturedEvent !== null);
      assert.equal(capturedEvent.payload.username, 'alice');
      assert.equal(capturedEvent.payload.password, '[REDACTED]');
      assert.equal(capturedEvent.payload.token, '[REDACTED]');
    });
  });

  describe('Vulnerability 7: CLI Path Traversal & Arbitrary File Overwrite', () => {
    it('blocks directory traversal attempts in project creation', async () => {
      const traversalNames = [
        '../../evil',
        '/etc/passwd',
        '..\\..\\evil',
        'sub/../../evil'
      ];

      for (const name of traversalNames) {
        const res = await runCreateCommand({ name, dryRun: true });
        assert.equal(res.success, false, `Did not block traversal name: ${name}`);
        assert.ok(res.message.includes('forbidden') || res.message.includes('Invalid'));
      }
    });

    it('blocks directory traversal attempts in artifact generation', async () => {
      const res = await runGenerateCommand({
        type: 'component',
        name: '../../MaliciousComponent',
        dryRun: true
      });

      assert.equal(res.success, false);
      assert.ok(res.message.includes('Path traversal characters'));
    });
  });

  describe('Vulnerability 8: CSRF Timing-Safe Token Verification', () => {
    it('generates secure entropy tokens and verifies them safely', () => {
      const tokenA = generateCsrfToken(32);
      const tokenB = generateCsrfToken(32);

      assert.notEqual(tokenA, tokenB);
      assert.equal(verifyCsrfToken(tokenA, tokenA), true);
      assert.equal(verifyCsrfToken(tokenA, tokenB), false);
      assert.equal(verifyCsrfToken(tokenA.slice(0, 10), tokenA), false);
      assert.equal(verifyCsrfToken(undefined, tokenA), false);
    });
  });

  describe('Vulnerability 9: Form Prototype Pollution Defense', () => {
    it('safely constructs forms without prototype pollution vulnerability', () => {
      const maliciousInitial = {
        username: 'alice',
        __proto__: { polluted: true },
        constructor: { evil: true }
      } as any;

      const form = createForm({
        initialValues: maliciousInitial,
        onSubmit: () => {}
      });

      assert.equal((Object.prototype as any).polluted, undefined);
      assert.ok(form.fields.username !== undefined);
      assert.equal(form.fields['__proto__' as any], undefined);
    });
  });
});
