/**
 * @license Apache-2.0
 * Gati Project Manager — Application Entry Point
 */

import { mount } from '@gati/runtime';
import { App } from './App.js';

const appRoot = document.getElementById('app') || document.body;
mount(App, appRoot);
