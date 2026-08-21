/**
 * @license Apache-2.0
 * Aether Project Manager — Application Entry Point
 */

import { mount } from '@aether/runtime';
import { App } from './App.js';

const appRoot = document.getElementById('app') || document.body;
mount(App, appRoot);
