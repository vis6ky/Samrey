/**
 * @license Apache-2.0
 * @samrey/doc - Native Samrey Monorepo Entry Point
 */

import { mount } from '@samrey/runtime';
import { App } from './App.js';
import './index.css';

const root = document.getElementById('root');
if (root) {
  try {
    mount(App, root);
  } catch (err: unknown) {
    console.error('[Samrey] Failed to mount root application:', err);
    const errMessage = err instanceof Error ? err.stack || err.message : String(err);
    const box = document.createElement('div');
    box.setAttribute(
      'style',
      'padding: 32px; font-family: system-ui, sans-serif; max-width: 640px; margin: 40px auto; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; color: #9f1239;'
    );
    const heading = document.createElement('h2');
    heading.setAttribute('style', 'margin-top: 0; font-size: 1.25rem;');
    heading.textContent = 'Application Initialization Notice';
    const desc = document.createElement('p');
    desc.setAttribute('style', 'font-size: 0.875rem; color: #4b5563;');
    desc.textContent = 'An error occurred while mounting the component tree:';
    const pre = document.createElement('pre');
    pre.setAttribute(
      'style',
      'background: #ffffff; padding: 12px; border-radius: 6px; font-size: 0.75rem; overflow-x: auto; color: #b91c1c;'
    );
    pre.textContent = errMessage;
    box.append(heading, desc, pre);
    root.replaceChildren(box);
  }
}
