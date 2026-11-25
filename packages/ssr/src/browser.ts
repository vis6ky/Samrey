/**
 * @license Apache-2.0
 * @samrey/ssr - Browser Client Entry Point
 */

export * from './secret-guard.js';
export * from './serializer.js';
export * from './data-loader.js';
export * from './hydration.js';

import { stripSecrets } from './secret-guard.js';
import { serializeStateForHydration } from './serializer.js';
import { hydrate } from './hydration.js';
import { escapeHtmlText } from '@samrey/security';
import { getDelegatedEventScript } from './hydration.js';

export const sanitizeSsrState = stripSecrets;
export const escapeJsonState = serializeStateForHydration;
export const serializeState = serializeStateForHydration;
export const hydrateFromSSR = hydrate;
export const escapeHtml = escapeHtmlText;
export const generatePreHydrationScript = getDelegatedEventScript;
