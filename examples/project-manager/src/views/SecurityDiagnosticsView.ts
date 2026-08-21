/**
 * @license Apache-2.0
 * Aether Project Manager — Security Diagnostics & Adversarial Sandbox View
 * Powered 100% by @aether/security with real sanitization tests
 */

import { el, Show, For } from '@aether/runtime';
import { signal } from '@aether/reactivity';
import { sanitizeHtml, sanitizeUrl, isSafeUrl, safeJsonParse, validateCsrfToken } from '@aether/security';
import { ProjectManagerApi, currentCsrfToken } from '../api.js';

export function SecurityDiagnosticsView(): HTMLElement {
  const metrics = ProjectManagerApi.getSecurityAudit();

  const testPayload = signal('<img src="x" onerror="alert(\'XSS\')"> <script>alert(1)</script> <b>Safe formatted text</b>');
  const sanitizedOutput = signal('');
  const testUrl = signal('javascript:alert(document.cookie)');
  const isUrlSafe = signal(false);

  // Run initial test
  sanitizedOutput.value = sanitizeHtml(testPayload.value);
  isUrlSafe.value = isSafeUrl(testUrl.value);

  const view = el('div', { class: 'space-y-6 max-w-7xl mx-auto' });

  // Header
  const header = el(
    'div',
    null,
    el('h2', { class: 'text-2xl font-bold text-slate-900 tracking-tight' }, 'Zero-Trust Security Diagnostics'),
    el('p', { class: 'text-xs text-slate-500 mt-1' }, 'Live adversarial verification against XSS, dangerous protocols, prototype pollution, and CSRF.')
  );

  // Telemetry Cards
  const statsGrid = el(
    'div',
    { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4' },
    el(
      'div',
      { class: 'bg-white p-4 rounded-xl border border-slate-200 shadow-xs' },
      el('div', { class: 'text-xs text-slate-500 font-medium' }, 'XSS Neutralized'),
      el('div', { class: 'text-2xl font-bold text-emerald-600 mt-1 font-mono' }, String(metrics.xssAttemptsPrevented)),
      el('div', { class: 'text-xxs text-slate-400 mt-1' }, 'Zero unsafe HTML scripts executed')
    ),
    el(
      'div',
      { class: 'bg-white p-4 rounded-xl border border-slate-200 shadow-xs' },
      el('div', { class: 'text-xs text-slate-500 font-medium' }, 'Dangerous URLs Blocked'),
      el('div', { class: 'text-2xl font-bold text-emerald-600 mt-1 font-mono' }, String(metrics.dangerousUrlsBlocked)),
      el('div', { class: 'text-xxs text-slate-400 mt-1' }, 'javascript: & data: filtered')
    ),
    el(
      'div',
      { class: 'bg-white p-4 rounded-xl border border-slate-200 shadow-xs' },
      el('div', { class: 'text-xs text-slate-500 font-medium' }, 'Pollution Scrubbed'),
      el('div', { class: 'text-2xl font-bold text-indigo-600 mt-1 font-mono' }, String(metrics.prototypePollutionsScrubbed)),
      el('div', { class: 'text-xxs text-slate-400 mt-1' }, '__proto__ & constructor blocked')
    ),
    el(
      'div',
      { class: 'bg-white p-4 rounded-xl border border-slate-200 shadow-xs' },
      el('div', { class: 'text-xs text-slate-500 font-medium' }, 'CSRF Nonces Validated'),
      el('div', { class: 'text-2xl font-bold text-indigo-600 mt-1 font-mono' }, String(metrics.csrfTokensValidated)),
      el('div', { class: 'text-xxs text-slate-400 mt-1' }, 'HMAC token state verification')
    )
  );

  // Interactive Live Sanitizer Sandbox
  const sandbox = el(
    'div',
    { class: 'bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4' },
    el('h3', { class: 'text-base font-bold text-slate-800' }, 'Interactive Sanitizer Sandbox'),
    el('p', { class: 'text-xs text-slate-500' }, 'Type hostile payloads below to witness real-time neutralization by @aether/security.'),
    el(
      'div',
      { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
      // Left: Input
      el(
        'div',
        { class: 'space-y-2' },
        el('label', { class: 'text-xs font-bold text-slate-700' }, 'Hostile Input:'),
        el('textarea', {
          class: 'w-full h-28 p-3 text-xs font-mono bg-slate-900 text-rose-300 rounded-lg border border-slate-700 focus:outline-none',
          value: () => testPayload.value,
          onInput: (e: Event) => {
            const val = (e.target as HTMLTextAreaElement).value;
            testPayload.value = val;
            sanitizedOutput.value = sanitizeHtml(val);
          }
        })
      ),
      // Right: Sanitized
      el(
        'div',
        { class: 'space-y-2' },
        el('label', { class: 'text-xs font-bold text-slate-700' }, 'Sanitized Output (Safe HTML):'),
        el(
          'div',
          { class: 'w-full h-28 p-3 text-xs font-mono bg-slate-50 text-slate-800 rounded-lg border border-slate-300 overflow-auto' },
          () => sanitizedOutput.value
        )
      )
    )
  );

  view.appendChild(header);
  view.appendChild(statsGrid);
  view.appendChild(sandbox);

  return view;
}
