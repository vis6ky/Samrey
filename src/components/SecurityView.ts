/**
 * @license Apache-2.0
 * @samrey/doc - Native Samrey Security Model & Threat Neutralization View
 */

import { el, For } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';
import { SECURITY_THREATS } from '../data/securityData.js';
import { SecurityThreat } from '../types.js';
import { icon } from '../lib/icons.js';

export function SecurityView(): HTMLElement {
  const activeThreat = signal<SecurityThreat>(SECURITY_THREATS[0]);
  const customPayload = signal<string>(SECURITY_THREATS[0].samplePayload);
  const simulatedDefenseResult = signal<string>('');
  const copied = signal<boolean>(false);

  const runSimulation = (payload: string, threatId: string) => {
    if (threatId === 'THREAT-01' || payload.includes('</script>')) {
      const escaped = payload
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');
      simulatedDefenseResult.value = `[SAFE SERIALIZED SSR OUTPUT]:\nwindow.__AETHER_STATE__ = "${escaped}";\n\nResult: Safe! Browser HTML parser ignores Unicode escapes; Script tag remains open and intact.`;
    } else if (threatId === 'THREAT-02' || payload.startsWith('javascript:')) {
      simulatedDefenseResult.value = `[AETHER URI SANITIZER INTERCEPTED]:\nTarget: "${payload}"\nBlocked Scheme: "javascript:"\nResolved Output: "about:blank"\n\nResult: Blocked! Zero script execution on click/navigation.`;
    } else if (threatId === 'THREAT-03' || payload.includes('<img') || payload.includes('onerror')) {
      simulatedDefenseResult.value = `[W3C TRUSTED TYPES ENFORCEMENT]:\nPolicy: aether#html.createHTML()\nAction: Stripped inline event handler "onerror"\nResult: Safe HTML token created under Cryptographically Sealed Policy.`;
    } else if (threatId === 'THREAT-04' || payload.includes('__proto__')) {
      simulatedDefenseResult.value = `[PROTOTYPE POLLUTION DEFENSE]:\nObject.create(null) store initialized.\nRejected keys: ["__proto__", "constructor", "prototype"]\nObject.prototype polluted? FALSE. Application memory is hermetically sealed.`;
    } else {
      simulatedDefenseResult.value = `[AETHER ACTION CSRF VALIDATOR]:\nSec-Fetch-Site: cross-site -> REJECTED (HTTP 403 Forbidden).\nAction signature verification failed. State unmodified.`;
    }
  };

  const selectThreat = (threat: SecurityThreat) => {
    activeThreat.value = threat;
    customPayload.value = threat.samplePayload;
    runSimulation(threat.samplePayload, threat.id);
  };

  // Run initial simulation
  runSimulation(SECURITY_THREATS[0].samplePayload, SECURITY_THREATS[0].id);

  const copyCode = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    }
  };

  const root = el('div', { class: 'space-y-6' });

  // Banner
  const banner = el('div', { class: 'bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm' },
    el('div', { class: 'flex flex-col lg:flex-row lg:items-center justify-between gap-4' },
      el('div', null,
        el('div', { class: 'inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-cyan-300 text-xs font-mono mb-2' },
          icon('lock', 'w-3.5 h-3.5'),
          el('span', null, 'Level 1 Defense-in-Depth Specification')
        ),
        el('h2', { class: 'text-2xl font-bold tracking-tight' },
          'Samrey Security Model & Threat Neutralization'
        ),
        el('p', { class: 'text-slate-400 text-sm mt-1 max-w-3xl' },
          'Zero-Trust Input architecture. The compiler statically enforces contextual encoding, W3C Trusted Types, zero-eval execution, and script-tag breakout immunity during SSR serialization.'
        )
      )
    ),
    el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs font-mono' },
      el('div', { class: 'p-3 rounded-xl bg-slate-800/80 border border-slate-700' },
        el('span', { class: 'text-emerald-400 font-bold' }, '1. Zero-eval Guarantee'),
        el('p', { class: 'text-slate-400 text-[11px] mt-1' }, 'Strict CSP (script-src \'self\')')
      ),
      el('div', { class: 'p-3 rounded-xl bg-slate-800/80 border border-slate-700' },
        el('span', { class: 'text-cyan-400 font-bold' }, '2. Contextual Sanitizer'),
        el('p', { class: 'text-slate-400 text-[11px] mt-1' }, 'URI, HTML, Attr, CSS contexts')
      ),
      el('div', { class: 'p-3 rounded-xl bg-slate-800/80 border border-slate-700' },
        el('span', { class: 'text-purple-400 font-bold' }, '3. W3C Trusted Types'),
        el('p', { class: 'text-slate-400 text-[11px] mt-1' }, 'window.trustedTypes sealed policy')
      ),
      el('div', { class: 'p-3 rounded-xl bg-slate-800/80 border border-slate-700' },
        el('span', { class: 'text-amber-400 font-bold' }, '4. Unicode SSR Escaping'),
        el('p', { class: 'text-slate-400 text-[11px] mt-1' }, 'Zero </script> tag breakout')
      ),
      el('div', { class: 'p-3 rounded-xl bg-slate-800/80 border border-slate-700' },
        el('span', { class: 'text-sky-400 font-bold' }, '5. Prototype Shielding'),
        el('p', { class: 'text-slate-400 text-[11px] mt-1' }, 'Object.create(null) stores')
      )
    )
  );
  root.appendChild(banner);

  // Split Threat Simulator
  const splitGrid = el('div', { class: 'grid grid-cols-1 lg:grid-cols-12 gap-6' });

  // Left List (4 cols)
  const leftCol = el('div', { class: 'lg:col-span-4 space-y-2' },
    el('span', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500 px-1' },
      `Common Threat Vectors (${SECURITY_THREATS.length})`
    )
  );

  const threatListContainer = el('div', { class: 'space-y-2' });

  const threatItems = For({
    each: () => SECURITY_THREATS,
    key: (t) => t.id,
    children: (threat) => {
      const item = el('div', {
        id: `threat-item-${threat.id}`,
        class: () => {
          const isSelected = activeThreat.value.id === threat.id;
          return `p-4 rounded-xl border transition-all cursor-pointer ${
            isSelected
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-1 ring-slate-900'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`;
        },
        onClick: () => selectThreat(threat)
      },
        el('div', { class: 'flex items-center justify-between' },
          el('span', { class: 'font-semibold text-xs' }, threat.title),
          el('span', {
            class: () => `text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
              activeThreat.value.id === threat.id ? 'bg-slate-800 text-cyan-300' : 'bg-slate-100 text-slate-600'
            }`
          }, threat.id)
        ),
        el('p', {
          class: () => `text-[11px] mt-1 line-clamp-1 ${activeThreat.value.id === threat.id ? 'text-slate-300' : 'text-slate-500'}`
        }, threat.category)
      );
      return item;
    }
  });

  threatListContainer.appendChild(threatItems);
  leftCol.appendChild(threatListContainer);
  splitGrid.appendChild(leftCol);

  // Right Detail View (8 cols)
  const rightCol = el('div', { class: 'lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5' },
    el('div', { class: 'flex items-center justify-between' },
      el('div', null,
        el('span', { class: 'text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200' },
          () => `${activeThreat.value.id} · ${activeThreat.value.category}`
        ),
        el('h3', { class: 'text-lg font-bold text-slate-900 mt-2' },
          () => activeThreat.value.title
        )
      ),
      el('div', { class: 'flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-semibold' },
        icon('shield-check', 'w-4 h-4 text-emerald-600'),
        el('span', null, 'Samrey Immune')
      )
    ),

    // Threat Cards
    el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
      el('div', { class: 'p-3.5 rounded-xl bg-red-50/70 border border-red-200/80 space-y-1' },
        el('div', { class: 'flex items-center space-x-1.5 text-xs font-bold text-red-800' },
          icon('alert-octagon', 'w-3.5 h-3.5 text-red-600'),
          el('span', null, 'Exploit Vector / Root Cause')
        ),
        el('p', { class: 'text-xs text-red-950 leading-relaxed' },
          () => activeThreat.value.vulnDescription
        )
      ),
      el('div', { class: 'p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1' },
        el('div', { class: 'flex items-center space-x-1.5 text-xs font-bold text-amber-800' },
          icon('shield-alert', 'w-3.5 h-3.5 text-amber-600'),
          el('span', null, 'Ecosystem Impact')
        ),
        el('p', { class: 'text-xs text-amber-950 leading-relaxed' },
          () => activeThreat.value.frameworkImpact
        )
      )
    ),

    // Interactive Payload Input
    el('div', { class: 'space-y-2' },
      el('label', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, 'Interactive Exploit Payload'),
      el('div', { class: 'flex space-x-2' },
        (() => {
          const input = el('input', {
            type: 'text',
            value: () => customPayload.value,
            class: 'flex-1 px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900'
          });
          input.addEventListener('input', (e) => {
            const val = (e.target as HTMLInputElement).value;
            customPayload.value = val;
            runSimulation(val, activeThreat.value.id);
          });
          return input;
        })(),
        el('button', {
          type: 'button',
          class: 'px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium cursor-pointer transition',
          onClick: () => runSimulation(customPayload.value, activeThreat.value.id)
        }, 'Test Neutralizer')
      )
    ),

    // Neutralizer Output Simulation
    el('div', { class: 'space-y-2' },
      el('span', { class: 'text-xs font-bold uppercase tracking-wider text-emerald-700' }, 'Samrey Runtime & Compiler Response'),
      el('div', { class: 'bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs leading-relaxed whitespace-pre-wrap' },
        () => simulatedDefenseResult.value || activeThreat.value.aetherDefense
      )
    ),

    // Code Countermeasure
    el('div', { class: 'space-y-2' },
      el('div', { class: 'flex items-center justify-between' },
        el('span', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, 'Architectural Implementation'),
        el('button', {
          type: 'button',
          class: 'inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer transition',
          onClick: () => copyCode(activeThreat.value.aetherCodeSnippet)
        },
          () => copied.value ? icon('check', 'w-3.5 h-3.5 text-emerald-600') : icon('copy', 'w-3.5 h-3.5'),
          el('span', null, () => copied.value ? 'Copied' : 'Copy Code')
        )
      ),
      el('div', { class: 'bg-slate-950 text-slate-300 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed' },
        el('pre', null, () => activeThreat.value.aetherCodeSnippet)
      )
    )
  );

  splitGrid.appendChild(rightCol);
  root.appendChild(splitGrid);

  return root;
}
