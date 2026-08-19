/**
 * @license Apache-2.0
 * @aether/ssr - Unicode Safe State Serialization
 */

import { escapeForScriptPayload } from '@aether/security';

export function serializeStateForHydration(state: unknown): string {
  const rawJson = JSON.stringify(state);
  const safePayload = escapeForScriptPayload(rawJson);
  return `<script id="__AETHER_STATE__" type="application/json">${safePayload}</script>`;
}

export function deserializeHydrationState<T = unknown>(): T | null {
  if (typeof document === 'undefined') return null;
  const script = document.getElementById('__AETHER_STATE__');
  if (!script || !script.textContent) return null;
  try {
    return JSON.parse(script.textContent) as T;
  } catch (err) {
    console.error('[Aether SSR] Failed to parse hydration state:', err);
    return null;
  }
}
