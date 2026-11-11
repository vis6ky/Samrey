/**
 * @license Apache-2.0
 * @samrey/security - Trusted Types Policy Provider
 */

import { sanitizeHtmlString, sanitizeTemplateHtml, sanitizeUri } from './sanitizer.js';

export interface SamreyTrustedPolicy {
  createHTML(input: string): string;
  createScript(input: string): string;
  createScriptURL(input: string): string;
}

export interface TrustedTypesOptions {
  allowedScriptOrigins?: string[];
}

const TRUSTED_TYPES_REALM_CACHE_KEY = Symbol.for('samrey.trustedTypes.realmPolicyCache');

interface RealmPolicyCache {
  html?: SamreyTrustedPolicy;
  template?: SamreyTrustedPolicy;
}

function getRealmPolicyCache(): WeakMap<object, RealmPolicyCache> {
  const g = globalThis as Record<symbol, unknown>;
  let cache = g[TRUSTED_TYPES_REALM_CACHE_KEY] as WeakMap<object, RealmPolicyCache> | undefined;
  if (!cache) {
    cache = new WeakMap<object, RealmPolicyCache>();
    g[TRUSTED_TYPES_REALM_CACHE_KEY] = cache;
  }
  return cache;
}

type NativeTrustedTypesFactory = {
  createPolicy: (name: string, rules: unknown) => SamreyTrustedPolicy;
  defaultPolicy?: {
    createHTML?: (input: string) => unknown;
    createScriptURL?: (url: string) => unknown;
  };
};

let cachedPolicy: SamreyTrustedPolicy | null = null;
let configuredAllowedOrigins: string[] = [];

export function setAllowedScriptOrigins(origins: string[]): void {
  configuredAllowedOrigins = [...origins];
}

export function resetTrustedPolicyForTest(): void {
  cachedPolicy = null;
  cachedTemplatePolicy = null;
  configuredAllowedOrigins = [];
  const tt = typeof window !== 'undefined' && (window as unknown as { trustedTypes?: NativeTrustedTypesFactory }).trustedTypes;
  if (tt && typeof tt === 'object') {
    getRealmPolicyCache().delete(tt);
  }
}

