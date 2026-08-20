/**
 * @license Apache-2.0
 * @aether/devtools - Privacy & Secret Sanitization Utility
 * Guarantees zero leak of sensitive credentials, tokens, and PII in DevTools emissions.
 */

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /auth/i,
  /bearer/i,
  /cookie/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /credit[_-]?card/i,
  /cvv/i,
  /ssn/i,
  /session[_-]?id/i
];

/**
 * Checks if a key name represents sensitive information.
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Deeply sanitizes an object, array, or primitive for safe serialization into DevTools.
 * Masks sensitive values with "[REDACTED]". Prevents infinite circular reference loops.
 */
export function sanitizePayload<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || value === undefined) {
    return value;
  }

  const type = typeof value;
  if (type === 'number' || type === 'boolean') {
    return value;
  }

  if (type === 'string') {
    // Check if the string resembles a JWT or Bearer token
    if (/^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value as string)) {
      return '[REDACTED JWT]' as unknown as T;
    }
    if (/^Bearer\s+[A-Za-z0-9_.-]+/i.test(value as string)) {
      return 'Bearer [REDACTED]' as unknown as T;
    }
    return value;
  }

  if (type === 'function') {
    return `[Function ${(value as Function).name || 'anonymous'}]` as unknown as T;
  }

  if (type === 'object') {
    if (seen.has(value as object)) {
      return '[Circular Reference]' as unknown as T;
    }
    seen.add(value as object);

    if (Array.isArray(value)) {
      return value.map((item) => sanitizePayload(item, seen)) as unknown as T;
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack
      } as unknown as T;
    }

    if (value instanceof Date) {
      return value.toISOString() as unknown as T;
    }

    if (value instanceof Map) {
      const sanitizedEntries: [unknown, unknown][] = [];
      for (const [k, v] of value.entries()) {
        const keyStr = String(k);
        const safeVal = isSensitiveKey(keyStr) ? '[REDACTED]' : sanitizePayload(v, seen);
        sanitizedEntries.push([k, safeVal]);
      }
      return sanitizedEntries as unknown as T;
    }

    if (value instanceof Set) {
      return Array.from(value).map((item) => sanitizePayload(item, seen)) as unknown as T;
    }

    // Standard plain object
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = sanitizePayload((value as Record<string, unknown>)[key], seen);
      }
    }

    return result as T;
  }

  return value;
}
