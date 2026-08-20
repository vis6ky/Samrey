import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  sanitizeUri, 
  escapeForScriptPayload, 
  sanitizeHtmlString, 
  escapeHtmlAttribute,
  generateCsrfToken,
  verifyCsrfToken,
  getAetherTrustedPolicy
} from '../src/index.js';

describe('@aether/security', () => {
  it('blocks javascript: URLs and dangerous schemes', () => {
    assert.equal(sanitizeUri('javascript:alert(1)'), 'about:blank');
    assert.equal(sanitizeUri('   JAVASCRIPT:alert(1)  '), 'about:blank');
    assert.equal(sanitizeUri('data:text/html,<script>alert(1)</script>'), 'about:blank');
    assert.equal(sanitizeUri('vbscript:msgbox(1)'), 'about:blank');
    assert.equal(sanitizeUri('blob:http://evil.com/payload'), 'about:blank');
  });

  it('allows safe HTTP, HTTPS, and relative URLs', () => {
    assert.equal(sanitizeUri('https://example.com/page'), 'https://example.com/page');
    assert.equal(sanitizeUri('http://localhost:3000'), 'http://localhost:3000');
    assert.equal(sanitizeUri('/dashboard'), '/dashboard');
    assert.equal(sanitizeUri('./subpath'), './subpath');
    assert.equal(sanitizeUri('#section'), '#section');
    assert.equal(sanitizeUri('mailto:support@aether.dev'), 'mailto:support@aether.dev');
    assert.equal(sanitizeUri('tel:+1234567890'), 'tel:+1234567890');
  });

  it('escapes SSR script payloads against </script> breakouts and Unicode separators', () => {
    const payload = '{"user": "</script><script>alert(1)</script>", "line": "Line 1\u2028Line 2\u2029"}';
    const escaped = escapeForScriptPayload(payload);
    assert.ok(!escaped.includes('</script>'));
    assert.ok(escaped.includes('\\u003c/script\\u003e'));
    assert.ok(escaped.includes('\\u2028'));
    assert.ok(escaped.includes('\\u2029'));
  });

  it('sanitizes dangerous HTML tags and inline event handlers', () => {
    const dangerous = '<p>Hello</p><script>alert(1)</script><img src="x" onerror="alert(2)"><iframe src="evil.com"></iframe>';
    const clean = sanitizeHtmlString(dangerous);
    assert.ok(!clean.includes('<script>'));
    assert.ok(!clean.includes('onerror'));
    assert.ok(!clean.includes('<iframe'));
    assert.ok(clean.includes('<p>Hello</p>'));
  });

  it('escapes HTML attributes correctly to prevent quote breakouts', () => {
    const malicious = '" onmouseover="alert(1)" data-extra="';
    const safeAttr = escapeHtmlAttribute(malicious);
    assert.ok(!safeAttr.includes('"'));
    assert.ok(safeAttr.includes('&quot;'));
  });

  it('generates and verifies CSRF tokens with constant-time equality', () => {
    const token = generateCsrfToken(32);
    assert.equal(token.length, 32);
    assert.ok(verifyCsrfToken(token, token));
    assert.ok(!verifyCsrfToken('tampered-token', token));
    assert.ok(!verifyCsrfToken(null, token));
    assert.ok(!verifyCsrfToken('', token));
  });

  it('provides Trusted Types policy or fallback', () => {
    const policy = getAetherTrustedPolicy();
    assert.ok(policy !== null);
    const safeHtml = policy.createHTML('<b>Safe Content</b>');
    assert.equal(safeHtml, '<b>Safe Content</b>');
  });
});
