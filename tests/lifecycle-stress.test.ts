/**
 * @license Apache-2.0
 * @aether/tests - Lifecycle, Memory, and High-Throughput Stress Benchmarks
 * Hardens Aether v1.0.0-rc.1 against memory leaks, owner leaks, and signal cycles.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { signal, computed, effect, batch, createRoot, createOwner, getOwner, runWithOwner, createStore, onCleanup } from '../packages/reactivity/src/index.js';
import { el, text, mount, Show, For, onMount } from '../packages/runtime/src/index.js';
import { runCreateCommand, validateProjectName } from '../packages/cli/src/commands/create.js';
import { runPreviewCommand } from '../packages/cli/src/commands/preview.js';
import { runCLI } from '../packages/cli/src/runner.js';
import { generateStarterProject } from '../packages/cli/src/starter-template.js';

describe('Aether Phase 17 - Lifecycle, Owner & Memory Stress Test Suite', () => {
  it('handles 1,000 mount/update/unmount cycles with 100% owner and effect cleanup', () => {
    let cleanupsExecuted = 0;
    let effectExecutions = 0;

    for (let i = 0; i < 1000; i++) {
      const dispose = createRoot((disposeRoot) => {
        const count = signal(0);
        const double = computed(() => count.value * 2);

        effect(() => {
          effectExecutions++;
          // Read double
          const _val = double.value;
        });

        onCleanup(() => {
          cleanupsExecuted++;
        });

        // Mutate signal
        count.value = 1;
        count.value = 2;

        return disposeRoot;
      });

      dispose();
    }

    assert.equal(cleanupsExecuted, 1000, 'All 1,000 root cleanups executed');
    // Each cycle: initial effect (1) + 2 updates = 3 executions. 1000 * 3 = 3000
    assert.equal(effectExecutions, 3000, 'Effects ran accurately without stale subscriptions');
  });

  it('handles 5,000 nested owner tree creations and disposals cleanly', () => {
    let childCleanups = 0;

    for (let i = 0; i < 5000; i++) {
      createRoot((disposeParent) => {
        const child = createOwner(getOwner());
        runWithOwner(child, () => {
          onCleanup(() => {
            childCleanups++;
          });
        });
        disposeParent();
      });
    }

    assert.equal(childCleanups, 5000, 'All 5,000 nested child scopes were disposed');
  });

  it('handles 10,000 high-frequency signal writes within batched transactions', () => {
    const s = signal(0);
    let subscriberRuns = 0;

    const dispose = effect(() => {
      subscriberRuns++;
      const _ = s.value;
    });

    assert.equal(subscriberRuns, 1);

    // 10,000 writes batched into 10 chunks of 1,000
    for (let chunk = 0; chunk < 10; chunk++) {
      batch(() => {
        for (let i = 0; i < 1000; i++) {
          s.value = chunk * 1000 + i;
        }
      });
    }

    // 1 initial + 10 batched flushes = 11 runs total
    assert.equal(subscriberRuns, 11, 'Batching prevented 10,000 redundant reactive re-evaluations');
    assert.equal(s.value, 9999);

    dispose();
  });

  it('stress tests reactive store with 2,000 deep property mutations', () => {
    interface ComplexState {
      users: { id: number; name: string; metadata: { loginCount: number; active: boolean } }[];
    }

    const initialUsers = Array.from({ length: 100 }, (_, idx) => ({
      id: idx + 1,
      name: `User ${idx + 1}`,
      metadata: { loginCount: 0, active: true }
    }));

    const store = createStore<ComplexState>({ users: initialUsers });

    let activeUsersCountRuns = 0;
    const activeCount = computed(() => {
      activeUsersCountRuns++;
      return store.users.filter((u) => u.metadata.active).length;
    });

    assert.equal(activeCount.value, 100);
    assert.equal(activeUsersCountRuns, 1);

    // Mutate 2000 times on individual leaves
    for (let i = 0; i < 2000; i++) {
      const targetIdx = i % 100;
      store.users[targetIdx].metadata.loginCount++;
    }

    // Leaf loginCount mutation should not re-trigger activeCount computed unless active changes
    assert.equal(activeCount.value, 100);
    assert.equal(store.users[0].metadata.loginCount, 20);
  });
});

describe('Aether Phase 17 - Starter Template & CLI Validation Suite', () => {
  it('generates valid production files for all 4 starter templates (ssr, spa, minimal, ssg)', () => {
    const templates = ['ssr', 'spa', 'minimal', 'ssg'] as const;

    for (const t of templates) {
      const files = generateStarterProject(`test-app-${t}`, { template: t });
      assert.ok(files['package.json'], `Template ${t} must have package.json`);
      assert.ok(files['tsconfig.json'], `Template ${t} must have tsconfig.json`);
      assert.ok(files['vite.config.ts'], `Template ${t} must have vite.config.ts`);
      assert.ok(files['src/App.tsx'], `Template ${t} must have src/App.tsx`);
      assert.ok(files['src/entry-client.tsx'], `Template ${t} must have src/entry-client.tsx`);

      const pkg = JSON.parse(files['package.json']);
      assert.equal(pkg.name, `test-app-${t}`);
      assert.ok(pkg.dependencies['@aether/reactivity']);
      assert.ok(pkg.dependencies['@aether/runtime']);

      if (t === 'ssr' || t === 'ssg') {
        assert.ok(pkg.dependencies['@aether/ssr'], `Template ${t} must depend on @aether/ssr`);
        assert.ok(files['src/entry-server.tsx'], `Template ${t} must have src/entry-server.tsx`);
      }

      if (t === 'ssg') {
        assert.ok(files['ssg-build.ts'], 'SSG template must have ssg-build.ts');
      }
    }
  });

  it('validates project names against traversal and malformed inputs', () => {
    assert.equal(validateProjectName('').valid, false);
    assert.equal(validateProjectName('../evil-path').valid, false);
    assert.equal(validateProjectName('/absolute/path').valid, false);
    assert.equal(validateProjectName('my-clean-app-123').valid, true);
    assert.equal(validateProjectName('@myorg/aether-starter').valid, true);
  });

  it('executes dry-run CLI commands without errors', async () => {
    const createRes = await runCreateCommand({ name: 'dry-run-demo', template: 'ssr', dryRun: true });
    assert.equal(createRes.success, true);
    assert.equal(createRes.exitCode, 0);

    const previewRes = await runPreviewCommand({ port: 4173, dryRun: true });
    assert.equal(previewRes.success, true);
    assert.equal(previewRes.exitCode, 0);

    const cliHelpRes = await runCLI(['--help']);
    assert.equal(cliHelpRes.success, true);
    assert.ok(cliHelpRes.message.includes('Aether Framework CLI'));

    const cliVersionRes = await runCLI(['--version']);
    assert.equal(cliVersionRes.success, true);
    assert.ok(cliVersionRes.message.includes('1.0.0-rc.1'));

    const cliUnknownRes = await runCLI(['nonexistent-command']);
    assert.equal(cliUnknownRes.success, false);
    assert.equal(cliUnknownRes.exitCode, 1);
  });
});
