/**
 * @license Apache-2.0
 * Samrey Framework Autonomous SaaS — Responsive Sidebar Navigation
 */

import { template } from '@samrey/runtime';
import { Link } from '@samrey/router';

const _sidebarTmpl = template(`
  <aside class="saas-sidebar">
    <div class="sidebar-brand">
      <h2>Samrey SaaS</h2>
    </div>
    <nav class="sidebar-menu" ref="menu"></nav>
  </aside>
`);

export function Sidebar(): HTMLElement {
  const root = _sidebarTmpl.clone();
  const { menu } = root.refs;

  menu.appendChild(Link({ href: '/', children: '📊 Dashboard' }));
  menu.appendChild(Link({ href: '/users', children: '👥 User Management' }));
  menu.appendChild(Link({ href: '/analytics', children: '📈 Analytics' }));

  return root;
}
