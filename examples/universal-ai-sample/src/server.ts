/**
 * @license Apache-2.0
 * Server-Side Rendering Script using @samrey/ssr
 */

import { renderToString } from '@samrey/ssr';
import { App } from './App.js';

export async function renderApp(url = '/'): Promise<string> {
  return await renderToString(() => App({ initialPath: url }), {
    title: 'Samrey AI Universal Verification'
  });
}
