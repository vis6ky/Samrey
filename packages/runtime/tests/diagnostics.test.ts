import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  reportDuplicateKey,
  reportHydrationMismatch,
  reportReactiveGraphWarning,
  reportUnnecessaryUpdate,
  reportRouterError,
  reportResourceError,
  onDevDiagnostic,
  getDevDiagnosticHistory,
  clearDevDiagnosticHistory,
  For
} from '../src/index.js';
import { signal } from '@aether/reactivity';

describe('@aether/runtime - Development Diagnostics', () => {
  it('captures and emits dev diagnostics to registered listeners', () => {
    clearDevDiagnosticHistory();
    const captured: any[] = [];
    const unsubscribe = onDevDiagnostic((diag) => {
      captured.push(diag);
    });

    reportDuplicateKey('user-1', 'UserList');
    reportHydrationMismatch('<div>Server</div>', '<div>Client</div>', 'UserProfile');
    reportReactiveGraphWarning('Cycle detected in effect chain');
    reportUnnecessaryUpdate('count', 5);
    reportRouterError('/dashboard/unknown', 'Route not found');
    reportResourceError('fetchUsers', new Error('Network timeout'));

    unsubscribe();

    assert.equal(captured.length, 6);
    assert.equal(captured[0].type, 'duplicate-key');
    assert.equal(captured[0].code, 'AETH-501');
    assert.equal(captured[1].type, 'hydration-mismatch');
    assert.equal(captured[1].code, 'AETH-401');
    assert.equal(captured[2].type, 'reactive-graph');
    assert.equal(captured[3].type, 'unnecessary-update');
    assert.equal(captured[4].type, 'router-error');
    assert.equal(captured[5].type, 'resource-error');

    const history = getDevDiagnosticHistory();
    assert.ok(history.length >= 6);
  });

  it('triggers duplicate key diagnostic when <For> receives non-unique keys', () => {
    clearDevDiagnosticHistory();
    const captured: any[] = [];
    const unsubscribe = onDevDiagnostic((diag) => {
      captured.push(diag);
    });

    const items = signal([
      { id: 'item-1', text: 'First' },
      { id: 'item-1', text: 'Duplicate Item' },
      { id: 'item-2', text: 'Second' }
    ]);

    // Render <For>
    For({
      each: () => items.value,
      key: (item) => item.id,
      children: (item) => ({ nodeType: 1, nodeName: 'DIV', textContent: item.text } as any)
    });

    unsubscribe();

    const dupDiag = captured.find((d) => d.type === 'duplicate-key');
    assert.ok(dupDiag !== undefined);
    assert.equal(dupDiag.code, 'AETH-501');
    assert.ok(dupDiag.message.includes('item-1'));
  });
});
