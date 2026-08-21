/**
 * @license Apache-2.0
 * @aether/doc - Native Aether Monorepo Entry Point
 */

import { mount } from '@aether/runtime';
import { App } from './App.js';
import './index.css';

const root = document.getElementById('root');
if (root) {
  mount(App, root);
}
