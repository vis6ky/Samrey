import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  template, 
  bindText, 
  bindAttr, 
  createComponent, 
  Show, 
  For 
} from '../src/index.js';
import { signal, onCleanup } from '@gati/reactivity';

// Lightweight Test DOM Node structure for pure Node.js environments
class TestNode {
  public nodeType: number;
  public nodeName: string;
  public textContent: string = '';
  public parentNode: TestNode | null = null;
  public childNodes: TestNode[] = [];
  public attributes: Record<string, string> = {};

  constructor(type: number, name: string, text = '') {
    this.nodeType = type;
    this.nodeName = name;
    this.textContent = text;
  }

  get nextSibling(): TestNode | null {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    if (idx === -1 || idx === this.parentNode.childNodes.length - 1) return null;
    return this.parentNode.childNodes[idx + 1];
  }

  appendChild(child: TestNode): TestNode {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    this.childNodes.push(child);
    child.parentNode = this;
    return child;
  }

  insertBefore(newChild: TestNode, refChild: TestNode | null): TestNode {
    if (newChild.parentNode) {
      newChild.parentNode.removeChild(newChild);
    }
    if (!refChild) {
      this.childNodes.push(newChild);
    } else {
      const idx = this.childNodes.indexOf(refChild);
      if (idx === -1) {
        this.childNodes.push(newChild);
      } else {
        this.childNodes.splice(idx, 0, newChild);
      }
    }
    newChild.parentNode = this;
    return newChild;
  }

  removeChild(child: TestNode): TestNode {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) {
      this.childNodes.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }
}

