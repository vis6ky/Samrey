import { template, bindText, on, For, Show } from '@samrey/runtime';
import { createDashboardStore } from './stores/DashboardStore.js';
import { MetricCard } from './components/MetricCard.js';

const _tmpl = template(`
  <div class="saas-dashboard">
    <header>
      <h1>SaaS Administration Console</h1>
      <input ref="search" type="search" placeholder="Search activities..." aria-label="Search activities" />
    </header>
    <section class="metrics-grid" ref="metrics"></section>
    <main class="activity-feed">
      <h2>Recent System Activities</h2>
      <ul ref="activityList" class="activity-list" aria-live="polite"></ul>
    </main>
  </div>
`);

const _rowTmpl = template('<li class="activity-item"><strong ref="user"></strong>: <span ref="action"></span> (<time ref="time"></time>)</li>');

export function SaaSApp() {
  const store = createDashboardStore();
  const root = _tmpl.clone();
  const { search, metrics, activityList } = root.refs;

  on(search, 'input', () => {
    store.searchQuery.value = (search as HTMLInputElement).value;
  });

  // Render metrics
  metrics.appendChild(
    For({
      each: () => store.metrics.value,
      key: (m) => m.id,
      children: (m) => MetricCard({ metric: m })
    })
  );

  // Render activities
  activityList.appendChild(
    For({
      each: () => store.filteredActivities.value,
      key: (a) => a.id,
      children: (a) => {
        const row = _rowTmpl.clone();
        const { user, action, time } = row.refs;
        bindText(user, () => a.user);
        bindText(action, () => a.action);
        bindText(time, () => a.timestamp);
        return row;
      }
    })
  );

  return { root, store };
}
