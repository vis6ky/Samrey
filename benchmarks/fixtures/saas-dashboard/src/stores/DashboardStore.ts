import { signal, computed } from '@samrey/reactivity';

export interface Metric {
  id: string;
  label: string;
  value: number;
  change: string;
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export function createDashboardStore() {
  const metrics = signal<Metric[]>([
    { id: 'mrr', label: 'Monthly Recurring Revenue', value: 45200, change: '+12.4%' },
    { id: 'users', label: 'Active Subscribers', value: 1840, change: '+8.1%' },
    { id: 'churn', label: 'Churn Rate', value: 1.2, change: '-0.3%' }
  ]);

  const activities = signal<Activity[]>([
    { id: '1', user: 'Ada Lovelace', action: 'Upgraded to Enterprise tier', timestamp: '10m ago' },
    { id: '2', user: 'Alan Turing', action: 'Invited 3 team members', timestamp: '25m ago' },
    { id: '3', user: 'Claude Shannon', action: 'Configured webhook integration', timestamp: '1h ago' }
  ]);

  const searchQuery = signal('');

  const filteredActivities = computed(() => {
    const q = searchQuery.value.toLowerCase().trim();
    if (!q) return activities.value;
    return activities.value.filter(a => a.user.toLowerCase().includes(q) || a.action.toLowerCase().includes(q));
  });

  return {
    metrics,
    activities,
    searchQuery,
    filteredActivities,
    addActivity: (user: string, action: string) => {
      const newAct: Activity = {
        id: Date.now().toString(),
        user,
        action,
        timestamp: 'Just now'
      };
      activities.value = [newAct, ...activities.value];
    }
  };
}
