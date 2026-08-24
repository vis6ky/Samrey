/**
 * @license Apache-2.0
 * @gati/ssr - Unicode Safe State Serialization & Validation
 */

import { escapeForScriptPayload } from '@gati/security';
import { stripSecrets, SecretGuardOptions } from './secret-guard.js';

export interface SerializeOptions extends SecretGuardOptions {
  /**
   * DOM script element ID. Defaults to '__AETHER_STATE__'.
   */
  id?: string;
}

export type StateValidator<T> = (data: unknown) => { success: true; data: T } | { success: false; error: string | Error } | boolean;

export interface DeserializeOptions<T = unknown> {
  /**
   * DOM script element ID to read from. Defaults to '__AETHER_STATE__'.
   */
  id?: string;
  /**
   * Optional schema or validator function to verify payload integrity.
   */
  validator?: StateValidator<T>;
  /**
   * Fallback state to return if parsing or validation fails.
   */
  fallback?: T;
}

/**
 * Serializes state to a safe inline JSON `<script>` payload.
 * Automatically scans and strips secrets and escapes script breakout tokens.
 */
export function serializeStateForHydration(state: unknown, options: SerializeOptions = {}): string {
  const scriptId = options.id || '__AETHER_STATE__';
  const cleanState = stripSecrets(state, options);
  const rawJson = JSON.stringify(cleanState);
  const safePayload = escapeForScriptPayload(rawJson);

  return `<script id="${scriptId}" type="application/json">${safePayload}</script>`;
}

/**
 * Safely parses and sanitizes a raw JSON string into an object,
 * preventing prototype pollution by scrubbing '__proto__', 'constructor', and 'prototype'.
 */
export function safeJsonParse<T = unknown>(rawJson: string): T {
  return JSON.parse(rawJson, (key, value) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined;
    }
    return value;
  }) as T;
}

/**
 * Deserializes and validates hydration state on the client.
 * Returns the validated state, or the fallback (or null) if the script is missing,
 * malformed, or fails schema validation.
 */
export function deserializeHydrationState<T = unknown>(options: DeserializeOptions<T> = {}): T | null {
  const scriptId = options.id || '__AETHER_STATE__';
  const fallback = options.fallback !== undefined ? options.fallback : null;

  if (typeof document === 'undefined') {
    return fallback;
  }

  const script = document.getElementById(scriptId);
  // Defend against DOM clobbering: ensure target is an actual SCRIPT element
  if (!script || (script.nodeName !== 'SCRIPT' && !(typeof HTMLScriptElement !== 'undefined' && script instanceof HTMLScriptElement))) {
    return fallback;
  }

  const rawContent = script.textContent;
  if (!rawContent) {
    return fallback;
  }

  try {
    const parsed = safeJsonParse<T>(rawContent);

    if (options.validator) {
      const res = options.validator(parsed);
      if (typeof res === 'boolean') {
        if (!res) {
          console.warn(`[Gati SSR] Hydration state failed custom validator. Using fallback.`);
          return fallback;
        }
        return parsed;
      }

      if (!res.success) {
        const errMsg = 'error' in res ? res.error : 'Validation failed';
        console.warn(`[Gati SSR] Hydration state validation error:`, errMsg);
        return fallback;
      }

      return res.data;
    }

    return parsed;
  } catch (err) {
    console.error('[Gati SSR] Failed to parse hydration state payload (malformed or corrupted JSON):', err);
    return fallback;
  }
}
