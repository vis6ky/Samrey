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
} from '../src/index.js';

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

  it('hardens HTML and template sanitizers against CDATA, malformed comments, and rawtext mXSS vectors', () => {
    // 1. CDATA injection inside SVG / raw HTML
    const cdataPayload = '<svg><desc><![CDATA[</desc><script>alert(1)</script>]]></desc></svg><![CDATA[<img src=x onerror=alert(2)>]]>';
    const cleanCdata = sanitizeHtmlString(cdataPayload);
    assert.ok(!cleanCdata.includes('<![CDATA['));
    assert.ok(!cleanCdata.includes('<script>'));
    assert.ok(!cleanCdata.includes('onerror'));

    // 2. Malformed & abrupt HTML5 comments (--!>, <!-->, <!--->) and conditional comments
    const commentPayloads = [
      '<!-- safe --!><script>alert(1)</script>',
      '<!--><img src=x onerror=alert(1)>',
      '<!---><script>alert(2)</script>',
      '<!--[if gte IE 4]><script>alert(3)</script><![endif]-->',
      '<![if !IE]><img src=x onerror=alert(4)><![endif]>'
    ];
    for (const payload of commentPayloads) {
      const sanitized = sanitizeHtmlString(payload);
      assert.ok(!sanitized.includes('<script>'), `Comment mXSS leaked script: ${payload}`);
      assert.ok(!sanitized.includes('onerror'), `Comment mXSS leaked handler: ${payload}`);
      assert.ok(!sanitized.includes('<!--'), `Comment mXSS left raw comment marker: ${payload}`);
    }

    // 3. Parser-switching rawtext tags (<noscript>, <noembed>, <xmp>)
    const rawtextPayload = '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript><xmp><script>alert(2)</script></xmp>';
    const cleanRawtext = sanitizeHtmlString(rawtextPayload);
    assert.ok(!cleanRawtext.includes('<noscript'));
    assert.ok(!cleanRawtext.includes('onerror'));
    assert.ok(!cleanRawtext.includes('<xmp'));
    assert.ok(!cleanRawtext.includes('<script'));

    // 4. sanitizeTemplateHtml preserves compiler slot comments while stripping malicious comments/CDATA
    const tmplWithSlotAndAttack = '<div><!-- show-slot --><!-- malicious --!><script>alert(1)</script><![CDATA[<img src=x onerror=alert(2)>]]><!-- <!-- for-slot --> <script>alert(3)</script> --></div>';
    const cleanTmpl = sanitizeTemplateHtml(tmplWithSlotAndAttack);
    assert.ok(cleanTmpl.includes('<!-- show-slot -->'), 'Compiler show-slot anchor must be preserved');
    assert.ok(!cleanTmpl.includes('<script>'));
    assert.ok(!cleanTmpl.includes('onerror'));
    assert.ok(!cleanTmpl.includes('malicious'));
    assert.ok(!cleanTmpl.includes('<![CDATA['));
  });

  it('blocks HTML/template tokenizer bypasses (no-space attrs, quoted >, </script >, SVG animate, <style> in templates)', () => {
    // 1. Missing whitespace between quoted attribute and event handler
    const noSpaceHtml = sanitizeHtmlString('<img src="x"onerror="alert(1)">');
    assert.ok(!noSpaceHtml.includes('onerror'));
    assert.ok(noSpaceHtml.includes('<img src="x">'));

    const noSpaceTmpl = sanitizeTemplateHtml('<button ref="b"onclick="alert(1)">Hi</button>');
    assert.ok(!noSpaceTmpl.includes('onclick'));
    assert.ok(noSpaceTmpl.includes('<button ref="b">Hi</button>'));

    // 2. Quoted '>' inside attributes must not end tag parsing prematurely
    const quotedGt = sanitizeHtmlString('<div title=">" onclick="alert(1)">Safe</div>');
    assert.ok(!quotedGt.includes('onclick'));
    assert.ok(quotedGt.includes('Safe'));

    // 3. Whitespace/attributes in </script > and unclosed <script>
    assert.equal(sanitizeHtmlString('<script>alert(1)</script ><b>Ok</b>'), '<b>Ok</b>');
    assert.equal(sanitizeHtmlString('<b>Ok</b><script>alert(1)'), '<b>Ok</b>');
    assert.equal(sanitizeTemplateHtml('<div>Hi</div><script>alert(1)</script >'), '<div>Hi</div>');

    // 4. SVG dangerous elements (<animate>, <set>, <foreignObject>, <discard>) and data:image/svg+xml
    const svgAttack = '<svg><animate onbegin="alert(1)" attributeName="href" to="javascript:alert(1)"></animate><foreignObject><script>alert(2)</script></foreignObject><path d="M0 0" /></svg>';
    for (const clean of [sanitizeHtmlString(svgAttack), sanitizeTemplateHtml(svgAttack)]) {
      assert.ok(!clean.includes('<animate'));
      assert.ok(!clean.includes('onbegin'));
      assert.ok(!clean.includes('<foreignObject'));
      assert.ok(!clean.includes('alert(2)'));
      assert.ok(clean.includes('<path d="M0 0" />'));
    }

    const svgDataUri = '<img src="data:image/svg+xml;base64,PHNjcmlwdD4=" srcset="data:image/png;base64,iVBOR== 1x, javascript:alert(1) 2x">';
    const cleanedData = sanitizeHtmlString(svgDataUri);
    assert.ok(!cleanedData.includes('image/svg+xml'));
    assert.ok(cleanedData.includes('src="about:blank"'));
    assert.ok(cleanedData.includes('srcset="data:image/png;base64,iVBOR== 1x, about:blank 2x"'));

    // 5. <style> tag must be stripped even in template mode
    const tmplWithStyle = '<div>Hi</div><style>body{background:url(javascript:alert(1))}</style>';
    assert.equal(sanitizeTemplateHtml(tmplWithStyle), '<div>Hi</div>');
  });

  it('blocks named HTML entity scheme bypasses (&Tab;, &NewLine;, mixed/malformed %XX) while preserving safe query strings', () => {
    const uriAttacks = [
      'java&Tab;script:alert(1)',
      'java&NewLine;script:alert(1)',
      'java&#x09;script&colon;alert&lpar;1&rpar;',
      'jav&#38;Tab;script:alert(1)',
      '%6a%61vascript:%ZZ',
      'https://example.com\t/evil'
    ];
    for (const attack of uriAttacks) {
      assert.equal(sanitizeUri(attack), 'about:blank', `Failed to block URI attack: ${attack}`);
    }
    assert.equal(sanitizeUri('https://example.com/?a=1&tab=2'), 'https://example.com/?a=1&tab=2');
    assert.equal(sanitizeRedirectUri('/%2fevil.com', '/safe'), '/safe');
    assert.equal(sanitizeRedirectUri('/%5cevil.com', '/safe'), '/safe');
  });

  it('sanitizes CSS escapes before url() and balances nested parentheses without leaving stray )', () => {
    const escapedUrl = 'background: \\75rl(javascript:alert(1)); color: blue;';
    const cleanEscapedUrl = sanitizeCssStyle(escapedUrl);
    assert.ok(!cleanEscapedUrl.includes('javascript:'));
    assert.ok(!cleanEscapedUrl.includes('\\75'));
    assert.ok(cleanEscapedUrl.includes('background: url(""); color: blue;'));

    const spacedEscapedUrl = 'background: \\75 rl(javascript:alert(1));';
    const cleanSpaced = sanitizeCssStyle(spacedEscapedUrl);
    assert.equal(cleanSpaced, 'background: url("");');

    const escapedExpr = 'width: expr\\65ssion(alert(1)); height: 10px;';
    const cleanExpr = sanitizeCssStyle(escapedExpr);
    assert.ok(!cleanExpr.includes('expression'));
    assert.ok(!cleanExpr.includes('alert(1)'));
    assert.ok(!cleanExpr.includes(')'));
    assert.ok(cleanExpr.includes('height: 10px;'));

    const nestedParensUrl = 'background: url(javascript:alert(1)); color: green;';
    assert.equal(sanitizeCssStyle(nestedParensUrl), 'background: url(""); color: green;');

    const imgSet = 'background-image: image-set("javascript:alert(1)" 1x, "https://cdn.example.com/a.png" 2x);';
    const cleanImgSet = sanitizeCssStyle(imgSet);
    assert.ok(!cleanImgSet.includes('javascript:'));
    assert.ok(cleanImgSet.includes('https://cdn.example.com/a.png'));
  });
});
