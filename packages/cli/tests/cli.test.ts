import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  samreyVitePlugin,
  samreyPlugin,
  auditSource,
  runCLI,
  runAuditCommand,
  generateStarterProject,
  validateProjectName,
  scaffoldArtifact
} from '../src/index.js';

describe('@samrey/cli - Comprehensive Developer Experience & Tooling Suite', () => {
  it('integrates Vite plugin transform hook with compiler', () => {
    const plugin = samreyVitePlugin();
    assert.equal(plugin.name, 'vite-plugin-samrey');
    assert.equal(samreyPlugin, samreyVitePlugin);

    const transformed = plugin.transform('<div>{title}</div>', 'App.samrey');
    assert.ok(transformed !== null);
    assert.ok(transformed.code.includes('/*#__PURE__*/ template('));

    // Excludes node_modules
    assert.equal(plugin.transform('<div>{title}</div>', 'node_modules/pkg/App.samrey'), null);

    // Preserves plain TypeScript files (does not touch .ts)
    const realTs = "import { signal } from '@samrey/reactivity';\nexport function App() { return null; }";
    assert.equal(plugin.transform(realTs, 'src/App.ts'), null);
  });

  it('transforms .samrey files with query parameters and hash fragments (e.g. HMR or asset queries)', () => {
    const plugin = samreyVitePlugin();
    const hmrTransformed = plugin.transform('<div>HMR</div>', '/src/App.samrey?t=1731145600');
    assert.ok(hmrTransformed !== null, 'Must transform files with ?t=... timestamp query');
    assert.ok(hmrTransformed.code.includes('/*#__PURE__*/ template('));

    const queryTransformed = plugin.transform('<div>Worker</div>', '/src/Worker.samrey?worker&v=123');
    assert.ok(queryTransformed !== null, 'Must transform files with ?worker query');

    const hashTransformed = plugin.transform('<div>Hash</div>', '/src/Component.samrey#chunk1');
    assert.ok(hashTransformed !== null, 'Must transform files with #hash');
  });

  it('audits template for security and a11y non-conformances', () => {
    const badCode = '<img src="pic.jpg"><script>alert(1)</script>';
    const report = auditSource(badCode, 'Header.tsx');

    assert.equal(report.violationsCount, 2);
    assert.ok(report.messages.some((m) => m.includes('alt')));
    assert.ok(report.messages.some((m) => m.includes('script')));
  });

  it('allows valid module/external script with src and flags inline or dangerous scripts', () => {
    // 1. Valid starter script tag with src -> 0 violations
    const validHtml = '<!DOCTYPE html><html><head><script type="module" src="/src/entry-client.ts"></script></head><body></body></html>';
    const validReport = auditSource(validHtml, 'index.html');
    assert.equal(validReport.violationsCount, 0, 'Must not flag script tag with valid src');

    // 2. Inline script tag without src -> 1 violation
    const inlineScript = '<script>console.log("inline")</script>';
    const inlineReport = auditSource(inlineScript, 'index.html');
    assert.equal(inlineReport.violationsCount, 1, 'Must flag inline script tag');
    assert.ok(inlineReport.messages[0].includes('Inline <script>'));

    // 3. Script tag with javascript: URI in src -> flagged as violation
    const jsUriScript = '<script src="javascript:alert(1)"></script>';
    const jsUriReport = auditSource(jsUriScript, 'index.html');
    assert.ok(jsUriReport.violationsCount >= 1, 'Must flag javascript: URI in src');
    assert.ok(jsUriReport.messages.some((m) => m.includes('javascript:')));

    // 4. Script tag with src and inline body -> 1 violation
    const bodyScript = '<script src="/bundle.js">alert(1)</script>';
    const bodyReport = auditSource(bodyScript, 'index.html');
    assert.equal(bodyReport.violationsCount, 1, 'Must flag script tag with src and inline content');
    assert.ok(bodyReport.messages[0].includes('must not contain inline code'));
  });

  it('generates a complete production starter project template with SSR, routing, and reactivity', () => {
    const files = generateStarterProject('my-samrey-app', { template: 'ssr' });

    assert.ok('package.json' in files);
    assert.ok('tsconfig.json' in files);
    assert.ok('vite.config.ts' in files);
    assert.ok('src/App.ts' in files);
    assert.ok('src/components/Header.ts' in files);
    assert.ok('src/components/Counter.ts' in files);
    assert.ok('src/views/HomeView.ts' in files);
    assert.ok('src/entry-client.ts' in files);
    assert.ok('src/entry-server.ts' in files);
    assert.ok('tests/app.test.ts' in files);

    const pkg = JSON.parse(files['package.json']!);
    assert.equal(pkg.name, 'my-samrey-app');
    assert.ok('@samrey/reactivity' in pkg.dependencies);
    assert.ok('@samrey/compiler' in pkg.dependencies);
    assert.ok('@samrey/ssr' in pkg.dependencies);
  });

  it('validates project names strictly for illegal characters and empty strings', () => {
    assert.equal(validateProjectName('my-cool-app').valid, true);
    assert.equal(validateProjectName('@scope/my-app').valid, true);
    assert.equal(validateProjectName('').valid, false);
    assert.equal(validateProjectName('my project with spaces').valid, false);
  });

  it('handles "samrey --help" and "samrey --version" cleanly', async () => {
    const helpResult = await runCLI(['--help']);
    assert.equal(helpResult.exitCode, 0);
    assert.ok(helpResult.message.includes('Samrey Framework CLI'));
    assert.ok(helpResult.message.includes('create <name>'));

    const versionResult = await runCLI(['--version']);
    assert.equal(versionResult.exitCode, 0);
    assert.ok(versionResult.message.includes('samrey v2.1.0'));
  });

  it('executes "samrey create" in dry-run mode with deterministic output', async () => {
    const result = await runCLI(['create', 'shop-app', '--template', 'ssr', '--dry-run']);
    assert.equal(result.exitCode, 0);
    assert.ok(result.message.includes('Prepared'));
  });

  it('returns non-zero exit code on missing project name in "samrey create"', async () => {
    const result = await runCLI(['create']);
    assert.equal(result.exitCode, 1);
    assert.ok(result.message.includes('Project name is required'));
  });

  it('executes "samrey dev" with port option and validation', async () => {
    const validDev = await runCLI(['dev', '--port', '4000', '--dry-run']);
    assert.equal(validDev.exitCode, 0);

    const invalidDev = await runCLI(['dev', '--port', '99999', '--dry-run']);
    assert.equal(invalidDev.exitCode, 1);
    assert.ok(invalidDev.message.includes('Invalid port'));
  });

  it('executes "samrey build" with production report or dry-run', async () => {
    const result = await runCLI(['build', '--dry-run']);
    assert.equal(result.exitCode, 0);
    assert.ok(result.message.includes('Samrey Production Build'));
  });

  it('executes "samrey test" runner in dry-run mode', async () => {
    const result = await runCLI(['test', '--dry-run']);
    assert.equal(result.exitCode, 0);
    assert.ok(result.message.includes('Samrey Test Runner'));
  });

  it('executes "samrey audit" detecting violations and honoring strict exit codes', async () => {
    const cleanAudit = await runCLI(['audit', '--warn-only']);
    assert.equal(cleanAudit.exitCode, 0);
    assert.ok(cleanAudit.message.includes('Static Check'));
  });

  it('executes "samrey analyze" requiring valid build output without fake metrics', async () => {
    // In empty directory, requires build first
    const noBuildRes = await runCLI(['analyze', '--outDir', 'non_existent_dist']);
    assert.equal(noBuildRes.exitCode, 1);
    assert.ok(noBuildRes.message.includes('run samrey build first'));
  });

  it('scaffolds components, routes, stores, and resources with "samrey generate"', async () => {
    const compScaffold = scaffoldArtifact('component', 'UserProfile');
    assert.equal(compScaffold.filename, 'UserProfile.ts');
    assert.equal(compScaffold.testFilename, 'UserProfile.test.ts');
    assert.ok(compScaffold.code.includes('export function UserProfile('));

    const routeScaffold = scaffoldArtifact('route', 'Settings');
    assert.equal(routeScaffold.filename, 'SettingsView.ts');

    const storeScaffold = scaffoldArtifact('store', 'Cart');
    assert.equal(storeScaffold.filename, 'CartStore.ts');
    assert.ok(storeScaffold.code.includes('createCartStore'));

    const genResult = await runCLI(['generate', 'component', 'Button', '--dry-run']);
    assert.equal(genResult.exitCode, 0);
    assert.ok(genResult.message.includes('Button.ts'));
  });

  it('produces a valid v3 source map object from the Vite plugin transform (Bug 12d)', async () => {
    const { samreyVitePlugin } = await import('../src/vite-plugin.js');
    const plugin = samreyVitePlugin();
    const res = plugin.transform('<div class="card">Hello</div>\n<span>World</span>', '/src/Card.samrey');
    assert.ok(res);
    assert.ok(res.map && typeof res.map === 'object', 'transform must emit a source map object');
    assert.equal(res.map.version, 3);
    assert.deepEqual(res.map.sources, ['/src/Card.samrey']);
    assert.ok(typeof res.map.mappings === 'string' && res.map.mappings.length > 0);
  });

  it('audits extended URL attributes, srcset, entity obfuscation, unquoted handlers, and <a> a11y without false positives on JSX expressions (Bug 7a)', async () => {
    const { auditSource } = await import('../src/audit.js');
    const badHtml = [
      '<img src="/ok.jpg" data-alt="not-alt">',
      '<a>Missing href and label</a>',
      '<video poster="javascript:alert(1)"></video>',
      '<button type="submit" formaction="vbscript:msgbox(1)">Go</button>',
      '<svg><a href="/safe" xlink:href="data:text/html,xss">x</a></svg>',
      '<a href="java&#x09;script:alert(1)">tab-obfuscated</a>',
      '<img alt="ok" srcset="/good.png 1x, javascript:alert(2) 2x">',
      '<div onclick=alert(3)>unquoted</div>'
    ].join('\n');

    const report = auditSource(badHtml, 'Unsafe.samrey');
    assert.equal(report.violationsCount, 8, `Expected 8 violations, got ${report.violationsCount}: ${report.messages.join('\n')}`);

    const cleanJsx = [
      'export function SafeCard(url: string, handler: () => void) {',
      '  return `<img src="/ok.png" alt="ok" /><a href="/about">About</a><a href={url} onClick={handler}>Dynamic</a>`;',
      '}'
    ].join('\n');
    const cleanReport = auditSource(cleanJsx, 'SafeCard.tsx');
    assert.equal(cleanReport.violationsCount, 0, `Expected 0 violations, got ${cleanReport.messages.join('\n')}`);
  });

  it('handles native dev fallback URL decoding, 404 for missing assets, 403 traversal, and .samrey/.ts transpilation (Bug 16)', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const { Writable } = await import('node:stream');
    const { createNativeDevHandler } = await import('../src/commands/dev.js');

    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-dev-fallback-'));
    try {
      fs.writeFileSync(path.join(tmpRoot, 'index.html'), '<html><body>SPA Shell</body></html>');
      fs.writeFileSync(path.join(tmpRoot, 'hello world.txt'), 'decoded-space-ok');
      fs.writeFileSync(path.join(tmpRoot, 'View.samrey'), '<div class="v">Hi</div>');
      fs.writeFileSync(path.join(tmpRoot, 'mod.ts'), 'export const answer: number = 42;');

      const handler = createNativeDevHandler(tmpRoot);
      const invoke = (url: string): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> =>
        new Promise((resolve, reject) => {
          const chunks: Buffer[] = [];
          const headers: Record<string, string | string[] | undefined> = {};
          let status = 200;
          const res = new Writable({
            write(chunk, _enc, cb) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
              cb();
            }
          }) as any;
          res.writeHead = (code: number, hdrs: Record<string, string | string[]> = {}) => {
            status = code;
            for (const [k, v] of Object.entries(hdrs)) {
              headers[k.toLowerCase()] = v;
            }
            return res;
          };
          res.on('finish', () => {
            resolve({ status, headers, body: Buffer.concat(chunks).toString('utf-8') });
          });
          Promise.resolve(handler({ url } as any, res)).catch(reject);
        });

      // 1. URI decoding
      const decoded = await invoke('/hello%20world.txt');
      assert.equal(decoded.status, 200);
      assert.equal(decoded.body, 'decoded-space-ok');

      // 2. Malformed percent encoding -> 400
      const malformed = await invoke('/%E0%A4%A');
      assert.equal(malformed.status, 400);

      // 3. Traversal -> 403
      const traversal = await invoke('/../../etc/passwd');
      assert.equal(traversal.status, 403);

      // 4. Missing asset extension -> 404 (not index.html)
      const missingJs = await invoke('/missing.js');
      assert.equal(missingJs.status, 404);

      // 5. Extensionless client route -> SPA index.html
      const spaRoute = await invoke('/dashboard/settings');
      assert.equal(spaRoute.status, 200);
      assert.ok(spaRoute.body.includes('SPA Shell'));

      // 6. .samrey compilation to JS
      const compiledSamrey = await invoke('/View.samrey');
      assert.equal(compiledSamrey.status, 200);
      assert.match(String(compiledSamrey.headers['content-type']), /text\/javascript/);
      assert.ok(compiledSamrey.body.includes('template('));

      // 7. .ts transpilation stripping type annotations
      const transpiledTs = await invoke('/mod.ts');
      assert.equal(transpiledTs.status, 200);
      assert.match(String(transpiledTs.headers['content-type']), /text\/javascript/);
      assert.ok(!transpiledTs.body.includes(': number'), 'TypeScript type annotation must be stripped');
      assert.ok(transpiledTs.body.includes('42'));

      // 8. F-10: Symlink escape protection and HTTP method allowlisting (GET/HEAD only)
      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-dev-outside-'));
      try {
        fs.writeFileSync(path.join(tmpRoot, '.env'), 'SECRET=topsecret');
        fs.mkdirSync(path.join(tmpRoot, '.git'), { recursive: true });
        fs.writeFileSync(path.join(tmpRoot, '.git', 'config'), '[core]');
        fs.mkdirSync(path.join(tmpRoot, 'real-sub'), { recursive: true });
        fs.writeFileSync(path.join(tmpRoot, 'real-sub', 'index.html'), '<h1>Internal Dir</h1>');
        fs.symlinkSync(path.join(tmpRoot, 'real-sub'), path.join(tmpRoot, 'alias-sub'));

        const dotEnvResp = await invoke('/.env');
        assert.equal(dotEnvResp.status, 403);
        const dotGitResp = await invoke('/.git/config');
        assert.equal(dotGitResp.status, 403);
        const internalSymlinkDir = await invoke('/alias-sub');
        assert.equal(internalSymlinkDir.status, 200);
        assert.ok(internalSymlinkDir.body.includes('Internal Dir'));

        const secretFile = path.join(outsideDir, 'secret.txt');
        fs.writeFileSync(secretFile, 'TOP_SECRET');
        fs.symlinkSync(secretFile, path.join(tmpRoot, 'leak.txt'));

        const symlinkResp = await invoke('/leak.txt');
        assert.equal(symlinkResp.status, 403);
        assert.ok(!symlinkResp.body.includes('TOP_SECRET'));

        const postResp = await new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }>((resolve, reject) => {
          const chunks: Buffer[] = [];
          const headers: Record<string, string | string[] | undefined> = {};
          let status = 200;
          const res = new Writable({
            write(chunk, _enc, cb) { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))); cb(); }
          }) as any;
          res.writeHead = (code: number, hdrs: Record<string, string | string[]> = {}) => {
            status = code;
            for (const [k, v] of Object.entries(hdrs)) headers[k.toLowerCase()] = v;
            return res;
          };
          res.on('finish', () => resolve({ status, headers, body: Buffer.concat(chunks).toString('utf-8') }));
          Promise.resolve(handler({ url: '/mod.ts', method: 'POST' } as any, res)).catch(reject);
        });
        assert.equal(postResp.status, 405);
        assert.equal(postResp.headers['allow'], 'GET, HEAD');

        const headResp = await new Promise<{ status: number; body: string }>((resolve, reject) => {
          const chunks: Buffer[] = [];
          let status = 200;
          const res = new Writable({
            write(chunk, _enc, cb) { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))); cb(); }
          }) as any;
          res.writeHead = (code: number) => { status = code; return res; };
          res.on('finish', () => resolve({ status, body: Buffer.concat(chunks).toString('utf-8') }));
          Promise.resolve(handler({ url: '/hello%20world.txt', method: 'HEAD' } as any, res)).catch(reject);
        });
        assert.equal(headResp.status, 200);
        assert.equal(headResp.body, '');
      } finally {
        fs.rmSync(outsideDir, { recursive: true, force: true });
      }
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('F-09: handles nested JSX braces, template literals, and > inside attributes accurately in auditSource', async () => {
    const { auditSource } = await import('../src/audit.js');

    // Nested braces + comparisons inside JSX expressions must not split opening tag or hide subsequent onclick
    const nestedSource = `
      export function ActionBar() {
        return (
          <div>
            <button onClick={() => { const cfg = { valid: 2 > 1 }; save(cfg); }} onclick="alert(1)">Save</button>
            <button onClick={() => { return \`value > 0\`; }}>Safe</button>
            <a title={count > 1 ? 'many' : 'one'} href="javascript:alert(1)">Link</a>
            <script title=">">alert(1)</script>
            <script title=">" src="javascript:alert(2)"></script>
          </div>
        );
      }
    `;

    const report = auditSource(nestedSource, 'ActionBar.tsx');
    assert.ok(report.messages.some((m) => m.includes('Inline event handler attribute "onclick"')));
    assert.ok(!report.messages.some((m) => m.includes('"onClick"')));
    assert.ok(report.messages.some((m) => m.includes('javascript:') && m.includes('"href"')));
    assert.ok(report.messages.some((m) => m.includes('Inline <script> tag without src')));
    assert.ok(report.messages.some((m) => m.includes('Insecure "javascript:" URI in <script src>')));
    assert.equal(report.violationsCount, 4, `Expected 4 violations, got ${report.violationsCount}: ${report.messages.join('\n')}`);
  });

  it('Batch 3: skips comments/regexes, avoids benign on* false positives, and flags raw HTML onclick={...} in auditSource', async () => {
    const { auditSource } = await import('../src/audit.js');

    const safeTs = [
      '// <script>alert(1)</script>',
      '/* <img src="/missing-alt.png"> */',
      'const re = /<script\\b[^>]*>[\\s\\S]*?<\\/script>/gi;',
      '<!-- <script>inline()</script> -->',
      'export const card = `<img src="/ok.png" alt="ok" online="true" once="1" onboard="step1" only="true" __proto__="ignored" />`;'
    ].join('\n');
    const cleanReport = auditSource(safeTs, 'Validator.ts');
    assert.equal(cleanReport.violationsCount, 0, `Expected 0 violations, got:\n${cleanReport.messages.join('\n')}`);

    const htmlWithBraceHandler = '<button onclick={alert(1)}>Run</button><body ononline="sync()"></body>';
    const htmlReport = auditSource(htmlWithBraceHandler, 'index.html');
    assert.equal(htmlReport.violationsCount, 2, `Expected 2 violations in index.html, got:\n${htmlReport.messages.join('\n')}`);
  });

  it('Batch 3: forwards build flags, rejects unsupported audit --fix, and emits valid SSR server & SSG API in starters', async () => {
    const { runCLI, generateStarterProject } = await import('../src/index.js');

    const ssrDefaultRes = await runCLI(['build', '--ssr', '--dry-run']);
    assert.equal(ssrDefaultRes.success, true);
    assert.equal((ssrDefaultRes.data as any).ssr, 'src/entry-server.ts');

    const customBuildRes = await runCLI([
      'build',
      '--ssr',
      'src/custom-ssr.ts',
      '--no-minify',
      '--sourcemap',
      'inline',
      '--outDir',
      'dist/server',
      '--dry-run'
    ]);
    assert.equal(customBuildRes.success, true);
    assert.equal((customBuildRes.data as any).ssr, 'src/custom-ssr.ts');
    assert.equal((customBuildRes.data as any).minify, false);
    assert.equal((customBuildRes.data as any).sourcemap, 'inline');
    assert.equal((customBuildRes.data as any).outDir, 'dist/server');

    const fixRes = await runCLI(['audit', '--fix']);
    assert.equal(fixRes.success, false);
    assert.equal(fixRes.exitCode, 1);
    assert.ok(fixRes.message.includes('--fix'));

    const ssrFiles = generateStarterProject('demo-ssr', { template: 'ssr' });
    const ssrPkg = JSON.parse(ssrFiles['package.json']);
    assert.equal(ssrPkg.scripts.start, 'node server.js');
    assert.ok('server.js' in ssrFiles, 'SSR starter must include server.js referenced by scripts.start');
    assert.ok(ssrPkg.scripts.build.includes('--ssr src/entry-server.ts'));

    const ssgFiles = generateStarterProject('demo-ssg', { template: 'ssg' });
    assert.ok('ssg-build.ts' in ssgFiles);
    assert.ok(!ssgFiles['ssg-build.ts'].includes('renderRoute:'), 'SSG starter must not use invalid renderRoute API');
    assert.ok(ssgFiles['ssg-build.ts'].includes('generateStaticSite(\n    ['), 'SSG starter must pass StaticRouteConfig[] array');
  });

  it('Batch 1 regression: blocks internal-symlink dotfiles, untrusted Host headers, error path leakage, unsafe SVG headers, and read stream crashes in dev server', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const { Writable } = await import('node:stream');
    const { createNativeDevHandler } = await import('../src/commands/dev.js');

    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-dev-b1-'));
    try {
      fs.writeFileSync(path.join(tmpRoot, '.env'), 'SECRET=topsecret');
      fs.mkdirSync(path.join(tmpRoot, 'sub'), { recursive: true });
      fs.symlinkSync('../.env', path.join(tmpRoot, 'sub', 'public'));
      fs.writeFileSync(path.join(tmpRoot, 'index.html'), '<h1>Home</h1>');
      fs.writeFileSync(path.join(tmpRoot, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
      fs.writeFileSync(path.join(tmpRoot, 'broken.samrey'), '<template><div>${unclosed</template>');
      fs.writeFileSync(path.join(tmpRoot, 'unreadable.txt'), 'secret');
      fs.chmodSync(path.join(tmpRoot, 'unreadable.txt'), 0o000);

      const handler = createNativeDevHandler(tmpRoot);
      const invoke = (url: string, headers: Record<string, string> = { host: 'localhost:3000' }) =>
        new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }>((resolve, reject) => {
          const chunks: Buffer[] = [];
          const respHeaders: Record<string, string | string[] | undefined> = {};
          let status = 200;
          let resolved = false;
          const res = new Writable({
            write(chunk, _enc, cb) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
              cb();
            }
          }) as any;
          res.writeHead = (code: number, hdrs: Record<string, string | string[]> = {}) => {
            status = code;
            for (const [k, v] of Object.entries(hdrs)) respHeaders[k.toLowerCase()] = v;
            return res;
          };
          const finishResolve = () => {
            if (resolved) return;
            resolved = true;
            resolve({ status, headers: respHeaders, body: Buffer.concat(chunks).toString('utf-8') });
          };
          res.on('finish', finishResolve);
          res.on('close', finishResolve);
          Promise.resolve(handler({ url, method: 'GET', headers } as any, res)).catch(reject);
        });

      // 1. Internal symlink to .env must be blocked (403)
      const internalDotResp = await invoke('/sub/public');
      assert.equal(internalDotResp.status, 403);
      assert.ok(!internalDotResp.body.includes('SECRET'));

      // 2. Untrusted Host header (DNS rebinding) must be rejected (403)
      const rebindResp = await invoke('/index.html', { host: 'evil.com:3000' });
      assert.equal(rebindResp.status, 403);

      // 3. SVG must include X-Content-Type-Options: nosniff + sandboxed CSP
      const svgResp = await invoke('/icon.svg');
      assert.equal(svgResp.status, 200);
      assert.equal(svgResp.headers['x-content-type-options'], 'nosniff');
      assert.ok(String(svgResp.headers['content-security-policy'] || '').includes("default-src 'none'"));

      // 4. 500 error responses must not leak full workspace filesystem path
      const errResp = await invoke('/broken.samrey');
      assert.equal(errResp.status, 500);
      assert.ok(!errResp.body.includes(tmpRoot), `500 response leaked tmpRoot filesystem path: ${errResp.body}`);

      // 5. Unreadable file stream error must be handled gracefully with 500/403 instead of unhandled crash
      const unreadableResp = await invoke('/unreadable.txt');
      assert.ok(unreadableResp.status === 403 || unreadableResp.status === 500);
    } finally {
      try { fs.chmodSync(path.join(tmpRoot, 'unreadable.txt'), 0o644); } catch {}
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it('parses --ssr false cleanly in CLI build and handles audit glob anchoring & zero-segment ** patterns', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-cli-b3-'));
    try {
      const ssrFalseRes = await runCLI(['build', '--ssr', 'false', '--dry-run'], { cwd: tmpRoot });
      assert.equal(ssrFalseRes.success, true);
      assert.ok(!ssrFalseRes.message.includes('(SSR Bundle)'), `Expected non-SSR build, got: ${ssrFalseRes.message}`);

      // Root file a.ts should match **/*.ts; nested/src/b.ts must NOT match anchored src/*.ts; f1.ts matches f?.ts
      fs.writeFileSync(path.join(tmpRoot, 'a.ts'), 'const x = `<img src="x" onerror="alert(1)">`;\n');
      fs.mkdirSync(path.join(tmpRoot, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpRoot, 'src', 'a.ts'), 'const x = `<img src="x" onerror="alert(1)">`;\n');
      fs.mkdirSync(path.join(tmpRoot, 'nested', 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpRoot, 'nested', 'src', 'b.ts'), 'const x = `<img src="x" onerror="alert(1)">`;\n');
      fs.writeFileSync(path.join(tmpRoot, 'f1.ts'), 'const x = `<img src="x" onerror="alert(1)">`;\n');

      const auditRes = await runAuditCommand({
        cwd: tmpRoot,
        ignore: ['a.ts', 'src/**/a.ts', 'src/*.ts', 'f?.ts'],
        strict: true
      });
      // Only nested/src/b.ts should be audited and trigger failure (not src/*.ts-matched)
      assert.equal(auditRes.exitCode, 1);
      assert.equal(auditRes.data?.filesScanned, 1);
      assert.ok(auditRes.message.includes('nested/src/b.ts'));
      assert.ok(!auditRes.message.includes('f1.ts'));

      const zeroGlobRes = await runAuditCommand({
        cwd: tmpRoot,
        ignore: ['**/*.ts']
      });
      assert.equal(zeroGlobRes.exitCode, 0, `Expected **/*.ts to ignore root a.ts, got: ${zeroGlobRes.message}`);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