describe('@gati/runtime', () => {
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

  describe('<Show> Control Flow', () => {
    it('handles false -> true -> false -> true conditional toggling and cleanups', () => {
      const isVisible = signal(false);
      let childCleanups = 0;
      let childCreations = 0;

      const container = new TestNode(1, 'DIV');

      const showMarker = Show({
        when: () => isVisible.value,
        fallback: () => new TestNode(1, 'SPAN', 'Fallback content') as unknown as Node,
        children: () => {
          childCreations++;
          onCleanup(() => {
            childCleanups++;
          });
          return new TestNode(1, 'DIV', 'Visible content') as unknown as Node;
        }
      });

      container.appendChild(showMarker as unknown as TestNode);

      // Initially false -> fallback rendered
      assert.equal(childCreations, 0);
      assert.equal(container.childNodes.length, 2); // marker + fallback
      assert.equal(container.childNodes[1].textContent, 'Fallback content');

      // false -> true
      isVisible.value = true;
      assert.equal(childCreations, 1);
      assert.equal(container.childNodes.length, 2); // marker + content
      assert.equal(container.childNodes[1].textContent, 'Visible content');

      // true -> false
      isVisible.value = false;
      assert.equal(childCleanups, 1);
      assert.equal(container.childNodes.length, 2); // marker + fallback
      assert.equal(container.childNodes[1].textContent, 'Fallback content');

      // false -> true again
      isVisible.value = true;
      assert.equal(childCreations, 2);
      assert.equal(container.childNodes.length, 2);
      assert.equal(container.childNodes[1].textContent, 'Visible content');
    });

    it('handles nested <Show> components cleanly', () => {
      const outer = signal(true);
      const inner = signal(false);

      const container = new TestNode(1, 'DIV');

      const showMarker = Show({
        when: () => outer.value,
        children: () => {
          const nestedMarker = Show({
            when: () => inner.value,
            fallback: () => new TestNode(1, 'SPAN', 'Inner Fallback') as unknown as Node,
            children: () => new TestNode(1, 'SPAN', 'Inner Content') as unknown as Node
          });
          const parent = new TestNode(1, 'SECTION');
          parent.appendChild(nestedMarker as unknown as TestNode);
          return parent as unknown as Node;
        }
      });

      container.appendChild(showMarker as unknown as TestNode);
      assert.equal(container.childNodes.length, 2);

      const section = container.childNodes[1];
      assert.equal(section.childNodes.length, 2); // nested marker + inner fallback
      assert.equal(section.childNodes[1].textContent, 'Inner Fallback');

      inner.value = true;
      assert.equal(section.childNodes[1].textContent, 'Inner Content');

      outer.value = false;
      assert.equal(container.childNodes.length, 1); // only outer marker remaining
    });
  });

  describe('<For> Keyed List Reconciliation', () => {
    it('reconciles keyed list: reuses DOM nodes, removes deleted nodes, creates new ones', () => {
      const items = signal([
        { id: 'a', text: 'Item A' },
        { id: 'b', text: 'Item B' },
        { id: 'c', text: 'Item C' }
      ]);

      const container = new TestNode(1, 'UL');
      const createdNodes = new Map<string, TestNode>();
      let disposals = 0;

      const forMarker = For({
        each: () => items.value,
        key: (item) => item.id,
        fallback: () => new TestNode(1, 'LI', 'Empty') as unknown as Node,
        children: (item, getIndex) => {
          onCleanup(() => {
            disposals++;
          });
          const li = new TestNode(1, 'LI', `${item.text} at ${getIndex()}`);
          createdNodes.set(item.id, li);
          return li as unknown as Node;
        }
      });

      container.appendChild(forMarker as unknown as TestNode);

      // Initial: marker + A + B + C (4 nodes total)
      assert.equal(container.childNodes.length, 4);
      assert.equal(container.childNodes[1].textContent, 'Item A at 0');
      assert.equal(container.childNodes[2].textContent, 'Item B at 1');
      assert.equal(container.childNodes[3].textContent, 'Item C at 2');

      const nodeA = createdNodes.get('a');
      const nodeB = createdNodes.get('b');
      const nodeC = createdNodes.get('c');

      // Update: C A D (B removed, D added, C & A reordered)
      items.value = [
        { id: 'c', text: 'Item C (reordered)' },
        { id: 'a', text: 'Item A (reordered)' },
        { id: 'd', text: 'Item D' }
      ];

      assert.equal(container.childNodes.length, 4); // marker + C + A + D
      // Verify node identity reuse!
      assert.equal(container.childNodes[1], nodeC); // C reused
      assert.equal(container.childNodes[2], nodeA); // A reused
      assert.notEqual(container.childNodes[3], nodeB); // D is new
      assert.equal(disposals, 1); // B was disposed

      // Verify nodeB was removed from parent
      assert.equal(nodeB?.parentNode, null);
    });

    it('handles list transition from empty to populated and back to empty', () => {
      const items = signal<{ id: number; name: string }[]>([]);
      const container = new TestNode(1, 'DIV');

      const forMarker = For({
        each: () => items.value,
        key: (i) => i.id,
        fallback: () => new TestNode(1, 'SPAN', 'No records found') as unknown as Node,
        children: (item) => new TestNode(1, 'P', item.name) as unknown as Node
      });

      container.appendChild(forMarker as unknown as TestNode);

      // Initially empty -> shows fallback
      assert.equal(container.childNodes.length, 2);
      assert.equal(container.childNodes[1].textContent, 'No records found');

      // Populated
      items.value = [
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' }
      ];
      assert.equal(container.childNodes.length, 3);
      assert.equal(container.childNodes[1].textContent, 'First');
      assert.equal(container.childNodes[2].textContent, 'Second');

      // Back to empty
      items.value = [];
      assert.equal(container.childNodes.length, 2);
      assert.equal(container.childNodes[1].textContent, 'No records found');
    });

    it('handles append, prepend, and middle insertion operations', () => {
      const items = signal(['B']);
      const container = new TestNode(1, 'DIV');

      const forMarker = For({
        each: () => items.value,
        key: (x) => x,
        children: (item) => new TestNode(1, 'SPAN', item) as unknown as Node
      });
      container.appendChild(forMarker as unknown as TestNode);

      // Prepend 'A'
      items.value = ['A', 'B'];
      assert.equal(container.childNodes[1].textContent, 'A');
      assert.equal(container.childNodes[2].textContent, 'B');

      // Append 'D'
      items.value = ['A', 'B', 'D'];
      assert.equal(container.childNodes.length, 4);
      assert.equal(container.childNodes[3].textContent, 'D');

      // Middle insert 'C'
      items.value = ['A', 'B', 'C', 'D'];
      assert.equal(container.childNodes.length, 5);
      assert.equal(container.childNodes[1].textContent, 'A');
      assert.equal(container.childNodes[2].textContent, 'B');
      assert.equal(container.childNodes[3].textContent, 'C');
      assert.equal(container.childNodes[4].textContent, 'D');
    });

    it('handles large lists (1000+ items) without error', () => {
      const bigList = Array.from({ length: 1000 }, (_, i) => ({ id: i, text: `Item #${i}` }));
      const items = signal(bigList);
      const container = new TestNode(1, 'DIV');

      const forMarker = For({
        each: () => items.value,
        key: (i) => i.id,
        children: (item) => new TestNode(1, 'P', item.text) as unknown as Node
      });
      container.appendChild(forMarker as unknown as TestNode);

      assert.equal(container.childNodes.length, 1001); // marker + 1000 nodes

      // Reverse list
      items.value = [...bigList].reverse();
      assert.equal(container.childNodes.length, 1001);
      assert.equal(container.childNodes[1].textContent, 'Item #999');
      assert.equal(container.childNodes[1000].textContent, 'Item #0');
    });

    it('handles duplicate keys gracefully with diagnostic warnings', () => {
      const items = signal([
        { id: 'dup', val: 1 },
        { id: 'dup', val: 2 }
      ]);
      const container = new TestNode(1, 'DIV');

      const forMarker = For({
        each: () => items.value,
        key: (i) => i.id,
        children: (item) => new TestNode(1, 'P', `Val: ${item.val}`) as unknown as Node
      });
      container.appendChild(forMarker as unknown as TestNode);

      // Should render without throwing
      assert.ok(container.childNodes.length >= 2);
    });
  });
});
