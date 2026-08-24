/**
 * @license Apache-2.0
 * @gati/doc - Native Gati Monorepo Entry Point
 */

import { mount } from '@gati/runtime';
import { App } from './App.js';
import './index.css';

const root = document.getElementById('root');
if (root) {
  mount(App, root);
}
