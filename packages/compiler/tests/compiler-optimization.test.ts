import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  compileTemplate,
  TemplateParser,
  evaluateConstantExpression,
  isStaticSubtree,
  buildAIRFromAST
} from '../src/index.js';

describe('@samrey/compiler - Phase 9B Optimizations', () => {
  it('evaluates and folds constant expressions correctly', () => {
    assert.deepEqual(evaluateConstantExpression('"hello"'), { isConstant: true, value: 'hello' });
    assert.deepEqual(evaluateConstantExpression("'world'"), { isConstant: true, value: 'world' });
    assert.deepEqual(evaluateConstantExpression('`template-static`'), { isConstant: true, value: 'template-static' });
    assert.deepEqual(evaluateConstantExpression('`dynamic-${val}`'), { isConstant: false, value: null });
    assert.deepEqual(evaluateConstantExpression('42'), { isConstant: true, value: '42' });
    assert.deepEqual(evaluateConstantExpression('-3.14'), { isConstant: true, value: '-3.14' });
    assert.deepEqual(evaluateConstantExpression('0xFF'), { isConstant: true, value: '0xFF' });
    assert.deepEqual(evaluateConstantExpression('true'), { isConstant: true, value: 'true' });
    assert.deepEqual(evaluateConstantExpression('false'), { isConstant: true, value: 'false' });
    assert.deepEqual(evaluateConstantExpression('null'), { isConstant: true, value: 'null' });
    assert.deepEqual(evaluateConstantExpression('undefined'), { isConstant: true, value: 'undefined' });
    assert.deepEqual(evaluateConstantExpression('count.value'), { isConstant: false, value: null });
    assert.deepEqual(evaluateConstantExpression('() => 123'), { isConstant: false, value: null });
  });

  it('hoists constant attributes and interpolations into static HTML skeleton', () => {
    const template = `
      <div id={"static-id"} class={'btn-primary'} data-num={100} title="Regular Title">
        <span>{"Static String Inside Interpolation"}</span>
        <p>{42}</p>
        <h1>{dynamicTitle.value}</h1>
      </div>
    `;

    const compiled = compileTemplate(template);
    assert.equal(compiled.templates.length, 1);
    const html = compiled.templates[0].staticHtml;

    // Constant folded attributes must be in the static HTML
    assert.ok(html.includes('id="static-id"'));
    assert.ok(html.includes('class="btn-primary"'));
    assert.ok(html.includes('data-num="100"'));
    assert.ok(html.includes('title="Regular Title"'));

    // Constant folded text must be in the static HTML
    assert.ok(html.includes('Static String Inside Interpolation'));
    assert.ok(html.includes('42'));

    // Dynamic slot must remain for dynamicTitle.value
    assert.equal(compiled.templates[0].dynamicSlots.length, 1);
    assert.equal(compiled.templates[0].dynamicSlots[0].type, 'dynamic-text');
    if (compiled.templates[0].dynamicSlots[0].type === 'dynamic-text') {
      assert.equal(compiled.templates[0].dynamicSlots[0].expression, 'dynamicTitle.value');
    }
  });

  it('generates tree-shakable runtime imports based on what is used', () => {
    // 1. Purely static template -> only imports template
    const staticComp = compileTemplate('<div class="hero"><h1>Static Content</h1></div>');
    const staticImportLine = staticComp.generatedCode.split('\n').find((l) => l.startsWith('import ')) || '';
    assert.ok(staticImportLine.includes('template'));
    assert.ok(!staticImportLine.includes('bindText'));
    assert.ok(!staticImportLine.includes('bindAttr'));
    assert.ok(!/\bon\b/.test(staticImportLine));

    // 2. Template with only dynamic text -> imports template, bindText
    const textComp = compileTemplate('<div>{greeting.value}</div>');
    const textImportLine = textComp.generatedCode.split('\n').find((l) => l.startsWith('import ')) || '';
    assert.ok(textImportLine.includes('bindText'));
    assert.ok(!textImportLine.includes('bindAttr'));
    assert.ok(!/\bon\b/.test(textImportLine));

    // 3. Template with dynamic attribute and event -> imports template, bindAttr, on
    const eventComp = compileTemplate('<button class={theme.value} @click={handleClick}>Click</button>');
    const eventImportLine = eventComp.generatedCode.split('\n').find((l) => l.startsWith('import ')) || '';
    assert.ok(eventImportLine.includes('bindAttr'));
    assert.ok(/\bon\b/.test(eventImportLine));
  });

  it('preserves exact source location lines, columns, and offsets with fast scanner', () => {
    const src = `<div>\n  <span\n    id="test">Text</span>\n</div>`;
    const parser = new TemplateParser(src);
    const { ast } = parser.parse();

    assert.equal(ast.loc.start.line, 1);
    assert.equal(ast.loc.start.column, 1);
    assert.equal(ast.loc.start.offset, 0);

    const rootElem = ast.children[0];
    assert.ok(rootElem && rootElem.type === 'Element');

    const span = rootElem.children.find((c) => c.type === 'Element');
    assert.ok(span && span.type === 'Element');
    assert.equal(span.loc.start.line, 2);
    assert.equal(span.tag, 'span');

    const attr = span.attributes[0];
    assert.ok(attr);
    assert.equal(attr.loc.start.line, 3);
    assert.equal(attr.name, 'id');
    assert.equal(attr.value, 'test');
  });

  it('correctly identifies static subtrees', () => {
    const staticParser = new TemplateParser('<div class="banner"><h2>Title</h2><p>Description</p></div>');
    const { ast: staticAst } = staticParser.parse();
    assert.equal(isStaticSubtree(staticAst.children[0]), true);

    const dynamicParser = new TemplateParser('<div class="banner"><h2>{title.value}</h2></div>');
    const { ast: dynamicAst } = dynamicParser.parse();
    assert.equal(isStaticSubtree(dynamicAst.children[0]), false);
  });
});
