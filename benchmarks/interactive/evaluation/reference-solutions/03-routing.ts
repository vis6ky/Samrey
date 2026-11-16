/**
 * Reference Solution: Challenge 03 - Routed Dashboard
 */

import { template } from '@samrey/runtime';
import { createRouter, RouterOutlet, Link } from '@samrey/router';

const _overviewTmpl = template('<div class="page-overview"><h2>System Overview</h2></div>');
const _settingsTmpl = template('<div class="page-settings"><h2>Account Settings</h2></div>');
const _notFoundTmpl = template('<div class="page-404"><h2>Page Not Found</h2></div>');

export function OverviewView(): HTMLElement {
  return _overviewTmpl();
}

export function SettingsView(): HTMLElement {
  return _settingsTmpl();
}

export function NotFoundView(): HTMLElement {
  return _notFoundTmpl();
}

export const router = createRouter([
  { path: '/', component: OverviewView },
  { path: '/settings', component: SettingsView },
  { path: '*', component: NotFoundView }
]);

const _layoutTmpl = template(
  '<div class="dashboard-shell"><nav ref="nav"></nav><main ref="outlet"></main></div>'
);

export function DashboardLayout(): HTMLElement {
  const root = _layoutTmpl.clone();
  const { nav, outlet } = root.refs;

  nav.appendChild(Link({ href: '/', children: 'Overview' }));
  nav.appendChild(Link({ href: '/settings', children: 'Settings' }));
  outlet.appendChild(RouterOutlet());

  return root;
}
