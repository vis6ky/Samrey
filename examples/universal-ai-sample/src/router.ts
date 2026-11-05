/**
 * @license Apache-2.0
 * Application Router Configuration
 */

import { signal } from '@samrey/reactivity';
import { createRouter, setRouterInstance, RouteRecord, RouterInstance } from '@samrey/router';
import { template } from '@samrey/runtime';
import { MetricsDashboard } from './components/MetricsDashboard.js';
import { TaskList, Task } from './components/TaskList.js';
import { TaskForm } from './components/TaskForm.js';
import { UserProfile } from './components/UserProfile.js';

// Shared application tasks state
export const appTasks = signal<Task[]>([
  { id: 1, title: 'Verify Gemini CLI integration', completed: true, priority: 'high' },
  { id: 2, title: 'Verify Claude Code integration', completed: true, priority: 'high' },
  { id: 3, title: 'Verify Cursor MCP integration', completed: false, priority: 'medium' }
]);

const _homeTmpl = template(`
  <div class="home-view">
    <div class="dashboard-slot"></div>
    <div class="form-slot"></div>
    <div class="list-slot"></div>
  </div>
`);

export function HomeView() {
  const root = _homeTmpl() as HTMLElement;
  root.querySelector('.dashboard-slot')!.appendChild(MetricsDashboard({ initial: 42 }));
  root.querySelector('.form-slot')!.appendChild(TaskForm({ tasks: appTasks }));
  root.querySelector('.list-slot')!.appendChild(TaskList({ tasks: appTasks }));
  return root;
}

const _notFoundTmpl = template(`
  <div class="not-found">
    <h2>404 - Page Not Found</h2>
    <p>The requested route does not exist.</p>
  </div>
`);

export function NotFoundView() {
  return _notFoundTmpl();
}

export const routes: RouteRecord[] = [
  { path: '/', component: HomeView },
  { path: '/profile', component: UserProfile },
  { path: '*', component: NotFoundView }
];

export function initAppRouter(initialPath?: string): RouterInstance {
  const router = createRouter(routes, initialPath);
  setRouterInstance(router);
  return router;
}

