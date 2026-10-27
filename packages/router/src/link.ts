/**
 * @license Apache-2.0
 * @samrey/router - Active Link Utilities
 */

import { RouterInstance } from './types.js';
import { sanitizeUri } from '@samrey/security';

export function createLink(router: RouterInstance, to: string) {
  const isExternal = /^(https?:|\/\/|mailto:|tel:)/i.test(to);
  const safeTo = isExternal ? to : sanitizeUri(to);
  const isActive = () => {
    if (isExternal) return false;
    const current = router.currentPath.value.split(/[?#]/)[0];
    const target = safeTo.split(/[?#]/)[0];
    return current === target;
  };

  const handleClick = (e: MouseEvent) => {
    if (e.defaultPrevented || (e.button !== undefined && e.button !== 0) || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    if (isExternal) {
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
