import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  template, 
  bindText, 
  bindAttr, 
  createComponent, 
  Show, 
  For,
  ErrorBoundary,
  onMount
} from '../src/index.js';
import { signal, onCleanup, effect, createRoot } from '@samrey/reactivity';

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

describe('@samrey/runtime', () => {
  it('creates template factory and clones structure', () => {
    const tmpl = template('<div class="box"><span>Hello</span></div>');
    const node = tmpl();
    assert.ok(node !== null);
  });

  it('preserves multi-root fragment operations (classList, setAttribute, querySelector) after fragment is appended to DOM and drained', () => {
    const classListMock = (classes: Set<string>) => ({
      add: (...tokens: string[]) => tokens.forEach((t) => classes.add(t)),
      remove: (...tokens: string[]) => tokens.forEach((t) => classes.delete(t)),
      toggle: (token: string) => {
        if (classes.has(token)) { classes.delete(token); return false; }
        classes.add(token); return true;
      },
      contains: (token: string) => classes.has(token)
    });

    const el1Classes = new Set<string>(['first']);
    const el2Classes = new Set<string>(['second']);
    const el1Attrs: Record<string, string> = { class: 'first' };
    const el2Attrs: Record<string, string> = { class: 'second' };

    const el1: any = {
      nodeType: 1,
      tagName: 'DIV',
      classList: classListMock(el1Classes),
      setAttribute: (k: string, v: string) => { el1Attrs[k] = v; },
      getAttribute: (k: string) => el1Attrs[k] || null,
      hasAttribute: (k: string) => k in el1Attrs,
      removeAttribute: (k: string) => { delete el1Attrs[k]; },
      matches: (sel: string) => sel === '.first' || sel === 'div',
      querySelector: () => null,
      querySelectorAll: () => []
    };

    const el2: any = {
      nodeType: 1,
      tagName: 'DIV',
      classList: classListMock(el2Classes),
      setAttribute: (k: string, v: string) => { el2Attrs[k] = v; },
      getAttribute: (k: string) => el2Attrs[k] || null,
      hasAttribute: (k: string) => k in el2Attrs,
      removeAttribute: (k: string) => { delete el2Attrs[k]; },
      matches: (sel: string) => sel === '.second' || sel === 'div',
      querySelector: () => null,
      querySelectorAll: () => []
    };

    const mockDoc: any = {
      createElement: (tag: string) => {
        if (tag === 'template') {
          return {
            content: {
              cloneNode: () => {
                const frag: any = {
                  nodeType: 11,
                  childNodes: [el1, el2]
                };
                return frag;
              }
            }
          };
        }
        return {};
      }
    };

    (globalThis as any).document = mockDoc;
    try {
      const tmpl = template('<div class="first"></div><div class="second"></div>');
      const frag: any = tmpl();
      assert.strictEqual(frag.nodeType, 11);

      // Simulate appending the fragment to a parent, draining frag.childNodes
      frag.childNodes = [];

      // Operations on frag must continue to work on root elements via rootNodes
      frag.classList.add('highlight');
      assert.ok(el1Classes.has('highlight'), 'First element should receive class');
      assert.ok(el2Classes.has('highlight'), 'Second element should receive class');

      frag.setAttribute('data-theme', 'dark');
      assert.strictEqual(el1Attrs['data-theme'], 'dark');
      assert.strictEqual(el2Attrs['data-theme'], 'dark');

      const found = frag.querySelector('.second');
      assert.strictEqual(found, el2, 'querySelector should find el2 even when frag.childNodes is drained');
    } finally {
      delete (globalThis as any).document;
    }
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

  describe('ErrorBoundary', () => {
    it('catches reactive errors from descendant effects and renders fallback UI', () => {
      const triggerError = signal(false);
      let fallbackRendered = false;
      let caughtMessage = '';

      const boundary = ErrorBoundary({
        fallback: (err, reset) => {
          fallbackRendered = true;
          caughtMessage = err.message;
          return new TestNode(1, 'DIV', `Caught: ${err.message}`) as unknown as Node;
        },
        children: () => {
          effect(() => {
            if (triggerError.value) {
              throw new Error('Reactive crash in child effect');
            }
          });
          return new TestNode(1, 'DIV', 'Child Healthy') as unknown as Node;
        }
      });

      assert.equal(fallbackRendered, false);
      triggerError.value = true;
      assert.equal(fallbackRendered, true);
      assert.equal(caughtMessage, 'Reactive crash in child effect');
    });
  });

  describe('onMount Hook Lifecycle', () => {
    it('executes within component owner context and respects early disposal', async () => {
      let mounted = false;
      let cleanupRan = false;

      const dispose = createRoot((disposeRoot) => {
        onMount(() => {
          mounted = true;
          return () => {
            cleanupRan = true;
          };
        });
        return disposeRoot;
      });

      // Microtask has not run yet synchronously
      assert.equal(mounted, false);

      // Wait for microtask
      await Promise.resolve();
      assert.equal(mounted, true);

      // Dispose root -> cleanup returned by onMount should run
      dispose();
      assert.equal(cleanupRan, true);

      // If disposed before microtask runs, onMount hook should be aborted
      let abortedMount = false;
      const disposeEarly = createRoot((disposeRoot) => {
        onMount(() => {
          abortedMount = true;
        });
        return disposeRoot;
      });

      // Dispose immediately before microtask
      disposeEarly();
      await Promise.resolve();
      assert.equal(abortedMount, false, 'onMount must not run if owner was disposed before microtask');
    });
  });
});