function normalizeAllowedOrigin(origin: string): string | null {
  if (typeof origin !== 'string' || !origin.trim() || origin.trim() === '*') {
    return null;
  }
  try {
    const parsed = new URL(origin.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function validateScriptUrl(url: string, allowedOrigins: string[]): string {
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error(`[Samrey Security] Invalid or empty script URL: ${String(url)}`);
  }

  const safe = sanitizeUri(url).trim();
  if (!safe || safe === 'about:blank') {
    throw new Error(`[Samrey Security] Insecure script URL blocked: ${url}`);
  }

  const currentOrigin = (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null')
    ? window.location.origin
    : '';
  const sentinelBase = currentOrigin || 'https://__samrey_self__.invalid';

  try {
    // Reject scheme-colon confusion and leading backslashes before relative URL resolution
    const normalizedInput = safe.replace(/\\/g, '/');
    if (safe.startsWith('\\') || /^[a-z][a-z0-9+.-]*:(?!\/\/)/i.test(normalizedInput)) {
      throw new Error(`[Samrey Security] Malformed script URL scheme or path blocked: ${url}`);
    }
    const parsed = new URL(safe, sentinelBase);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`[Samrey Security] Unsupported script URL protocol: ${parsed.protocol}`);
    }

    // Same-origin or true path-relative URL (not protocol-relative //, /\, \\, \/ or cross-origin)
    const usedSentinelHost = !currentOrigin && parsed.origin === sentinelBase && !safe.toLowerCase().includes('__samrey_self__.invalid');
    const isSameCurrentOrigin = Boolean(currentOrigin && parsed.origin === currentOrigin);
    if (
      (isSameCurrentOrigin || usedSentinelHost) &&
      !normalizedInput.startsWith('//')
    ) {
      return safe;
    }

    const normalizedOrigins = new Set(
      allowedOrigins.map(normalizeAllowedOrigin).filter((o): o is string => o !== null)
    );
    if (normalizedOrigins.has(parsed.origin)) {
      return safe;
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('[Samrey Security]')) {
      throw err;
    }
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
  const tt = typeof window !== 'undefined' && (window as unknown as { trustedTypes?: NativeTrustedTypesFactory }).trustedTypes;

  if (tt && typeof tt === 'object') {
    const realmCache = getRealmPolicyCache();
    let entry = realmCache.get(tt);
    if (entry?.html) {
      cachedPolicy = entry.html;
      return cachedPolicy;
    }

    try {
      cachedPolicy = tt.createPolicy('samrey#html', {
        createHTML: (input: string) => sanitizeHtmlString(input),
        createScript: () => {
          throw new Error('[Samrey Security] Dynamic script creation is prohibited under zero-eval policy.');
        },
        createScriptURL: (url: string) => validateScriptUrl(url, configuredAllowedOrigins)
      });
      entry = entry || {};
      entry.html = cachedPolicy;
      realmCache.set(tt, entry);
      return cachedPolicy;
    } catch (err) {
      const def = tt.defaultPolicy;
      if (def && typeof def.createHTML === 'function') {
        cachedPolicy = {
          createHTML: (input: string) => def.createHTML!(sanitizeHtmlString(input)) as string,
          createScript: () => {
            throw new Error('[Samrey Security] Dynamic script creation is prohibited.');
          },
          createScriptURL: (url: string) => {
            const safe = validateScriptUrl(url, configuredAllowedOrigins);
            return typeof def.createScriptURL === 'function' ? (def.createScriptURL(safe) as string) : safe;
          }
        };
        return cachedPolicy;
      }
      throw new Error(
        `[Samrey Security] Trusted Types policy "samrey#html" initialization failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // Fallback programmatic policy when browser Trusted Types API is absent
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
 * Returns or initializes the strictly sanitized Trusted Types policy for developer-authored static HTML templates (EXT-002).
 */
export function getSamreyTemplateTrustedPolicy(): SamreyTrustedPolicy {
  if (cachedTemplatePolicy) return cachedTemplatePolicy;

  const tt = typeof window !== 'undefined' && (window as unknown as { trustedTypes?: NativeTrustedTypesFactory }).trustedTypes;

  if (tt && typeof tt === 'object') {
    const realmCache = getRealmPolicyCache();
    let entry = realmCache.get(tt);
    if (entry?.template) {
      cachedTemplatePolicy = entry.template;
      return cachedTemplatePolicy;
    }

    try {
      cachedTemplatePolicy = tt.createPolicy('samrey#template', {
        createHTML: (input: string) => sanitizeTemplateHtml(input),
        createScript: () => {
          throw new Error('[Samrey Security] Dynamic script creation is prohibited.');
        },
        createScriptURL: (url: string) => validateScriptUrl(url, configuredAllowedOrigins)
      });
      entry = entry || {};
      entry.template = cachedTemplatePolicy;
      realmCache.set(tt, entry);
      return cachedTemplatePolicy;
    } catch (err) {
      const def = tt.defaultPolicy;
      if (def && typeof def.createHTML === 'function') {
        cachedTemplatePolicy = {
          createHTML: (input: string) => def.createHTML!(sanitizeTemplateHtml(input)) as string,
          createScript: () => {
            throw new Error('[Samrey Security] Dynamic script creation is prohibited.');
          },
          createScriptURL: (url: string) => {
            const safe = validateScriptUrl(url, configuredAllowedOrigins);
            return typeof def.createScriptURL === 'function' ? (def.createScriptURL(safe) as string) : safe;
          }
        };
        return cachedTemplatePolicy;
      }
      throw new Error(
        `[Samrey Security] Trusted Types policy "samrey#template" initialization failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  cachedTemplatePolicy = {
    createHTML: (input: string) => sanitizeTemplateHtml(input),
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

