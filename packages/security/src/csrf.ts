/**
 * @license Apache-2.0
 * @samrey/security - Anti-CSRF Token Generation & Verification
 */

function getRandomBytes(count: number): Uint8Array {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(count);
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const getModule = (process as any)['getBuiltinModule'];
      const cryptoName = ['node', 'crypto'].join(':');
      let nc: any = null;
      if (typeof getModule === 'function') {
        nc = getModule(cryptoName);
      }
      if (!nc) {
        const req = (globalThis as any)['require'] || (typeof module !== 'undefined' ? (module as any)['require'] : null);
        if (typeof req === 'function') {
          nc = req(cryptoName);
        }
      }
      if (nc) {
        if (nc.webcrypto?.getRandomValues) {
          const bytes = new Uint8Array(count);
          nc.webcrypto.getRandomValues(bytes);
          return bytes;
        }
        if (typeof nc.randomBytes === 'function') {
          const buf = nc.randomBytes(count);
          return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        }
      }
    } catch {
      // Fall through to error
    }
  }
  throw new Error('[Samrey Security] Cryptographically secure random generator is unavailable.');
}

/**
 * Generates a pseudo-random CSRF token or action HMAC identifier.
 */
export function generateCsrfToken(entropyOrSecret?: number | string): string {
  let entropy = 32;
  if (typeof entropyOrSecret === 'number') {
    if (!Number.isInteger(entropyOrSecret) || entropyOrSecret <= 0) {
      throw new RangeError('[Samrey Security] Entropy must be a positive integer.');
    }
    entropy = entropyOrSecret;
  } else if (typeof entropyOrSecret === 'string') {
    if (entropyOrSecret.length > 8192) {
      throw new RangeError('[Samrey Security] CSRF secret argument exceeds maximum length.');
    }
    entropy = 32;
  } else if (entropyOrSecret !== undefined) {
    throw new TypeError('[Samrey Security] entropyOrSecret must be a number or string.');
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes = getRandomBytes(entropy);
  let token = '';
  for (let i = 0; i < entropy; i++) {
    token += chars[bytes[i]! % chars.length];
  }
  return token;
}

/**
 * Constant-time string equality check to prevent timing attacks on HMAC tokens.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifies a submitted CSRF token against an expected session token.
 */
export function verifyCsrfToken(submittedToken: string | null | undefined, expectedToken: string): boolean {
  if (!submittedToken || !expectedToken) return false;
  return timingSafeEqual(submittedToken, expectedToken);
}

export const createCsrfToken = generateCsrfToken;
export const validateCsrfToken = verifyCsrfToken;
