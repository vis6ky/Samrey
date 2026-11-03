/**
 * @license Apache-2.0
 * @samrey/task-studio - Interactive Application Security Defense Lab
 */

import { el, For } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';
import {
  sanitizeHtmlString,
  sanitizeUri,
  sanitizeRedirectUri,
  safeJsonParse,
  escapeJsonStringForScript,
  stripSecrets
} from '@samrey/security';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';

export function SecurityView(): HTMLElement {
  const container = el('div', { class: 'flex flex-col space-y-8 max-w-4xl mx-auto w-full select-none' });

  // 1. Header
  const header = el(
    'div',
    null,
    el('div', { class: 'flex items-center space-x-2 text-rose-600 text-xs font-mono mb-1' },
      el('span', { class: 'w-2 h-2 rounded-full bg-rose-500' }),
      el('span', null, '@samrey/security Live Verification Engine')
    ),
    el('h1', { class: 'text-2xl font-extrabold text-slate-900 tracking-tight' }, 'Application Security & Hardening Lab'),
    el(
      'p',
      { class: 'text-xs text-slate-500 mt-0.5' },
      'Execute live security defenses against hostile XSS payloads, unsafe URI schemes, prototype pollution, and SSR script breakout vectors.'
    )
  );
  container.appendChild(header);

  // 2. HTML Sanitization & XSS Defense Lab
  const xssInput = signal<string>('<img src="x" onerror="alert(\'XSS\')" /><strong>Safe Content</strong><script>maliciousCode()</script>');
  const xssOutput = signal<string>('');

  function runXssSanitization() {
    xssOutput.value = sanitizeHtmlString(xssInput.value);
  }
  runXssSanitization();

  const xssCard = Card(
    {
      title: '1. Zero-Eval HTML Sanitizer & XSS Rejection',
      subtitle: 'Strips malicious script tags, onerror/onload event handlers, and dangerous iframe embeds'
    },
    el(
      'div',
      { class: 'space-y-4 text-xs' },
      el(
        'div',
        { class: 'flex flex-col space-y-1.5' },
        el('label', { class: 'font-semibold text-slate-700' }, 'Hostile Input Payload:'),
        el('textarea', {
          rows: 2,
          class: 'w-full px-3 py-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg',
          value: () => xssInput.value,
          onInput: (e: Event) => {
            xssInput.value = (e.target as HTMLTextAreaElement).value;
            runXssSanitization();
          }
        })
      ),
      el(
        'div',
        { class: 'flex flex-col space-y-1.5' },
        el('label', { class: 'font-semibold text-slate-700' }, 'Sanitized Output (Safe for DOM rendering):'),
        el('div', {
          class: 'p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto break-all'
        }, () => xssOutput.value || '(empty)')
      )
    )
  );
  container.appendChild(xssCard);

  // 3. Safe URI & Redirect Defense Lab
  const uriInput = signal<string>('javascript:alert("XSS Attack")');
  const uriOutput = signal<string>('');

  function runUriSanitization() {
    uriOutput.value = sanitizeUri(uriInput.value);
  }
  runUriSanitization();

  const uriCard = Card(
    {
      title: '2. Safe URI & Redirect Protocol Defense',
      subtitle: 'Blocks javascript:, data:, vbscript:, and relative bypass schemes, returning about:blank'
    },
    el(
      'div',
      { class: 'space-y-4 text-xs' },
      el(
        'div',
        { class: 'flex flex-col space-y-1.5' },
        el('label', { class: 'font-semibold text-slate-700' }, 'Target URI Scheme:'),
        el('input', {
          type: 'text',
          class: 'w-full px-3 py-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg',
          value: () => uriInput.value,
          onInput: (e: Event) => {
            uriInput.value = (e.target as HTMLInputElement).value;
            runUriSanitization();
          }
        })
      ),
      el(
        'div',
        { class: 'flex flex-wrap gap-2' },
        el('span', { class: 'text-slate-500 self-center' }, 'Test Presets:'),
        ...['javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==', 'https://example.com/safe-route', '/dashboard'].map(
          (preset) =>
            el(
              'button',
              {
                type: 'button',
                class: 'px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono text-[11px] cursor-pointer',
                onClick: () => {
                  uriInput.value = preset;
                  runUriSanitization();
                }
              },
              preset
            )
        )
      ),
      el(
        'div',
        { class: 'flex flex-col space-y-1.5' },
        el('label', { class: 'font-semibold text-slate-700' }, 'Sanitized Protocol Output:'),
        el('div', {
          class: 'p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg'
        }, () => `Sanitized: "${uriOutput.value}" (Status: ${uriOutput.value === 'about:blank' ? '⛔ BLOCKED' : '✅ ALLOWED'})`)
      )
    )
  );
  container.appendChild(uriCard);

  // 4. Prototype Pollution Defense Lab
  const protoPayload = '{"__proto__": {"polluted": true}, "constructor": {"prototype": {"admin": true}}, "normalKey": "Safe Value"}';
  const protoResult = signal<string>('');

  function runProtoTest() {
    const parsed = safeJsonParse(protoPayload);
    const isClean = !(Object.prototype as any).polluted && !(Object.prototype as any).admin;
    protoResult.value = JSON.stringify(
      {
        parsedObject: parsed,
        prototypeIsClean: isClean,
        pollutedFlagCheck: (Object.prototype as any).polluted ?? 'undefined (safe)',
        adminFlagCheck: (Object.prototype as any).admin ?? 'undefined (safe)'
      },
      null,
      2
    );
  }
  runProtoTest();

  const protoCard = Card(
    {
      title: '3. Prototype Pollution Scrubber',
      subtitle: 'Recursively removes __proto__, constructor, and prototype keys before object tree instantiation'
    },
    el(
      'div',
      { class: 'space-y-4 text-xs' },
      el('pre', {
        class: 'p-3 bg-slate-100 text-slate-700 font-mono text-xs rounded-lg overflow-x-auto'
      }, `Hostile JSON Input:\n${protoPayload}`),
      el(
        'div',
        { class: 'flex flex-col space-y-1.5' },
        el('label', { class: 'font-semibold text-slate-700' }, 'Safe Parser & Prototype Audit Result:'),
        el('pre', {
          class: 'p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto'
        }, () => protoResult.value)
      )
    )
  );
  container.appendChild(protoCard);

  // 5. SSR Script Breakout & Secret Guard Lab
  const stateSample = {
    user: 'vishal',
    passwordHash: '$2b$12$e8Y...SECRET',
    apiKey: 'sk-live-samrey-super-secret-key-12345',
    jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    database_url: 'postgres://admin:secretpass@db.internal:5432/main',
    comment: '</script><script>alert("Hostile Breakout!")</script>',
    unicodeSeparators: 'Line1\u2028Line2\u2029Line3'
  };

  const ssrEscaped = escapeJsonStringForScript(JSON.stringify(stripSecrets(stateSample)));

  const ssrCard = Card(
    {
      title: '4. SSR Secret Guard & Script Breakout Escaper',
      subtitle: 'Automatically redacts API keys/credentials and escapes </script> tags and Unicode separators'
    },
    el(
      'div',
      { class: 'space-y-4 text-xs' },
      el('p', { class: 'text-slate-600' }, 'Original Server State (containing secrets and hostile script breakout tags):'),
      el('pre', {
        class: 'p-3 bg-slate-100 text-slate-700 font-mono text-xs rounded-lg overflow-x-auto'
      }, JSON.stringify(stateSample, null, 2)),
      el('p', { class: 'font-semibold text-slate-700' }, 'Safe Hydration Payload (Cleaned & Escaped):'),
      el('pre', {
        class: 'p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto'
      }, ssrEscaped)
    )
  );
  container.appendChild(ssrCard);

  return container;
}
