import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { For } from '../packages/runtime/src/index.js';
import { signal, createRoot, onCleanup } from '../packages/reactivity/src/index.js';
import { setupBenchmarkDOM, BenchmarkNode } from '../benchmarks/utils/dom-mock.js';

describe('Issue 10: <For> with duplicate keys leaks rows and shows wrong count', () => {
  setupBenchmarkDOM();

  it('renders every item as its own row and disposes all rows without leaks across updates and disposal', () => {
    let createdOwners = 0;
    let disposedOwners = 0;

    const listSig = signal<number[]>([1, 1, 2, 2, 3]);
    const container = new BenchmarkNode(1, 'UL');
    let doDispose: () => void = () => {};

    createRoot((dispose) => {
      doDispose = dispose;
      const forNode = For({
        each: () => listSig.value,
        children: (item) => {
          createdOwners++;
          onCleanup(() => {
            disposedOwners++;
          });
          const li = new BenchmarkNode(1, 'LI', String(item));
          return li as unknown as Node;
        }
      });
      container.appendChild(forNode as unknown as BenchmarkNode);
    });

    // Function to count item LI nodes in container
    const getRowTexts = () =>
      container.childNodes
        .filter((n) => n.nodeName === 'LI')
        .map((n) => n.textContent);

    // 1. Initial [1, 1, 2, 2, 3] -> 5 rows
    assert.deepEqual(getRowTexts(), ['1', '1', '2', '2', '3']);
    assert.equal(createdOwners, 5);
    assert.equal(disposedOwners, 0);

    // 2. Update -> [1, 2, 2, 4] -> expected 4 rows
    listSig.value = [1, 2, 2, 4];
    assert.deepEqual(getRowTexts(), ['1', '2', '2', '4']);
    // Initial had 5, now 4. Exactly 2 rows were removed (second 1, and 3), 1 new row created (4)
    assert.equal(createdOwners, 6);
    assert.equal(disposedOwners, 2);

    // 3. Update -> [] -> expected 0 rows
    listSig.value = [];
    assert.deepEqual(getRowTexts(), []);
    assert.equal(disposedOwners, 6);

    // 4. Update -> [5, 5] -> expected 2 rows
    listSig.value = [5, 5];
    assert.deepEqual(getRowTexts(), ['5', '5']);
    assert.equal(createdOwners, 8);
    assert.equal(disposedOwners, 6);

    // 5. Dispose -> expected 0 rows, created owners == disposed owners
    doDispose();
    assert.deepEqual(getRowTexts(), []);
    assert.equal(createdOwners, 8);
    assert.equal(disposedOwners, 8, 'Created owners must equal disposed owners after dispose');
  });

  it('reuses DOM rows for matching occurrences across updates', () => {
    const listSig = signal<number[]>([1, 1, 2]);
    const container = new BenchmarkNode(1, 'UL');
    const renderedNodes: BenchmarkNode[] = [];

    let doDispose: () => void = () => {};
    createRoot((dispose) => {
      doDispose = dispose;
      const forNode = For({
        each: () => listSig.value,
        children: (item) => {
          const li = new BenchmarkNode(1, 'LI', String(item));
          renderedNodes.push(li);
          return li as unknown as Node;
        }
      });
      container.appendChild(forNode as unknown as BenchmarkNode);
    });

    const first1 = renderedNodes[0];
    const second1 = renderedNodes[1];
    const first2 = renderedNodes[2];

    // Update to [1, 1, 3]
    listSig.value = [1, 1, 3];

    const currentLiNodes = container.childNodes.filter((n) => n.nodeName === 'LI');
    assert.equal(currentLiNodes.length, 3);
    // Occurrence 0 of 1 and occurrence 1 of 1 should be reused
    assert.strictEqual(currentLiNodes[0], first1, 'Occurrence 0 of 1 should be reused');
    assert.strictEqual(currentLiNodes[1], second1, 'Occurrence 1 of 1 should be reused');

    doDispose();
  });
});
