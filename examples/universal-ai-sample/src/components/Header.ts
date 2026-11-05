/**
 * @license Apache-2.0
 * Header Component - Reactive Theme & Brand Navigation
 */

import { signal } from '@samrey/reactivity';
import { template, on, bindText, bindAttr } from '@samrey/runtime';

const _headerTmpl = template(`
  <header class="app-header">
    <div class="brand">
      <h1 class="title">Samrey AI Verification App</h1>
      <span class="badge theme-badge"></span>
    </div>
    <div class="actions">
      <button class="btn btn-theme" type="button">Toggle Theme</button>
    </div>
  </header>
`);

export function Header(props?: { initialTheme?: string }) {
  const theme = signal<string>(props?.initialTheme ?? 'light');
  const root = _headerTmpl() as HTMLElement;

  const badgeEl = root.querySelector('.theme-badge') as HTMLElement;
  const toggleBtn = root.querySelector('.btn-theme') as HTMLButtonElement;

  bindText(badgeEl, () => `Theme: ${theme.value.toUpperCase()}`);
  bindAttr(root, 'data-theme', () => theme.value);

  on(toggleBtn, 'click', () => {
    theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  });

  return root;
}

