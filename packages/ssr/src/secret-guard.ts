/**
 * @license Apache-2.0
 * @samrey/ssr - Secret Leakage Prevention & Sanitization
 */

/**
 * Patterns of sensitive keys that MUST NOT be serialized to the client.
 */
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwd/i,
  /(^|[a-z0-9_-])pwd([A-Z0-9_-]|$)/i,
  /secret/i,
  /api[_-]?key/i,
  /access[_-]?key/i,
  /(^|[_-])auth([A-Z_-]|$|token|secret|key|header)/i,
  /authorization/i,
  /authentication/i,
  /bearer/i,
  /(^|[a-z0-9_-])token([A-Z_-]|$)(?!count)/i,
  /jwt/i,
  /private[_-]?key/i,
  /(^|[_-])credentials?($|[_-])/i,
  /(^|[_-])cookies?($|[_-])/i,
  /(^|[_-])session(id)?($|[_-])/i,
  /(^|[_-])ssn($|[_-])/i,
  /database[_-]?url/i,
  /connection[_-]?string/i,
  /(^|[_-])salt($|[_-])/i,
  /(^|[a-z0-9_-])(pass(word)?|secret|salt)hash/i,
  /(^|[_-])hash($|[_-])/i,
  /^env\./i,
  /^process\.env/i,
  /^_secret/i,
  /client[_-]?secret/i,
  /service[_-]?role/i
];

export interface SecretGuardOptions {
  /**
   * If true, throws an error when a secret key is detected.
   * If false (default), strips the key and logs a warning.
   */
  strict?: boolean;
  /**
   * Custom list of additional sensitive keys to strip.
   */
  additionalKeys?: (string | RegExp)[];
  /**
   * Custom callback invoked when a secret is stripped.
   */
  onSecretFound?: (path: string, key: string) => void;
}

/**
 * Tests whether a property key matches any sensitive pattern.
 */
export function isSensitiveKey(key: string, additionalKeys?: (string | RegExp)[]): boolean {
  if (SENSITIVE_KEY_PATTERNS.some((p) => p.test(key))) {
    return true;
  }
  if (additionalKeys) {
    return additionalKeys.some((p) => (typeof p === 'string' ? p.toLowerCase() === key.toLowerCase() : p.test(key)));
  }
  return false;
}

/**
 * Recursively scans and strips sensitive data from an object before serialization.
 * Defends against circular references and prototype pollution.
 */
export function stripSecrets<T>(data: T, options: SecretGuardOptions = {}): T {
  const ancestors = new WeakSet<object>();
  const memo = new WeakMap<object, any>();

  function sanitize(val: unknown, currentPath = ''): unknown {
    if (val === null || val === undefined) return val;
    if (typeof val !== 'object') return val;

    // Detect circular reference in current ancestor stack
    if (ancestors.has(val as object)) {
      return undefined;
    }

    // Reuse previously sanitized object in DAG (shared references)
    if (memo.has(val as object)) {
      return memo.get(val as object);
    }

    // Preserve Date, RegExp, Map, Set
    if (val instanceof Date) {
      return new Date(val.getTime());
    }
    if (val instanceof RegExp) {
      return new RegExp(val.source, val.flags);
    }
    if (val instanceof Map) {
      ancestors.add(val as object);
      const cleanMap = new Map();
      memo.set(val as object, cleanMap);
      for (const [k, v] of val.entries()) {
        if (typeof k === 'string' && isSensitiveKey(k, options.additionalKeys)) {
          if (options.strict) {
            throw new Error(`[Samrey SSR Security Violation] Attempted to serialize secret field "${currentPath}.${String(k)}".`);
          }
          if (options.onSecretFound) options.onSecretFound(`${currentPath}.${String(k)}`, k);
          continue;
        }
        cleanMap.set(k, sanitize(v, `${currentPath}.${String(k)}`));
      }
      ancestors.delete(val as object);
      return cleanMap;
    }
    if (val instanceof Set) {
      ancestors.add(val as object);
      const cleanSet = new Set();
      memo.set(val as object, cleanSet);
      for (const item of val.values()) {
        cleanSet.add(sanitize(item, currentPath));
      }
      ancestors.delete(val as object);
      return cleanSet;
    }

    ancestors.add(val as object);

    if (Array.isArray(val)) {
      const cleanArr: unknown[] = [];
      memo.set(val as object, cleanArr);
      for (let idx = 0; idx < val.length; idx++) {
        cleanArr.push(sanitize(val[idx], `${currentPath}[${idx}]`));
      }
      ancestors.delete(val as object);
      return cleanArr;
    }

    const cleanObj: Record<string, unknown> = {};
    memo.set(val as object, cleanObj);
    const entries = Object.entries(val as Record<string, unknown>);

    for (const [key, value] of entries) {
      // Prototype pollution defense: ignore dangerous keys
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }

      const fullPath = currentPath ? `${currentPath}.${key}` : key;

      if (isSensitiveKey(key, options.additionalKeys)) {
        if (options.strict) {
          throw new Error(
            `[Samrey SSR Security Violation] Attempted to serialize secret field "${fullPath}". Serialization aborted to prevent credential leakage.`
          );
        }
        if (options.onSecretFound) {
          options.onSecretFound(fullPath, key);
        } else {
          console.warn(`[Samrey SSR Security Warning] Stripped sensitive property "${fullPath}" from client state payload.`);
        }
        continue;
      }

      cleanObj[key] = sanitize(value, fullPath);
    }

    ancestors.delete(val as object);
    return cleanObj;
  }

  return sanitize(data) as T;
}
