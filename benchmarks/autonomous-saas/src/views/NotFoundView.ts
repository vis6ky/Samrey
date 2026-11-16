/**
 * @license Apache-2.0
 * Samrey Framework Autonomous SaaS — 404 View
 */

import { template } from '@samrey/runtime';
import { Link } from '@samrey/router';

const _notFoundTmpl = template(`
  <div class="page-404">
    <h2>404 — Page Not Found</h2>
    <p>The requested route does not exist.</p>
    <div ref="linkContainer"></div>
  </div>
`);

export function NotFoundView(): HTMLElement {
  const root = _notFoundTmpl.clone();
  const { linkContainer } = root.refs;
  linkContainer.appendChild(Link({ href: '/', children: 'Return to Dashboard' }));
  return root;
}
