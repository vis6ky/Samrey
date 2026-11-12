/**
 * @license Apache-2.0
 * @samrey/ssr - Unicode Safe State Serialization & Validation
 */

import { escapeForScriptPayload, escapeHtmlAttribute } from '@samrey/security';
import { stripSecrets, SecretGuardOptions } from './secret-guard.js';
import { escapeCssIdentifier } from './css-escape.js';

export interface SerializeOptions extends SecretGuardOptions {
  /**
   * DOM script element ID. Defaults to '__SAMREY_STATE__'.
   */
  id?: string;
  /**
   * Cryptographic nonce for inline script execution under Content Security Policy (CSP).
   */
  nonce?: string;
}

export type StateValidator<T> = (data: unknown) => { success: true; data: T } | { success: false; error: string | Error } | boolean;

export interface DeserializeOptions<T = unknown> {
  /**
   * DOM script element ID to read from. Defaults to '__SAMREY_STATE__'.
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
 *
 * NOTE: SSR hydration state must be JSON-serializable (plain objects, arrays, primitives, Date).
 * Non-JSON data structures like Map and Set must be converted prior to serialization:
 * - Map: Array.from(myMap.entries())
 * - Set: Array.from(mySet)
 * In development, non-JSON types trigger a diagnostic warning; in strict mode ({ strict: true }), an error is thrown.
 */
export function serializeStateForHydration(state: unknown, options: SerializeOptions = {}): string {
  const rawId = options.id || '__SAMREY_STATE__';
  // Strictly validate script ID token to prevent attribute breakout or script termination
  const scriptId = /^[a-zA-Z0-9_\-:]+$/.test(rawId) ? rawId : '__SAMREY_STATE__';
  const cleanState = stripSecrets(state, options);
  const rawJson = JSON.stringify(cleanState) ?? 'null';
  const safePayload = escapeForScriptPayload(rawJson);
  const nonceAttr = options.nonce ? ` nonce="${escapeHtmlAttribute(options.nonce)}"` : '';

  return `<script id="${escapeHtmlAttribute(scriptId)}" type="application/json"${nonceAttr}>${safePayload}</script>`;
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
  const rawId = options.id || '__SAMREY_STATE__';
  const scriptId = /^[a-zA-Z0-9_\-:]+$/.test(rawId) ? rawId : '__SAMREY_STATE__';
  const fallback = options.fallback !== undefined ? options.fallback : null;

  if (typeof document === 'undefined') {
    return fallback;
  }

  const getSafeTagName = (el: any): string => {
    if (typeof Element !== 'undefined' && el instanceof Element) {
      return Object.getOwnPropertyDescriptor(Element.prototype, 'tagName')?.get?.call(el) ?? el.tagName ?? '';
    }
    return typeof el?.nodeName === 'string' ? el.nodeName : (typeof el?.tagName === 'string' ? el.tagName : '');
  };

  const getSafeAttr = (el: any, attrName: string): string | null => {
    if (typeof Element !== 'undefined' && el instanceof Element) {
      return Element.prototype.getAttribute.call(el, attrName);
    }
    return typeof el?.getAttribute === 'function' ? el.getAttribute(attrName) : null;
  };

  const getSafeTextContent = (el: any): string | null => {
    if (typeof Node !== 'undefined' && el instanceof Node) {
      return Object.getOwnPropertyDescriptor(Node.prototype, 'textContent')?.get?.call(el) ?? null;
    }
    return typeof el?.textContent === 'string' ? el.textContent : null;
  };

  const isValidStateScript = (node: any): boolean => {
    if (!node || typeof node !== 'object') return false;
    if (typeof Element !== 'undefined' && node instanceof Element) {
      if (typeof HTMLScriptElement !== 'undefined' && !(node instanceof HTMLScriptElement)) {
        return false;
      }
      const elId = getSafeAttr(node, 'id');
      if (elId !== null && elId !== scriptId) return false;
    } else if (typeof HTMLScriptElement !== 'undefined' && typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) {
      return false;
    }
    if (getSafeTagName(node).toUpperCase() !== 'SCRIPT') {
      return false;
    }
    const hasGetAttr = (typeof Element !== 'undefined' && node instanceof Element) || typeof node.getAttribute === 'function';
    if (hasGetAttr) {
      const typeAttr = getSafeAttr(node, 'type');
      if (typeAttr !== 'application/json') return false;
    }
    return true;
  };

  const candidates: Element[] = [];
  const selector = `script[type="application/json"]#${escapeCssIdentifier(scriptId)}`;
  if (typeof document.querySelectorAll === 'function') {
    try {
      for (const match of Array.from(document.querySelectorAll(selector))) {
        if (isValidStateScript(match)) candidates.push(match);
      }
    } catch {
      // Fall through to querySelector / getElementById fallback
    }
  }
  if (candidates.length === 0 && typeof document.querySelector === 'function') {
    try {
      const first = document.querySelector(selector);
      if (first && isValidStateScript(first)) candidates.push(first);
    } catch {
      // Fall through to getElementById fallback
    }
  }
  if (candidates.length === 0 && typeof document.getElementById === 'function') {
    const byId = document.getElementById(scriptId);
    if (byId && isValidStateScript(byId)) candidates.push(byId);
  }

  if (candidates.length === 0) {
    return fallback;
  }

  const parsedPayloads: unknown[] = [];
  for (const script of candidates) {
    const rawContent = getSafeTextContent(script);
    if (!rawContent) continue;
    try {
      parsedPayloads.push(safeJsonParse<unknown>(rawContent));
    } catch (err) {
      console.error('[Samrey SSR] Failed to parse hydration state payload (malformed or corrupted JSON):', err);
      return fallback;
    }
  }

  if (parsedPayloads.length === 0) {
    return fallback;
  }

  let parsed: T;
  if (
    parsedPayloads.length > 1 &&
    parsedPayloads.every((p) => p !== null && typeof p === 'object' && !Array.isArray(p))
  ) {
    const merged: Record<string, unknown> = Object.create(null);
    for (const chunk of parsedPayloads) {
      for (const [k, v] of Object.entries(chunk as Record<string, unknown>)) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        merged[k] = v;
      }
    }
    parsed = merged as unknown as T;
  } else {
    parsed = parsedPayloads[0] as T;
  }

  try {
    if (options.validator) {
      const res = options.validator(parsed);
      if (typeof res === 'boolean') {
        if (!res) {
          console.warn(`[Samrey SSR] Hydration state failed custom validator. Using fallback.`);
          return fallback;
        }
        return parsed;
      }

      if (!res.success) {
        const errMsg = 'error' in res ? res.error : 'Validation failed';
        console.warn(`[Samrey SSR] Hydration state validation error:`, errMsg);
        return fallback;
      }

      return res.data;
    }

    return parsed;
  } catch (err) {
    console.error('[Samrey SSR] Failed to validate hydration state payload:', err);
    return fallback;
  }
}
