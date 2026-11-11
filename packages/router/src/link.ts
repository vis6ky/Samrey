/**
 * @license Apache-2.0
 * @samrey/router - Active Link Utilities
 */

import { RouterInstance } from './types.js';
import { isPlainLeftClick, resolveLinkTarget } from './link-helpers.js';

export function createLink(router: RouterInstance, to: string) {
  const { isExternal, safeHref: safeTo } = resolveLinkTarget(to);
  const isActive = () => {
    if (isExternal) return false;
    const current = router.currentPath.value.split(/[?#]/)[0];
    const target = safeTo.split(/[?#]/)[0];
    return current === target;
  };

  const handleClick = (e: MouseEvent) => {
    if (!isPlainLeftClick(e) || isExternal) {
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
