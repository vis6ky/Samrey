import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { signal, computed, effect, batch, createStore, produce, createOwner, runWithOwner } from '../packages/reactivity/dist/index.js';
import { createField, bindField, validators } from '../packages/forms/dist/index.js';
import { createHttpClient, httpClient, createResource } from '../packages/http/dist/index.js';
import { bindDynamicChild, Show, on } from '../packages/runtime/dist/index.js';
import { renderTest, fireEvent, flushReactivity } from '../packages/testing/dist/index.js';

describe('Serious Bugs Fix Verification (BUG-01 to BUG-15)', () => {
  // BUG-01: produce wraps mutations in batch()
  it('BUG-01: produce() batches state updates to prevent torn intermediate reads in effects', () => {
    const state = createStore({ a: 1, b: 2 });
    const observations: string[] = [];

    effect(() => {
      observations.push(`${state.a}:${state.b}`);
    });

    assert.deepEqual(observations, ['1:2']);

    produce(state, (draft) => {
      draft.a = 10;
      draft.b = 20;
    });

    // Should only notify once with final state (10:20), not with intermediate state (10:2)
    assert.deepEqual(observations, ['1:2', '10:20']);
  });

  // BUG-02: childStore cache handles target reference replacement
  it('BUG-02: createStore invalidates child store proxy when nested object reference changes', () => {
    const store = createStore({ nested: { count: 1 } });
    const child1 = store.nested;
    assert.equal(child1.count, 1);

    // Replace the nested object with a new object reference
    store.nested = { count: 42 };
    const child2 = store.nested;
    assert.equal(child2.count, 42);
  });

  // BUG-04: computed handles access after owner disposed before 1st evaluation
  it('BUG-04: computed throws descriptive error if accessed after owner disposed before first evaluation', () => {
    const owner = createOwner();
    let comp!: () => number;

    runWithOwner(owner, () => {
      const s = signal(10);
      comp = computed(() => s.value * 2);
    });

    owner.dispose();
    assert.throws(() => comp(), /computed\(\) was accessed after its reactive owner was disposed/);
  });

  // BUG-05: signal writes notify subscribers without redundant outer batch
  it('BUG-05: signal.write notifies subscribers cleanly', () => {
    const s = signal(0);
    let count = 0;
    effect(() => {
      s.value;
      count++;
    });
    assert.equal(count, 1);

    s.value = 1;
    assert.equal(count, 2);
    s.value = 2;
    assert.equal(count, 3);
  });

  // BUG-06: bindField deduplicates input and change events
  it('BUG-06: bindField deduplicates duplicate input/change events with same value', () => {
    const f = createField('test', '');
    let validateCount = 0;
    const validatingField = createField('v', '', (val) => {
      validateCount++;
      return val ? null : 'Required';
    });

    const listeners: Record<string, Function[]> = {};
    const mockInput: any = {
      value: '',
      addEventListener: (evt: string, fn: Function) => {
        listeners[evt] = listeners[evt] || [];
        listeners[evt].push(fn);
      },
      removeEventListener: () => {}
    };

    bindField(mockInput, validatingField);
    validatingField.setTouched(true);
    const initialValidations = validateCount;

    // Simulate typing 'abc': fires 'input' then browser also fires 'change' on blur/commit
    mockInput.value = 'abc';
    for (const fn of listeners['input'] || []) fn({ target: mockInput });
    const afterInputCount = validateCount;

    // 'change' event with identical value should be deduplicated
    for (const fn of listeners['change'] || []) fn({ target: mockInput });
    assert.equal(validateCount, afterInputCount, 'change event must not re-trigger validation for same value');
  });

  // BUG-07: bindDynamicChild cleanup removes marker and nodes
  it('BUG-07: bindDynamicChild removes marker and dynamic children on owner cleanup', () => {
    const parent: any = {
      childNodes: [] as any[],
      appendChild(node: any) {
        node.parentNode = this;
        this.childNodes.push(node);
      },
      insertBefore(node: any, ref: any) {
        node.parentNode = this;
        const idx = this.childNodes.indexOf(ref);
        if (idx !== -1) {
          this.childNodes.splice(idx, 0, node);
        } else {
          this.childNodes.push(node);
        }
      },
      removeChild(node: any) {
        const idx = this.childNodes.indexOf(node);
        if (idx !== -1) {
          this.childNodes.splice(idx, 1);
          node.parentNode = null;
        }
      }
    };

    const owner = createOwner();
    const textSig = signal('hello');

    runWithOwner(owner, () => {
      bindDynamicChild(parent, () => textSig.value);
    });

    assert.ok(parent.childNodes.length >= 2, 'Should have child text node and comment marker');

    owner.dispose();
    assert.equal(parent.childNodes.length, 0, 'All nodes including marker must be removed on cleanup');
  });

  // BUG-08: createResource does not track synchronous signal reads in fetcher
  it('BUG-08: createResource does not track signals read synchronously inside fetcher', async () => {
    const sourceSig = signal(1);
    const untrackedFilter = signal('active');
    let fetchCount = 0;

    const res = createResource(
      () => sourceSig.value,
      async (id) => {
        fetchCount++;
        // Read untrackedFilter synchronously
        const _f = untrackedFilter.value;
        return `item-${id}-${_f}`;
      }
    );

    await new Promise((r) => setTimeout(r, 10));
    assert.equal(fetchCount, 1);

    // Changing untrackedFilter must NOT trigger a refetch
    untrackedFilter.value = 'archived';
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(fetchCount, 1, 'Changing signal read inside fetcher must not trigger refetch');

    // Changing sourceSig MUST trigger a refetch
    sourceSig.value = 2;
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(fetchCount, 2, 'Changing sourceSig must trigger refetch');
  });

  // BUG-09: validators.required treats false as valid
  it('BUG-09: validators.required treats false and 0 as valid values', () => {
    const req = validators.required('Field required');
    assert.equal(req(''), 'Field required');
    assert.equal(req(null), 'Field required');
    assert.equal(req(undefined), 'Field required');
    assert.equal(req(0), null, '0 must be valid');
    assert.equal(req(false), null, 'false must be valid for boolean fields/checkboxes');
    assert.equal(req(true), null, 'true must be valid');
    assert.equal(req('hello'), null, 'non-empty string must be valid');
  });

  // BUG-10: resolveUrl blocks disallowed URI schemes
  it('BUG-10: HttpClient.resolveUrl blocks data:, blob:, javascript: schemes', async () => {
    const client = createHttpClient('https://api.example.com');
    await assert.rejects(() => client.get('data:text/plain,leak'), /Blocked disallowed URI scheme/);
    await assert.rejects(() => client.get('blob:https://api.example.com/uuid'), /Blocked disallowed URI scheme/);
    await assert.rejects(() => client.get('javascript:alert(1)'), /Blocked disallowed URI scheme/);
  });

  // BUG-11: httpClient singleton is frozen
  it('BUG-11: httpClient singleton is frozen to prevent state mutation across SSR requests', () => {
    assert.ok(Object.isFrozen(httpClient), 'httpClient should be frozen');
  });

  // BUG-12: Show reads when with untrack to prevent over-subscription to store props
  it('BUG-12: Show evaluates condition without over-subscribing to store props', () => {
    const storeProps = createStore({
      when: () => isVisible.value,
      otherKey: 'unrelated'
    });
    const isVisible = signal(true);
    let renderCount = 0;

    Show({
      when: storeProps.when,
      children: () => {
        renderCount++;
        return null;
      }
    });

    assert.equal(renderCount, 1);

    // Modifying unrelated property in storeProps must not trigger Show re-render
    storeProps.otherKey = 'changed';
    assert.equal(renderCount, 1, 'Unrelated store property change must not re-render Show');

    // Toggling isVisible must toggle Show
    isVisible.value = false;
    assert.equal(renderCount, 1);
    isVisible.value = true;
    assert.equal(renderCount, 2);
  });

  // BUG-13: computed version tracking uses Map rather than positional index
  it('BUG-13: computed handles conditional dependencies with varying tracking order', () => {
    const cond = signal(true);
    const a = signal(1);
    const b = signal(10);

    const c = computed(() => {
      return cond.value ? a.value + b.value : b.value + a.value;
    });

    assert.equal(c.value, 11);

    a.value = 2;
    assert.equal(c.value, 12);

    cond.value = false;
    assert.equal(c.value, 12);

    b.value = 20;
    assert.equal(c.value, 22);
  });

  // BUG-14: on() logs a dev warning when called outside a reactive owner
  it('BUG-14: on() warns in dev when called outside a reactive owner scope', () => {
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: any[]) => {
      warnings.push(args.join(' '));
    };

    try {
      const mockElem: any = {
        addEventListener: () => {},
        removeEventListener: () => {}
      };
      on(mockElem, 'click', () => {});
      assert.ok(
        warnings.some((w) => w.includes('[Samrey Runtime Warning] on("click", ...) was called outside a reactive owner scope')),
        'Expected warning about calling on() outside reactive owner scope'
      );
    } finally {
      console.warn = origWarn;
    }
  });

  // BUG-16: renderTest in Node.js wraps component in headless container so querySelector finds root elements
  it('BUG-16: renderTest in Node.js finds component root elements via container.querySelector()', async () => {
    const { template, bindText: bText } = await import('../packages/runtime/dist/index.js');
    const _tmpl = template('<button class="test-btn">Count: <span class="num">0</span></button>');
    const count = signal(0);

    const { container, unmount } = renderTest(() => {
      const root = _tmpl.clone();
      const num = root.querySelector('.num')!;
      bText(num, () => count.value.toString());
      return root;
    });

    const btn = container.querySelector('button');
    assert.ok(btn, 'container.querySelector("button") must find the root button in Node.js');
    assert.equal(btn.textContent, 'Count: 0');

    count.value = 5;
    await flushReactivity();
    assert.equal(btn.textContent, 'Count: 5');
    unmount();
  });

  // BUG-17: SSR starter template generates hydrate() instead of destructive mount()
  it('BUG-17: generateStarterProject with ssr template uses hydrate() for client entry', async () => {
    const { generateStarterProject } = await import('../packages/cli/dist/starter-template.js');
    const files = generateStarterProject('test-ssr-app', { template: 'ssr' });
    const entryClient = files['src/entry-client.ts'];

    assert.ok(entryClient.includes('hydrate('), 'SSR client entry must invoke hydrate()');
    assert.ok(entryClient.includes('root.hasChildNodes()'), 'SSR client entry must check for existing server-rendered nodes');
  });
});

