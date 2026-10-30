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

export interface TrustedTypesOptions {
  allowedScriptOrigins?: string[];
}

let cachedPolicy: SamreyTrustedPolicy | null = null;
let configuredAllowedOrigins: string[] = [];

export function setAllowedScriptOrigins(origins: string[]): void {
  configuredAllowedOrigins = [...origins];
}

export function resetTrustedPolicyForTest(): void {
  cachedPolicy = null;
  configuredAllowedOrigins = [];
}

function validateScriptUrl(url: string, allowedOrigins: string[]): string {
  const safe = sanitizeUri(url);
  if (safe === 'about:blank' && url !== 'about:blank') {
    throw new Error(`[Samrey Security] Insecure script URL blocked: ${url}`);
  }

  // Same-origin or relative check
  const isRelative = !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//');
  if (isRelative) {
    return safe;
  }

  const currentOrigin = (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null')
    ? window.location.origin
    : '';

  try {
    const parsed = new URL(url, currentOrigin || 'http://localhost');
    if (currentOrigin && parsed.origin === currentOrigin) {
      return safe;
    }
    if (allowedOrigins.includes(parsed.origin)) {
      return safe;
    }
  } catch {
    throw new Error(`[Samrey Security] Invalid script URL: ${url}`);
  }

  throw new Error(`[Samrey Security] Insecure or non-allowlisted script URL blocked: ${url}`);
}

/**
 * Returns or initializes the W3C Trusted Types policy for Samrey.
 * Strictly forbids dynamic string-to-script execution.
 */
export function getSamreyTrustedPolicy(options?: TrustedTypesOptions): SamreyTrustedPolicy {
  if (options?.allowedScriptOrigins) {
    configuredAllowedOrigins = [...options.allowedScriptOrigins];
  }

  if (cachedPolicy) return cachedPolicy;

  // Check if browser Trusted Types API is available
  const tt = typeof window !== 'undefined' && (window as unknown as { trustedTypes?: { createPolicy: (name: string, rules: unknown) => SamreyTrustedPolicy } }).trustedTypes;

  if (tt) {
    try {
      cachedPolicy = tt.createPolicy('samrey#html', {
        createHTML: (input: string) => sanitizeHtmlString(input),
        createScript: () => {
          throw new Error('[Samrey Security] Dynamic script creation is prohibited under zero-eval policy.');
        },
        createScriptURL: (url: string) => validateScriptUrl(url, configuredAllowedOrigins)
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
    createScriptURL: (url: string) => validateScriptUrl(url, configuredAllowedOrigins)
  };

  return cachedPolicy;
}

let cachedTemplatePolicy: SamreyTrustedPolicy | null = null;

/**
 * Returns or initializes the pass-through Trusted Types policy for developer-authored static HTML templates.
 */
export function getSamreyTemplateTrustedPolicy(): SamreyTrustedPolicy {
  if (cachedTemplatePolicy) return cachedTemplatePolicy;

  const tt = typeof window !== 'undefined' && (window as unknown as { trustedTypes?: { createPolicy: (name: string, rules: unknown) => SamreyTrustedPolicy } }).trustedTypes;

  if (tt) {
    try {
      cachedTemplatePolicy = tt.createPolicy('samrey#template', {
        createHTML: (input: string) => input,
        createScript: () => {
          throw new Error('[Samrey Security] Dynamic script creation is prohibited.');
        },
        createScriptURL: (url: string) => validateScriptUrl(url, configuredAllowedOrigins)
      });
      return cachedTemplatePolicy;
    } catch {
      // Policy may already exist
    }
  }

  cachedTemplatePolicy = {
    createHTML: (input: string) => input,
    createScript: () => {
      throw new Error('[Samrey Security] Dynamic script creation is prohibited.');
    },
    createScriptURL: (url: string) => validateScriptUrl(url, configuredAllowedOrigins)
  };

  return cachedTemplatePolicy;
}

export const TrustedTypesPolicy = {
  getPolicy: getSamreyTrustedPolicy,
  getTemplatePolicy: getSamreyTemplateTrustedPolicy,
  createHTML: (input: string) => getSamreyTrustedPolicy().createHTML(input),
  createTemplateHTML: (input: string) => getSamreyTemplateTrustedPolicy().createHTML(input),
  createScriptURL: (url: string, options?: TrustedTypesOptions) => {
    if (options?.allowedScriptOrigins) {
      configuredAllowedOrigins = [...options.allowedScriptOrigins];
    }
    return getSamreyTrustedPolicy().createScriptURL(url);
  }
};

