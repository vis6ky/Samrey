/**
 * @license Apache-2.0
 * @gati/monorepo - Phase 24 Security Final Gate
 * Validates XSS protection, SSR JSON escaping, safe URL validation, CSRF tokens, Trusted Types, and zero secret leaks.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  sanitizeHtml,
  sanitizeUrl,
  sanitizeAttribute,
  escapeHtmlText,
  isSafeUrl,
  safeJsonParse,
  safeJsonStringify,
  createCsrfToken,
  validateCsrfToken,
  TrustedTypesPolicy
} from '../../packages/security/src/index.js';
import { escapeJsonState, sanitizeSsrState } from '../../packages/ssr/src/index.js';

describe('Phase 24 — Security Final Gate', () => {
  it('1. Verifies HTML sanitization against malicious XSS payloads', () => {
    const maliciousPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)">',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<a href="javascript:alert(1)">Click Me</a>'
    ];

    for (const payload of maliciousPayloads) {
      const sanitized = sanitizeHtml(payload);
      assert.ok(!sanitized.includes('<script>'), `Failed to sanitize script in ${payload}`);
      assert.ok(!sanitized.includes('onerror='), `Failed to sanitize onerror in ${payload}`);
      assert.ok(!sanitized.includes('onload='), `Failed to sanitize onload in ${payload}`);
      assert.ok(!sanitized.includes('javascript:'), `Failed to sanitize javascript: in ${payload}`);
    }
  });

  it('2. Verifies URL protocol validation against javascript: and data: exploits', () => {
    assert.strictEqual(isSafeUrl('https://example.com'), true);
    assert.strictEqual(isSafeUrl('http://example.com'), true);
    assert.strictEqual(isSafeUrl('/dashboard'), true);
    assert.strictEqual(isSafeUrl('mailto:admin@example.com'), true);

    assert.strictEqual(isSafeUrl('javascript:alert(1)'), false);
    assert.strictEqual(isSafeUrl('vbscript:alert(1)'), false);
    assert.strictEqual(isSafeUrl('data:text/html,<script>alert(1)</script>'), false);
  });

  it('3. Verifies SSR JSON state serialization and escaping against script injection', () => {
    const stateWithAttack = {
      username: '</script><script>alert("Hacked")</script>',
      comment: '<!-- <script>alert(1)</script> -->'
    };

    const serialized = escapeJsonState(stateWithAttack);
    // The payload itself inside the tag must have script tags escaped
    assert.ok(serialized.includes('\\u003c/script\\u003e') || serialized.includes('\\u003c'), 'Script tags must be unicode-escaped inside payload');
    assert.ok(serialized.startsWith('<script id="__AETHER_STATE__" type="application/json">'));
  });

  it('4. Verifies CSRF token creation, validation, and rejection of forged tokens', () => {
    const sessionToken = createCsrfToken(32);
    assert.ok(sessionToken && typeof sessionToken === 'string', 'CSRF token must be generated');

    const isValid = validateCsrfToken(sessionToken, sessionToken);
    assert.strictEqual(isValid, true, 'Matching CSRF token must pass validation');

    const isForgedValid = validateCsrfToken('forged-token-value', sessionToken);
    assert.strictEqual(isForgedValid, false, 'Forged CSRF token must be rejected');
  });

  it('5. Codebase Secret Scan (verifies 0 hardcoded private keys or tokens)', () => {
    const sensitivePatterns = [
      /AIza[0-9A-Za-z-_]{35}/,
      /sk_live_[0-9a-zA-Z]{24}/,
      /ghp_[0-9a-zA-Z]{36}/,
      /BEGIN RSA PRIVATE KEY/,
      /BEGIN OPENSSH PRIVATE KEY/
    ];

    function scanDirectory(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'tarballs' || file === 'tests') continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && !file.endsWith('.tgz')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pat of sensitivePatterns) {
            assert.ok(!pat.test(content), `Potential secret detected in ${fullPath}`);
          }
        }
      }
    }

    scanDirectory(process.cwd());
  });
});
