/**
 * @license Apache-2.0
 * @samrey/security - Trusted Types Policy Provider
 */

import { sanitizeHtmlString, sanitizeUri } from './sanitizer.js';

export interface SamreyTrustedPolicy {
  createHTML(input: string): string;
  createScript(input: string): string;
  createScriptURL(input: string): string;
}

let cachedPolicy: SamreyTrustedPolicy | null = null;

/**
 * Returns or initializes the W3C Trusted Types policy for Samrey.
 * Strictly forbids dynamic string-to-script execution.
 */
export function getSamreyTrustedPolicy(): SamreyTrustedPolicy {
  if (cachedPolicy) return cachedPolicy;

  // Check if browser Trusted Types API is available
  const tt = typeof window !== 'undefined' && (window as unknown as { trustedTypes?: { createPolicy: (name: string, rules: unknown) => SamreyTrustedPolicy } }).trustedTypes;

  if (tt) {
    try {
      cachedPolicy = tt.createPolicy('aether#html', {
        createHTML: (input: string) => sanitizeHtmlString(input),
        createScript: () => {
          throw new Error('[Samrey Security] Dynamic script creation is prohibited under zero-eval policy.');
        },
        createScriptURL: (url: string) => {
          const safe = sanitizeUri(url);
          if (safe === 'about:blank' && url !== 'about:blank') {
            throw new Error(`[Samrey Security] Insecure script URL blocked: ${url}`);
          }
          return safe;
        }
      });
      return cachedPolicy;
    } catch {
      // Policy may already exist or be locked
    }
  }

  // Fallback programmatic policy
  cachedPolicy = {
    createHTML: (input: string) => sanitizeHtmlString(input),
    createScript: () => {
      throw new Error('[Samrey Security] Dynamic script creation is prohibited.');
    },
    createScriptURL: (url: string) => sanitizeUri(url)
  };

  return cachedPolicy;
}

export const TrustedTypesPolicy = {
  getPolicy: getSamreyTrustedPolicy,
  createHTML: (input: string) => getSamreyTrustedPolicy().createHTML(input),
  createScriptURL: (url: string) => getSamreyTrustedPolicy().createScriptURL(url)
};
