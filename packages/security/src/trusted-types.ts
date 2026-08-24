/**
 * @license Apache-2.0
 * @gati/security - Trusted Types Policy Provider
 */

import { sanitizeHtmlString, sanitizeUri } from './sanitizer.js';

export interface GatiTrustedPolicy {
  createHTML(input: string): string;
  createScript(input: string): string;
  createScriptURL(input: string): string;
}

let cachedPolicy: GatiTrustedPolicy | null = null;

/**
 * Returns or initializes the W3C Trusted Types policy for Gati.
 * Strictly forbids dynamic string-to-script execution.
 */
export function getGatiTrustedPolicy(): GatiTrustedPolicy {
  if (cachedPolicy) return cachedPolicy;

  // Check if browser Trusted Types API is available
  const tt = typeof window !== 'undefined' && (window as unknown as { trustedTypes?: { createPolicy: (name: string, rules: unknown) => GatiTrustedPolicy } }).trustedTypes;

  if (tt) {
    try {
      cachedPolicy = tt.createPolicy('aether#html', {
        createHTML: (input: string) => sanitizeHtmlString(input),
        createScript: () => {
          throw new Error('[Gati Security] Dynamic script creation is prohibited under zero-eval policy.');
        },
        createScriptURL: (url: string) => {
          const safe = sanitizeUri(url);
          if (safe === 'about:blank' && url !== 'about:blank') {
            throw new Error(`[Gati Security] Insecure script URL blocked: ${url}`);
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
      throw new Error('[Gati Security] Dynamic script creation is prohibited.');
    },
    createScriptURL: (url: string) => sanitizeUri(url)
  };

  return cachedPolicy;
}

export const TrustedTypesPolicy = {
  getPolicy: getGatiTrustedPolicy,
  createHTML: (input: string) => getGatiTrustedPolicy().createHTML(input),
  createScriptURL: (url: string) => getGatiTrustedPolicy().createScriptURL(url)
};
