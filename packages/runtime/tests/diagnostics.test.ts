import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  reportDuplicateKey,
  reportStaleItemWarning,
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
import { signal } from '@samrey/reactivity';

describe('@samrey/runtime - Development Diagnostics', () => {
  it('captures and emits dev diagnostics to registered listeners', () => {
    clearDevDiagnosticHistory();
    const captured: any[] = [];
    const unsubscribe = onDevDiagnostic((diag) => {
      captured.push(diag);
    });

    reportDuplicateKey('user-1', 'UserList');
    reportStaleItemWarning('row-1', 'TodoList');
    reportHydrationMismatch('<div>Server</div>', '<div>Client</div>', 'UserProfile');
    reportReactiveGraphWarning('Cycle detected in effect chain');
    reportUnnecessaryUpdate('count', 5);
    reportRouterError('/dashboard/unknown', 'Route not found');
    reportResourceError('fetchUsers', new Error('Network timeout'));

    unsubscribe();

    assert.equal(captured.length, 7);
    assert.equal(captured[0].type, 'duplicate-key');
    assert.equal(captured[0].code, 'SAMREY-501');
    assert.equal(captured[1].type, 'unnecessary-update');
    assert.equal(captured[1].code, 'SAMREY-502');
    assert.equal(captured[2].type, 'hydration-mismatch');
    assert.equal(captured[2].code, 'SAMREY-401');
    assert.equal(captured[3].type, 'reactive-graph');
    assert.equal(captured[3].code, 'SAMREY-301');
    assert.equal(captured[4].type, 'unnecessary-update');
    assert.equal(captured[4].code, 'SAMREY-302');
    assert.equal(captured[5].type, 'router-error');
    assert.equal(captured[5].code, 'SAMREY-ROUTER-404');
    assert.equal(captured[6].type, 'resource-error');
    assert.equal(captured[6].code, 'SAMREY-RES-ERR');

    const history = getDevDiagnosticHistory();
    assert.ok(history.length >= 7);
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
    assert.equal(dupDiag.code, 'SAMREY-501');
    assert.ok(dupDiag.message.includes('item-1'));
  });
});
