/**
 * @license Apache-2.0
 * Client-Side Application Entry Point
 */

import { App } from './App.js';

const root = document.getElementById('app');
if (root) {
  root.innerHTML = '';
  root.appendChild(App());
}

