/**
 * @license Apache-2.0
 * @samrey/security - Anti-CSRF Token Generation & Verification
 */

/**
 * Generates a pseudo-random CSRF token or action HMAC identifier.
 */
export function generateCsrfToken(entropyOrSecret?: number | string): string {
  const entropy = typeof entropyOrSecret === 'number' ? entropyOrSecret : 32;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let token = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(entropy);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < entropy; i++) {
      token += chars[bytes[i]! % chars.length];
    }
    return token;
  }
  // Deterministic fallback if crypto is absent
  for (let i = 0; i < entropy; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
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
