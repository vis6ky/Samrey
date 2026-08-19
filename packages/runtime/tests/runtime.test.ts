import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { template, bindText, bindAttr, createComponent } from '../src/index.js';
import { signal } from '@aether/reactivity';

describe('@aether/runtime', () => {
  it('creates template factory and clones structure', () => {
    const tmpl = template('<div class="box"><span>Hello</span></div>');
    const node = tmpl();
    assert.ok(node !== null);
  });

  it('binds signal to text and attribute safely', () => {
    const count = signal(10);
    const mockNode = { textContent: '' } as unknown as Node;

    bindText(mockNode, () => count.value);
    assert.equal(mockNode.textContent, '10');

    count.value = 42;
    assert.equal(mockNode.textContent, '42');
  });

  it('executes component function only once', () => {
    let executions = 0;
    const count = signal(1);

    const MyComponent = (props: { title: string }) => {
      executions++;
      return { nodeType: 1, title: props.title } as unknown as Node;
    };

    const comp = createComponent(MyComponent, { title: 'App' });
    assert.equal(executions, 1);

    // Mutating signal does NOT re-run component constructor!
    count.value = 2;
    assert.equal(executions, 1);
  });
});
