/**
 * @license Apache-2.0
 * @samrey/monorepo - Phase 24 Public API Freeze Certification
 * Verifies that 100% of public exports match the v1.0.0 frozen API contract.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { validatePublicAPIExports } from '../../scripts/release/validate-exports.js';

describe('Phase 24 — Public API Freeze Gate', () => {
  it('1. Audits all 11 @samrey/* packages against docs/PUBLIC_API.md', async () => {
    const { results, allValid } = await validatePublicAPIExports();
    assert.strictEqual(results.length, 11, 'Must audit all 11 packages');
    for (const res of results) {
      assert.strictEqual(
        res.missingExports.length,
        0,
        `Package ${res.packageName} has missing exports: ${res.missingExports.join(', ')}`
      );
      assert.strictEqual(
        res.unexpectedExports.length,
        0,
        `Package ${res.packageName} has unexpected exports: ${res.unexpectedExports.join(', ')}`
      );
      assert.ok(res.isValid, `Package ${res.packageName} public API parity must be valid`);
    }
    assert.ok(allValid, 'All 11 packages must have 100% public API parity with docs/PUBLIC_API.md');
  });

  it('2. Verifies Reactivity Module v1.0.0 freeze', async () => {
    const mod = await import('../../packages/reactivity/src/index.js');
    const expected = [
      'signal', 'computed', 'effect', 'batch', 'untrack',
      'createStore', 'produce', 'reconcile', 'createMemo',
      'createRoot', 'createContext', 'useContext'
    ];
    for (const exp of expected) {
      assert.ok(exp in mod, `Reactivity export "${exp}" missing`);
      assert.strictEqual(typeof (mod as any)[exp], 'function', `Reactivity export "${exp}" must be a function`);
    }
  });

  it('3. Verifies Runtime Module v1.0.0 freeze', async () => {
    const mod = await import('../../packages/runtime/src/index.js');
    const expected = [
      'el', 'svg', 'fragment', 'text', 'mount', 'hydrate',
      'Show', 'For', 'Switch', 'Match', 'ErrorBoundary',
      'Dynamic', 'Portal', 'Suspense', 'onMount', 'onCleanup',
      'onError', 'createComponent'
    ];
    for (const exp of expected) {
      assert.ok(exp in mod, `Runtime export "${exp}" missing`);
      assert.strictEqual(typeof (mod as any)[exp], 'function', `Runtime export "${exp}" must be a function`);
    }
  });

  it('4. Verifies Security Module v1.0.0 freeze', async () => {
    const mod = await import('../../packages/security/src/index.js');
    const expected = [
      'sanitizeHtml', 'sanitizeUrl', 'sanitizeAttribute',
      'escapeHtmlText', 'isSafeUrl', 'safeJsonParse',
      'safeJsonStringify', 'createCsrfToken', 'validateCsrfToken',
      'TrustedTypesPolicy'
    ];
    for (const exp of expected) {
      assert.ok(exp in mod, `Security export "${exp}" missing`);
    }
  });

  it('5. Verifies Compiler Module v1.0.0 freeze', async () => {
    const mod = await import('../../packages/compiler/src/index.js');
    const expected = [
      'compileTemplate', 'parseTemplate', 'buildAIR', 'generateCode',
      'classifySecurityNode', 'lintAccessibility', 'SamreyCompilerError',
      'generateSourceFrame', 'ERROR_REGISTRY'
    ];
    for (const exp of expected) {
      assert.ok(exp in mod, `Compiler export "${exp}" missing`);
    }
  });

  it('6. Verifies Router, HTTP, Forms, SSR, Testing, DevTools, CLI v1.0.0 freeze', async () => {
    const router = await import('../../packages/router/src/index.js');
    assert.ok('createRouter' in router);
    assert.ok('matchPath' in router);
    assert.ok('Router' in router);
    assert.ok('Route' in router);
    assert.ok('Link' in router);

    const http = await import('../../packages/http/src/index.js');
    assert.ok('createResource' in http);
    assert.ok('httpClient' in http);
    assert.ok('createHttpCache' in http);

    const forms = await import('../../packages/forms/src/index.js');
    assert.ok('createForm' in forms);
    assert.ok('createField' in forms);
    assert.ok('validateSchema' in forms);

    const ssr = await import('../../packages/ssr/src/index.js');
    assert.ok('renderToString' in ssr);
    assert.ok('renderToStream' in ssr);
    assert.ok('generateStaticSite' in ssr);

    const testing = await import('../../packages/testing/src/index.js');
    assert.ok('renderTestComponent' in testing);
    assert.ok('fireEvent' in testing);
    assert.ok('waitFor' in testing);

    const devtools = await import('../../packages/devtools/src/index.js');
    assert.ok('initDevTools' in devtools);
    assert.ok('samreyDevToolsBridge' in devtools);

    const cli = await import('../../packages/cli/src/index.js');
    assert.ok('runCLI' in cli);
    assert.ok('generateStarterProject' in cli);
    assert.ok('samreyVitePlugin' in cli);
    assert.strictEqual(cli.CLI_VERSION, '1.0.0');
  });
});
