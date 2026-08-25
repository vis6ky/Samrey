/**
 * @license Apache-2.0
 * Samrey Task Details & Authentication Example — Main Entrypoint
 */

import { App } from './App.js';

export function bootstrap(rootSelector = '#app'): void {
  if (typeof document === 'undefined') return;

  const root = document.querySelector(rootSelector);
  if (!root) {
    console.error(`Root element "${rootSelector}" not found.`);
    return;
  }

  root.innerHTML = '';
  root.appendChild(App());
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bootstrap());
  } else {
    bootstrap();
  }
}
