import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  compileTemplate, 
  generateModuleCode,
  classifyBindingContext, 
  lintA11y, 
  TemplateParser,
  SamreyCompilerError,
  isStaticSubtree
} from '../src/index.js';
import { signal } from '@samrey/reactivity';
import { template, bindText, bindAttr } from '@samrey/runtime';

describe('@samrey/compiler', () => {
  it('classifies security contexts accurately', () => {
    assert.equal(classifyBindingContext('text'), 'html-text');
    assert.equal(classifyBindingContext('attr', 'href'), 'uri-attr');
    assert.equal(classifyBindingContext('attr', 'src'), 'uri-attr');
    assert.equal(classifyBindingContext('attr', 'title'), 'safe-attr');
    assert.equal(classifyBindingContext('attr', 'style'), 'style-attr');
  });

  it('detects a11y violations statically', () => {
    const imgWarnings = lintA11y('img', { src: 'pic.png' });
    assert.ok(imgWarnings.length > 0);
    assert.ok(imgWarnings[0]?.includes('alt'));

    const cleanImg = lintA11y('img', { src: 'pic.png', alt: 'Profile picture' });
    assert.equal(cleanImg.length, 0);
  });

  it('compiles template and hoists static HTML', () => {
    const result = compileTemplate('<div class="card"><h1>{title}</h1><p>{body}</p></div>');
    
    assert.equal(result.templates.length, 1);
    assert.ok(result.generatedCode.includes('/*#__PURE__*/ template('));
    assert.ok(result.generatedCode.includes('bindText('));
    assert.ok(result.ast !== undefined);
    assert.equal(result.ast?.type, 'Root');
  });

  it('parses nested and deeply nested HTML elements with attributes', () => {
    const source = `
      <div id="main" class="container" data-test="unit">
        <header>
          <nav>
            <ul>
              <li><a href="/home">Home</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </nav>
        </header>
        <section>
          <article>
            <p>Paragraph 1</p>
            <p>Paragraph 2</p>
          </article>
        </section>
      </div>
    `;

    const parser = new TemplateParser(source);
    const { ast, diagnostics } = parser.parse();

    assert.equal(diagnostics.length, 0);
    assert.equal(ast.type, 'Root');
    
    const rootElem = ast.children.find((c) => c.type === 'Element');
    assert.ok(rootElem && rootElem.type === 'Element');
    assert.equal(rootElem.tag, 'div');
    assert.equal(rootElem.attributes.length, 3);
    assert.equal(rootElem.attributes[0].name, 'id');
    assert.equal(rootElem.attributes[0].value, 'main');
  });

  it('parses dynamic attributes, boolean attributes, and event handlers', () => {
    const source = `<button disabled class={btnTheme} @click={handleClick} onMouseEnter={handleHover}>Submit</button>`;
    const parser = new TemplateParser(source);
    const { ast, diagnostics } = parser.parse();

    assert.equal(diagnostics.length, 0);
    const button = ast.children[0];
    assert.ok(button && button.type === 'Element');
    assert.equal(button.tag, 'button');

    const disabledAttr = button.attributes.find((a) => a.name === 'disabled');
    assert.ok(disabledAttr);
    assert.equal(disabledAttr.value, 'true');

    const classAttr = button.attributes.find((a) => a.name === 'class');
    assert.ok(classAttr);
    assert.equal(classAttr.isDynamic, true);
    assert.equal(classAttr.expression, 'btnTheme');

    const clickAttr = button.attributes.find((a) => a.name === '@click');
    assert.ok(clickAttr);
    assert.equal(clickAttr.isEvent, true);
    assert.equal(clickAttr.eventName, 'click');
    assert.equal(clickAttr.expression, 'handleClick');

    const hoverAttr = button.attributes.find((a) => a.name === 'onMouseEnter');
    assert.ok(hoverAttr);
    assert.equal(hoverAttr.isEvent, true);
    assert.equal(hoverAttr.eventName, 'mouseenter');
  });

  it('throws SamreyCompilerError for custom components and control flow (<Show> and <For>)', () => {
    const source = `
      <Card title="User Dashboard">
        <Show when={isLoggedIn()}>
          <span>Hello</span>
        </Show>
      </Card>
    `;

    assert.throws(
      () => compileTemplate(source, { filename: 'test.html' }),
      (err: any) => {
        return (
          err instanceof SamreyCompilerError &&
          err.code === 'SAMREY-108' &&
          err.message.includes('Card') &&
          err.filename === 'test.html'
        );
      }
    );

    const showSource = `<div><Show when={isLoggedIn()}><span>Hello</span></Show></div>`;
    assert.throws(
      () => compileTemplate(showSource, { filename: 'test.html' }),
      (err: any) => {
        return (
          err instanceof SamreyCompilerError &&
          err.code === 'SAMREY-108' &&
          err.message.includes('Show') &&
          err.filename === 'test.html'
        );
      }
    );
  });

  it('recovers gracefully from malformed markup and unclosed tags with diagnostics', () => {
    const malformed = `<div><p>Unclosed paragraph<span>Nested</span></div>`;
    const parser = new TemplateParser(malformed);
    const { ast, diagnostics } = parser.parse();

    // Diagnostics should note mismatched closing tag </p> vs </div>
    assert.ok(diagnostics.length > 0);
    assert.ok(ast.children.length > 0);
  });

  it('handles complex nested expressions and balanced braces correctly', () => {
    const source = `<div>{items.map((x) => ({ id: x.id, val: \`item-\${x.val}\` }))}</div>`;
    const parser = new TemplateParser(source);
    const { ast, diagnostics } = parser.parse();

    assert.equal(diagnostics.length, 0);
    const div = ast.children[0];
    assert.ok(div && div.type === 'Element');
    assert.equal(div.children.length, 1);
    assert.equal(div.children[0].type, 'Interpolation');
    if (div.children[0].type === 'Interpolation') {
      assert.equal(div.children[0].expression, 'items.map((x) => ({ id: x.id, val: `item-${x.val}` }))');
    }
  });

  it('classifies extended URL attributes, emits aria-hidden="true", and sanitizes static style/srcset/poster', () => {
    for (const urlAttr of ['poster', 'srcset', 'imagesrcset', 'ping', 'cite', 'background', 'usemap']) {
      assert.equal(classifyBindingContext('attr', urlAttr), 'uri-attr', `expected uri-attr for ${urlAttr}`);
    }

    const compiledAria = compileTemplate('<div aria-hidden={true} aria-expanded={true} hidden={true}></div>');
    const htmlAria = compiledAria.templates[0].staticHtml;
    assert.ok(htmlAria.includes('aria-hidden="true"'));
    assert.ok(htmlAria.includes('aria-expanded="true"'));
    assert.ok(htmlAria.includes(' hidden>') && !htmlAria.includes(' hidden="true"'));

    const compiledMedia = compileTemplate(
      '<img alt="Preview" srcset="a.jpg 1x, javascript:alert(1) 2x" style="width: expr\\65ssion(alert(1)); color: red;" /><video poster={"javascript:alert(1)"}></video>'
    );
    const htmlMedia = compiledMedia.templates[0].staticHtml;
    assert.ok(!htmlMedia.includes('javascript:'));
    assert.ok(!htmlMedia.includes('expression'));
    assert.ok(!htmlMedia.includes('alert(1)'));
    assert.ok(htmlMedia.includes('srcset="a.jpg 1x, about:blank 2x"'));
    assert.ok(htmlMedia.includes('color: red;'));
    assert.ok(htmlMedia.includes('poster="about:blank"'));
  });

  it('expands non-void HTML self-closing tags while preserving void and foreign SVG/MathML self-closing tags', () => {
    const compiledHtml = compileTemplate('<div><span class="badge" /><strong >ok</strong><img alt="logo" src="/a.png" /></div>');
    const html = compiledHtml.templates[0].staticHtml;
    assert.ok(html.includes('<span class="badge"></span><strong>ok</strong>') || html.includes('<span class="badge"></span><strong >ok</strong>'));
    assert.ok(!html.includes('<span class="badge" />'));
    assert.ok(html.includes('<img alt="logo" src="/a.png" />'));

    const compiledSvg = compileTemplate('<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /><path d="M0 0" /></svg>');
    const svgHtml = compiledSvg.templates[0].staticHtml;
    assert.ok(svgHtml.includes('<circle cx="5" cy="5" r="4" />'));
    assert.ok(svgHtml.includes('<path d="M0 0" />'));
  });

  it('uses token-aware runtime import detection without false positives from substrings, strings, comments, or member calls', () => {
    const compiledExpr = compileTemplate('<div>{action(1)} {myShow(2)} {waitFor(3)}</div>');
    const exprImportLine = compiledExpr.generatedCode.split('\n').find((l) => l.startsWith('import ')) || '';
    assert.ok(exprImportLine.includes('template'));
    assert.ok(exprImportLine.includes('bindText'));
    assert.ok(!/\bon\b/.test(exprImportLine), `Must not import "on" for action(1), got: ${exprImportLine}`);
    assert.ok(!exprImportLine.includes('Show'), `Must not import "Show" for myShow(2), got: ${exprImportLine}`);
    assert.ok(!exprImportLine.includes('For'), `Must not import "For" for waitFor(3), got: ${exprImportLine}`);

    const directCode = generateModuleCode(
      [],
      [
        'const text = "Show(x) on(a)";',
        '// bindAttr(root, "x", () => 1)',
        '/* For({ each: () => [] }) */',
        'obj.on("custom", () => {});',
        'action(1);',
        'const tpl = `prefix ${on(root, "click", handler)} end`;'
      ].join('\n')
    );
    const directImportLine = directCode.split('\n').find((l) => l.startsWith('import ')) || '';
    assert.ok(/\bon\b/.test(directImportLine), `Should import "on" from template expression interpolation: ${directImportLine}`);
    assert.ok(!directImportLine.includes('Show'));
    assert.ok(!directImportLine.includes('For'));
    assert.ok(!directImportLine.includes('bindAttr'));

    const noHelperDirect = generateModuleCode(
      [],
      'const label = "on(1)"; obj.on("ev", fn); action(1); /* bindText(x) */'
    );
    const noHelperImportLine = noHelperDirect.split('\n').find((l) => l.startsWith('import ')) || '';
    assert.ok(!/\bon\b/.test(noHelperImportLine));
    assert.ok(!noHelperImportLine.includes('bindText'));
  });

  it('Batch 2 regression: compiles <foreignObject>, <template> contents, and reactive {count()} expressions cleanly', () => {
    // 1. <foreignObject> inside <svg> re-enters HTML content rules & accepts case-insensitive HTML/SVG closing
    const svgForeign = compileTemplate('<svg><foreignObject><div /><span>{count()}</span></foreignobject></svg>');
    assert.equal(svgForeign.diagnostics.length, 0);
    const foreignHtml = svgForeign.templates[0].staticHtml;
    assert.ok(foreignHtml.includes('<div></div><span><!-- dynamic-slot --></span>'), `Must expand non-void HTML <div /> inside <foreignObject>: ${foreignHtml}`);
    assert.ok(!foreignHtml.includes('<div />'));
    assert.ok(svgForeign.generatedCode.includes('bindText('));

    // 2. <template> contents generate .content.childNodes traversal and bind live values cleanly
    const nestedTemplate = compileTemplate('<div><template><span>{count()}</span></template></div>');
    assert.ok(
      nestedTemplate.generatedCode.includes('.content.childNodes[0].childNodes[0]'),
      `Generated code for <template> must access .content.childNodes, got:\n${nestedTemplate.generatedCode}`
    );

    const rootTemplate = compileTemplate('<template><span ref="inner" data-n={count()}>{count()}</span></template>');
    assert.ok(
      rootTemplate.generatedCode.includes('root.content.childNodes[0]'),
      `Root <template> binding must target root.content.childNodes, got:\n${rootTemplate.generatedCode}`
    );

    // Execute root <template> template + bindings against a live signal in headless DOM
    const count = signal(1);
    const tplRoot = template(rootTemplate.templates[0].staticHtml)() as any;
    assert.ok(tplRoot.content, 'Headless <template> element must expose .content fragment');
    assert.ok(tplRoot.refs.inner, '<template><span ref="inner"> must populate root.refs.inner via .content');
    const spanEl = tplRoot.content.childNodes[0];
    bindAttr(spanEl, 'data-n', () => count());
    bindText(spanEl.childNodes[0], () => count());
    assert.equal(spanEl.getAttribute('data-n'), '1');
    assert.equal(spanEl.textContent, '1');
    count.value = 42;
    assert.equal(spanEl.getAttribute('data-n'), '42');
    assert.equal(spanEl.textContent, '42');

    // 3. Reactive function-call expression {count()} is not treated as static
    const astRes = compileTemplate('<div data-v={count()}>{count()}</div>');
    assert.equal(isStaticSubtree(astRes.ast!.children[0]), false);
    assert.ok(astRes.generatedCode.includes('bindAttr(root, "data-v", () => (count()))'));
    assert.ok(astRes.generatedCode.includes('bindText(root.childNodes[0], () => (count()))'));
  });
});
