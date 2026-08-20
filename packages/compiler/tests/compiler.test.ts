import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  compileTemplate, 
  classifyBindingContext, 
  lintA11y, 
  hoistTemplates,
  TemplateParser
} from '../src/index.js';

describe('@aether/compiler', () => {
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

  it('parses custom components and control flow (<Show> and <For>)', () => {
    const source = `
      <Card title="User Dashboard">
        <Show when={isLoggedIn()} fallback={<span>Please log in</span>}>
          <UserBadge name={user.name} />
          <For each={items()} key={(item) => item.id} fallback={<p>No items</p>}>
            <ItemRow item={item} />
          </For>
        </Show>
      </Card>
    `;

    const parser = new TemplateParser(source);
    const { ast, diagnostics } = parser.parse();

    assert.equal(diagnostics.length, 0);
    const card = ast.children.find((c) => c.type === 'Component');
    assert.ok(card && card.type === 'Component');
    assert.equal(card.name, 'Card');

    const showNode = card.children.find((c) => c.type === 'Show');
    assert.ok(showNode && showNode.type === 'Show');
    assert.equal(showNode.when, 'isLoggedIn()');

    const forNode = showNode.children.find((c) => c.type === 'For');
    assert.ok(forNode && forNode.type === 'For');
    assert.equal(forNode.each, 'items()');
    assert.equal(forNode.key, '(item) => item.id');
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
});
