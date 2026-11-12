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

let defaultAllowedOrigins: string[] = [];
let activeScopedOrigins: string[] | null = null;
let fallbackHtmlPolicy: SamreyTrustedPolicy | null = null;
let fallbackTemplatePolicy: SamreyTrustedPolicy | null = null;

export function setAllowedScriptOrigins(origins: string[]): void {
  defaultAllowedOrigins = [...origins];
}

export function resetTrustedPolicyForTest(): void {
  fallbackHtmlPolicy = null;
  fallbackTemplatePolicy = null;
  defaultAllowedOrigins = [];
  activeScopedOrigins = null;
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

function wrapScopedPolicy(
  basePolicy: SamreyTrustedPolicy,
  scopedOrigins: string[]
): SamreyTrustedPolicy {
  return new Proxy(basePolicy, {
    get(target, prop) {
      if (prop === 'createHTML') {
        return (input: string) => target.createHTML(input);
      }
      if (prop === 'createScript') {
        return () => {
          throw new Error('[Samrey Security] Dynamic script creation is prohibited under zero-eval policy.');
        };
      }
      if (prop === 'createScriptURL') {
        return (url: string) => {
          const safe = validateScriptUrl(url, scopedOrigins);
          const prev = activeScopedOrigins;
          activeScopedOrigins = scopedOrigins;
          try {
            return target.createScriptURL(safe);
          } finally {
            activeScopedOrigins = prev;
          }
        };
      }
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

function createNativeOrFallbackPolicy(
  policyName: 'samrey#html' | 'samrey#template',
  sanitizeFn: (input: string) => string,
  options?: TrustedTypesOptions
): SamreyTrustedPolicy {
  const tt = typeof window !== 'undefined' && (window as unknown as { trustedTypes?: NativeTrustedTypesFactory }).trustedTypes;
  const isTemplate = policyName === 'samrey#template';
  const scopedOrigins = options?.allowedScriptOrigins ? [...options.allowedScriptOrigins] : null;

  if (tt && typeof tt === 'object') {
    const realmCache = getRealmPolicyCache();
    let entry = realmCache.get(tt);
    if (!entry) {
      entry = {};
      realmCache.set(tt, entry);
    }

    let basePolicy = isTemplate ? entry.template : entry.html;
    if (!basePolicy) {
      try {
        basePolicy = tt.createPolicy(policyName, {
          createHTML: (input: string) => sanitizeFn(input),
          createScript: () => {
            throw new Error('[Samrey Security] Dynamic script creation is prohibited under zero-eval policy.');
          },
          createScriptURL: (url: string) => validateScriptUrl(url, activeScopedOrigins ?? defaultAllowedOrigins)
        });
      } catch (err) {
        const def = tt.defaultPolicy;
        if (def && typeof def.createHTML === 'function') {
          basePolicy = {
            createHTML: (input: string) => def.createHTML!(sanitizeFn(input)) as string,
            createScript: () => {
              throw new Error('[Samrey Security] Dynamic script creation is prohibited.');
            },
            createScriptURL: (url: string) => {
              const safe = validateScriptUrl(url, activeScopedOrigins ?? defaultAllowedOrigins);
              if (typeof def.createScriptURL !== 'function') {
                throw new Error(
                  `[Samrey Security] Trusted Types policy "${policyName}" collision: defaultPolicy.createScriptURL is unavailable.`
                );
              }
              return def.createScriptURL(safe) as string;
            }
          };
        } else {
          throw new Error(
            `[Samrey Security] Trusted Types policy "${policyName}" initialization failed: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      if (isTemplate) entry.template = basePolicy;
      else entry.html = basePolicy;
    }

    return scopedOrigins ? wrapScopedPolicy(basePolicy, scopedOrigins) : basePolicy;
  }

  // Programmatic fallback when browser Trusted Types API is absent:
  // explicit per-call options create an isolated policy without mutating global origins
  if (scopedOrigins) {
    return {
      createHTML: (input: string) => sanitizeFn(input),
      createScript: () => {
        throw new Error('[Samrey Security] Dynamic script creation is prohibited.');
      },
      createScriptURL: (url: string) => validateScriptUrl(url, scopedOrigins)
    };
  }

  if (isTemplate) {
    if (!fallbackTemplatePolicy) {
      fallbackTemplatePolicy = {
        createHTML: (input: string) => sanitizeFn(input),
        createScript: () => {
          throw new Error('[Samrey Security] Dynamic script creation is prohibited.');
        },
        createScriptURL: (url: string) => validateScriptUrl(url, defaultAllowedOrigins)
      };
    }
    return fallbackTemplatePolicy;
  }

  if (!fallbackHtmlPolicy) {
    fallbackHtmlPolicy = {
      createHTML: (input: string) => sanitizeFn(input),
      createScript: () => {
        throw new Error('[Samrey Security] Dynamic script creation is prohibited.');
      },
      createScriptURL: (url: string) => validateScriptUrl(url, defaultAllowedOrigins)
    };
  }
  return fallbackHtmlPolicy;
}

/**
 * Returns or initializes the W3C Trusted Types policy for Samrey.
 * Strictly forbids dynamic string-to-script execution.
 */
export function getSamreyTrustedPolicy(options?: TrustedTypesOptions): SamreyTrustedPolicy {
  return createNativeOrFallbackPolicy('samrey#html', sanitizeHtmlString, options);
}

/**
 * Returns or initializes the strictly sanitized Trusted Types policy for developer-authored static HTML templates (EXT-002).
 */
export function getSamreyTemplateTrustedPolicy(options?: TrustedTypesOptions): SamreyTrustedPolicy {
  return createNativeOrFallbackPolicy('samrey#template', sanitizeTemplateHtml, options);
}

export const TrustedTypesPolicy = {
  getPolicy: getSamreyTrustedPolicy,
  getTemplatePolicy: getSamreyTemplateTrustedPolicy,
  createHTML: (input: string) => getSamreyTrustedPolicy().createHTML(input),
  createTemplateHTML: (input: string) => getSamreyTemplateTrustedPolicy().createHTML(input),
  createScriptURL: (url: string, options?: TrustedTypesOptions) => {
    return getSamreyTrustedPolicy(options).createScriptURL(url);
  }
};

