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

    it('rejects node --input-type code evaluation', async () => {
      await assert.rejects(
        () => executeSafeCommand('node', ['--input-type=module'], tempRoot),
        /prohibited|rejected|not allowed/i
      );
      await assert.rejects(
        () => executeSafeCommand('node', ['--input-type', 'module'], tempRoot),
        /prohibited|rejected|not allowed/i
      );
    });

    it('rejects unauthorized npm subcommands (npm exec, x, install, i, pkg, config, run other)', async () => {
      const unauthorizedNpmArgs = [
        ['exec', 'whoami'],
        ['x', 'cowsay'],
        ['install', 'malicious-pkg'],
        ['i', 'malicious-pkg'],
        ['pkg', 'get', 'name'],
        ['config', 'list'],
        ['run', 'deploy'],
        ['run', 'start'],
        ['publish'],
        ['audit', 'fix']
      ];

      for (const args of unauthorizedNpmArgs) {
        await assert.rejects(
          () => executeSafeCommand('npm', args, tempRoot),
          /prohibited|rejected|not allowed|allowed/i,
          `Should reject unauthorized npm command: npm ${args.join(' ')}`
        );
      }
    });

    it('rejects mutating or unauthorized git subcommands (push, commit, clone, etc.)', async () => {
      const unauthorizedGitArgs = [
        ['commit', '-m', 'evil'],
        ['push', 'origin', 'main'],
        ['clone', 'https://github.com/evil/repo.git'],
        ['reset', '--hard', 'HEAD~1'],
        ['clean', '-fd']
      ];

      for (const args of unauthorizedGitArgs) {
        await assert.rejects(
          () => executeSafeCommand('git', args, tempRoot),
          /prohibited|rejected|not allowed|allowed/i,
          `Should reject unauthorized git subcommand: git ${args.join(' ')}`
        );
      }
    });

    it('rejects git path and arbitrary execution options (--output, --ext-diff, --textconv, --no-index, -O)', async () => {
      const outsideFile = path.join(os.tmpdir(), `samrey-git-diff-out-${Date.now()}`);

      // 1. git diff --output=/tmp/x
      await assert.rejects(
        () => executeSafeCommand('git', ['diff', `--output=${outsideFile}`], tempRoot),
        /prohibited|rejected|not allowed|Security Exception/i
      );
      assert.strictEqual(fs.existsSync(outsideFile), false, 'git diff --output must not create any file');

      // 2. git diff --output /tmp/x
      await assert.rejects(
        () => executeSafeCommand('git', ['diff', '--output', outsideFile], tempRoot),
        /prohibited|rejected|not allowed|Security Exception/i
      );
      assert.strictEqual(fs.existsSync(outsideFile), false, 'git diff --output must not create any file');

      // 3. git diff -O/tmp/x
      await assert.rejects(
        () => executeSafeCommand('git', ['diff', `-O${outsideFile}`], tempRoot),
        /prohibited|rejected|not allowed|Security Exception/i
      );

      // 4. git diff -O /tmp/x
      await assert.rejects(
        () => executeSafeCommand('git', ['diff', '-O', outsideFile], tempRoot),
        /prohibited|rejected|not allowed|Security Exception/i
      );

      // 5. git diff --ext-diff
      await assert.rejects(
        () => executeSafeCommand('git', ['diff', '--ext-diff'], tempRoot),
        /prohibited|rejected|not allowed|Security Exception/i
      );

      // 6. git diff --textconv
      await assert.rejects(
        () => executeSafeCommand('git', ['diff', '--textconv'], tempRoot),
        /prohibited|rejected|not allowed|Security Exception/i
      );

      // 7. git diff --no-index
      await assert.rejects(
        () => executeSafeCommand('git', ['diff', '--no-index', 'a', 'b'], tempRoot),
        /prohibited|rejected|not allowed|Security Exception/i
      );
    });

    it('hardens npm test: rejects "--", flags, --script-shell, outside paths, and >1 extra arg', async () => {
      const insideFile = path.join(tempRoot, 'example.test.js');
      fs.writeFileSync(insideFile, '// test\n');
      const outsideFile = path.join(os.tmpdir(), 'outside.test.js');

      // Rejects "--"
      await assert.rejects(
        () => executeSafeCommand('npm', ['test', '--'], tempRoot),
        /prohibited|rejected|flag|--/i
      );

      // Rejects flags (e.g. --help, -w, --coverage)
      await assert.rejects(
        () => executeSafeCommand('npm', ['test', '--help'], tempRoot),
        /prohibited|rejected|flag/i
      );

      await assert.rejects(
        () => executeSafeCommand('npm', ['test', '-w'], tempRoot),
        /prohibited|rejected|flag/i
      );

      // Rejects --script-shell
      await assert.rejects(
        () => executeSafeCommand('npm', ['test', '--script-shell=/bin/sh'], tempRoot),
        /prohibited|rejected|script-shell|flag/i
      );

      await assert.rejects(
        () => executeSafeCommand('npm', ['run', 'build', '--script-shell=/bin/sh'], tempRoot),
        /prohibited|rejected|script-shell/i
      );

      // Rejects relative test path
      await assert.rejects(
        () => executeSafeCommand('npm', ['test', 'example.test.js'], tempRoot),
        /absolute path|relative/i
      );

      // Rejects path outside project root
      await assert.rejects(
        () => executeSafeCommand('npm', ['test', outsideFile], tempRoot),
        /escapes project root|boundary/i
      );

      // Rejects more than 1 extra argument
      await assert.rejects(
        () => executeSafeCommand('npm', ['test', insideFile, insideFile], tempRoot),
        /at most one extra argument/i
      );
    });

    it('hardens node: allows only "node --test <path inside root>" and rejects other node calls', async () => {
      const insideFile = path.join(tempRoot, 'node-example.test.js');
      fs.writeFileSync(insideFile, 'import { test } from "node:test"; test("ok", () => {});\n');
      const outsideFile = path.join(os.tmpdir(), 'outside-node.test.js');

      // Rejects node without arguments or with arbitrary script execution
      await assert.rejects(
        () => executeSafeCommand('node', [], tempRoot),
        /prohibited|rejected|allowed/i
      );

      await assert.rejects(
        () => executeSafeCommand('node', ['index.js'], tempRoot),
        /prohibited|rejected|allowed/i
      );

      // Rejects node --test with path outside root
      await assert.rejects(
        () => executeSafeCommand('node', ['--test', outsideFile], tempRoot),
        /escapes project root|boundary/i
      );

      // Rejects node --test with relative path
      await assert.rejects(
        () => executeSafeCommand('node', ['--test', 'relative.js'], tempRoot),
        /absolute path|relative/i
      );

      // Allows legitimate node --test <path inside root>
      await assert.doesNotReject(
        () => executeSafeCommand('node', ['--test', insideFile], tempRoot)
      );
    });

    it('allows legitimate npm and git commands', async () => {
      // Legitimate read-only git command
      const gitRes = await executeSafeCommand('git', ['status'], tempRoot);
      assert.equal(typeof gitRes.exitCode, 'number');

      // Legitimate npm subcommands: test without args, test with inside absolute path, run build, run typecheck
      const safeTestFile = path.join(tempRoot, 'sample.test.js');
      fs.writeFileSync(safeTestFile, '// test\n');

      await assert.doesNotReject(
        () => executeSafeCommand('npm', ['test'], tempRoot)
      );

      await assert.doesNotReject(
        () => executeSafeCommand('npm', ['test', safeTestFile], tempRoot)
      );

      await assert.doesNotReject(
        () => executeSafeCommand('npm', ['run', 'build'], tempRoot)
      );
    });

    it('F-11: rejects extra args after npm run and mutating git branch invocations', async () => {
      await assert.rejects(
        () => executeSafeCommand('npm', ['run', 'build', '--', '--exec', 'whoami'], tempRoot),
        /prohibited|extra arguments/i
      );

      await assert.rejects(
        () => executeSafeCommand('npm', ['run', 'typecheck', '--prefix', outsideDir], tempRoot),
        /prohibited|extra arguments/i
      );

      for (const branchArgs of [
        ['branch', 'new-evil-branch'],
        ['branch', '-D', 'main'],
        ['branch', '-d', 'main'],
        ['branch', '-m', 'main', 'hijacked'],
        ['branch', '-l', 'new-reflog-branch'],
        ['branch', '--edit-description']
      ]) {
        await assert.rejects(
          () => executeSafeCommand('git', branchArgs, tempRoot),
          /prohibited/i,
          `Must reject mutating git branch args: ${branchArgs.join(' ')}`
        );
      }

      const showCurrent = await executeSafeCommand('git', ['branch', '--show-current'], tempRoot);
      assert.equal(typeof showCurrent.exitCode, 'number');
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

    it('redacts Slack tokens (xox[abprs]-...)', () => {
      const samples = [
        'Bot token: xoxb-1234567890-1234567890-abcdef123456',
        'User token: xoxp-9876543210-9876543210-fedcba654321',
        'App token: xoxa-2-1111222233-4444555566-abcdef987654',
        'Refresh token: xoxr-1234567890-abcdef1234567890',
        'Slash command token: xoxs-9988776655-aabbccddeeff'
      ];

      for (const sample of samples) {
        const redacted = redactSecrets(sample);
        assert.ok(!redacted.includes('xoxb-'));
        assert.ok(!redacted.includes('xoxp-'));
        assert.ok(!redacted.includes('xoxa-'));
        assert.ok(!redacted.includes('xoxr-'));
        assert.ok(!redacted.includes('xoxs-'));
        assert.ok(redacted.includes('[REDACTED_SECRET]'));
      }
    });

    it('redacts Stripe API keys (sk_live_, sk_test_, rk_live_, pk_live_)', () => {
      const dummyId = '51A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P';
      const samples = [
        `Stripe secret live: ${['sk', 'live', dummyId].join('_')}`,
        `Stripe secret test: ${['sk', 'test', dummyId].join('_')}`,
        `Stripe restricted live: ${['rk', 'live', dummyId].join('_')}`,
        `Stripe publishable live: ${['pk', 'live', dummyId].join('_')}`
      ];

      for (const sample of samples) {
        const redacted = redactSecrets(sample);
        assert.ok(!redacted.includes(['sk', 'live'].join('_')));
        assert.ok(!redacted.includes(['sk', 'test'].join('_')));
        assert.ok(!redacted.includes(['rk', 'live'].join('_')));
        assert.ok(!redacted.includes(['pk', 'live'].join('_')));
        assert.ok(redacted.includes('[REDACTED_SECRET]'));
      }
    });

    it('redacts bare JWTs (eyJ....eyJ....signature)', () => {
      const bareJwt = 'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c in header';

      const redacted = redactSecrets(bareJwt);
      assert.ok(!redacted.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'));
      assert.ok(!redacted.includes('eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ'));
      assert.ok(redacted.includes('[REDACTED_SECRET]'));
    });

    it('redacts Azure connection strings (AccountKey=...) and standalone AccountKey values', () => {
      const connStr = 'DefaultEndpointsProtocol=https;AccountName=samreystorage;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;EndpointSuffix=core.windows.net';
      const redacted = redactSecrets(connStr);
      assert.ok(!redacted.includes('Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=='));
      assert.ok(redacted.includes('AccountKey=[REDACTED_SECRET]'));
      assert.ok(redacted.includes('AccountName=samreystorage'));

      const standalone = 'AccountKey="bXljdXN0b21rZXkxMjM0NTY3ODkwMTI="';
      const redactedStandalone = redactSecrets(standalone);
      assert.ok(!redactedStandalone.includes('bXljdXN0b21rZXkxMjM0NTY3ODkwMTI='));
      assert.ok(redactedStandalone.includes('AccountKey=[REDACTED_SECRET]'));
    });

    it('redacts SendGrid API keys (SG.xxx.yyy)', () => {
      const samples = [
        'SendGrid key: SG.9a8b7c6d5e4f3a2b1c0d9e.1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2',
        'SG_KEY=SG.abcdefghijklmnopqrstuvwxyz.1234567890abcdefghijklmnopqrstuvwxyz1234567890'
      ];
      for (const sample of samples) {
        const redacted = redactSecrets(sample);
        assert.ok(!redacted.includes('9a8b7c6d5e4f3a2b1c0d9e'));
        assert.ok(!redacted.includes('1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2'));
        assert.ok(!redacted.includes('abcdefghijklmnopqrstuvwxyz'));
        assert.ok(redacted.includes('[REDACTED_SECRET]'));
      }
    });

    it('redacts Twilio Account SIDs and API Key secrets (AC/SK + 32 hex)', () => {
      const twilioAccountSid = ['AC', '0123456789abcdef0123456789abcdef'].join('');
      const twilioApiKey = ['SK', 'fedcba9876543210fedcba9876543210'].join('');
      const text = `Twilio SID: ${twilioAccountSid}, API Key: ${twilioApiKey}`;

      const redacted = redactSecrets(text);
      assert.ok(!redacted.includes(twilioAccountSid));
      assert.ok(!redacted.includes(twilioApiKey));
      assert.ok(redacted.includes('[REDACTED_SECRET]'));
    });

    it('redacts Docker config "auth" values', () => {
      const dockerConfig = JSON.stringify({
        auths: {
          'https://index.docker.io/v1/': {
            auth: 'dXNlcm5hbWU6c3VwZXJzZWNyZXRwYXNzd29yZA==',
            email: 'user@example.com'
          }
        }
      }, null, 2);

      const redacted = redactSecrets(dockerConfig);
      assert.ok(!redacted.includes('dXNlcm5hbWU6c3VwZXJzZWNyZXRwYXNzd29yZA=='));
      assert.ok(redacted.includes('"auth": "[REDACTED_SECRET]"'));
      assert.ok(redacted.includes('user@example.com'));
    });

    it('produces no false positive on ordinary technical prose', () => {
      const prose = [
        'Samrey uses fine-grained reactivity with signals and computed values. The component renders a button and lists items with For({ each: () => items.value, key: i => i.id }).',
        'We deploy the application to Azure Storage using standard blob storage containers and CDN rules.',
        'Emails are dispatched via the SendGrid service using transactional email templates and webhooks.',
        'SMS notifications are routed through Twilio messaging services with callback status webhooks.',
        'Docker configuration specifies registry endpoints and authentication policies for containers.'
      ].join('\n');
      const redacted = redactSecrets(prose);
      assert.equal(redacted, prose, 'Ordinary documentation and code prose must not be altered');
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
