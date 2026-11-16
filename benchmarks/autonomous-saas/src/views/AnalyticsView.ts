/**
 * @license Apache-2.0
 * Samrey Framework Autonomous SaaS — Analytics View
 */

import { signal, computed } from '@samrey/reactivity';
import { template, on, bindText } from '@samrey/runtime';

const _analyticsTmpl = template(`
  <div class="page-analytics">
    <h2>Performance & Usage Analytics</h2>
    <div class="time-range-selector">
      <button ref="btn7d" class="btn-tab active">Last 7 Days</button>
      <button ref="btn30d" class="btn-tab">Last 30 Days</button>
      <button ref="btn90d" class="btn-tab">Last 90 Days</button>
    </div>
    <div class="analytics-metrics-grid">
      <div class="stat-card">
        <span class="stat-label">Active API Requests</span>
        <div ref="statRequests" class="stat-num"></div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Avg Response Latency</span>
        <div class="stat-num text-success">12ms</div>
      </div>
      <div class="stat-card">
        <span class="stat-label">Total Computed Transactions</span>
        <div ref="statTransactions" class="stat-num"></div>
      </div>
    </div>
  </div>
`);

export function AnalyticsView(): HTMLElement {
  const period = signal<'7d' | '30d' | '90d'>('7d');

  const requestsCount = computed(() => {
    switch (period.value) {
      case '7d': return '1,420,800';
      case '30d': return '6,180,450';
      case '90d': return '18,940,200';
    }
  });

  const transactionsCount = computed(() => {
    switch (period.value) {
      case '7d': return '482,100';
      case '30d': return '2,045,600';
      case '90d': return '6,310,000';
    }
  });

  const root = _analyticsTmpl.clone();
  const { btn7d, btn30d, btn90d, statRequests, statTransactions } = root.refs;

  bindText(statRequests, () => requestsCount.value);
  bindText(statTransactions, () => transactionsCount.value);

  on(btn7d, 'click', () => { period.value = '7d'; });
  on(btn30d, 'click', () => { period.value = '30d'; });
  on(btn90d, 'click', () => { period.value = '90d'; });

  return root;
}
