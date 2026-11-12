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
  resetTrustedPolicyForTest,
  getSamreyTemplateTrustedPolicy,
  sanitizeTemplateHtml,
  sanitizeHeadTags,
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
    const cleanHtmlSvg = sanitizeHtmlString(svgAttack);
    assert.ok(!cleanHtmlSvg.includes('<foreignObject'), 'Untrusted HTML must strip <foreignObject>');
    const cleanTmplSvg = sanitizeTemplateHtml(svgAttack);
    assert.ok(cleanTmplSvg.includes('<foreignObject>'), 'Compiled templates allow <foreignObject> container');
    for (const clean of [cleanHtmlSvg, cleanTmplSvg]) {
      assert.ok(!clean.includes('<animate'));
      assert.ok(!clean.includes('onbegin'));
      assert.ok(!clean.includes('<script'));
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

  it('F-01: validates script URLs against uppercase, whitespace, backslash, and scheme-colon bypasses', () => {
    resetTrustedPolicyForTest();
    const policy = getSamreyTrustedPolicy({ allowedScriptOrigins: ['https://cdn.samrey.dev'] });

    for (const bypassUrl of [
      'HTTPS://evil.com/hack.js',
      '  https://evil.com/hack.js',
      '\t//evil.com/hack.js',
      '/\\evil.com/hack.js',
      '\\evil.com/hack.js',
      '\\\\evil.com/hack.js',
      'https:evil.com/hack.js',
      'https://__samrey_self__.invalid/hack.js',
      'about:blank',
      ''
    ]) {
      assert.throws(() => policy.createScriptURL(bypassUrl), /Security|Invalid|blocked/i, `Must block ${bypassUrl}`);
    }

    assert.equal(policy.createScriptURL('HTTPS://CDN.SAMREY.DEV:443/sdk.js'), 'HTTPS://CDN.SAMREY.DEV:443/sdk.js');
    assert.equal(policy.createScriptURL('/assets/app.js'), '/assets/app.js');
    resetTrustedPolicyForTest();
  });

  it('F-02: terminates CSS string quotes on unescaped newlines while preserving escaped line continuations', () => {
    for (const payload of [
      'color: "foo\n; width: expression(alert(1))',
      'background: "foo\n url(javascript:alert(1))',
      'background: "foo\r url(javascript:alert(1))',
      'color: "foo\f; behavior: url(evil.htc)'
    ]) {
      const cleaned = sanitizeCssStyle(payload);
      assert.ok(!cleaned.includes('expression('), `Must neutralize expression in ${payload}`);
      assert.ok(!cleaned.includes('javascript:'), `Must neutralize javascript: in ${payload}`);
      assert.ok(!cleaned.includes('behavior:'), `Must neutralize behavior: in ${payload}`);
    }

    const safeCont = sanitizeCssStyle('content: "a\\\nb"; color: blue');
    assert.ok(safeCont.includes('color: blue'));
    const safeCrlfCont = sanitizeCssStyle('content: "a\\\r\nb"; color: green');
    assert.ok(safeCrlfCont.includes('color: green'));
  });

  it('F-12: handles RCDATA title/textarea tags, unquoted attribute slashes, and external base tags safely', () => {
    const titleMxss = sanitizeHtmlString('<title><p title="</title><img src=x onerror=alert(1)>"></title>');
    assert.ok(!titleMxss.includes('onerror'));

    const unquotedSlash = sanitizeHtmlString('<a href=https://example.com/>Link</a>');
    assert.ok(unquotedSlash.includes('href="https://example.com/"'));

    const textareaSlash = sanitizeTemplateHtml('<textarea/><div title="</textarea><img src=x onerror=alert(1)>">');
    assert.ok(!textareaSlash.includes('onerror'));
    assert.ok(!textareaSlash.includes('&amp;amp;'));

    const headClean = sanitizeHeadTags(
      '<title><meta name="evil"></title><base href="https://evil.com/"><base href="/app/"><meta name="ok" content="1">'
    );
    assert.ok(!headClean.includes('evil.com'));
    assert.ok(!headClean.includes('name="evil"'));
    assert.ok(headClean.includes('<base href="/app/">'));
    assert.ok(headClean.includes('<meta name="ok" content="1">'));
  });

  it('EXT-002 / EXT-003 / NEW-001: hardens Trusted Types realm reuse, root self-closing <svg />, and quoted </style> CSS', () => {
    // EXT-003: root <svg /> and <math /> preserve self-closing marker so following siblings are not swallowed
    assert.equal(sanitizeHtmlString('<svg /><p>hi</p>'), '<svg /><p>hi</p>');
    assert.equal(sanitizeHtmlString('<math /><p>next</p>'), '<math /><p>next</p>');

    // NEW-001: neutralize </style> and <!-- inside CSS style output
    const cssBreakout = sanitizeCssStyle('content: "</style><script>alert(1)</script>"; /* <!-- */ color: red;');
    assert.ok(!cssBreakout.toLowerCase().includes('</style'));
    assert.ok(cssBreakout.includes('\\3c /style'));

    // EXT-002: native Trusted Types realm reuse + fail-closed collision without defaultPolicy
    const hadWindow = 'window' in globalThis;
    const origWindow = (globalThis as any).window;
    try {
      let policyCreateCount = 0;
      const fakePolicy = {
        createHTML: (s: string) => ({ __trustedHtml: sanitizeHtmlString(s) }),
        createScript: () => '',
        createScriptURL: (u: string) => u
      };
      const fakeFactory = {
        createPolicy: (name: string) => {
          policyCreateCount++;
          if (name === 'samrey#html' && policyCreateCount > 1) {
            throw new TypeError('Policy already exists');
          }
          return fakePolicy;
        }
      };

      (globalThis as any).window = { trustedTypes: fakeFactory };
      resetTrustedPolicyForTest();
      const first = getSamreyTrustedPolicy();
      assert.equal(typeof first.createHTML('<b>ok</b>'), 'object');

      // Collision without defaultPolicy must fail closed rather than downgrade to plain string
      resetTrustedPolicyForTest();
      assert.throws(() => getSamreyTrustedPolicy(), /Trusted Types policy "samrey#html" initialization failed/);

      // Collision with defaultPolicy delegates only AFTER Samrey sanitization
      (globalThis as any).window = {
        trustedTypes: {
          createPolicy: () => { throw new TypeError('Policy already exists'); },
          defaultPolicy: {
            createHTML: (safe: string) => ({ __wrappedDefault: safe })
          }
        }
      };
      resetTrustedPolicyForTest();
      const wrapped = getSamreyTrustedPolicy().createHTML('<b>ok</b><script>alert(1)</script>') as any;
      assert.equal(wrapped.__wrappedDefault, '<b>ok</b>');
    } finally {
      resetTrustedPolicyForTest();
      if (hadWindow) (globalThis as any).window = origWindow;
      else delete (globalThis as any).window;
    }
  });

  it('Batch 1 regression: blocks unclosed EOF CSS url, image()/src(), multiline image-set(), CRLF redirect, and HTML foreign-breakout/end-tag > vectors', () => {
    // 1. Unclosed CSS url("...) and url('...) at EOF must still reject dangerous schemes
    for (const badUrlCss of [
      'background: url("javascript:alert(1)',
      "background: url('javascript:alert(1)",
      'background: url(  "javascript:alert(1)'
    ]) {
      const clean = sanitizeCssStyle(badUrlCss);
      assert.ok(!clean.toLowerCase().includes('javascript:'), `Must block unclosed EOF url(): ${badUrlCss} -> ${clean}`);
      assert.ok(clean.includes('url("")'), `Must replace blocked unclosed url() with url(""): ${clean}`);
    }

    // 2. Uniform CSS image functions: image(), src(), image-set() including multiline bad-string-token
    for (const badFnCss of [
      'background: image("javascript:alert(1)")',
      'src: src("javascript:alert(1)")',
      'background: image(ltr "javascript:alert(1)", "https://cdn.example.com/a.png")',
      'background: image-set("a\n , "javascript:alert(1)" 1x)'
    ]) {
      const clean = sanitizeCssStyle(badFnCss);
      assert.ok(!clean.toLowerCase().includes('javascript:'), `Must block JS scheme in CSS function: ${badFnCss} -> ${clean}`);
    }
    const mixedImg = sanitizeCssStyle('background: image(ltr "javascript:alert(1)", "https://cdn.example.com/a.png")');
    assert.ok(mixedImg.includes('https://cdn.example.com/a.png'));

    // 3. sanitizeRedirectUri must reject CRLF / NUL / control characters cleanly
    assert.equal(sanitizeRedirectUri('/login\r\nSet-Cookie: a=1', '/'), '/');
    assert.equal(sanitizeRedirectUri('/login\nLocation: //evil.com', '/'), '/');
    assert.equal(sanitizeRedirectUri('/login\0evil', '/'), '/');
    assert.equal(sanitizeRedirectUri('/login\tok', '/'), '/');

    // 4. HTML5 foreign-content breakout tags (<p>, <div>, <span>, <table>) pop <svg>/<math> before <textarea />
    const svgBreakout = sanitizeTemplateHtml('<svg><p><textarea /><b>hi</b></svg>');
    assert.ok(!svgBreakout.includes('<textarea />'), `Must not emit self-closing <textarea /> after HTML breakout: ${svgBreakout}`);
    assert.ok(svgBreakout.includes('</textarea>'), `Must close <textarea> properly in HTML mode: ${svgBreakout}`);

    // 5. Closing tags & rawtext strip tags must parse quoted '>' without leaving trailing fragments
    assert.equal(sanitizeHtmlString('</div title="><script>alert(1)</script>">'), '</div>');
    assert.equal(sanitizeHtmlString('</div/title="><script>alert(1)</script>">'), '</div>');
    const textareaEndAttr = sanitizeHtmlString('<textarea>safe</textarea title="><img src=x onerror=alert(1)>">');
    assert.equal(textareaEndAttr, '', `Must strip rawtext textarea with quoted > in end tag cleanly: ${textareaEndAttr}`);
    const styleEndAttr = sanitizeHtmlString('<style>a{}</style title="><img src=x onerror=alert(1)>">');
    assert.equal(styleEndAttr, '', `Must strip rawtext style with quoted > in end tag cleanly: ${styleEndAttr}`);
    const textareaRdataBreak = sanitizeHtmlString('<textarea><p title="</textarea><img src=x onerror=alert(1)>"></textarea>');
    assert.ok(!textareaRdataBreak.includes('onerror'), `Must sanitize content after RCDATA </textarea> break cleanly: ${textareaRdataBreak}`);
  });

  it('Batch 1 regression: enforces per-realm Trusted Types isolation, scoped allowedScriptOrigins, and non-string defaultPolicy fallback', () => {
    const hadWindow = 'window' in globalThis;
    const origWindow = (globalThis as any).window;
    try {
      const makeRealm = (id: number, withScriptUrl: boolean) => ({
        trustedTypes: {
          createPolicy: (name: string, rules: any) => ({ realm: id, name, ...rules }),
          defaultPolicy: withScriptUrl
            ? { createHTML: (s: string) => ({ def: s }), createScriptURL: (s: string) => ({ defUrl: s }) }
            : { createHTML: (s: string) => ({ def: s }) }
        }
      });

      resetTrustedPolicyForTest();
      (globalThis as any).window = makeRealm(1, true);
      const r1Html = getSamreyTrustedPolicy({ allowedScriptOrigins: ['https://cdn1.example'] }) as any;
      const r1Tmpl = getSamreyTemplateTrustedPolicy() as any;
      assert.equal(r1Html.realm, 1);
      assert.equal(r1Tmpl.realm, 1);

      // Switch realm WITHOUT calling resetTrustedPolicyForTest()
      (globalThis as any).window = makeRealm(2, true);
      const r2Html = getSamreyTrustedPolicy() as any;
      const r2Tmpl = getSamreyTemplateTrustedPolicy() as any;
      assert.equal(r2Html.realm, 2, 'Switching window.trustedTypes realm must NOT return Realm 1 cached policy');
      assert.equal(r2Tmpl.realm, 2, 'Switching window.trustedTypes realm must NOT return Realm 1 cached template policy');

      // Realm 1 allowlist must not silently leak into Realm 2 / template policy
      assert.throws(() => r2Html.createScriptURL('https://cdn1.example/sdk.js'), /Security|blocked/i);
      assert.throws(() => r2Tmpl.createScriptURL('https://cdn1.example/sdk.js'), /Security|blocked/i);

      // Default policy without createScriptURL must fail closed rather than returning a raw string
      (globalThis as any).window = {
        trustedTypes: {
          createPolicy: () => { throw new TypeError('Policy already exists'); },
          defaultPolicy: { createHTML: (s: string) => ({ __wrapped: s }) }
        }
      };
      const dupPolicy = getSamreyTrustedPolicy();
      assert.throws(() => dupPolicy.createScriptURL('/app.js'), /Security|Trusted Types|createScriptURL/i);
    } finally {
      resetTrustedPolicyForTest();
      if (hadWindow) (globalThis as any).window = origWindow;
      else delete (globalThis as any).window;
    }
  });

  it('closes CSS arbitrary-function/EOF bypasses, textarea slash end-tags, and same-realm Trusted Types leakage', () => {
    // 1. CSS arbitrary image/URI functions (cross-fade, -webkit-cross-fade, -moz-image-set, nested, var)
    for (const cssPayload of [
      'background: cross-fade("javascript:alert(1)", "https://ok.example/a.png", 50%)',
      'background: -webkit-cross-fade("javascript:alert(1)", "https://ok.example/a.png", 50%)',
      'background: -moz-image-set("jav\\61script:alert(1)" 1x)',
      'background: cross-fade(url("javascript:alert(1)"), image-set("data:text/html,<script>alert(1)</script>" 1x), 50%)',
      'background: filter(url("vbscript:msgbox(1)"))',
      'background: url(//evil.com/leak.png)'
    ]) {
      const cleaned = sanitizeCssStyle(cssPayload);
      assert.ok(!/javascript:|vbscript:|data:text\/html|\/\/evil\.com/i.test(cleaned), `Must neutralize CSS payload: ${cssPayload} -> ${cleaned}`);
    }
    const crossFadeMixed = sanitizeCssStyle('background: cross-fade("javascript:alert(1)", "https://ok.example/a.png", 50%)');
    assert.ok(crossFadeMixed.includes('https://ok.example/a.png'));

    // 2. Unclosed EOF quotes/parens in CSS functions must produce balanced quotes & single balanced paren
    assert.equal(sanitizeCssStyle('background: url("https://ok.example/a.png'), 'background: url("https://ok.example/a.png")');
    assert.equal(sanitizeCssStyle("background: url('https://ok.example/a.png"), "background: url('https://ok.example/a.png')");
    const trailingSlashEof = sanitizeCssStyle('background: url("https://ok.example/a.png\\');
    assert.equal((trailingSlashEof.match(/"/g) || []).length % 2, 0);
    assert.ok(!trailingSlashEof.endsWith('\\"'));
    const eofImgSet = sanitizeCssStyle('background: image-set("https://ok.example/a.png 1x)');
    assert.ok(!eofImgSet.includes('))'), `Must not emit duplicate )) on EOF unclosed image-set: ${eofImgSet}`);
    assert.equal((eofImgSet.match(/"/g) || []).length % 2, 0, `Quotes must stay balanced: ${eofImgSet}`);

    // Benign metadata/content strings stay preserved
    assert.ok(sanitizeCssStyle('src: url("https://ok.example/font.woff2") format("woff2")').includes('format("woff2")'));
    assert.ok(sanitizeCssStyle('background: image-set("https://ok.example/a.webp" type("image/webp"))').includes('type("image/webp")'));

    // 3. HTML textarea closing tag with slash separator
    const slashTextarea = sanitizeTemplateHtml('<textarea>ok</textarea/title="><img src=x onerror=alert(1)>"><b>after</b>');
    assert.equal(slashTextarea, '<textarea>ok</textarea><b>after</b>');

    // 4. Same-realm Trusted Types allowedScriptOrigins must never leak to subsequent callers
    const hadWindow = 'window' in globalThis;
    const origWindow = (globalThis as any).window;
    try {
      resetTrustedPolicyForTest();
      const createdNames = new Set<string>();
      (globalThis as any).window = {
        location: { origin: 'https://app.example' },
        trustedTypes: {
          createPolicy: (name: string, rules: any) => {
            if (createdNames.has(name)) {
              throw new TypeError(`Duplicate policy ${name}`);
            }
            createdNames.add(name);
            return {
              createHTML: (s: string) => ({ __html: rules.createHTML(s) }),
              createScript: (s: string) => rules.createScript(s),
              createScriptURL: (u: string) => ({ __url: rules.createScriptURL(u) })
            };
          }
        }
      };

      const scopedHtml = getSamreyTrustedPolicy({ allowedScriptOrigins: ['https://cdn1.example'] }) as any;
      assert.deepEqual(scopedHtml.createScriptURL('https://cdn1.example/a.js'), { __url: 'https://cdn1.example/a.js' });
      assert.throws(() => scopedHtml.createScriptURL('https://cdn2.example/b.js'), /Security|blocked/i);

      const defaultHtml = getSamreyTrustedPolicy() as any;
      assert.throws(() => defaultHtml.createScriptURL('https://cdn1.example/x.js'), /Security|blocked/i);

      const otherScoped = getSamreyTrustedPolicy({ allowedScriptOrigins: ['https://cdn2.example'] }) as any;
      assert.deepEqual(otherScoped.createScriptURL('https://cdn2.example/b.js'), { __url: 'https://cdn2.example/b.js' });
      assert.throws(() => otherScoped.createScriptURL('https://cdn1.example/a.js'), /Security|blocked/i);

      const scopedTmpl = getSamreyTemplateTrustedPolicy({ allowedScriptOrigins: ['https://cdn1.example'] }) as any;
      const defaultTmpl = getSamreyTemplateTrustedPolicy() as any;
      assert.deepEqual(scopedTmpl.createScriptURL('https://cdn1.example/t.js'), { __url: 'https://cdn1.example/t.js' });
      assert.throws(() => defaultTmpl.createScriptURL('https://cdn1.example/t.js'), /Security|blocked/i);
    } finally {
      resetTrustedPolicyForTest();
      if (hadWindow) (globalThis as any).window = origWindow;
      else delete (globalThis as any).window;
    }
  });
});
