/**
 * @license Apache-2.0
 * @samrey/compiler - Static A11y Verification Pass
 */

export function lintA11y(tag: string, attributes: Record<string, string>): string[] {
  const diagnostics: string[] = [];

  if (tag === 'img' && !('alt' in attributes)) {
    diagnostics.push(`[SAMREY-202] [a11y warning] <img> elements must provide an 'alt' attribute for screen reader accessibility.`);
  }

  if (tag === 'a' && (!('href' in attributes) && !('aria-label' in attributes))) {
    diagnostics.push(`[SAMREY-202] [a11y warning] <a> anchor tags must specify a valid 'href' or 'aria-label'.`);
  }

  if (tag === 'button' && (!('type' in attributes))) {
    diagnostics.push(`[SAMREY-202] [a11y warning] <button> should explicitly declare type="button" | "submit" | "reset".`);
  }

  return diagnostics;
}
