/**
 * @license Apache-2.0
 * @samrey/ssr - Secret Leakage Prevention & Sanitization
 *
 * Merged into shared security module (@samrey/security) to guarantee
 * consistent secret stripping and state sanitization across both SSR and client runtimes.
 */

export {
  isSensitiveKey,
  stripSecrets,
  type SecretGuardOptions
} from '@samrey/security';
