/**
 * @license Apache-2.0
 * @samrey/ssr - CSS Identifier Escaping Utility
 */

/**
 * Escapes an identifier for safe interpolation inside CSS selectors (`#id`, `.class`).
 * Uses native `CSS.escape` when available and falls back to CSSOM-compatible escaping.
 */
export function escapeCssIdentifier(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }

  const str = String(value);
  const length = str.length;
  let result = '';

  for (let i = 0; i < length; i++) {
    const codeUnit = str.charCodeAt(i);

    if (codeUnit === 0x0000) {
      result += '\uFFFD';
      continue;
    }

    if (
      (codeUnit >= 0x0001 && codeUnit <= 0x001f) ||
      codeUnit === 0x007f ||
      (i === 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
      (i === 1 && codeUnit >= 0x0030 && codeUnit <= 0x0039 && str.charCodeAt(0) === 0x002d)
    ) {
      result += `\\${codeUnit.toString(16)} `;
      continue;
    }

    if (i === 0 && length === 1 && codeUnit === 0x002d) {
      result += `\\${str.charAt(i)}`;
      continue;
    }

    if (
      codeUnit >= 0x0080 ||
      codeUnit === 0x002d ||
      codeUnit === 0x005f ||
      (codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
      (codeUnit >= 0x0041 && codeUnit <= 0x005a) ||
      (codeUnit >= 0x0061 && codeUnit <= 0x007a)
    ) {
      result += str.charAt(i);
      continue;
    }

    result += `\\${str.charAt(i)}`;
  }

  return result;
}

