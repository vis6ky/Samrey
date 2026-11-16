import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { CrmApp } from '../src/App.js';

describe('Enterprise CRM & Deal Analytics Benchmark Application', () => {
  it('computes pipeline value, filters by deal stage, and dynamically updates analytics', async () => {
    let store: any;
    const { container } = renderTest(() => {
      const app = CrmApp();
      store = app.store;
      return app.root;
    });

    // 1. Initial pipeline analytics
    assert.ok(container.textContent?.includes('Enterprise CRM & Deal Analytics'));
    // Initial values: 24000 + 50000 + 75000 = 149,000
    assert.ok(container.textContent?.includes('149,000'), 'Pipeline value should be 149,000');

    // 2. Initial customer rows
    const rows = container.querySelectorAll('.cust-row');
    assert.equal(rows.length, 3, 'Should render 3 initial customer rows');

    // 3. Mark Linus Torvalds ($50,000) as Won
    // Row 1 is Linus Torvalds
    const winBtn = rows[1].querySelectorAll('button')[0];
    fireEvent(winBtn, 'click');
    await flushReactivity();

    // Now all 3 deals are Won: 100% win rate, Won deals: 149,000
    assert.ok(container.textContent?.includes('100%'), 'Win rate should update to 100%');

    // 4. Filter by Won deals
    const wonTabBtn = container.querySelectorAll('.filter-tabs button')[1];
    fireEvent(wonTabBtn, 'click');
    await flushReactivity();

    const filteredRows = container.querySelectorAll('.cust-row');
    assert.equal(filteredRows.length, 3, 'All 3 deals are Won now');

    // 5. Add new Lead via store
    store.addCustomer({
      name: 'Alan Kay',
      company: 'Viewpoints Research',
      email: 'kay@vpri.org',
      dealValue: 30000,
      stage: 'Lead'
    });
    await flushReactivity();

    // In 'Won' filter, new lead shouldn't appear
    assert.equal(container.querySelectorAll('.cust-row').length, 3);

    // Switch to 'All' filter
    const allTabBtn = container.querySelectorAll('.filter-tabs button')[0];
    fireEvent(allTabBtn, 'click');
    await flushReactivity();

    assert.equal(container.querySelectorAll('.cust-row').length, 4, 'Should now list 4 customers');
    assert.ok(container.textContent?.includes('Alan Kay'));
  });
});
