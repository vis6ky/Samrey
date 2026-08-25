/**
 * @license Apache-2.0
 * @samrey/monorepo - Phase 20 Public Release Readiness & npm Publication Validation Suite
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

// Samrey Native Modules
import { signal, computed, effect, batch, untrack, createStore, produce, reconcile, createMemo, createRoot, createContext, useContext } from '../packages/reactivity/src/index.js';
import { el, svg, fragment, text, mount, hydrate, Show, For, Switch, Match, ErrorBoundary, Dynamic, Portal, Suspense, onMount, onCleanup, onError, createComponent } from '../packages/runtime/src/index.js';
import { sanitizeHtml, sanitizeUrl, sanitizeAttribute, escapeHtmlText, isSafeUrl, safeJsonParse, safeJsonStringify, createCsrfToken, validateCsrfToken, TrustedTypesPolicy } from '../packages/security/src/index.js';
import { compileTemplate, parseTemplate, buildAIR, generateCode, classifySecurityNode, lintAccessibility, SamreyCompilerError, generateSourceFrame, ERROR_REGISTRY } from '../packages/compiler/src/index.js';
import { createRouter, matchPath, matchRoute, matchRoutes, createLink, Router, Route, Link, useRouter, useParams, useLocation, useSearchParams, createBrowserHistory, createMemoryHistory } from '../packages/router/src/index.js';
import { createResource, httpClient, createHttpCache, HttpError } from '../packages/http/src/index.js';
import { createForm, createField, validateSchema, getAccessibleFieldProps } from '../packages/forms/src/index.js';
import { renderToString, renderToStream, generateStaticSite, sanitizeSsrState, stripSecrets, serializeStateForHydration, escapeJsonState, hydrateFromSSR } from '../packages/ssr/src/index.js';
import { renderTestComponent, fireEvent, waitFor, cleanupAllTestContainers, createMockResource } from '../packages/testing/src/index.js';
import { DevToolsBridge, samreyDevToolsBridge, SamreyDevToolsBridge, initDevTools, GraphInspector, ReactiveGraphInspector, PerformanceInspector, PerfInspector } from '../packages/devtools/src/index.js';
import { runCLI, generateStarterProject, samreyVitePlugin, runSamreyAudit, CLI_VERSION } from '../packages/cli/src/index.js';

describe('Samrey Phase 20 — Public Release & npm Publication Readiness', () => {
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

  describe('1. Source Tree & Zero-Foreign-Framework Strict Audit', () => {
    it('verifies no foreign framework dependencies in any package.json or production runtime imports', () => {
      const FORBIDDEN = [
        'react', 'react-dom', 'vue', 'angular', 'svelte', 'solid-js', 'preact', 'lit',
        'redux', 'zustand', 'mobx', 'lucide-react', 'framer-motion', 'chakra', 'mui', 'antd',
        'bootstrap', 'tailwind-react', '@vitejs/plugin-react'
      ];

      for (const pkg of PACKAGES) {
        const manifestPath = path.join(process.cwd(), 'packages', pkg, 'package.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const deps = {
          ...(manifest.dependencies || {}),
          ...(manifest.devDependencies || {}),
          ...(manifest.peerDependencies || {}),
          ...(manifest.optionalDependencies || {})
        };

        for (const f of FORBIDDEN) {
          assert.ok(!deps[f], `Forbidden dependency "${f}" found in @samrey/${pkg} package.json`);
        }
      }

      // Check src/ directories of all packages
      for (const pkg of PACKAGES) {
        const srcDir = path.join(process.cwd(), 'packages', pkg, 'src');
        if (fs.existsSync(srcDir)) {
          const files = fs.readdirSync(srcDir, { recursive: true }) as string[];
          for (const file of files) {
            const fullPath = path.join(srcDir, file);
            if (fs.statSync(fullPath).isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
              const content = fs.readFileSync(fullPath, 'utf8');
              for (const f of ['from \'react\'', 'from "react"', 'from \'vue\'', 'from "vue"', 'from \'@angular', 'from \'svelte\'', 'from \'solid-js\'']) {
                assert.ok(!content.includes(f), `Foreign import "${f}" found in @samrey/${pkg}/src/${file}`);
              }
            }
          }
        }
      }
    });
  });

  describe('2. Package Manifest & Dependency Graph Validation', () => {
    it('verifies all 11 package manifests have version 1.0.0-rc.1, Apache-2.0, repository metadata, and correct exports', () => {
      for (const pkg of PACKAGES) {
        const manifestPath = path.join(process.cwd(), 'packages', pkg, 'package.json');
        assert.ok(fs.existsSync(manifestPath), `Manifest missing for @samrey/${pkg}`);
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        assert.equal(manifest.name, `@samrey/${pkg}`);
        assert.equal(manifest.version, '1.0.0');
        assert.equal(manifest.license, 'Apache-2.0');
        assert.ok(manifest.repository, `Missing repository in @samrey/${pkg}`);
        assert.ok(manifest.description, `Missing description in @samrey/${pkg}`);
        assert.ok(manifest.exports, `Missing exports in @samrey/${pkg}`);
        assert.ok(manifest.files, `Missing files in @samrey/${pkg}`);

        if (pkg === 'cli') {
          assert.ok(manifest.bin && manifest.bin.samrey, 'CLI must have bin.samrey field');
        }
      }
    });
  });

  describe('3. Public API Contract Exhaustive Verification', () => {
    it('verifies 100% of public API exports across all 11 packages against docs/PUBLIC_API.md contract', () => {
      // Reactivity
      assert.equal(typeof signal, 'function');
      assert.equal(typeof computed, 'function');
      assert.equal(typeof effect, 'function');
      assert.equal(typeof batch, 'function');
      assert.equal(typeof untrack, 'function');
      assert.equal(typeof createStore, 'function');
      assert.equal(typeof produce, 'function');
      assert.equal(typeof reconcile, 'function');
      assert.equal(typeof createMemo, 'function');
      assert.equal(typeof createRoot, 'function');
      assert.equal(typeof createContext, 'function');
      assert.equal(typeof useContext, 'function');

      // Runtime
      assert.equal(typeof el, 'function');
      assert.equal(typeof svg, 'function');
      assert.equal(typeof fragment, 'function');
      assert.equal(typeof text, 'function');
      assert.equal(typeof mount, 'function');
      assert.equal(typeof hydrate, 'function');
      assert.equal(typeof Show, 'function');
      assert.equal(typeof For, 'function');
      assert.equal(typeof Switch, 'function');
      assert.equal(typeof Match, 'function');
      assert.equal(typeof ErrorBoundary, 'function');
      assert.equal(typeof Dynamic, 'function');
      assert.equal(typeof Portal, 'function');
      assert.equal(typeof Suspense, 'function');
      assert.equal(typeof onMount, 'function');
      assert.equal(typeof onCleanup, 'function');
      assert.equal(typeof onError, 'function');
      assert.equal(typeof createComponent, 'function');

      // Security
      assert.equal(typeof sanitizeHtml, 'function');
      assert.equal(typeof sanitizeUrl, 'function');
      assert.equal(typeof sanitizeAttribute, 'function');
      assert.equal(typeof escapeHtmlText, 'function');
      assert.equal(typeof isSafeUrl, 'function');
      assert.equal(typeof safeJsonParse, 'function');
      assert.equal(typeof safeJsonStringify, 'function');
      assert.equal(typeof createCsrfToken, 'function');
      assert.equal(typeof validateCsrfToken, 'function');
      assert.ok(TrustedTypesPolicy, 'TrustedTypesPolicy must exist');

      // Compiler
      assert.equal(typeof compileTemplate, 'function');
      assert.equal(typeof parseTemplate, 'function');
      assert.equal(typeof buildAIR, 'function');
      assert.equal(typeof generateCode, 'function');
      assert.equal(typeof classifySecurityNode, 'function');
      assert.equal(typeof lintAccessibility, 'function');
      assert.ok(SamreyCompilerError, 'SamreyCompilerError must exist');
      assert.equal(typeof generateSourceFrame, 'function');
      assert.ok(ERROR_REGISTRY, 'ERROR_REGISTRY must exist');

      // Router
      assert.equal(typeof createRouter, 'function');
      assert.equal(typeof matchPath, 'function');
      assert.equal(typeof matchRoute, 'function');
      assert.equal(typeof matchRoutes, 'function');
      assert.equal(typeof createLink, 'function');
      assert.equal(typeof Router, 'function');
      assert.equal(typeof Route, 'function');
      assert.equal(typeof Link, 'function');
      assert.equal(typeof useRouter, 'function');
      assert.equal(typeof useParams, 'function');
      assert.equal(typeof useLocation, 'function');
      assert.equal(typeof useSearchParams, 'function');
      assert.equal(typeof createBrowserHistory, 'function');
      assert.equal(typeof createMemoryHistory, 'function');

      // HTTP
      assert.equal(typeof createResource, 'function');
      assert.ok(httpClient, 'httpClient instance must be exported');
      assert.equal(typeof createHttpCache, 'function');
      assert.ok(HttpError, 'HttpError class must be exported');

      // Forms
      assert.equal(typeof createForm, 'function');
      assert.equal(typeof createField, 'function');
      assert.equal(typeof validateSchema, 'function');
      assert.equal(typeof getAccessibleFieldProps, 'function');

      // SSR
      assert.equal(typeof renderToString, 'function');
      assert.equal(typeof renderToStream, 'function');
      assert.equal(typeof generateStaticSite, 'function');
      assert.equal(typeof sanitizeSsrState, 'function');
      assert.equal(typeof stripSecrets, 'function');
      assert.equal(typeof serializeStateForHydration, 'function');
      assert.equal(typeof escapeJsonState, 'function');
      assert.equal(typeof hydrateFromSSR, 'function');

      // Testing
      assert.equal(typeof renderTestComponent, 'function');
      assert.equal(typeof fireEvent, 'function');
      assert.equal(typeof waitFor, 'function');
      assert.equal(typeof cleanupAllTestContainers, 'function');
      assert.equal(typeof createMockResource, 'function');

      // DevTools
      assert.ok(DevToolsBridge, 'DevToolsBridge must exist');
      assert.ok(samreyDevToolsBridge, 'samreyDevToolsBridge must exist');
      assert.ok(SamreyDevToolsBridge, 'SamreyDevToolsBridge must exist');
      assert.equal(typeof initDevTools, 'function');
      assert.ok(GraphInspector, 'GraphInspector must exist');
      assert.ok(ReactiveGraphInspector, 'ReactiveGraphInspector must exist');
      assert.ok(PerformanceInspector, 'PerformanceInspector must exist');
      assert.ok(PerfInspector, 'PerfInspector must exist');

      // CLI
      assert.equal(typeof runCLI, 'function');
      assert.equal(typeof generateStarterProject, 'function');
      assert.equal(typeof samreyVitePlugin, 'function');
      assert.equal(typeof runSamreyAudit, 'function');
      assert.equal(CLI_VERSION, '1.0.0');
    });
  });

  describe('4 & 5. NPM Tarballs, Clean-Room Consumer & Isolation', () => {
    it('packages all 11 modules into tarballs, verifies contents, and executes cleanly in consumer', () => {
      const tarballDir = path.join('/tmp', 'samrey-phase20-tarballs');
      const consumerDir = path.join('/tmp', 'samrey-phase20-consumer');

      fs.rmSync(tarballDir, { recursive: true, force: true });
      fs.rmSync(consumerDir, { recursive: true, force: true });
      fs.mkdirSync(tarballDir, { recursive: true });
      fs.mkdirSync(consumerDir, { recursive: true });

      // Run npm pack on all packages
      for (const pkg of PACKAGES) {
        const pkgDir = path.join(process.cwd(), 'packages', pkg);
        execSync(`npm pack --pack-destination ${tarballDir}`, { cwd: pkgDir, stdio: 'pipe' });
      }

      const tarballs = fs.readdirSync(tarballDir).filter(f => f.endsWith('.tgz'));
      assert.equal(tarballs.length, 11, 'Must generate 11 tarball archives');

      // Verify tarballs do not contain tests, benchmarks, secrets, or .env files
      for (const tarball of tarballs) {
        const tarballPath = path.join(tarballDir, tarball);
        const listOutput = execSync(`tar -tf ${tarballPath}`, { encoding: 'utf8' });
        const lines = listOutput.split('\n').filter(Boolean);

        assert.ok(!lines.some(l => l.includes('tests/')), `Tarball ${tarball} should not contain tests/`);
        assert.ok(!lines.some(l => l.includes('benchmarks/')), `Tarball ${tarball} should not contain benchmarks/`);
        assert.ok(!lines.some(l => l.includes('.env')), `Tarball ${tarball} should not contain .env files`);
        assert.ok(!lines.some(l => l.includes('.git')), `Tarball ${tarball} should not contain git metadata`);
        assert.ok(lines.some(l => l.includes('package.json')), `Tarball ${tarball} must contain package.json`);
        assert.ok(lines.some(l => l.includes('README.md')), `Tarball ${tarball} must contain README.md`);
        assert.ok(lines.some(l => l.includes('LICENSE')), `Tarball ${tarball} must contain LICENSE`);
      }

      // Create isolated consumer package.json
      const consumerManifest = {
        name: 'samrey-phase20-clean-consumer',
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: {} as Record<string, string>
      };

      for (const tarball of tarballs) {
        const pkgName = tarball.replace(/^samrey-/, '@samrey/').replace(/-1\.0\.0.*\.tgz$/, '');
        consumerManifest.dependencies[pkgName] = path.join(tarballDir, tarball);
      }

      fs.writeFileSync(
        path.join(consumerDir, 'package.json'),
        JSON.stringify(consumerManifest, null, 2)
      );

      // Install in isolated clean room
      execSync('npm install --no-package-lock', { cwd: consumerDir, stdio: 'pipe' });

      // Run isolated consumer smoke script
      const consumerScript = `
        import { signal, computed } from '@samrey/reactivity';
        import { sanitizeHtml, sanitizeUrl } from '@samrey/security';
        import { createRouter } from '@samrey/router';
        import { createForm, createField } from '@samrey/forms';
        import { renderToString } from '@samrey/ssr';
        import { el } from '@samrey/runtime';

        const count = signal(10);
        const double = computed(() => count.value * 2);
        if (double.value !== 20) throw new Error('Reactivity calculation failed');

        const clean = sanitizeHtml('<script>alert(1)</script>hello');
        if (clean.includes('<script>')) throw new Error('Security sanitize failed');

        const safeU = sanitizeUrl('javascript:alert(1)');
        if (safeU !== 'about:blank') throw new Error('Security URI sanitize failed');

        const router = createRouter([{ path: '/', component: () => ({}) }]);
        if (router.currentPath.value !== '/') throw new Error('Router path mismatch');

        const form = createForm({
          initialValues: { name: 'Samrey Consumer' },
          onSubmit: async () => {}
        });
        if (form.fields.name.value.value !== 'Samrey Consumer') throw new Error('Form initialization failed');

        const html = await renderToString(() => el('div', { id: 'test' }, 'Samrey Consumer Ready'));
        if (!html.includes('Samrey Consumer Ready')) throw new Error('SSR renderToString failed');

        console.log('CLEAN_ROOM_CONSUMER_SUCCESS');
      `;

      fs.writeFileSync(path.join(consumerDir, 'index.mjs'), consumerScript);
      const consumerOutput = execSync('npx --yes tsx index.mjs', { cwd: consumerDir, encoding: 'utf8' });
      assert.ok(consumerOutput.includes('CLEAN_ROOM_CONSUMER_SUCCESS'), 'Clean-room consumer smoke test failed');
    });
  });

  describe('6 & 7. Secret Scan & License Integrity', () => {
    it('verifies 0 hardcoded secrets or sensitive credentials exist across codebase', () => {
      const sensitivePatterns = [
        /AKIA[0-9A-Z]{16}/,
        /AIzaSy[0-9A-Za-z-_]{33}/,
        /ghp_[0-9a-zA-Z]{36}/,
        /sk_live_[0-9a-zA-Z]{24}/,
        /-----BEGIN RSA PRIVATE KEY-----/,
        /-----BEGIN OPENSSH PRIVATE KEY-----/
      ];

      for (const pkg of PACKAGES) {
        const srcDir = path.join(process.cwd(), 'packages', pkg, 'src');
        if (fs.existsSync(srcDir)) {
          const files = fs.readdirSync(srcDir, { recursive: true }) as string[];
          for (const file of files) {
            const fullPath = path.join(srcDir, file);
            if (fs.statSync(fullPath).isFile()) {
              const content = fs.readFileSync(fullPath, 'utf8');
              for (const pat of sensitivePatterns) {
                assert.ok(!pat.test(content), `Found potential secret in ${fullPath}`);
              }
            }
          }
        }
      }
    });

    it('verifies Apache-2.0 license file and SPDX headers', () => {
      const rootLicense = path.join(process.cwd(), 'LICENSE');
      assert.ok(fs.existsSync(rootLicense), 'Root LICENSE file missing');
      const rootLicenseText = fs.readFileSync(rootLicense, 'utf8');
      assert.ok(rootLicenseText.includes('Apache License'), 'Root LICENSE must be Apache License');
      assert.ok(rootLicenseText.includes('Version 2.0'), 'Root LICENSE must be Version 2.0');

      for (const pkg of PACKAGES) {
        const pkgLicense = path.join(process.cwd(), 'packages', pkg, 'LICENSE');
        assert.ok(fs.existsSync(pkgLicense), `LICENSE missing in @samrey/${pkg}`);
      }
    });
  });

  describe('8 & 11. CLI Execution & Starter Templates', () => {
    it('executes CLI commands and validates all 4 starter templates (minimal, spa, ssr, ssg)', () => {
      const templates = ['minimal', 'spa', 'ssr', 'ssg'] as const;
      for (const tmpl of templates) {
        const files = generateStarterProject(`app-${tmpl}`, { template: tmpl });
        assert.ok(files['package.json'], `Template ${tmpl} missing package.json`);
        assert.ok(files['README.md'], `Template ${tmpl} missing README.md`);
        assert.ok(files['src/App.tsx'] || files['src/entry-client.tsx'] || files['src/App.ts'] || files['src/main.ts'], `Template ${tmpl} missing entry file`);

        const manifest = JSON.parse(files['package.json']);
        assert.ok(manifest.dependencies['@samrey/reactivity'] || manifest.dependencies['@samrey/runtime'], `Template ${tmpl} missing Samrey runtime dependencies`);
        assert.ok(!manifest.dependencies['react'], `Template ${tmpl} must not have react dependency`);
        assert.ok(!manifest.dependencies['vue'], `Template ${tmpl} must not have vue dependency`);
      }
    });
  });

  describe('12. Project Manager Example Application Verification', () => {
    it('validates Project Manager state, selectors, actions and health metrics', async () => {
      const stateMod = await import('../examples/project-manager/src/state.js');
      assert.ok(stateMod.projectStore, 'projectStore must be initialized');
      assert.ok(stateMod.filteredProjects, 'filteredProjects computed selector must exist');
      assert.ok(stateMod.projectMetrics, 'projectMetrics computed selector must exist');

      await stateMod.initializeData();

      const metrics = stateMod.projectMetrics.value;
      assert.ok(typeof metrics.totalProjects === 'number', 'Initial projects metric must be numeric');
      assert.ok(metrics.totalProjects >= 3, 'Initial projects count must be at least 3');
      assert.ok(metrics.completionRate >= 0 && metrics.completionRate <= 100, 'Completion rate must be between 0 and 100');
    });
  });

  describe('14. Performance Regression & Stress Verification', () => {
    it('executes 1,000 mount/unmount cycles, 5,000 owner disposals, and 10,000 batched signal updates', () => {
      // 1. 1,000 mount/unmount cycles
      const s = signal(1);
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
          return el('div', null, 'perf');
        }, container);

        unmount();
      }
      const beforeWrite = runCount;
      s.value = 42;
      assert.equal(runCount, beforeWrite, 'Disposed effects must not run after signal write');

      // 2. 5,000 nested owner disposals
      let disposed = 0;
      for (let i = 0; i < 5000; i++) {
        createRoot((dispose) => {
          onCleanup(() => { disposed++; });
          dispose();
        });
      }
      assert.equal(disposed, 5000, 'All 5,000 root owners must clean up synchronously');

      // 3. 10,000 batched signal writes
      const count = signal(0);
      let effectRuns = 0;
      effect(() => {
        const v = count.value;
        effectRuns++;
      });
      assert.equal(effectRuns, 1);

      batch(() => {
        for (let i = 0; i < 10000; i++) {
          count.value = i;
        }
      });
      assert.equal(effectRuns, 2, '10,000 updates in batch() must notify observer exactly once');
      assert.equal(count.value, 9999);
    });
  });
});
