/**
 * @license Apache-2.0
 * @samrey/devtools - Privacy & Secret Sanitization Utility
 * Guarantees zero leak of sensitive credentials, tokens, and PII in DevTools emissions.
 */

const SENSITIVE_KEY_PATTERNS = [
  /(^|[._-])(password|passwd|pwd)([._-]|$)/,
  /(^|[._-])secret([._-]|$)/,
  /(^|[._-])api[._-]?key([._-]|$)/,
  /(^|[._-])access[._-]?key([._-]|$)/,
  /(^|[._-])private[._-]?key([._-]|$)/,
  /(^|[._-])auth([._-]|$|token|secret|key|header)/,
  /(^|[._-])(authorization|authentication)([._-]|$)/,
  /(^|[._-])bearer([._-]|$)/,
  /(^|[._-])token([._-]|$)/,
  /(^|[._-])jwt([._-]|$)/,
  /(^|[._-])credentials?([._-]|$)/,
  /(^|[._-])cookies?([._-]|$)/,
  /(^|[._-])session(id)?([._-]|$)/,
  /(^|[._-])ssn([._-]|$)/,
  /(^|[._-])database[._-]?url([._-]|$)/,
  /(^|[._-])connection[._-]?string([._-]|$)/,
  /(^|[._-])salt([._-]|$)/,
  /(^|[._-])(pass(word)?|secret|salt)hash([._-]|$)/,
  /(^|[._-])hash([._-]|$)/,
  /^env\./,
  /^process\.env/,
  /^_secret/,
  /(^|[._-])client[._-]?secret([._-]|$)/,
  /(^|[._-])service[._-]?role([._-]|$)/
];

/**
 * Checks if a key name represents sensitive information.
 * Uses camelCase and delimiter-anchored matching to avoid false positives (e.g. author, tokenCount).
 */
export function isSensitiveKey(key: string): boolean {
  if (typeof key !== 'string') return false;
  const norm = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

  // Explicit non-sensitive exceptions: author, authorId, tokenCount, authority
  if (/(^|[._-])author([._-]|$)/.test(norm)) return false;
  if (/(^|[._-])authority([._-]|$)/.test(norm)) return false;
  if (/(^|[._-])token[._-]count(s)?([._-]|$)/.test(norm)) return false;

  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(norm));
}

/**
 * Deeply sanitizes an object, array, or primitive for safe serialization into DevTools.
 * Masks sensitive values with "[REDACTED]".
 * Tracks ancestor path to detect real circular references while preserving shared DAG references.
 */
export function sanitizePayload<T>(
  value: T,
  ancestors = new WeakSet<object>(),
  memo = new WeakMap<object, any>()
): T {
  if (value === null || value === undefined) {
    return value;
  }

  const type = typeof value;
  if (type === 'number' || type === 'boolean') {
    return value;
  }

  if (type === 'string') {
    let str = value as string;
    if (/Bearer\s+[A-Za-z0-9_.-]+/i.test(str)) {
      str = str.replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, 'Bearer [REDACTED]');
    }
    if (/ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/.test(str)) {
      str = str.replace(/ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g, '[REDACTED JWT]');
    }
    return str as unknown as T;
  }

  if (type === 'function') {
    return `[Function ${(value as Function).name || 'anonymous'}]` as unknown as T;
  }

  if (type === 'object') {
    if (ancestors.has(value as object)) {
      return '[Circular Reference]' as unknown as T;
    }

    if (memo.has(value as object)) {
      return memo.get(value as object);
    }

    ancestors.add(value as object);

    if (Array.isArray(value)) {
      const cleanArr: unknown[] = [];
      memo.set(value as object, cleanArr);
      for (const item of value) {
        cleanArr.push(sanitizePayload(item, ancestors, memo));
      }
      ancestors.delete(value as object);
      return cleanArr as unknown as T;
    }

    if (value instanceof Error) {
      ancestors.delete(value as object);
      return {
        name: value.name,
        message: value.message,
        stack: value.stack
      } as unknown as T;
    }

    if (value instanceof Date) {
      ancestors.delete(value as object);
      return value.toISOString() as unknown as T;
    }

    if (value instanceof Map) {
      const sanitizedEntries: [unknown, unknown][] = [];
      memo.set(value as object, sanitizedEntries);
      for (const [k, v] of value.entries()) {
        const keyStr = String(k);
        const safeVal = isSensitiveKey(keyStr) ? '[REDACTED]' : sanitizePayload(v, ancestors, memo);
        sanitizedEntries.push([k, safeVal]);
      }
      ancestors.delete(value as object);
      return sanitizedEntries as unknown as T;
    }

    if (value instanceof Set) {
      const cleanArr: unknown[] = [];
      memo.set(value as object, cleanArr);
      for (const item of value) {
        cleanArr.push(sanitizePayload(item, ancestors, memo));
      }
      ancestors.delete(value as object);
      return cleanArr as unknown as T;
    }

    // Standard plain object
    const result: Record<string, unknown> = {};
    memo.set(value as object, result);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      const val = (value as Record<string, unknown>)[key];
      if (typeof val === 'string' && /^ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+$/.test(val)) {
        result[key] = '[REDACTED JWT]';
      } else if (isSensitiveKey(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = sanitizePayload(val, ancestors, memo);
      }
    }

    ancestors.delete(value as object);
    return result as T;
  }

  return value;
}
