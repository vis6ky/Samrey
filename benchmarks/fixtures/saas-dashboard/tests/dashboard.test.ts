import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { SaaSApp } from '../src/App.js';

describe('SaaS Administration Dashboard Benchmark Application', () => {
  it('renders metrics cards and filters activity reactively', async () => {
    let dashboardStore: any;
    const { container } = renderTest(() => {
      const app = SaaSApp();
      dashboardStore = app.store;
      return app.root;
    });

    // 1. Metric cards rendering
    const cards = container.querySelectorAll('.metric-card');
    assert.equal(cards.length, 3, 'Should render 3 metric cards');
    assert.ok(container.textContent?.includes('Monthly Recurring Revenue'));

    // 2. Activity list
    const items = container.querySelectorAll('.activity-item');
    assert.equal(items.length, 3, 'Should render 3 initial activities');

    // 3. Reactive Search Filtering
    const searchInput = container.querySelector('input[type="search"]') as HTMLInputElement;
    searchInput.value = 'Turing';
    fireEvent(searchInput, 'input');
    await flushReactivity();

    const filteredItems = container.querySelectorAll('.activity-item');
    assert.equal(filteredItems.length, 1, 'Should filter down to 1 activity matching Turing');
    assert.ok(filteredItems[0].textContent?.includes('Alan Turing'));

    // 4. Reactive Addition
    dashboardStore.addActivity('Grace Hopper', 'Decommissioned legacy cluster');
    searchInput.value = '';
    fireEvent(searchInput, 'input');
    await flushReactivity();

    const updatedItems = container.querySelectorAll('.activity-item');
    assert.equal(updatedItems.length, 4, 'Should reflect added activity reactively');
    assert.ok(updatedItems[0].textContent?.includes('Grace Hopper'));
  });
});
