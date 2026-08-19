/**
 * @license Apache-2.0
 * @aether/router - Active Link Utilities
 */

import { RouterInstance } from './types.js';
import { sanitizeUri } from '@aether/security';

export function createLink(router: RouterInstance, to: string) {
  const safeTo = sanitizeUri(to);
  const isActive = () => router.currentPath.value === safeTo;

  const handleClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    router.navigate(safeTo);
  };

  return {
    href: safeTo,
    isActive,
    onClick: handleClick
  };
}
