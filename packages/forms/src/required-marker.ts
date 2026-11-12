/**
 * @license Apache-2.0
 * @samrey/forms - Internal Required Validator Marker
 */

export const REQUIRED_VALIDATOR_MARKER = Symbol.for('samrey.forms.requiredValidator');

export function isRequiredValidator(fn: unknown): boolean {
  if (typeof fn === 'function') {
    return Boolean((fn as unknown as Record<symbol, unknown>)[REQUIRED_VALIDATOR_MARKER]);
  }
  if (Array.isArray(fn)) {
    return fn.some((item) => isRequiredValidator(item));
  }
  return false;
}

