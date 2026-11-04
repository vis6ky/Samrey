import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { Show, Switch, Match, For, el } from '../packages/runtime/src/index.js';
import { signal, createRoot } from '../packages/reactivity/src/index.js';
import { setupBenchmarkDOM, BenchmarkNode } from '../benchmarks/utils/dom-mock.js';

function getNodeText(node: any): string {
  if (!node) return '';
  if (node.nodeType === 3) return node.textContent || '';
  if (node.childNodes && node.childNodes.length > 0) {
    return node.childNodes.map(getNodeText).join('');
  }
  return node.textContent || '';
}

describe('Item 1: Show and Switch Control Flow Semantics', () => {
  setupBenchmarkDOM();

  it('Repro 1: Show with parameterized children re-renders when truthy value identity changes', () => {
    interface User {
      name: string;
    }
    const user = signal<User | null>({ name: 'Ann' });
    const container = new BenchmarkNode(1, 'DIV');

    createRoot((dispose) => {
      const node = Show({
        when: () => user.value,
        fallback: () => el('p', null, 'logged out') as unknown as Node,
        children: (u: User) => el('p', null, 'Hello ' + u.name) as unknown as Node
      });
      container.appendChild(node as unknown as BenchmarkNode);

      const getText = () => {
        const p = container.childNodes.find((n) => n.nodeName === 'P');
        return p ? getNodeText(p) : '';
      };

      // 1. Initial: Ann
      assert.equal(getText(), 'Hello Ann');

      // 2. Ann -> Bob (truthy -> truthy with new value)
      user.value = { name: 'Bob' };
      assert.equal(getText(), 'Hello Bob', 'Expected Hello Bob when user changes from Ann to Bob');

      // 3. Bob -> null (truthy -> falsy)
      user.value = null;
      assert.equal(getText(), 'logged out');

      // 4. null -> Cy (falsy -> truthy)
      user.value = { name: 'Cy' };
      assert.equal(getText(), 'Hello Cy');

      // 5. Cy -> Dee (truthy -> truthy with new value)
      user.value = { name: 'Dee' };
      assert.equal(getText(), 'Hello Dee', 'Expected Hello Dee when user changes from Cy to Dee');

      dispose();
    });
  });

  it('Repro 2: Switch with two Matches re-renders across sequence 1,2,1,3,2', () => {
    const val = signal<number>(1);
    const container = new BenchmarkNode(1, 'DIV');

    createRoot((dispose) => {
      const node = Switch({
        fallback: () => el('p', null, 'none') as unknown as Node,
        children: [
          Match({
            when: () => val.value === 1,
            children: () => el('p', null, 'one') as unknown as Node
          }),
          Match({
            when: () => val.value === 2,
            children: () => el('p', null, 'two') as unknown as Node
          })
        ]
      });
      container.appendChild(node as unknown as BenchmarkNode);

      const getText = () => {
        const p = container.childNodes.find((n) => n.nodeName === 'P');
        return p ? getNodeText(p) : '';
      };

      // 1. val = 1 -> "one"
      assert.equal(getText(), 'one');

      // 2. val = 2 -> "two"
      val.value = 2;
      assert.equal(getText(), 'two', 'Expected "two" when val becomes 2');

      // 3. val = 1 -> "one"
      val.value = 1;
      assert.equal(getText(), 'one', 'Expected "one" when val becomes 1 again');

      // 4. val = 3 -> "none"
      val.value = 3;
      assert.equal(getText(), 'none', 'Expected "none" (fallback) when val is 3');

      // 5. val = 2 -> "two"
      val.value = 2;
      assert.equal(getText(), 'two', 'Expected "two" when val becomes 2 again');

      dispose();
    });
  });

  it('Show with a boolean gate (0 params) does NOT re-render on repeated truthy values', () => {
    const num = signal<number>(1);
    let renderCount = 0;
    const container = new BenchmarkNode(1, 'DIV');

    createRoot((dispose) => {
      const node = Show({
        when: () => num.value,
        children: () => {
          renderCount++;
          return el('p', null, `Rendered ${renderCount}`) as unknown as Node;
        }
      });
      container.appendChild(node as unknown as BenchmarkNode);

      assert.equal(renderCount, 1);

      // num changes 1 -> 2 -> 3 (all truthy): boolean gate must NOT re-render
      num.value = 2;
      assert.equal(renderCount, 1, 'Render count must remain 1 on 1 -> 2');
      num.value = 3;
      assert.equal(renderCount, 1, 'Render count must remain 1 on 2 -> 3');

      // num changes to 0 (falsy)
      num.value = 0;
      assert.equal(renderCount, 1);

      // num changes 0 -> 4 (falsy -> truthy): must render
      num.value = 4;
      assert.equal(renderCount, 2, 'Render count must become 2 on 0 -> 4');

      // num changes 4 -> 5 (truthy -> truthy): must NOT re-render
      num.value = 5;
      assert.equal(renderCount, 2);

      dispose();
    });
  });

  it('Show -> fallback -> Show transition cleanly mounts and disposes', () => {
    const flag = signal<boolean>(true);
    const container = new BenchmarkNode(1, 'DIV');

    createRoot((dispose) => {
      const node = Show({
        when: () => flag.value,
        fallback: () => el('span', null, 'Fallback') as unknown as Node,
        children: () => el('span', null, 'Active') as unknown as Node
      });
      container.appendChild(node as unknown as BenchmarkNode);

      const getText = () => {
        const span = container.childNodes.find((n) => n.nodeName === 'SPAN');
        return span ? getNodeText(span) : '';
      };

      assert.equal(getText(), 'Active');

      flag.value = false;
      assert.equal(getText(), 'Fallback');

      flag.value = true;
      assert.equal(getText(), 'Active');

      dispose();
    });
  });

  it('Switch with 3 cases and fallback transitions correctly', () => {
    const status = signal<string>('loading');
    const container = new BenchmarkNode(1, 'DIV');

    createRoot((dispose) => {
      const node = Switch({
        fallback: () => el('span', null, 'Unknown') as unknown as Node,
        children: [
          Match({
            when: () => status.value === 'loading',
            children: () => el('span', null, 'Loading...') as unknown as Node
          }),
          Match({
            when: () => status.value === 'success',
            children: (val) => el('span', null, 'Success!') as unknown as Node
          }),
          Match({
            when: () => status.value === 'error',
            children: () => el('span', null, 'Error!') as unknown as Node
          })
        ]
      });
      container.appendChild(node as unknown as BenchmarkNode);

      const getText = () => {
        const span = container.childNodes.find((n) => n.nodeName === 'SPAN');
        return span ? getNodeText(span) : '';
      };

      assert.equal(getText(), 'Loading...');

      status.value = 'success';
      assert.equal(getText(), 'Success!');

      status.value = 'error';
      assert.equal(getText(), 'Error!');

      status.value = 'idle';
      assert.equal(getText(), 'Unknown');

      status.value = 'loading';
      assert.equal(getText(), 'Loading...');

      dispose();
    });
  });

  it('Nested Show inside For maintains independent state per row', () => {
    interface Item {
      id: number;
      name: string;
      showDetails: ReturnType<typeof signal<boolean>>;
    }
    const items = signal<Item[]>([
      { id: 1, name: 'Item 1', showDetails: signal(false) },
      { id: 2, name: 'Item 2', showDetails: signal(true) }
    ]);
    const container = new BenchmarkNode(1, 'DIV');

    createRoot((dispose) => {
      const forNode = For({
        each: () => items.value,
        key: (item) => item.id,
        children: (item) => {
          const row = new BenchmarkNode(1, 'DIV', item.name);
          const detail = Show({
            when: () => item.showDetails.value,
            children: () => el('span', null, `[Details: ${item.name}]`) as unknown as Node
          });
          row.appendChild(detail as unknown as BenchmarkNode);
          return row as unknown as Node;
        }
      });
      container.appendChild(forNode as unknown as BenchmarkNode);

      const rows = container.childNodes.filter((n) => n.nodeName === 'DIV');
      assert.equal(rows.length, 2);

      // Row 1: showDetails = false -> no span
      assert.equal(rows[0].childNodes.filter((n) => n.nodeName === 'SPAN').length, 0);
      // Row 2: showDetails = true -> has span
      assert.equal(rows[1].childNodes.filter((n) => n.nodeName === 'SPAN').length, 1);
      assert.equal(getNodeText(rows[1].childNodes.find((n) => n.nodeName === 'SPAN')), '[Details: Item 2]');

      // Toggle row 1 to true, row 2 to false
      items.value[0].showDetails.value = true;
      items.value[1].showDetails.value = false;

      assert.equal(rows[0].childNodes.filter((n) => n.nodeName === 'SPAN').length, 1);
      assert.equal(getNodeText(rows[0].childNodes.find((n) => n.nodeName === 'SPAN')), '[Details: Item 1]');
      assert.equal(rows[1].childNodes.filter((n) => n.nodeName === 'SPAN').length, 0);

      dispose();
    });
  });
});
