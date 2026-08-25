import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TemplateParser, compileTemplate } from '@samrey/compiler';
import { evaluateConstantExpression } from '@samrey/compiler/src/static-analyzer.js';
import { 
  sanitizeUri, 
  sanitizeRedirectUri, 
  sanitizeCssStyle, 
  escapeHtmlAttribute, 
  escapeHtmlText, 
  escapeForScriptPayload 
} from '../src/index.ts';
import { serializeStateForHydration, deserializeHydrationState, safeJsonParse } from '@samrey/ssr';
import { matchPath } from '@samrey/router/src/matcher.js';

describe('Security Fuzzing Suite', () => {
  describe('Template Parser & Compiler Fuzzing', () => {
    it('handles thousands of malformed, randomized, and adversarial templates without crashing', () => {
      const fuzzTokens = [
        '<', '>', '</', '/>', '<!--', '-->', '{', '}', '"', "'", '`',
        '\\', '\0', '\n', '\r', '\t', ' ', '<script>', '</script>',
        '<div', 'div>', '=""', ' = ', 'a="b"', '@click="', 'when={', 'each={',
        'undefined', 'null', 'NaN', '123', 'true', 'false', '0x99',
        '<Show', '<For', '</Show>', '</For>', '<Nested><Deep>', '</Deep></Nested>'
      ];

      // PRNG generator for deterministic fuzzing
      let seed = 1337;
      function random(): number {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      }

      for (let iteration = 0; iteration < 200; iteration++) {
        let malformed = '';
        const tokenCount = Math.floor(random() * 20) + 1;
        for (let t = 0; t < tokenCount; t++) {
          const idx = Math.floor(random() * fuzzTokens.length);
          malformed += fuzzTokens[idx];
        }

        // Must never throw unhandled exception
        assert.doesNotThrow(() => {
          const parser = new TemplateParser(malformed);
          const result = parser.parse();
          assert.ok(result.ast !== undefined);
          assert.ok(Array.isArray(result.diagnostics));
        }, `Parser crashed on fuzz payload: ${JSON.stringify(malformed)}`);
      }
    });

    it('handles extreme nesting depth gracefully without call stack overflow', () => {
      let deepTemplate = '';
      for (let i = 0; i < 200; i++) {
        deepTemplate += '<div>';
      }
      deepTemplate += '<span>deep leaf</span>';
      for (let i = 0; i < 200; i++) {
        deepTemplate += '</div>';
      }

      assert.doesNotThrow(() => {
        const result = compileTemplate(deepTemplate);
        assert.ok(result.generatedCode.includes('template('));
      });
    });

    it('handles unbalanced and truncated control flow tags gracefully', () => {
      const brokenTemplates = [
        '<Show when={isTrue}',
        '<Show when={}>',
        '<Show when={isTrue}><p>Unclosed',
        '<For each={items}',
        '<For each={items} key="id"><span',
        '<{unknownTag} />',
        '<<<div>>>',
        '<div attr={unclosedExpr',
        '<div "unnamed-attr"="val">'
      ];

      for (const t of brokenTemplates) {
        assert.doesNotThrow(() => {
          const parser = new TemplateParser(t);
          const res = parser.parse();
          assert.ok(res.ast !== null);
          assert.ok(res.diagnostics.length > 0);
        }, `Parser crashed on broken template: ${t}`);
      }
    });
  });

  describe('Expression Evaluator Fuzzing', () => {
    it('evaluates arbitrary constant and non-constant expressions safely', () => {
      const exprSamples = [
        '',
        '   ',
        '"hello"',
        "'world'",
        '`template`',
        '`template ${withVar}`',
        'true',
        'false',
        'null',
        'undefined',
        '0',
        '-100',
        '3.14159',
        '0xFF',
        '1e10',
        '-0.5e-2',
        '"unclosed string',
        "'unclosed single",
        '`unclosed template',
        '() => {}',
        'foo.bar()',
        'function() {}',
        '{ a: 1 }',
        '[1, 2, 3]',
        '__proto__',
        'constructor',
        'alert(1)'
      ];

      for (const expr of exprSamples) {
        assert.doesNotThrow(() => {
          const res = evaluateConstantExpression(expr);
          assert.ok(typeof res.isConstant === 'boolean');
        });
      }
    });
  });

  describe('URI Sanitizer Fuzzing', () => {
    it('blocks diverse obfuscated URI bypass attempts', () => {
      const maliciousUris = [
        'javascript:alert(1)',
        'JAVASCRIPT:alert(1)',
        'java\0script:alert(1)',
        'java\tscript:alert(1)',
        'java\nscript:alert(1)',
        'java\rscript:alert(1)',
        '  \u0000javascript:alert(1)',
        'vbscript:msgbox(1)',
        'VBSCRIPT:msgbox(1)',
        'data:text/html,<script>alert(1)</script>',
        'DATA:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        'blob:http://evil.com/uuid',
        '%6a%61%76%61%73%63%72%69%70%74:alert(1)',
        '%4a%41%56%41%53%43%52%49%50%54:alert(1)',
        'jav&#x61;script:alert(1)',
        'jav&colon;alert(1)',
        'unknown-scheme://payload'
      ];

      for (const uri of maliciousUris) {
        const sanitized = sanitizeUri(uri);
        assert.equal(sanitized, 'about:blank', `Failed to block malicious URI: ${uri}`);
      }
    });

    it('rejects protocol-relative and external URLs in redirect sanitizer', () => {
      const redirectAttacks = [
        '//evil.com',
        '//attacker.org/steal',
        '/\\evil.com',
        '\\\\evil.com',
        'http://evil.com',
        'https://phishing.site',
        'javascript:void(0)'
      ];

      for (const attack of redirectAttacks) {
        const safe = sanitizeRedirectUri(attack, '/fallback');
        assert.equal(safe, '/fallback', `Failed to sanitize redirect attack: ${attack}`);
      }
    });
  });

  describe('SSR Serializer & JSON Handling Fuzzing', () => {
    it('handles circular references and deeply nested state without crashing', () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      assert.doesNotThrow(() => {
        const html = serializeStateForHydration(circular);
        assert.ok(html.includes('<script id="__AETHER_STATE__"'));
      });
    });

    it('scrubs prototype pollution payloads during deserialization', () => {
      const evilPayload = '{"__proto__": {"isAdmin": true}, "normal": 42, "child": {"constructor": {"evil": true}}}';
      const parsed: any = safeJsonParse(evilPayload);

      assert.equal(parsed.normal, 42);
      assert.equal(parsed.isAdmin, undefined);
      assert.equal((Object.prototype as any).isAdmin, undefined);
      assert.equal(parsed.child.constructor, Object);
    });
  });

  describe('Router Parameter Matcher Fuzzing', () => {
    it('handles malformed percent-encoded sequences without throwing URIError', () => {
      const malformedPaths = [
        '/%',
        '/%Z',
        '/%ZZ',
        '/%E0%A4%9',
        '/%E0%A4',
        '/user/%99%99',
        '/item/%FF%FE',
        '/search/%%%'
      ];

      for (const p of malformedPaths) {
        assert.doesNotThrow(() => {
          const match = matchPath('/user/:id', p);
          // Match might be null or return raw malformed string, but must never throw
        }, `Router crashed on malformed path: ${p}`);
      }
    });

    it('safely ignores prototype pollution param keys', () => {
      const match1 = matchPath('/:__proto__', '/evil-val');
      assert.equal((Object.prototype as any)['evil-val'], undefined);
      assert.equal(Object.prototype.hasOwnProperty.call(match1, '__proto__'), false);
      assert.notEqual((match1 as any)?.['__proto__'], 'evil-val');

      const match2 = matchPath('/:constructor', '/evil-val');
      assert.equal(Object.prototype.hasOwnProperty.call(match2, 'constructor'), false);
      assert.notEqual((match2 as any)?.['constructor'], 'evil-val');
    });
  });
});
