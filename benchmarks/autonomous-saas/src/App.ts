/**
 * @license Apache-2.0
 * Samrey Framework Autonomous SaaS — Main Application & Router
 */

import { template, Show } from '@samrey/runtime';
import { createRouter, RouterOutlet } from '@samrey/router';
import { isAuthenticated } from './auth/AuthContext.js';
import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { NotificationCenter } from './components/NotificationCenter.js';

import { DashboardView } from './views/DashboardView.js';
import { UserManagementView } from './views/UserManagementView.js';
import { AnalyticsView } from './views/AnalyticsView.js';
import { LoginView } from './views/LoginView.js';
import { NotFoundView } from './views/NotFoundView.js';

export const router = createRouter([
  { path: '/', component: DashboardView },
  { path: '/users', component: UserManagementView },
  { path: '/analytics', component: AnalyticsView },
  { path: '/login', component: LoginView },
  { path: '*', component: NotFoundView }
]);

const _shellTmpl = template(`
  <div class="saas-app-shell">
    <div ref="sidebarMount"></div>
    <div class="content-wrapper">
      <div ref="headerMount"></div>
      <main ref="mainOutlet" class="saas-main-content"></main>
    </div>
    <div ref="notificationMount"></div>
  </div>
`);

export function App(): HTMLElement {
  const root = _shellTmpl.clone();
  const { sidebarMount, headerMount, mainOutlet, notificationMount } = root.refs;

  sidebarMount.appendChild(Sidebar());
  headerMount.appendChild(Header());
  notificationMount.appendChild(NotificationCenter());

  const protectedOutlet = Show({
    when: () => isAuthenticated.value,
    children: () => RouterOutlet(),
    fallback: () => LoginView({ onLoginSuccess: () => router.navigate('/') })
  });

  mainOutlet.appendChild(protectedOutlet);

  return root;
}
