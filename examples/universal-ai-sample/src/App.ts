/**
 * @license Apache-2.0
 * Root Application Component
 */

import { template } from '@samrey/runtime';
import { Link, RouterOutlet } from '@samrey/router';
import { Header } from './components/Header.js';
import { initAppRouter } from './router.js';

const _appTmpl = template(`
  <div class="samrey-app-shell">
    <div class="header-mount"></div>
    <nav class="main-nav">
      <div class="nav-container"></div>
    </nav>
    <main class="main-content">
      <div class="outlet-mount"></div>
    </main>
    <footer class="app-footer">
      <p>Built with <strong>Samrey</strong> — High-Performance Reactive Web Framework</p>
    </footer>
  </div>
`);

export function App(props?: { initialPath?: string }) {
  // Ensure router instance is initialized
  initAppRouter(props?.initialPath);

  const root = _appTmpl() as HTMLElement;

  const headerMount = root.querySelector('.header-mount') as HTMLElement;
  const navContainer = root.querySelector('.nav-container') as HTMLElement;
  const outletMount = root.querySelector('.outlet-mount') as HTMLElement;

  // Mount Header
  headerMount.appendChild(Header({ initialTheme: 'light' }));

  // Mount Nav Links
  const linkHome = Link({
    href: '/',
    class: 'nav-link',
    activeClass: 'active',
    children: 'Dashboard'
  });
  const linkProfile = Link({
    href: '/profile',
    class: 'nav-link',
    activeClass: 'active',
    children: 'Profile'
  });

  navContainer.appendChild(linkHome as unknown as Node);
  navContainer.appendChild(linkProfile as unknown as Node);

  // Mount Router Outlet
  outletMount.appendChild(RouterOutlet());

  return root;
}

