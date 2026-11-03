/**
 * @license Apache-2.0
 * @samrey/runtime - Headless el() and SSR Escaping Tests
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { el, rawHtml, frag, svgEl } from '../src/dom.js';

describe('Headless el() and SSR HTML serialization', () => {
  it('escapes text content containing < > & " in outerHTML', () => {
    const node = el('div', null, 'Hello <script>alert("xss")</script> & "quotes"');
    const html = (node as any).outerHTML;
    assert.ok(!html.includes('<script>'), 'Must escape < in text content');
    assert.ok(html.includes('&lt;script&gt;alert("xss")&lt;/script&gt; &amp; "quotes"'));
  });

  it('escapes attribute values containing < > & " in outerHTML', () => {
    const node = el('a', { title: 'Quote " & <test>' }, 'Link');
    const html = (node as any).outerHTML;
    assert.ok(html.includes('title="Quote &quot; &amp; &lt;test&gt;"'));
  });

  it('renders function children as evaluated value, never source code', () => {
    const getter = () => 'dynamic <value>';
    const node = el('span', null, getter);
    const html = (node as any).outerHTML;
    assert.ok(!html.includes('() =>'), 'Must never render function source code');
    assert.ok(!html.includes('dynamic <value>'), 'Must escape evaluated value');
    assert.ok(html.includes('dynamic &lt;value&gt;'), 'Must include escaped evaluated value');
  });

  it('handles nested arrays, functions in arrays, null, false, and true cleanly', () => {
    const node = el(
      'ul',
      null,
      [
        null,
        false,
        true,
        undefined,
        el('li', null, 'first'),
        [
          el('li', null, () => 'second'),
          [el('li', null, 'third')]
        ]
      ]
    );
    const html = (node as any).outerHTML;
    assert.ok(html.includes('<li>first</li>'));
    assert.ok(html.includes('<li>second</li>'));
    assert.ok(html.includes('<li>third</li>'));
    assert.ok(!html.includes('null'));
    assert.ok(!html.includes('false'));
    assert.ok(!html.includes('true'));
    assert.ok(!html.includes('undefined'));
    assert.ok(!html.includes('() =>'));
  });

  it('evaluates and escapes function attributes in headless mode', () => {
    const node = el('div', { 'data-label': () => 'Value with "quotes" & <tags>' });
    const html = (node as any).outerHTML;
    assert.ok(html.includes('data-label="Value with &quot;quotes&quot; &amp; &lt;tags&gt;"'));
  });

  it('renders rawHtml safely in headless el()', () => {
    const node = el('div', null, rawHtml('<b>Safe Bold</b>'));
    const html = (node as any).outerHTML;
    assert.ok(html.includes('Safe Bold'));
  });

  it('ignores function children that evaluate to null, false, or undefined', () => {
    const node = el('div', null, () => null, () => false, () => undefined);
    const html = (node as any).outerHTML;
    assert.equal(html, '<div></div>');
  });

  it('renders number 0 correctly in headless el()', () => {
    const node = el('span', null, 0, () => 0);
    const html = (node as any).outerHTML;
    assert.equal(html, '<span>00</span>');
  });

  it('ensures headless el() structure matches DOM path conventions', () => {
    const node = el(
      'main',
      { id: 'app', class: 'container' },
      el('header', null, el('h1', null, 'Title')),
      el('section', null, [
        null,
        false,
        el('p', null, () => 'Dynamic content')
      ])
    );
    const html = (node as any).outerHTML;
    assert.equal(
      html,
      '<main id="app" class="container"><header><h1>Title</h1></header><section><p>Dynamic content</p></section></main>'
    );
  });

  it('preserves children and renders correctly with headless frag() and svgEl()', () => {
    const f = frag(el('h1', null, 'Title'), el('p', null, 'Subtitle'));
    assert.equal((f as any).childNodes.length, 2);
    assert.equal((f as any).outerHTML, '<h1>Title</h1><p>Subtitle</p>');

    const wrapped = el('div', null, f);
    assert.equal((wrapped as any).outerHTML, '<div><h1>Title</h1><p>Subtitle</p></div>');

    const s = svgEl('svg', { width: '100', height: '100' }, svgEl('circle', { cx: '50', cy: '50', r: '40' }));
    assert.equal((s as any).outerHTML, '<svg width="100" height="100"><circle cx="50" cy="50" r="40"></circle></svg>');

    const svgWrapper = el('div', { class: 'icon' }, s);
    assert.equal((svgWrapper as any).outerHTML, '<div class="icon"><svg width="100" height="100"><circle cx="50" cy="50" r="40"></circle></svg></div>');
  });

  it('supports replaceChild and fragment unwrapping in headless mode', () => {
    const parent = el('div', null, el('span', null, 'First'), el('span', null, 'Second'));
    const oldChild = (parent as any).childNodes[1];
    const replacement = el('strong', null, 'Replaced');

    (parent as any).replaceChild(replacement, oldChild);
    assert.equal((parent as any).outerHTML, '<div><span>First</span><strong>Replaced</strong></div>');

    // Replace with fragment
    const fragment = frag(el('em', null, 'Part A'), el('em', null, 'Part B'));
    (parent as any).replaceChild(fragment, replacement);
    assert.equal((parent as any).outerHTML, '<div><span>First</span><em>Part A</em><em>Part B</em></div>');
  });
});
