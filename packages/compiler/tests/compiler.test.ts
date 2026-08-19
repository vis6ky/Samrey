import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  compileTemplate, 
  classifyBindingContext, 
  lintA11y, 
  hoistTemplates 
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
  });
});
