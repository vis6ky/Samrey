/**
 * @license Apache-2.0
 * @samrey/monorepo - Item 4: Starter Template Acceptance & Plain TypeScript Architecture Suite
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { packAllPackages } from '../scripts/release/pack.js';
import { generateStarterProject } from '../packages/cli/src/starter-template.js';

describe('Item 4: Starter Template Acceptance & Plain TS Integration', { timeout: 300000 }, () => {
  const CLI_BIN = path.resolve('packages/cli/bin/samrey.js');
  const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-starter-acceptance-'));
  const tarballDir = path.join(tempBase, 'tarballs');

  it('verifies all 4 starter templates (spa, ssr, minimal, ssg) with packed tarballs in clean room', async () => {
    // 1. Pack fresh tarballs for all 11 packages
    const tarballs = packAllPackages(tarballDir, { keepCliBin: true });
    assert.strictEqual(tarballs.length, 11, 'Must produce 11 tarballs');

    const templates = ['spa', 'ssr', 'minimal', 'ssg'] as const;

    for (const tmpl of templates) {
      const projDir = path.join(tempBase, `demo-${tmpl}`);
      fs.mkdirSync(projDir, { recursive: true });

      // Generate files
      const files = generateStarterProject(`demo-${tmpl}`, { template: tmpl });
      for (const [relPath, content] of Object.entries(files)) {
        const fullPath = path.join(projDir, relPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content, 'utf8');
      }

      // Point @samrey/* dependencies and transitive dependencies to local tarballs
      const pkgPath = path.join(projDir, 'package.json');
      const manifest = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      manifest.overrides = manifest.overrides || {};
      for (const t of tarballs) {
        manifest.overrides[t.packageName] = `file:${t.destinationPath}`;
        if (manifest.dependencies && manifest.dependencies[t.packageName]) {
          manifest.dependencies[t.packageName] = `file:${t.destinationPath}`;
        }
        if (manifest.devDependencies && manifest.devDependencies[t.packageName]) {
          manifest.devDependencies[t.packageName] = `file:${t.destinationPath}`;
        }
      }
      fs.writeFileSync(pkgPath, JSON.stringify(manifest, null, 2), 'utf8');

      // Install dependencies
      execSync('npm install --prefer-offline --no-audit', { cwd: projDir, stdio: 'pipe' });

      // 1. tsc --noEmit must pass with exit code 0
      try {
        execSync('npx tsc --noEmit', { cwd: projDir, stdio: 'pipe' });
      } catch (err: any) {
        console.error(`[tsc error for ${tmpl}]:`, err.stdout?.toString(), err.stderr?.toString());
        throw err;
      }

      const cliBin = path.join(projDir, 'node_modules', '@samrey', 'cli', 'bin', 'samrey.js');

      // 2. samrey test must pass with exit code 0
      const testOut = execSync(`node "${cliBin}" test`, { cwd: projDir, encoding: 'utf8' });
      assert.ok(testOut.includes('passed cleanly') || testOut.includes('ok'), `Test must pass for template ${tmpl}`);

      // 3. samrey audit must pass with exit code 0 and 0 violations
      const auditOut = execSync(`node "${cliBin}" audit --strict`, { cwd: projDir, encoding: 'utf8' });
      assert.ok(auditOut.includes('0 violations') || auditOut.includes('passed'), `Audit must pass for template ${tmpl}`);

      // 4. samrey build must pass with exit code 0
      const buildOut = execSync(`node "${cliBin}" build`, { cwd: projDir, encoding: 'utf8' });
      assert.ok(buildOut.includes('Build finished successfully') || buildOut.includes('built'), `Build must pass for template ${tmpl}`);
      assert.ok(fs.existsSync(path.join(projDir, 'dist')), `dist/ must exist for template ${tmpl}`);

      // 5. samrey analyze must pass with exit code 0
      const analyzeOut = execSync(`node "${cliBin}" analyze`, { cwd: projDir, encoding: 'utf8' });
      assert.ok(analyzeOut.includes('Bundle Analysis') || analyzeOut.includes('Analysis'), `Analyze must pass for template ${tmpl}`);

      // 6. samrey generate component my-widget
      const genOut = execSync(`node "${cliBin}" generate component my-widget`, { cwd: projDir, encoding: 'utf8' });
      assert.ok(genOut.includes('MyWidget.ts'), 'Must generate MyWidget.ts');
      assert.ok(fs.existsSync(path.join(projDir, 'src', 'components', 'MyWidget.ts')), 'MyWidget.ts must exist on disk');
      assert.ok(fs.existsSync(path.join(projDir, 'src', 'components', 'MyWidget.test.ts')), 'MyWidget.test.ts must exist on disk');

      // Run tests again: newly generated component test must pass
      const testAfterGenOut = execSync(`node "${cliBin}" test`, { cwd: projDir, encoding: 'utf8' });
      assert.ok(testAfterGenOut.includes('passed cleanly') || testAfterGenOut.includes('ok'), 'Generated component test must pass');

      // 7. Special assertion for SSR starter: server-rendered HTML escaping & content
      if (tmpl === 'ssr') {
        const { render } = await import(path.join(projDir, 'src', 'entry-server.ts'));
        const html = await render('/');
        assert.ok(typeof html === 'string', 'SSR render must return a string');
        assert.ok(html.includes('app-container'), 'SSR output must include app-container');
        assert.ok(html.includes('Welcome to your Samrey Application') || html.includes('Reactive Counter'), 'SSR output must include page content');

        // Test escaping of dynamic strings in SSR
        const { el } = await import(path.join(projDir, 'node_modules', '@samrey', 'runtime', 'dist', 'index.js'));
        const { renderToString } = await import(path.join(projDir, 'node_modules', '@samrey', 'ssr', 'dist', 'index.js'));
        const dynamicSsr = await renderToString(() =>
          el('div', { 'data-user': '<malicious & "quote">' }, 'Dangerous <script>alert(1)</script> & text')
        );
        assert.ok(!dynamicSsr.includes('<script>alert'), 'Must escape script tags in SSR');
        assert.ok(dynamicSsr.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; text'), 'Must escape text entities in SSR');
        assert.ok(dynamicSsr.includes('data-user="&lt;malicious &amp; &quot;quote&quot;&gt;"'), 'Must escape attribute entities in SSR');
      }
    }

    // Cleanup temp
    fs.rmSync(tempBase, { recursive: true, force: true });
  });
});
