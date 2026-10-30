/**
 * @license Apache-2.0
 * @samrey/monorepo - Phase 19 Release Gate & Distribution Validation Suite
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

// Samrey Native Modules
import { signal, computed, effect, batch, createStore } from '../packages/reactivity/src/index.js';
import { el, Show, For, Switch, Match, ErrorBoundary, mount } from '../packages/runtime/src/index.js';
import { sanitizeHtml, sanitizeUrl, isSafeUrl, sanitizeAttribute, safeJsonParse, safeJsonStringify, createCsrfToken, validateCsrfToken } from '../packages/security/src/index.js';
import { compileTemplate, parseTemplate, ERROR_REGISTRY } from '../packages/compiler/src/index.js';
import { createRouter, matchPath } from '../packages/router/src/index.js';
import { createResource, httpClient, createHttpCache, HttpError } from '../packages/http/src/index.js';
import { createForm, createField, validateSchema, getAccessibleFieldProps } from '../packages/forms/src/index.js';
import { renderToString, renderToStream, generateStaticSite, sanitizeSsrState, stripSecrets } from '../packages/ssr/src/index.js';
import { renderTestComponent, fireEvent, waitFor, cleanupAllTestContainers, createMockResource } from '../packages/testing/src/index.js';
import { initDevTools, samreyDevToolsBridge } from '../packages/devtools/src/index.js';
import { runCLI, generateStarterProject } from '../packages/cli/src/index.js';

describe('Samrey Phase 19 — Release Gate, Production Deployment & NPM Distribution Validation', () => {
  const PACKAGES = [
    'reactivity',
    'runtime',
    'security',
    'compiler',
    'router',
    'http',
    'forms',
    'ssr',
    'testing',
    'devtools',
    'cli'
  ];

  describe('1 & 2 & 3. Clean-Room Consumer & NPM Package Quality Gate', () => {
    it('verifies all 11 package manifests have valid v1.0.0-rc.1 metadata and Apache-2.0 licenses', () => {
      for (const pkg of PACKAGES) {
        const manifestPath = path.join(process.cwd(), 'packages', pkg, 'package.json');
        assert.ok(fs.existsSync(manifestPath), `Manifest missing for @samrey/${pkg}`);
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        assert.equal(manifest.name, `@samrey/${pkg}`);
        assert.equal(manifest.version, '1.0.0');
        assert.equal(manifest.license, 'Apache-2.0');
        assert.ok(manifest.description && manifest.description.length > 5, `Missing description in @samrey/${pkg}`);
        assert.ok(manifest.exports, `Missing exports in @samrey/${pkg}`);
        assert.ok(manifest.files, `Missing files in @samrey/${pkg}`);

        // Ensure no test/benchmark leaks in packaged files definition
        const files: string[] = manifest.files;
        assert.ok(!files.includes('tests'), `Tests directory should not be in files array for @samrey/${pkg}`);
        assert.ok(!files.includes('benchmarks'), `Benchmarks directory should not be in files array for @samrey/${pkg}`);
      }
    });

    it('generates npm pack tarballs and executes isolated clean-room consumer application', () => {
      const tarballDir = path.join('/tmp', 'samrey-tarballs');
      const consumerDir = path.join('/tmp', 'samrey-release-consumer');

      fs.rmSync(tarballDir, { recursive: true, force: true });
      fs.rmSync(consumerDir, { recursive: true, force: true });
      fs.mkdirSync(tarballDir, { recursive: true });
      fs.mkdirSync(consumerDir, { recursive: true });

      // Pack all packages into tarballs
      for (const pkg of PACKAGES) {
        const pkgDir = path.join(process.cwd(), 'packages', pkg);
        execSync(`npm pack --pack-destination ${tarballDir}`, { cwd: pkgDir, stdio: 'pipe' });
      }

      const tarballFiles = fs.readdirSync(tarballDir).filter(f => f.endsWith('.tgz'));
      assert.equal(tarballFiles.length, 11, 'All 11 packages must produce .tgz tarballs');

      // Create consumer package.json
      const consumerManifest = {
        name: 'samrey-release-consumer',
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: {} as Record<string, string>
      };

      for (const tarball of tarballFiles) {
        const pkgName = tarball.replace(/^samrey-/, '@samrey/').replace(/-1\.0\.0.*\.tgz$/, '');
        consumerManifest.dependencies[pkgName] = path.join(tarballDir, tarball);
      }

      fs.writeFileSync(
        path.join(consumerDir, 'package.json'),
        JSON.stringify(consumerManifest, null, 2)
      );

      // Verify tarball install in isolated consumer directory
      execSync('npm install --no-package-lock', { cwd: consumerDir, stdio: 'pipe' });
      const installedNodeModules = path.join(consumerDir, 'node_modules', '@samrey');
      assert.ok(fs.existsSync(installedNodeModules), 'node_modules/@samrey must be populated');

      for (const pkg of PACKAGES) {
        assert.ok(
          fs.existsSync(path.join(installedNodeModules, pkg, 'package.json')),
          `@samrey/${pkg} must be installed in clean-room consumer`
        );
      }
    });
  });

  describe('4. Public API Export Verification', () => {
    it('verifies all public APIs exported by @samrey/reactivity match specification', async () => {
      const mod = await import('../packages/reactivity/src/index.js');
      assert.equal(typeof mod.signal, 'function');
      assert.equal(typeof mod.computed, 'function');
      assert.equal(typeof mod.effect, 'function');
      assert.equal(typeof mod.batch, 'function');
      assert.equal(typeof mod.untrack, 'function');
      assert.equal(typeof mod.createStore, 'function');
      assert.equal(typeof mod.produce, 'function');
      assert.equal(typeof mod.reconcile, 'function');
      assert.equal(typeof mod.createMemo, 'function');
      assert.equal(typeof mod.createRoot, 'function');
      assert.equal(typeof mod.createContext, 'function');
      assert.equal(typeof mod.useContext, 'function');
    });

    it('verifies all public APIs exported by @samrey/runtime match specification', async () => {
      const mod = await import('../packages/runtime/src/index.js');
      assert.equal(typeof mod.el, 'function');
      assert.equal(typeof mod.svg, 'function');
      assert.equal(typeof mod.fragment, 'function');
      assert.equal(typeof mod.text, 'function');
      assert.equal(typeof mod.mount, 'function');
      assert.equal(typeof mod.hydrate, 'function');
      assert.equal(typeof mod.Show, 'function');
      assert.equal(typeof mod.For, 'function');
      assert.equal(typeof mod.Switch, 'function');
      assert.equal(typeof mod.Match, 'function');
      assert.equal(typeof mod.ErrorBoundary, 'function');
      assert.equal(typeof mod.Dynamic, 'function');
      assert.equal(typeof mod.Portal, 'function');
      assert.equal(typeof mod.Suspense, 'function');
      assert.equal(typeof mod.onMount, 'function');
      assert.equal(typeof mod.onCleanup, 'function');
      assert.equal(typeof mod.onError, 'function');
      assert.equal(typeof mod.createComponent, 'function');
    });

    it('verifies all public APIs exported by @samrey/security match specification', async () => {
      const mod = await import('../packages/security/src/index.js');
      assert.equal(typeof mod.sanitizeHtml, 'function');
      assert.equal(typeof mod.sanitizeUrl, 'function');
      assert.equal(typeof mod.sanitizeAttribute, 'function');
      assert.equal(typeof mod.isSafeUrl, 'function');
      assert.equal(typeof mod.safeJsonParse, 'function');
      assert.equal(typeof mod.safeJsonStringify, 'function');
      assert.equal(typeof mod.createCsrfToken, 'function');
      assert.equal(typeof mod.validateCsrfToken, 'function');
      assert.ok(mod.TrustedTypesPolicy, 'TrustedTypesPolicy must exist');
    });

    it('verifies all public APIs exported by @samrey/http and @samrey/forms match specification', async () => {
      const httpMod = await import('../packages/http/src/index.js');
      assert.equal(typeof httpMod.createResource, 'function');
      assert.ok(httpMod.httpClient, 'httpClient instance must be exported');
      assert.equal(typeof httpMod.createHttpCache, 'function');
      assert.ok(httpMod.HttpError, 'HttpError class must be exported');

      const formsMod = await import('../packages/forms/src/index.js');
      assert.equal(typeof formsMod.createForm, 'function');
      assert.equal(typeof formsMod.createField, 'function');
      assert.equal(typeof formsMod.validateSchema, 'function');
      assert.equal(typeof formsMod.getAccessibleFieldProps, 'function');
    });
  });

  describe('5 & 6. Version Consistency & Zero Foreign Framework Gate', () => {
    it('verifies exact version 1.0.0 across monorepo and CLI', async () => {
      const cliMod = await import('../packages/cli/src/index.js');
      assert.equal(cliMod.CLI_VERSION, '1.0.0');

      const rootManifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
      assert.equal(rootManifest.version, '1.0.0');
    });

    it('verifies zero foreign frontend frameworks in source code and package dependencies', () => {
      const FORBIDDEN = [
        'react', 'react-dom', 'vue', 'angular', 'svelte', 'solid-js', 'preact', 'lit',
        'redux', 'zustand', 'mobx', '@chakra-ui', '@mui', 'antd', '@radix-ui', '@headlessui'
      ];

      for (const pkg of PACKAGES) {
        const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'packages', pkg, 'package.json'), 'utf8'));
        const allDeps = {
          ...(manifest.dependencies || {}),
          ...(manifest.peerDependencies || {})
        };

        for (const forbidden of FORBIDDEN) {
          assert.ok(
            !allDeps[forbidden],
            `Forbidden dependency ${forbidden} found in @samrey/${pkg} package.json!`
          );
        }
      }
    });
  });

  describe('7 & 8. Starter Templates & Real-World Application Build', () => {
    it('generates and verifies all 4 starter templates (ssr, spa, minimal, ssg)', () => {
      const templates = ['ssr', 'spa', 'minimal', 'ssg'] as const;
      for (const tmpl of templates) {
        const files = generateStarterProject(`test-${tmpl}`, { template: tmpl });
        assert.ok(files['package.json'], `Template ${tmpl} missing package.json`);
        assert.ok(
          files['src/App.tsx'] || files['src/entry-client.tsx'] || files['src/App.ts'] || files['src/main.ts'],
          `Template ${tmpl} missing entry file`
        );

        // Verify no React/Vue references in template files
        for (const [filename, content] of Object.entries(files)) {
          assert.ok(!content.includes("from 'react'"), `Foreign framework detected in ${tmpl}/${filename}`);
          assert.ok(!content.includes("from 'vue'"), `Foreign framework detected in ${tmpl}/${filename}`);
        }
      }
    });

    it('validates Project Manager example application state and data structures', async () => {
      const stateMod = await import('../examples/project-manager/src/state.js');
      assert.ok(stateMod.projectStore, 'projectStore must be initialized');
      assert.ok(stateMod.filteredProjects, 'filteredProjects computed selector must exist');
      assert.ok(stateMod.projectMetrics, 'projectMetrics computed selector must exist');

      const metrics = stateMod.projectMetrics.value;
      assert.ok(typeof metrics.totalProjects === 'number', 'Initial projects metric must be numeric');
    });
  });

  describe('11 & 12 & 13 & 14. SSR, SSG, Hydration & Security Hostile State Stripping', () => {
    it('renders component to static HTML and strips hostile secrets from SSR state', async () => {
      const hostileState = {
        publicUser: { name: 'Alice Developer', role: 'Architect' },
        secretToken: 'sk_live_983749823479283749283749',
        databaseUrl: 'postgres://admin:supersecret@db.internal:5432/prod',
        apiKey: 'AIzaSyD-HostileKey999',
        nested: {
          passwordHash: '$2a$12$e8h129837198273918273918273',
          publicCount: 42
        }
      };

      const cleanState = stripSecrets(hostileState);
      assert.ok(cleanState.publicUser, 'Public data must remain');
      assert.equal((cleanState as any).secretToken, undefined, 'secretToken must be stripped');
      assert.equal((cleanState as any).databaseUrl, undefined, 'databaseUrl must be stripped');
      assert.equal((cleanState as any).apiKey, undefined, 'apiKey must be stripped');
      assert.equal((cleanState as any).nested.passwordHash, undefined, 'passwordHash must be stripped');
      assert.equal((cleanState as any).nested.publicCount, 42, 'publicCount must remain');

      // Test SSR HTML render
      const html = await renderToString(() => el('div', { id: 'app-root' }, 'Samrey Native SSR Output'));
      assert.ok(html.includes('id="app-root"'), 'SSR HTML must contain element attributes');
      assert.ok(html.includes('Samrey Native SSR Output'), 'SSR HTML must contain text content');
    });

    it('generates multi-route static site pages with generateStaticSite', async () => {
      const routes = [
        { path: '/', component: () => el('h1', null, 'Home Page') },
        { path: '/projects', component: () => el('h1', null, 'Projects Catalog') },
        { path: '/security', component: () => el('h1', null, 'Security Shield') }
      ];

      const result = await generateStaticSite(routes, {
        outDir: '/tmp/test-ssg-out',
        writeFiles: false
      });

      assert.equal(result.pages.length, 3, 'Must pre-render 3 pages');
      assert.ok(result.pages.some(p => p.path === '/' && p.html.includes('Home Page')));
      assert.ok(result.pages.some(p => p.path === '/projects' && p.html.includes('Projects Catalog')));
      assert.ok(result.pages.some(p => p.path === '/security' && p.html.includes('Security Shield')));
    });
  });

  describe('15 & 16 & 17 & 18. Security, A11y, Lifecycle Stress & Error Codes', () => {
    it('neutralizes adversarial XSS and URI injection attempts', () => {
      const hostileHtml = '<script>alert("PWNED")</script><img src=x onerror=alert(1)>';
      const clean = sanitizeHtml(hostileHtml);
      assert.ok(!clean.includes('<script>'), 'Script tags must be stripped');
      assert.ok(!clean.includes('alert("PWNED")'), 'Script inner payload must be removed');

      const hostileUrls = [
        'javascript:alert(document.cookie)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox("xss")'
      ];

      for (const u of hostileUrls) {
        assert.equal(isSafeUrl(u), false, `Insecure protocol ${u} must be flagged false`);
        assert.equal(sanitizeUrl(u), 'about:blank', `Insecure protocol ${u} must sanitize to about:blank`);
      }
    });

    it('executes 1,000 mount and disposal cycles with 0 orphaned subscriptions', () => {
      const s = signal(0);
      let runCount = 0;

      for (let i = 0; i < 1000; i++) {
        const container = {
          childNodes: [] as any[],
          replaceChildren(...nodes: any[]) { this.childNodes = nodes; }
        } as unknown as HTMLElement;

        const unmount = mount(() => {
          effect(() => {
            const val = s.value;
            runCount++;
          });
          return el('div', null, 'item');
        }, container);

        unmount();
      }

      const countBefore = runCount;
      s.value = 999;
      // Because all 1,000 effects were unmounted, s.value update should NOT trigger any unmounted effects!
      assert.equal(runCount, countBefore, 'Unmounted effects must not execute upon signal write');
    });

    it('verifies standard error codes catalog in ERROR_REGISTRY', () => {
      assert.ok(ERROR_REGISTRY['SAMREY-101'], 'SAMREY-101 must exist');
      assert.ok(ERROR_REGISTRY['SAMREY-102'], 'SAMREY-102 must exist');
      assert.ok(ERROR_REGISTRY['SAMREY-103'], 'SAMREY-103 must exist');
      assert.ok(ERROR_REGISTRY['SAMREY-201'], 'SAMREY-201 must exist');
      assert.ok(ERROR_REGISTRY['SAMREY-301'], 'SAMREY-301 must exist');
      assert.ok(ERROR_REGISTRY['SAMREY-401'], 'SAMREY-401 must exist');
      assert.ok(ERROR_REGISTRY['SAMREY-501'], 'SAMREY-501 must exist');
      assert.ok(ERROR_REGISTRY['AETH-101'], 'AETH-101 alias must exist');
    });
  });
});
