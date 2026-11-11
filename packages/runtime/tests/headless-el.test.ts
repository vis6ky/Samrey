/**
 * @license Apache-2.0
 * @samrey/runtime - Headless el() and SSR Escaping Tests
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { signal, createRoot } from '@samrey/reactivity';
import { el, rawHtml, frag, svgEl, text } from '../src/dom.js';
import { createHeadlessCommentNode, createHeadlessFragment } from '../src/headless-dom.js';

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

  it('F-03: enforces attribute validation, URL/CSS sanitization, and Trusted Types innerHTML in headless mode', () => {
    const node = el('div', {
      'id" onclick="alert(1)': 'bad',
      __proto__: 'polluted',
      srcdoc: '<script>alert(1)</script>',
      onclick: 'alert(1)',
      href: 'javascript:alert(1)',
      style: 'color: red; width: expression(alert(1))',
      'data-safe': 'ok'
    }) as any;

    node.setAttribute('onclick', 'alert(2)');
    node.setAttribute('srcdoc', '<script>alert(2)</script>');
    node.setAttribute('bad"key', 'x');
    node.setAttribute('src', 'javascript:alert(3)');
    node.setAttribute('style', 'background: url("javascript:alert(4)"); color: green');
    node.innerHTML = '<strong>Safe</strong><script>alert(5)</script>';

    const html = node.outerHTML;
    assert.ok(!html.includes('onclick'));
    assert.ok(!html.includes('srcdoc'));
    assert.ok(!html.includes('javascript:'));
    assert.ok(!html.includes('expression('));
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('bad"key'));
    assert.ok(html.includes('data-safe="ok"'));
    assert.ok(html.includes('color: green'));
    assert.ok(html.includes('<strong>Safe</strong>'));
  });

  it('supports reactive attributes, class:* toggles, children, text(fn), and rawHtml(fn) in headless mode', () => {
    const active = signal(false);
    const label = signal('init');
    const htmlFrag = signal('<em>one</em>');

    let node!: any;
    let txtNode!: any;
    let rawNode!: any;

    const dispose = createRoot((d) => {
      node = el(
        'div',
        {
          className: 'box',
          'class:active': () => active.value,
          'data-state': () => label.value
        },
        () => `Child:${label.value}`
      );
      txtNode = text(() => `Text:${label.value}`);
      rawNode = rawHtml(() => htmlFrag.value);
      return d;
    });

    assert.equal(node.getAttribute('class'), 'box');
    assert.equal(node.getAttribute('data-state'), 'init');
    assert.ok(node.outerHTML.includes('Child:init'));
    assert.equal(txtNode.textContent, 'Text:init');
    assert.ok(rawNode.outerHTML.includes('<em>one</em>'));

    active.value = true;
    label.value = 'next';
    htmlFrag.value = '<b>two</b>';

    assert.equal(node.getAttribute('class'), 'box active');
    assert.equal(node.getAttribute('data-state'), 'next');
    assert.ok(node.outerHTML.includes('Child:next'));
    assert.equal(txtNode.textContent, 'Text:next');
    assert.ok(rawNode.outerHTML.includes('<b>two</b>'));
    dispose();
  });

  it('excludes Comment nodes from headless Element and DocumentFragment textContent per DOM spec', () => {
    const comment = createHeadlessCommentNode('samrey:dynamic');
    assert.equal(comment.textContent, 'samrey:dynamic');

    const host = el('span', null, 'Visible') as any;
    host.appendChild(comment);
    assert.equal(host.textContent, 'Visible');

    const docFrag = createHeadlessFragment();
    docFrag.appendChild(el('em', null, 'A'));
    docFrag.appendChild(createHeadlessCommentNode('hidden-marker'));
    docFrag.appendChild(text('B'));
    assert.equal(docFrag.textContent, 'AB');
  });
});
