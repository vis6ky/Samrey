/**
 * @license Apache-2.0
 * @gati/monorepo - Phase 24 Clean-Room Consumer Verification
 * Installs packed tarballs into an isolated directory and executes all framework capabilities.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { packAllPackages } from '../../scripts/release/pack.js';

describe('Phase 24 — Clean-Room Consumer Verification Gate', () => {
  const tarballDir = path.join('/tmp', 'aether-p24-clean-tarballs');
  const consumerDir = path.join('/tmp', 'aether-v1-consumer');

  it('1. Prepares tarballs and installs in isolated /tmp/aether-v1-consumer', () => {
    fs.rmSync(tarballDir, { recursive: true, force: true });
    fs.rmSync(consumerDir, { recursive: true, force: true });
    fs.mkdirSync(tarballDir, { recursive: true });
    fs.mkdirSync(consumerDir, { recursive: true });

    const tarballs = packAllPackages(tarballDir);
    assert.strictEqual(tarballs.length, 11, 'Must pack 11 tarballs');

    const consumerManifest = {
      name: 'aether-v1-consumer',
      version: '1.0.0',
      private: true,
      type: 'module',
      dependencies: {} as Record<string, string>
    };

    for (const t of tarballs) {
      consumerManifest.dependencies[t.packageName] = t.destinationPath;
    }

    fs.writeFileSync(
      path.join(consumerDir, 'package.json'),
      JSON.stringify(consumerManifest, null, 2)
    );

    execSync('npm install --no-package-lock', { cwd: consumerDir, stdio: 'pipe' });
    assert.ok(fs.existsSync(path.join(consumerDir, 'node_modules', '@aether')), 'node_modules/@aether must exist');
  });

  it('2. Executes end-to-end multi-package smoke script in clean-room environment', () => {
    const smokeScript = `
      import { signal, computed, effect, batch, createRoot } from '@gati/reactivity';
      import { el, Show, For, ErrorBoundary } from '@gati/runtime';
      import { sanitizeHtml, sanitizeUrl } from '@gati/security';
      import { createRouter } from '@gati/router';
      import { createForm, createField } from '@gati/forms';
      import { createResource } from '@gati/http';
      import { renderToString, escapeJsonState } from '@gati/ssr';
      import { initDevTools } from '@gati/devtools';

      // 1. Reactivity check
      const count = signal(5);
      const squared = computed(() => count.value * count.value);
      let effectValue = 0;
      createRoot((dispose) => {
        effect(() => {
          effectValue = squared.value;
        });
        batch(() => {
          count.value = 10;
        });
        dispose();
      });
      if (effectValue !== 100) throw new Error('Reactivity computation failed');

      // 2. Security sanitization check
      const safe = sanitizeHtml('<script>alert(1)</script><p>Gati Clean Room</p>');
      if (safe.includes('<script>')) throw new Error('Security sanitization failed');

      // 3. SSR renderToString check
      const html = await renderToString(() => el('div', { class: 'consumer-box' }, ['SSR Rendered Output: ', count.value]));
      if (!html.includes('SSR Rendered Output') || !html.includes('10')) {
        throw new Error('SSR renderToString failed: ' + html);
      }

      // 4. Forms check
      const form = createForm({
        initialValues: { email: 'user@example.com' },
        onSubmit: () => {}
      });
      if (form.fields.email.value.value !== 'user@example.com') throw new Error('Form initialization failed');

      // 5. Router check
      const router = createRouter([
        { path: '/', component: () => el('div', {}, ['Home']) },
        { path: '/docs', component: () => el('div', {}, ['Docs']) }
      ]);
      if (!router) throw new Error('Router creation failed');

      console.log('CLEAN_ROOM_EXECUTION_SUCCESS');
    `;

    const scriptPath = path.join(consumerDir, 'smoke.js');
    fs.writeFileSync(scriptPath, smokeScript);

    const out = execSync(`npx tsx ${scriptPath}`, { cwd: process.cwd(), encoding: 'utf8' });
    assert.ok(out.includes('CLEAN_ROOM_EXECUTION_SUCCESS'), 'Clean-room smoke script must execute successfully');
  });
});
