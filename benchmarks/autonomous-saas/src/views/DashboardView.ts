/**
 * @license Apache-2.0
 * Samrey Framework Autonomous SaaS — Dashboard View
 */

import { computed } from '@samrey/reactivity';
import { template, bindText } from '@samrey/runtime';
import { usersSignal } from '../services/UserService.js';

const _dashboardTmpl = template(`
  <div class="page-dashboard">
    <div class="metrics-row">
      <div class="metric-card">
        <span class="metric-title">Total Users</span>
        <h3 ref="totalUsers" class="metric-value"></h3>
      </div>
      <div class="metric-card">
        <span class="metric-title">Active Users</span>
        <h3 ref="activeUsers" class="metric-value"></h3>
      </div>
      <div class="metric-card">
        <span class="metric-title">Monthly Revenue</span>
        <h3 class="metric-value">$48,250</h3>
      </div>
      <div class="metric-card">
        <span class="metric-title">System Health</span>
        <h3 class="metric-value text-success">99.98%</h3>
      </div>
    </div>
    <div class="recent-activity-card">
      <h3>System Status</h3>
      <p>Fine-grained reactive updates active. Zero VDOM overhead.</p>
    </div>
  </div>
`);

export function DashboardView(): HTMLElement {
  const totalUsers = computed(() => usersSignal.value.length);
  const activeUsers = computed(() => usersSignal.value.filter(u => u.status === 'active').length);

  const root = _dashboardTmpl.clone();
  const { totalUsers: totalEl, activeUsers: activeEl } = root.refs;

  bindText(totalEl, () => totalUsers.value.toString());
  bindText(activeEl, () => activeUsers.value.toString());

  return root;
}
