/**
 * @license Apache-2.0
 * @samrey/doc - Native Samrey Monorepo Entry Point
 */

import { mount } from '@samrey/runtime';
import { App } from './App.js';
import './index.css';

const root = document.getElementById('root');
if (root) {
  mount(App, root);
}
