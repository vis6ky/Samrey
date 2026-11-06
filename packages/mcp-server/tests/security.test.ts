/**
 * @license Apache-2.0
 * @samrey/mcp-server - Security Hardening Test Suite
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  resolveSafePath,
  executeSafeCommand,
  redactSecrets
} from '../src/security.js';
import { handleToolCall, ToolContext } from '../src/tools.js';
import { SamreyMcpServer } from '../src/server.js';
import { MCP_ERROR_CODES } from '../src/protocol.js';

describe('MCP Server Security & Hardening', () => {
  let tempRoot: string;
  let siblingDir: string;
  let outsideDir: string;

  before(() => {
    // Setup isolated directory structure
    const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-mcp-sec-')));
    tempRoot = path.join(base, 'proj');
    siblingDir = path.join(base, 'proj-evil');
    outsideDir = path.join(base, 'outside');

    fs.mkdirSync(tempRoot, { recursive: true });
    fs.mkdirSync(siblingDir, { recursive: true });
    fs.mkdirSync(outsideDir, { recursive: true });

    fs.writeFileSync(path.join(outsideDir, 'secret.txt'), 'SUPER_SECRET_DATA');
    fs.writeFileSync(path.join(siblingDir, 'hack.txt'), 'SIBLING_HACK');

    // Create a symlink inside project pointing outside
    try {
      fs.symlinkSync(outsideDir, path.join(tempRoot, 'symlink-outside'), 'dir');
    } catch {}

    // Create nested symlinks pointing outside
    try {
      const subDir = path.join(tempRoot, 'sub');
      fs.mkdirSync(subDir, { recursive: true });
      fs.symlinkSync(path.join(tempRoot, 'symlink-outside'), path.join(subDir, 'nested-link'), 'dir');
    } catch {}
  });

  after(() => {
    if (tempRoot) {
      try {
        const base = path.dirname(tempRoot);
        fs.rmSync(base, { recursive: true, force: true });
      } catch {}
    }
  });

  // =========================================================================
  // a. resolveSafePath
  // =========================================================================
  describe('a. resolveSafePath hardening', () => {
    it('rejects sibling-prefix escape paths (../proj-evil/hack.txt)', () => {
      assert.throws(
        () => resolveSafePath(tempRoot, '../proj-evil/hack.txt'),
        /escapes project root/i
      );
    });

    it('rejects absolute paths pointing to sibling-prefix directory (/tmp/.../proj-evil/hack.txt)', () => {
      assert.throws(
        () => resolveSafePath(tempRoot, path.join(siblingDir, 'hack.txt')),
        /escapes project root/i
      );
    });

    it('rejects absolute paths outside project root (/tmp/outside/secret.txt)', () => {
      assert.throws(
        () => resolveSafePath(tempRoot, path.join(outsideDir, 'secret.txt')),
        /escapes project root/i
      );
    });

    it('rejects symlinks inside project pointing outside', () => {
      const targetInLink = path.join(tempRoot, 'symlink-outside', 'secret.txt');
      assert.throws(
        () => resolveSafePath(tempRoot, targetInLink),
        /escapes project root/i
      );
    });

    it('rejects nested symlinks inside project pointing outside', () => {
      const nestedTarget = path.join(tempRoot, 'sub', 'nested-link', 'secret.txt');
      assert.throws(
        () => resolveSafePath(tempRoot, nestedTarget),
        /escapes project root/i
      );
    });

    it('rejects backslash directory traversal variants (..\\proj-evil\\x)', () => {
      assert.throws(
        () => resolveSafePath(tempRoot, '..\\proj-evil\\hack.txt'),
        /escapes project root/i
      );
    });

    it('rejects NUL bytes in relative paths', () => {
      assert.throws(
        () => resolveSafePath(tempRoot, 'src/valid.ts\0../../etc/passwd'),
        /NUL|null byte|escapes/i
      );
    });

    it('allows valid existing and non-existing safe target paths within root', () => {
      const safePath = resolveSafePath(tempRoot, 'src/components/MyComp.ts');
      assert.ok(safePath.startsWith(tempRoot));
      assert.ok(!path.relative(tempRoot, safePath).startsWith('..'));
    });
  });

  // =========================================================================
  // b. Generate Tools Validation & Restrictions
  // =========================================================================
  describe('b. Generate tools validation and restrictions', () => {
    const ctx: ToolContext = { projectRoot: '' };

    before(() => {
      ctx.projectRoot = tempRoot;
      fs.mkdirSync(path.join(tempRoot, 'src', 'components'), { recursive: true });
    });

    it('validates component name with /^[A-Za-z_][A-Za-z0-9_]*$/ and length limit', async () => {
      const invalidNames = [
        '../../EvilComp',
        'Bad-Name',
        '123NumericStart',
        'eval(1)',
        'Comp; rm -rf /',
        'A'.repeat(101)
      ];

      for (const name of invalidNames) {
        const res = await handleToolCall('samrey_generate_component', { name }, ctx);
        assert.equal(res.isError, true, `Should reject invalid component name: "${name}"`);
        assert.ok(
          res.content[0].text.toLowerCase().includes('name') ||
          res.content[0].text.toLowerCase().includes('invalid')
        );
      }
    });

    it('refuses to overwrite existing file unless args.overwrite === true', async () => {
      const filePath = 'src/components/Existing.ts';
      const absPath = path.join(tempRoot, filePath);
      fs.writeFileSync(absPath, '// original content');

      // Attempt 1: without overwrite flag
      const res1 = await handleToolCall(
        'samrey_generate_component',
        { name: 'Existing', targetPath: filePath },
        ctx
      );
      assert.equal(res1.isError, true);
      assert.ok(res1.content[0].text.includes('Refusing to overwrite') || res1.content[0].text.includes('overwrite'));
      assert.equal(fs.readFileSync(absPath, 'utf8'), '// original content');

      // Attempt 2: with overwrite: true
      const res2 = await handleToolCall(
        'samrey_generate_component',
        { name: 'Existing', targetPath: filePath, overwrite: true },
        ctx
      );
      assert.ok(!res2.isError);
      assert.ok(fs.readFileSync(absPath, 'utf8').includes('Existing'));
    });

    it('restricts targetPath to allowed source directories and refuses sensitive files', async () => {
      const forbiddenTargets = [
        'package.json',
        'package-lock.json',
        'pnpm-lock.yaml',
        'yarn.lock',
        'bun.lockb',
        '.git/config',
        '.git/hooks/pre-commit',
        '.github/workflows/ci.yml',
        'vite.config.ts',
        'tsconfig.json',
        'node_modules/malicious/index.js',
        'root-script.js'
      ];

      for (const targetPath of forbiddenTargets) {
        const res = await handleToolCall(
          'samrey_generate_component',
          { name: 'TestComp', targetPath },
          ctx
        );
        assert.equal(res.isError, true, `Should refuse forbidden target: "${targetPath}"`);
      }
    });

    it('rejects dangling symlink pointing to missing file outside the root', async () => {
      const missingOutsideFile = path.join(outsideDir, 'not-yet.ts');
      const danglingOutsideLink = path.join(tempRoot, 'src', 'dangling-outside.ts');
      try { fs.unlinkSync(danglingOutsideLink); } catch {}
      try { fs.unlinkSync(missingOutsideFile); } catch {}
      fs.symlinkSync(missingOutsideFile, danglingOutsideLink);

      // 1. resolveSafePath must throw
      assert.throws(
        () => resolveSafePath(tempRoot, 'src/dangling-outside.ts'),
        /escapes project root/i
      );

      // 2. samrey_generate_component must fail and not create the outside file
      const res = await handleToolCall(
        'samrey_generate_component',
        { name: 'DanglingEsc', targetPath: 'src/dangling-outside.ts' },
        ctx
      );
      assert.equal(res.isError, true);
      assert.equal(fs.existsSync(missingOutsideFile), false, 'Must not create missing file outside root');
    });

    it('allows dangling symlink pointing to missing file inside the root', () => {
      const missingInsideFile = path.join(tempRoot, 'src', 'components', 'Future.ts');
      const danglingInsideLink = path.join(tempRoot, 'src', 'dangling-inside.ts');
      try { fs.unlinkSync(danglingInsideLink); } catch {}
      try { fs.unlinkSync(missingInsideFile); } catch {}
      fs.symlinkSync(missingInsideFile, danglingInsideLink);

      assert.doesNotThrow(() => {
        const resolved = resolveSafePath(tempRoot, 'src/dangling-inside.ts');
        assert.ok(resolved.startsWith(tempRoot));
      });
    });

    it('rejects symlink pointing to an existing file outside the root and never overwrites it', async () => {
      const outsideFile = path.join(outsideDir, 'secret.txt');
      const linkToOutside = path.join(tempRoot, 'src', 'link-to-secret.ts');
      try { fs.unlinkSync(linkToOutside); } catch {}
      fs.symlinkSync(outsideFile, linkToOutside);

      // resolveSafePath must throw
      assert.throws(
        () => resolveSafePath(tempRoot, 'src/link-to-secret.ts'),
        /escapes project root/i
      );

      // Even with overwrite: true, must refuse and must not modify secret.txt
      const originalSecret = fs.readFileSync(outsideFile, 'utf8');
      const res = await handleToolCall(
        'samrey_generate_component',
        { name: 'SecretHacker', targetPath: 'src/link-to-secret.ts', overwrite: true },
        ctx
      );
      assert.equal(res.isError, true);
      assert.equal(fs.readFileSync(outsideFile, 'utf8'), originalSecret, 'Must not overwrite outside file');
    });

    it('prevents file writing when directory is swapped for a symlink pointing outside', async () => {
      const swappableDir = path.join(tempRoot, 'src', 'swappable');
      fs.mkdirSync(swappableDir, { recursive: true });

      // Before swap: resolveSafePath was valid
      const targetPath = 'src/swappable/Comp.ts';
      assert.doesNotThrow(() => resolveSafePath(tempRoot, targetPath));

      // Attacker swaps directory with symlink to outsideDir
      fs.rmSync(swappableDir, { recursive: true, force: true });
      fs.symlinkSync(outsideDir, swappableDir);

      // Writing must fail and must not create file in outsideDir
      const res = await handleToolCall(
        'samrey_generate_component',
        { name: 'SwappedComp', targetPath },
        ctx
      );
      assert.equal(res.isError, true);
      assert.equal(
        fs.existsSync(path.join(outsideDir, 'Comp.ts')),
        false,
        'File must not land outside project root when directory was swapped'
      );
    });
  });

  // =========================================================================
  // c. samrey_run_tests / samrey_build_project Opt-In Execution Guard
  // =========================================================================
  describe('c. samrey_run_tests and build opt-in flag', () => {
    it('refuses execution by default when SAMREY_MCP_ALLOW_EXEC is not set', async () => {
      const savedEnv = process.env.SAMREY_MCP_ALLOW_EXEC;
      delete process.env.SAMREY_MCP_ALLOW_EXEC;

      try {
        const ctx: ToolContext = { projectRoot: tempRoot, allowExec: false };

        const testRes = await handleToolCall('samrey_run_tests', {}, ctx);
        assert.equal(testRes.isError, true);
        assert.ok(testRes.content[0].text.includes('SAMREY_MCP_ALLOW_EXEC'));

        const buildRes = await handleToolCall('samrey_build_project', {}, ctx);
        assert.equal(buildRes.isError, true);
        assert.ok(buildRes.content[0].text.includes('SAMREY_MCP_ALLOW_EXEC'));
      } finally {
        if (savedEnv !== undefined) {
          process.env.SAMREY_MCP_ALLOW_EXEC = savedEnv;
        }
      }
    });
  });

  // =========================================================================
  // d. executeSafeCommand Hardening
  // =========================================================================
  describe('d. executeSafeCommand hardening', () => {
    it('rejects paths with allowed basenames (e.g. /bin/node, ./npm)', async () => {
      await assert.rejects(
        () => executeSafeCommand('/bin/node', [], tempRoot),
        /path separators|bare executable name/i
      );

      await assert.rejects(
        () => executeSafeCommand('./npm', [], tempRoot),
        /path separators|bare executable name/i
      );
    });

    it('rejects node code evaluation arguments (-e, --eval, --import)', async () => {
      await assert.rejects(
        () => executeSafeCommand('node', ['-e', 'process.exit(1)'], tempRoot),
        /prohibited|rejected|not allowed/i
      );

      await assert.rejects(
        () => executeSafeCommand('node', ['--eval', '1+1'], tempRoot),
        /prohibited|rejected|not allowed/i
      );

      await assert.rejects(
        () => executeSafeCommand('node', ['--import', 'malicious.js'], tempRoot),
        /prohibited|rejected|not allowed/i
      );
    });

    it('rejects npx binary completely', async () => {
      await assert.rejects(
        () => executeSafeCommand('npx', ['-y', 'malicious-pkg'], tempRoot),
        /not in the allowed binaries/i
      );
    });

    it('rejects git config overrides (-c, --upload-pack)', async () => {
      await assert.rejects(
        () => executeSafeCommand('git', ['-c', 'core.fsmonitor=true', 'status'], tempRoot),
        /prohibited|rejected|not allowed/i
      );

      await assert.rejects(
        () => executeSafeCommand('git', ['--upload-pack=evil', 'fetch'], tempRoot),
        /prohibited|rejected|not allowed/i
      );
    });
  });

  // =========================================================================
  // e. redactSecrets Hardening
  // =========================================================================
  describe('e. redactSecrets comprehensive coverage', () => {
    it('redacts JSON-style keys ("password": "...")', () => {
      const json = '{"user": "admin", "password": "supersecretpassword123", "api_key": "xyz_api_key"}';
      const redacted = redactSecrets(json);
      assert.ok(!redacted.includes('supersecretpassword123'));
      assert.ok(!redacted.includes('xyz_api_key'));
      assert.ok(redacted.includes('[REDACTED_SECRET]'));
    });

    it('redacts .env assignments for names containing PASSWORD, SECRET, TOKEN, KEY', () => {
      const env = `
DB_PASSWORD=my_database_password
APP_SECRET='very_secret_signing_phrase'
API_TOKEN="ghp_exampleTokenString"
SECRET_KEY=123456789
PUBLIC_PORT=3000
`;
      const redacted = redactSecrets(env);
      assert.ok(!redacted.includes('my_database_password'));
      assert.ok(!redacted.includes('very_secret_signing_phrase'));
      assert.ok(redacted.includes('PUBLIC_PORT=3000'));
    });

    it('redacts AWS AKIA and ASIA access key IDs', () => {
      const sample = 'Found credentials AKIAIOSFODNN7EXAMPLE and ASIAIOSFODNN7EXAMPLE in config';
      const redacted = redactSecrets(sample);
      assert.ok(!redacted.includes('AKIAIOSFODNN7EXAMPLE'));
      assert.ok(!redacted.includes('ASIAIOSFODNN7EXAMPLE'));
      assert.ok(redacted.includes('[REDACTED_SECRET]'));
    });

    it('redacts GitHub personal access and fine-grained tokens', () => {
      const sample = 'Tokens github_pat_11AAAAAAA0000000000000_1234567890abcdef and ghs_12345678901234567890';
      const redacted = redactSecrets(sample);
      assert.ok(!redacted.includes('github_pat_11AAAAAAA0000000000000_1234567890abcdef'));
      assert.ok(!redacted.includes('ghs_12345678901234567890'));
      assert.ok(redacted.includes('[REDACTED_SECRET]'));
    });

    it('redacts npm publishing tokens', () => {
      const sample = 'Logged in with npm_abcdef1234567890abcdef12345678901234';
      const redacted = redactSecrets(sample);
      assert.ok(!redacted.includes('npm_abcdef1234567890abcdef12345678901234'));
      assert.ok(redacted.includes('[REDACTED_SECRET]'));
    });

    it('redacts PEM private key blocks', () => {
      const pem = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y1+abcdefghijklmnopqrstuvwxyz1234567890
-----END RSA PRIVATE KEY-----`;
      const redacted = redactSecrets(pem);
      assert.ok(!redacted.includes('MIIEowIBAAKCAQEA0Y1+abcdefghijklmnopqrstuvwxyz1234567890'));
      assert.ok(redacted.includes('[REDACTED_SECRET]'));
    });

    it('redacts basic-auth credentials from URLs', () => {
      const url = 'Connected to https://myuser:secretpass123@git.example.com/repo.git';
      const redacted = redactSecrets(url);
      assert.ok(!redacted.includes('secretpass123'));
      assert.ok(redacted.includes('[REDACTED_SECRET]'));
    });
  });

  // =========================================================================
  // f. JSON-RPC Protocol & Argument Validation
  // =========================================================================
  describe('f. JSON-RPC protocol & argument validation', () => {
    let server: SamreyMcpServer;

    before(() => {
      server = new SamreyMcpServer({ projectRoot: tempRoot });
    });

    it('rejects tools/call prior to initialization with clear error', async () => {
      const uninitServer = new SamreyMcpServer({ projectRoot: tempRoot });
      const res = await uninitServer.handleMessage({
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: { name: 'samrey_search_docs', arguments: { query: 'signals' } }
      });
      assert.ok(res?.error, 'Must return error when not initialized');
      assert.ok(res?.error?.message.includes('initialize'));
    });

    it('rejects non-object tool arguments with -32602 (INVALID_PARAMS)', async () => {
      // First initialize
      await server.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
      });

      // Call tool with string arguments instead of object
      const res1 = await server.handleMessage({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'samrey_search_docs', arguments: 'not-an-object' as any }
      });
      assert.equal(res1?.error?.code, MCP_ERROR_CODES.INVALID_PARAMS);

      // Call tool with array arguments
      const res2 = await server.handleMessage({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'samrey_search_docs', arguments: ['array'] as any }
      });
      assert.equal(res2?.error?.code, MCP_ERROR_CODES.INVALID_PARAMS);
    });

    it('never responds to notifications (requests without id)', async () => {
      // Notification without id
      const res = await server.handleMessage({
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      });
      assert.equal(res, null, 'Must never respond to notifications');

      // Invalid request notification without id
      const resErrorNotification = await server.handleMessage({
        jsonrpc: '2.0',
        method: 'nonexistent/method'
      });
      assert.equal(resErrorNotification, null, 'Must not return error response for notification');
    });
  });
});
