import { describe, it } from 'node:test';
import assert from 'node:assert';
import { signal, effect, onCleanup } from '@samrey/reactivity';
import { mount, el } from '@samrey/runtime';

function createMockContainer(): HTMLElement {
  return {
    childNodes: [] as any[],
    replaceChildren(...nodes: any[]) {
      this.childNodes = nodes;
    }
  } as unknown as HTMLElement;
}

describe('Review Item 5: mount() Double-Call Container Root Disposal via WeakMap', () => {
  it('disposes first root effects when mount() is called twice on the same container', () => {
    const container = createMockContainer();
    const count1 = signal(0);
    const count2 = signal(0);
    let effect1Runs = 0;
    let effect2Runs = 0;
    let cleanup1Ran = false;

    // First mount
    mount(() => {
      effect(() => {
        count1.value;
        effect1Runs++;
      });
      onCleanup(() => {
        cleanup1Ran = true;
      });
      return el('div', null, 'app1');
    }, container);

    assert.strictEqual(effect1Runs, 1, 'effect 1 should run on initial mount');
    assert.strictEqual(cleanup1Ran, false, 'cleanup 1 should not have run yet');

    // Second mount on the same container
    mount(() => {
      effect(() => {
        count2.value;
        effect2Runs++;
      });
      return el('div', null, 'app2');
    }, container);

    assert.strictEqual(effect2Runs, 1, 'effect 2 should run on initial mount');
    assert.strictEqual(cleanup1Ran, true, 'cleanup 1 should run when second mount replaces first root');

    // Update signal 1: first root was disposed, so effect 1 must NOT run
    count1.value++;
    assert.strictEqual(effect1Runs, 1, 'effect 1 must not run after container was re-mounted');

    // Update signal 2: second root is still active, so effect 2 must run
    count2.value++;
    assert.strictEqual(effect2Runs, 2, 'effect 2 must run on active root');
  });

  it('preserves independent roots when mounting on distinct containers', () => {
    const containerA = createMockContainer();
    const containerB = createMockContainer();
    const sigA = signal(10);
    const sigB = signal(20);
    let runsA = 0;
    let runsB = 0;

    mount(() => {
      effect(() => {
        sigA.value;
        runsA++;
      });
      return el('div', null, 'A');
    }, containerA);

    mount(() => {
      effect(() => {
        sigB.value;
        runsB++;
      });
      return el('div', null, 'B');
    }, containerB);

    assert.strictEqual(runsA, 1);
    assert.strictEqual(runsB, 1);

    sigA.value++;
    assert.strictEqual(runsA, 2);
    assert.strictEqual(runsB, 1);

    sigB.value++;
    assert.strictEqual(runsA, 2);
    assert.strictEqual(runsB, 2);
  });

  it('calling returned unmount function disposes the root and clears the container', () => {
    const container = createMockContainer();
    const sig = signal(0);
    let runs = 0;
    let cleanedUp = false;

    const unmount = mount(() => {
      effect(() => {
        sig.value;
        runs++;
      });
      onCleanup(() => {
        cleanedUp = true;
      });
      return el('span', null, 'hello');
    }, container);

    assert.strictEqual(runs, 1);
    assert.strictEqual(cleanedUp, false);

    unmount();

    assert.strictEqual(cleanedUp, true, 'onCleanup should run on unmount');
    assert.strictEqual((container as any).childNodes.length, 0, 'container should be emptied on unmount');

    sig.value++;
    assert.strictEqual(runs, 1, 'effect must not run after manual unmount');
  });
});
