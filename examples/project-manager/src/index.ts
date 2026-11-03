/**
 * @license Apache-2.0
 * Samrey Project Manager — Application Entry Point
 */

import { mount } from '@samrey/runtime';
import { App } from './App.js';

const appRoot = document.getElementById('app') || document.body;
mount(App, appRoot);
