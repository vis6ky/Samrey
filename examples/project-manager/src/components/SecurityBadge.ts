/**
 * @license Apache-2.0
 * Aether Project Manager — Security Status Badge Component
 * Demonstrates @aether/security active sanitizer protection
 */

import { el } from '@aether/runtime';
import { ProjectManagerApi } from '../api.js';

export function SecurityBadge(): HTMLElement {
  const metrics = ProjectManagerApi.getSecurityAudit();

  return el(
    'div',
    {
      class: 'flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs'
    },
    el('span', { class: 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse' }),
    el('span', { class: 'font-semibold' }, 'Zero-Trust Shield Active:'),
    el('span', { class: 'font-mono' }, `${metrics.xssAttemptsPrevented} XSS Neutralized`)
  );
}
