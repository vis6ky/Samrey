/**
 * @license Apache-2.0
 * @gati/ssr - Secret Leakage Prevention & Sanitization
 */

/**
 * Patterns of sensitive keys that MUST NOT be serialized to the client.
 */
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /api[_-]?key/i,
  /auth(entication|orization)?/i,
  /bearer/i,
  /token/i,
  /jwt/i,
  /private[_-]?key/i,
  /credential/i,
  /cookie/i,
  /session/i,
  /database[_-]?url/i,
  /connection[_-]?string/i,
  /salt/i,
  /hash/i,
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
  const visited = new WeakSet<object>();

  function sanitize(val: unknown, currentPath = ''): unknown {
    if (val === null || val === undefined) return val;
    if (typeof val !== 'object') return val;

    // Defend against circular structures
    if (visited.has(val as object)) {
      return undefined;
    }
    visited.add(val as object);

    if (Array.isArray(val)) {
      return val.map((item, idx) => sanitize(item, `${currentPath}[${idx}]`));
    }

    const cleanObj: Record<string, unknown> = {};
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
            `[Gati SSR Security Violation] Attempted to serialize secret field "${fullPath}". Serialization aborted to prevent credential leakage.`
          );
        }
        if (options.onSecretFound) {
          options.onSecretFound(fullPath, key);
        } else {
          console.warn(`[Gati SSR Security Warning] Stripped sensitive property "${fullPath}" from client state payload.`);
        }
        continue;
      }

      cleanObj[key] = sanitize(value, fullPath);
    }

    return cleanObj;
  }

  return sanitize(data) as T;
}
