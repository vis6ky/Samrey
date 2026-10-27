/**
 * @license Apache-2.0
 * @samrey/ssr - Main Entry Point
 */

export * from './secret-guard.js';
export * from './serializer.js';
export * from './context.js';
export * from './data-loader.js';
export * from './stream.js';
export * from './hydration.js';
export * from './ssg.js';

import { stripSecrets } from './secret-guard.js';
import { serializeStateForHydration } from './serializer.js';
import { hydrate } from './hydration.js';
import { escapeHtmlText } from '@samrey/security';

export const sanitizeSsrState = stripSecrets;
export const escapeJsonState = serializeStateForHydration;
export const serializeState = serializeStateForHydration;
export const hydrateFromSSR = hydrate;
export const escapeHtml = escapeHtmlText;
import { getDelegatedEventScript } from './hydration.js';
export const generatePreHydrationScript = getDelegatedEventScript;
