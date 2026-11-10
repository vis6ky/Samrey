import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  sanitizeUri, 
  sanitizeRedirectUri,
  sanitizeCssStyle,
  scrubPrototypePollution,
  escapeForScriptPayload, 
  sanitizeHtmlString, 
  escapeHtmlAttribute,
  escapeHtmlText,
  generateCsrfToken,
  verifyCsrfToken,
  getSamreyTrustedPolicy,
  getSamreyTemplateTrustedPolicy,
  sanitizeTemplateHtml,
  decodeCssEscapes
} from '../src/index.ts';

describe('@samrey/security', () => {
  it('blocks javascript: URLs and dangerous schemes', () => {
    assert.equal(sanitizeUri('javascript:alert(1)'), 'about:blank');
    assert.equal(sanitizeUri('   JAVASCRIPT:alert(1)  '), 'about:blank');
    assert.equal(sanitizeUri('data:text/html,<script>alert(1)</script>'), 'about:blank');
    assert.equal(sanitizeUri('vbscript:msgbox(1)'), 'about:blank');
    assert.equal(sanitizeUri('blob:http://evil.com/payload'), 'about:blank');
    assert.equal(sanitizeUri('%6a%61%76%61%73%63%72%69%70%74:alert(1)'), 'about:blank');
    assert.equal(sanitizeUri('jav&#x61;script:alert(1)'), 'about:blank');
  });

  it('validates and sanitizes safe redirect URIs', () => {
    assert.equal(sanitizeRedirectUri('/dashboard'), '/dashboard');
    assert.equal(sanitizeRedirectUri('./profile'), './profile');
    assert.equal(sanitizeRedirectUri('#top'), '#top');
    // Protocol-relative attacks must be rejected
    assert.equal(sanitizeRedirectUri('//evil.com/phish'), '/');
    assert.equal(sanitizeRedirectUri('/\\evil.com'), '/');
    assert.equal(sanitizeRedirectUri('\\\\evil.com'), '/');
    assert.equal(sanitizeRedirectUri('https://attacker.com/evil', '/home'), '/home');
    assert.equal(sanitizeRedirectUri('javascript:alert(1)', '/login'), '/login');
  });

  it('sanitizes inline CSS style strings', () => {
    const dangerousCss = 'color: red; background: url(javascript:alert(1)); width: expression(alert(2)); behavior: url(evil.htc); @import url("evil.css");';
    const clean = sanitizeCssStyle(dangerousCss);
    assert.ok(!clean.includes('javascript:'));
    assert.ok(!clean.includes('expression('));
    assert.ok(!clean.includes('behavior:'));
    assert.ok(!clean.includes('@import'));
    assert.ok(clean.includes('color: red'));
  });

  it('scrubs prototype pollution vectors from objects', () => {
    const maliciousJson = '{"name": "Alice", "__proto__": {"polluted": true}, "nested": {"constructor": {"evil": 1}}}';
    const parsed = JSON.parse(maliciousJson);
    const scrubbed = scrubPrototypePollution(parsed);

    assert.equal(scrubbed.name, 'Alice');
    assert.equal(Object.prototype.hasOwnProperty.call(scrubbed, '__proto__'), false);
    assert.equal((Object.prototype as any).polluted, undefined);
    assert.equal(Object.prototype.hasOwnProperty.call(scrubbed.nested, 'constructor'), false);
  });

  it('allows safe HTTP, HTTPS, and relative URLs', () => {
    assert.equal(sanitizeUri('https://example.com/page'), 'https://example.com/page');
    assert.equal(sanitizeUri('http://localhost:3000'), 'http://localhost:3000');
    assert.equal(sanitizeUri('/dashboard'), '/dashboard');
    assert.equal(sanitizeUri('./subpath'), './subpath');
    assert.equal(sanitizeUri('#section'), '#section');
    assert.equal(sanitizeUri('mailto:support@samrey.dev'), 'mailto:support@samrey.dev');
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

  it('escapes HTML attributes and text correctly', () => {
    const malicious = '" onmouseover="alert(1)" data-extra="';
    const safeAttr = escapeHtmlAttribute(malicious);
    assert.ok(!safeAttr.includes('"'));
    assert.ok(safeAttr.includes('&quot;'));

    const textPayload = '<script>alert("text")</script>';
    const safeText = escapeHtmlText(textPayload);
    assert.ok(!safeText.includes('<'));
    assert.ok(safeText.includes('&lt;script&gt;'));
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
    const policy = getSamreyTrustedPolicy();
    assert.ok(policy !== null);
    const safeHtml = policy.createHTML('<b>Safe Content</b>');
    assert.equal(safeHtml, '<b>Safe Content</b>');
  });

  it('NEW-001: sanitizes CSS styles with comments, backslash escapes, and url() schemes', () => {
    // 1. Decodes CSS escapes
    assert.equal(decodeCssEscapes('expr\\65ssion'), 'expression');
    assert.equal(decodeCssEscapes('jav\\61script\\3a'), 'javascript:');

    // 2. Strips expressions split by comments
    const commented = 'color: red; width: exp/*comment*/ression(alert(1));';
    const cleanCommented = sanitizeCssStyle(commented);
    assert.ok(!cleanCommented.includes('expression'));
    assert.ok(!cleanCommented.includes('alert(1)'));

    // 3. Strips backslash escaped expression
    const escapedExpr = 'width: expr\\65ssion(alert(1));';
    const cleanEscaped = sanitizeCssStyle(escapedExpr);
    assert.ok(!cleanEscaped.includes('expression'));

    // 4. Neutralizes javascript: in url()
    const urlJs = 'background: url("jav\\61script:alert(1)");';
    const cleanUrlJs = sanitizeCssStyle(urlJs);
    assert.ok(!cleanUrlJs.includes('javascript:'));
    assert.ok(cleanUrlJs.includes('url("")'));

    // 5. Preserves legitimate safe CSS
    const safeCss = 'display: flex; margin: 10px; background: url("https://cdn.example.com/bg.png");';
    const cleanSafe = sanitizeCssStyle(safeCss);
    assert.ok(cleanSafe.includes('display: flex'));
    assert.ok(cleanSafe.includes('https://cdn.example.com/bg.png'));
  });

  it('NEW-002: sanitizes comprehensive URL-bearing attributes and compound srcset lists', () => {
    const htmlWithUrlAttrs = `
      <video poster="javascript:alert('poster')"></video>
      <object data="javascript:alert('data')"></object>
      <button formaction="javascript:alert('formaction')">Submit</button>
      <blockquote cite="javascript:alert('cite')">Quote</blockquote>
      <img src="valid.png" srcset="small.jpg 1x, javascript:alert('srcset') 2x">
      <a ping="javascript:alert('ping')">Link</a>
    `;

    const cleaned = sanitizeHtmlString(htmlWithUrlAttrs);
    assert.ok(!cleaned.includes("javascript:alert('poster')"));
    assert.ok(!cleaned.includes("javascript:alert('cite')"));
    assert.ok(!cleaned.includes("javascript:alert('srcset')"));
    assert.ok(cleaned.includes('srcset="small.jpg 1x, about:blank 2x"'));
  });

  it('NEW-003: enforces documented URI policy distinction between resources and redirects', () => {
    // Resource context (sanitizeUri): allows protocol-relative CDN URLs by default
    assert.equal(sanitizeUri('//cdn.example.com/asset.png'), '//cdn.example.com/asset.png');

    // Resource context with allowProtocolRelative: false: rejects protocol-relative URLs
    assert.equal(sanitizeUri('//cdn.example.com/asset.png', { allowProtocolRelative: false }), 'about:blank');

    // Navigational redirect context (sanitizeRedirectUri): strictly rejects protocol-relative URLs to prevent Open Redirects
    assert.equal(sanitizeRedirectUri('//evil.com/phish'), '/');
    assert.equal(sanitizeRedirectUri('/\\evil.com'), '/');
    assert.equal(sanitizeRedirectUri('\\\\evil.com'), '/');
  });

  it('EXT-002: verifies template Trusted Types policy strictly sanitizes without pass-through', () => {
    const templatePolicy = getSamreyTemplateTrustedPolicy();
    assert.ok(templatePolicy !== null);

    // Strips executable script tags
    const templateWithScript = '<div><span>Title</span><script>alert("xss")</script></div>';
    const safeTmpl = templatePolicy.createHTML(templateWithScript);
    assert.ok(!safeTmpl.includes('<script>'));
    assert.ok(!safeTmpl.includes('alert("xss")'));
    assert.ok(safeTmpl.includes('<div><span>Title</span></div>'));

    // Strips inline on* event handlers
    const templateWithEvents = '<button ref="btn" onclick="alert(1)">Click</button>';
    const safeBtn = templatePolicy.createHTML(templateWithEvents);
    assert.ok(!safeBtn.includes('onclick'));
    assert.ok(safeBtn.includes('<button ref="btn">Click</button>'));

    // Rewrites javascript: URLs to about:blank
    const templateWithBadUrl = '<a href="javascript:alert(1)">Link</a>';
    const safeLink = templatePolicy.createHTML(templateWithBadUrl);
    assert.ok(!safeLink.includes('javascript:'));
    assert.ok(safeLink.includes('href="about:blank"'));

    // Preserves interactive UI tags: button, input, form, textarea, svg, refs
    const validTemplate = '<form><input ref="inp" class="txt"><button ref="btn" type="submit"><svg><path d="M0 0"></path></svg></button></form>';
    const safeForm = templatePolicy.createHTML(validTemplate);
    assert.ok(safeForm.includes('<form>'));
    assert.ok(safeForm.includes('ref="inp"'));
    assert.ok(safeForm.includes('<button ref="btn"'));
    assert.ok(safeForm.includes('<svg>'));
  });

  it('EXT-003: sanitizes recursively nested tags through multi-pass convergence', () => {
    // Nested script evasion: <scr<script>ipt>
    const nestedScript = '<scr<script>ipt>alert(1)</script>';
    const cleaned = sanitizeHtmlString(nestedScript);
    assert.ok(!cleaned.includes('<script>'));
    assert.ok(!cleaned.includes('alert(1)'));
  });
});
