/**
 * @license Apache-2.0
 * @aether/task-studio - Master Application Shell
 */

import { el, Show } from '@aether/runtime';
import { signal, effect } from '@aether/reactivity';
import { createRouter, RouteRecord } from '@aether/router';
import { Header } from './Header.js';
import { Sidebar } from './Sidebar.js';
import { ToastContainer } from './ui/ToastContainer.js';
import { DashboardView } from '../views/DashboardView.js';
import { TasksView } from '../views/TasksView.js';
import { NewTaskView } from '../views/NewTaskView.js';
import { TaskDetailView } from '../views/TaskDetailView.js';
import { SecurityView } from '../views/SecurityView.js';
import { BenchmarksView } from '../views/BenchmarksView.js';
import { SettingsView } from '../views/SettingsView.js';
import { AboutView } from '../views/AboutView.js';
import { NotFoundView } from '../views/NotFoundView.js';

export function AppShell(initialRoute = '/dashboard'): HTMLElement {
  // Determine initial path from window.location if available
  let startPath = initialRoute;
  if (typeof window !== 'undefined' && window.location) {
    const pathname = window.location.pathname;
    if (pathname && pathname !== '/' && pathname !== '') {
      startPath = pathname;
    }
  }

  // Router instance
  const routes: RouteRecord[] = [
    { path: '/', component: () => DashboardView({ onNavigate }) },
    { path: '/dashboard', component: () => DashboardView({ onNavigate }) },
    { path: '/tasks', component: () => TasksView({ onNavigate }) },
    { path: '/tasks/new', component: () => NewTaskView({ onNavigate }) },
    { path: '/tasks/:id', component: () => TaskDetailView({ router, onNavigate }) },
    { path: '/security', component: () => SecurityView() },
    { path: '/benchmarks', component: () => BenchmarksView() },
    { path: '/settings', component: () => SettingsView({ onNavigate }) },
    { path: '/about', component: () => AboutView({ onNavigate }) }
  ];

  const router = createRouter(routes, startPath);

  function onNavigate(to: string): void {
    router.navigate(to);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Synchronize browser popstate events
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => {
      router.navigate(window.location.pathname || '/dashboard');
    });
  }

  const isMobileSidebarOpen = signal(false);

  const root = el('div', {
    id: 'aether-task-studio-root',
    class: 'min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased font-sans'
  });

  // 1. Header
  const headerNode = Header({
    onNavigate,
    onToggleSidebar: () => {
      isMobileSidebarOpen.value = !isMobileSidebarOpen.value;
    }
  });
  root.appendChild(headerNode);

  // 2. Body Container (Sidebar + Main Content Area)
  const bodyContainer = el('div', { class: 'flex-1 flex max-w-7xl w-full mx-auto' });

  // Desktop Sidebar
  const desktopSidebar = Sidebar({
    router,
    onNavigate
  });
  bodyContainer.appendChild(desktopSidebar);

  // Mobile Sidebar Drawer via Show
  const mobileSidebarDrawer = Show({
    when: () => isMobileSidebarOpen.value,
    children: () => {
      const backdrop = el(
        'div',
        {
          class: 'fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex lg:hidden',
          onClick: (e: MouseEvent) => {
            if (e.target === backdrop) isMobileSidebarOpen.value = false;
          }
        },
        el(
          'div',
          { class: 'w-72 bg-white h-full shadow-2xl flex flex-col' },
          Sidebar({
            router,
            onNavigate,
            onCloseMobile: () => {
              isMobileSidebarOpen.value = false;
            }
          })
        )
      );
      return backdrop;
    }
  });
  root.appendChild(mobileSidebarDrawer as HTMLElement);

  // Main Content Area
  const main = el('main', {
    id: 'main-content',
    class: 'flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto'
  });

  // Cached view nodes
  let dashboardViewNode: HTMLElement | null = null;
  let tasksViewNode: HTMLElement | null = null;
  let newTaskViewNode: HTMLElement | null = null;
  let securityViewNode: HTMLElement | null = null;
  let benchmarksViewNode: HTMLElement | null = null;
  let settingsViewNode: HTMLElement | null = null;
  let aboutViewNode: HTMLElement | null = null;

  // Reactive Route View Switcher
  const viewDashboard = Show({
    when: () => router.currentPath.value === '/' || router.currentPath.value === '/dashboard',
    children: () => {
      if (!dashboardViewNode) dashboardViewNode = DashboardView({ onNavigate });
      return dashboardViewNode;
    }
  });

  const viewTasks = Show({
    when: () => router.currentPath.value === '/tasks',
    children: () => {
      if (!tasksViewNode) tasksViewNode = TasksView({ onNavigate });
      return tasksViewNode;
    }
  });

  const viewNewTask = Show({
    when: () => router.currentPath.value === '/tasks/new',
    children: () => {
      if (!newTaskViewNode) newTaskViewNode = NewTaskView({ onNavigate });
      return newTaskViewNode;
    }
  });

  const viewTaskDetail = Show({
    when: () => router.currentPath.value.startsWith('/tasks/') && router.currentPath.value !== '/tasks/new',
    children: () => TaskDetailView({ router, onNavigate })
  });

  const viewSecurity = Show({
    when: () => router.currentPath.value === '/security',
    children: () => {
      if (!securityViewNode) securityViewNode = SecurityView();
      return securityViewNode;
    }
  });

  const viewBenchmarks = Show({
    when: () => router.currentPath.value === '/benchmarks',
    children: () => {
      if (!benchmarksViewNode) benchmarksViewNode = BenchmarksView();
      return benchmarksViewNode;
    }
  });

  const viewSettings = Show({
    when: () => router.currentPath.value === '/settings',
    children: () => {
      if (!settingsViewNode) settingsViewNode = SettingsView({ onNavigate });
      return settingsViewNode;
    }
  });

  const viewAbout = Show({
    when: () => router.currentPath.value === '/about',
    children: () => {
      if (!aboutViewNode) aboutViewNode = AboutView({ onNavigate });
      return aboutViewNode;
    }
  });

  const viewNotFound = Show({
    when: () => {
      const p = router.currentPath.value;
      const known = ['/', '/dashboard', '/tasks', '/tasks/new', '/security', '/benchmarks', '/settings', '/about'];
      return !known.includes(p) && !p.startsWith('/tasks/');
    },
    children: () => NotFoundView({ onNavigate })
  });

  main.appendChild(viewDashboard);
  main.appendChild(viewTasks);
  main.appendChild(viewNewTask);
  main.appendChild(viewTaskDetail);
  main.appendChild(viewSecurity);
  main.appendChild(viewBenchmarks);
  main.appendChild(viewSettings);
  main.appendChild(viewAbout);
  main.appendChild(viewNotFound);

  bodyContainer.appendChild(main);
  root.appendChild(bodyContainer);

  // 3. Global Toast Container
  root.appendChild(ToastContainer());

  return root;
}
