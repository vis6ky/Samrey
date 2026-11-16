/**
 * @license Apache-2.0
 * Samrey Framework Autonomous SaaS — Application Header
 */

import { template, on, bindText } from '@samrey/runtime';
import { currentUser, logout } from '../auth/AuthContext.js';
import { notify } from './NotificationCenter.js';

const _headerTmpl = template(`
  <header class="saas-header">
    <div class="header-title">
      <h1>Enterprise Workspace</h1>
    </div>
    <div class="user-profile">
      <span ref="userName" class="user-name"></span>
      <span ref="userRole" class="badge badge-admin"></span>
      <button ref="logoutBtn" class="btn-logout">Logout</button>
    </div>
  </header>
`);

export function Header(): HTMLElement {
  const root = _headerTmpl.clone();
  const { userName, userRole, logoutBtn } = root.refs;

  bindText(userName, () => currentUser.value?.name ?? 'Guest');
  bindText(userRole, () => currentUser.value?.role ? currentUser.value.role.toUpperCase() : '');

  on(logoutBtn, 'click', () => {
    logout();
    notify('Successfully logged out', 'info');
  });

  return root;
}
