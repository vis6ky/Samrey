/**
 * @license Apache-2.0
 * @samrey/mcp-server - Security Boundaries & Path Sandboxing
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { spawn } from 'node:child_process';

const ALLOWED_BARE_BINARIES = new Set(['npm', 'node', 'git']);

const FORBIDDEN_ARG_PATTERNS: Record<string, Array<RegExp | string>> = {
  npm: [
    /^--script-shell(=|$)/
  ],
  node: [
    /^-e$/,
    /^--eval$/,
    /^-p$/,
    /^--print$/,
    /^--import(=|$)/,
    /^--loader(=|$)/,
    /^-r$/,
    /^--require(=|$)/,
    /^--input-type(=|$)/
  ],
  git: [
    /^-c.*/,
    /^--upload-pack(=|$)/,
    /^--receive-pack(=|$)/,
    /^--exec-path(=|$)/,
    /^--config-env(=|$)/,
    /^--output(=|$)/,
    /^--output-directory(=|$)/,
    /^--ext-diff$/,
    /^--textconv$/,
    /^--no-index$/,
    /^-O.*$/,
    /^--work-tree(=|$)/,
    /^--git-dir(=|$)/,
    /^--template(=|$)/,
    /^--separate-git-dir(=|$)/,
    /^--attr-source(=|$)/,
    /^--src-prefix(=|$)/,
    /^--dst-prefix(=|$)/,
    /^--line-prefix(=|$)/
  ]
};

const GIT_ALLOWED_READ_ONLY_SUBCOMMANDS = new Set([
  'status',
  'log',
  'diff',
  'rev-parse',
  'branch',
  'describe',
  'show'
]);

const GIT_BRANCH_ALLOWED_READ_ONLY_FLAGS = new Set([
  '--show-current',
  '-a',
  '--all',
  '-r',
  '--remotes',
  '--list',
  '-v',
  '-vv',
  '--verbose',
  '--no-color'
]);

const NPM_ALLOWED_RUN_SCRIPTS = new Set(['build', 'typecheck']);

export function redactSecrets(text: string): string {
  if (!text) return text;
  let result = text;

  // 1. PEM private key blocks
  result = result.replace(
    /-----BEGIN[ A-Z0-9_-]*PRIVATE KEY-----[\s\S]*?-----END[ A-Z0-9_-]*PRIVATE KEY-----/g,
    '[REDACTED_SECRET]'
  );

  // 2. Basic-auth credentials in URLs (e.g. https://user:pass@host)
  result = result.replace(
    /([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)[^/:\s@]+:[^/@\s]+@/g,
    '$1[REDACTED_SECRET]@'
  );

  // 3. JSON-style keys with secrets ("password": "...", "api_key": "...")
  result = result.replace(
    /"([a-zA-Z0-9_]*(?:password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key)[a-zA-Z0-9_]*)"\s*:\s*"[^"]+"/gi,
    '"$1": "[REDACTED_SECRET]"'
  );

  // 4. .env assignments (KEY=value for names containing PASSWORD, SECRET, TOKEN, KEY)
  result = result.replace(
    /(^|[\r\n])\s*(export\s+)?([A-Za-z0-9_]*(?:PASSWORD|SECRET|TOKEN|KEY)[A-Za-z0-9_]*)\s*=\s*(?:'[^']*'|"[^"]*"|[^\s\r\n]+)/gim,
    '$1$2$3=[REDACTED_SECRET]'
  );

  // 5. AWS AKIA and ASIA credentials
  result = result.replace(/\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, '[REDACTED_SECRET]');

  // 6. GitHub tokens (fine-grained and classic personal access / workflow / server tokens)
  result = result.replace(
    /\b(github_pat_[a-zA-Z0-9_]{22,}|gh[pousr]_[A-Za-z0-9_]{20,})\b/g,
    '[REDACTED_SECRET]'
  );

  // 7. npm publishing tokens
  result = result.replace(/\bnpm_[A-Za-z0-9]{36}\b/g, '[REDACTED_SECRET]');

  // 8. Bearer Authorization headers
  result = result.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_SECRET]');

  // 9. Standard AI API keys (OpenAI sk-, Google AIza)
  result = result.replace(/AIza[0-9A-Za-z\-_]{10,}/g, '[REDACTED_SECRET]');
  result = result.replace(/sk-[a-zA-Z0-9_\-]{10,}/g, '[REDACTED_SECRET]');

  // 10. Slack tokens (xox[abprs]-...)
  result = result.replace(/\bxox[abprs]-[A-Za-z0-9_\-]{8,}\b/g, '[REDACTED_SECRET]');

  // 11. Stripe API keys (sk_live_, sk_test_, rk_live_, pk_live_)
  result = result.replace(/\b(?:sk|rk|pk)_(?:live|test)_[a-zA-Z0-9]{10,}\b/g, '[REDACTED_SECRET]');

  // 12. Bare JWT tokens (eyJ....eyJ....signature)
  result = result.replace(/\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_SECRET]');

  // 13. Azure connection strings (AccountKey=...)
  result = result.replace(/\bAccountKey\s*=\s*(?:'[^']*'|"[^"]*"|[A-Za-z0-9+/=]{16,})/gi, 'AccountKey=[REDACTED_SECRET]');

  // 14. SendGrid API keys (SG.xxx.yyy)
  result = result.replace(/\bSG\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_SECRET]');

  // 15. Twilio Account SIDs and API Key secrets (AC/SK + 32 hex)
  result = result.replace(/\b(?:AC|SK)[0-9a-fA-F]{32}\b/g, '[REDACTED_SECRET]');

  // 16. Docker config "auth" values
  result = result.replace(/"auth"\s*:\s*"[^"]+"/gi, '"auth": "[REDACTED_SECRET]"');

  return result;
}

export function resolveSafePath(projectRoot: string, relativePath: string): string {
  if (typeof relativePath !== 'string' || relativePath.includes('\0')) {
    throw new Error(`Security Exception: Path contains invalid or NUL bytes.`);
  }

  const resolvedRoot = path.resolve(projectRoot);
  if (!fs.existsSync(resolvedRoot)) {
    throw new Error(`Security Exception: Project root "${resolvedRoot}" does not exist.`);
  }
  const realRoot = fs.realpathSync.native ? fs.realpathSync.native(resolvedRoot) : fs.realpathSync(resolvedRoot);

  // Normalize slashes (handling Windows ..\ variants) and Unicode NFC
  const cleanRel = relativePath.replace(/\\/g, '/').normalize('NFC');

  const resolvedTarget = path.isAbsolute(cleanRel)
    ? path.resolve(cleanRel)
    : path.resolve(realRoot, cleanRel);

  // Initial lexical boundary check
  const lexicalRel = path.relative(realRoot, resolvedTarget);
  if (lexicalRel.startsWith('..') || path.isAbsolute(lexicalRel)) {
    throw new Error(`Security Exception: Path "${relativePath}" escapes project root boundary "${realRoot}".`);
  }

  // Walk and lstat every existing path component from realRoot down to resolvedTarget.
  // If any component is a symlink (dangling or not), resolve it with readlink and require
  // the resolved target to be inside the real root; treat a dangling link whose target
  // is outside as a violation.
  const segments = lexicalRel.split(path.sep).filter(Boolean);
  let current = realRoot;

  for (let i = 0; i < segments.length; i++) {
    const nextPath = path.join(current, segments[i]);

    let stat: fs.Stats | null = null;
    try {
      stat = fs.lstatSync(nextPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
      // Component does not exist on disk.
      // Verify remaining path doesn't escape root.
      const remainingRel = path.relative(realRoot, path.join(current, ...segments.slice(i)));
      if (remainingRel.startsWith('..') || path.isAbsolute(remainingRel)) {
        throw new Error(`Security Exception: Path "${relativePath}" escapes project root boundary "${realRoot}".`);
      }
      current = nextPath;
      continue;
    }

    if (stat.isSymbolicLink()) {
      // Resolve the symlink target (handle chains up to limit)
      let linkTarget = nextPath;
      let depth = 0;
      while (depth < 40) {
        let linkStat: fs.Stats | null = null;
        try {
          linkStat = fs.lstatSync(linkTarget);
        } catch (err: any) {
          if (err.code !== 'ENOENT') throw err;
          // Dangling link reached!
          break;
        }
        if (!linkStat || !linkStat.isSymbolicLink()) {
          break;
        }
        depth++;
        const rawTarget = fs.readlinkSync(linkTarget);
        linkTarget = path.resolve(path.dirname(linkTarget), rawTarget);

        const relCheck = path.relative(realRoot, linkTarget);
        if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) {
          throw new Error(
            `Security Exception: Path "${relativePath}" escapes project root boundary "${realRoot}" via symlink.`
          );
        }
      }

      if (depth >= 40) {
        throw new Error(`Security Exception: Symlink loop detected.`);
      }

      // Check final link target location
      const finalRel = path.relative(realRoot, linkTarget);
      if (finalRel.startsWith('..') || path.isAbsolute(finalRel)) {
        throw new Error(
          `Security Exception: Path "${relativePath}" escapes project root boundary "${realRoot}" via symlink.`
        );
      }

      // If the link target exists, use realpath to be 100% sure
      if (fs.existsSync(linkTarget)) {
        const realLinkTarget = fs.realpathSync.native
          ? fs.realpathSync.native(linkTarget)
          : fs.realpathSync(linkTarget);
        const realRel = path.relative(realRoot, realLinkTarget);
        if (realRel.startsWith('..') || path.isAbsolute(realRel)) {
          throw new Error(
            `Security Exception: Path "${relativePath}" escapes project root boundary "${realRoot}" via symlink.`
          );
        }
        current = realLinkTarget;
      } else {
        // Dangling link whose target is inside root
        current = linkTarget;
      }
    } else {
      // Regular file or directory
      current = nextPath;
    }
  }

  const finalCheck = path.relative(realRoot, current);
  if (finalCheck.startsWith('..') || path.isAbsolute(finalCheck)) {
    throw new Error(`Security Exception: Path "${relativePath}" escapes project root boundary "${realRoot}".`);
  }

  return current;
}

/**
 * Securely writes a file ensuring parent directory authenticity,
 * refusing to follow symlinks at the final component, and re-verifying
 * boundary constraints prior to opening.
 */
export function safeWriteFile(
  filePath: string,
  content: string,
  projectRoot: string,
  overwrite = false
): void {
  const resolvedRoot = path.resolve(projectRoot);
  const realRoot = fs.realpathSync.native ? fs.realpathSync.native(resolvedRoot) : fs.realpathSync(resolvedRoot);

  const parentDir = path.dirname(filePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  // 1. Verify parent directory with O_DIRECTORY | O_NOFOLLOW if practical
  const dirFlags = (fs.constants.O_RDONLY || 0) | (fs.constants.O_DIRECTORY || 0) | (fs.constants.O_NOFOLLOW || 0);
  let parentFd: number | null = null;
  try {
    parentFd = fs.openSync(parentDir, dirFlags);
  } catch (err: any) {
    throw new Error(`Security Exception: Cannot open parent directory securely (${err.message}).`);
  } finally {
    if (parentFd !== null) {
      try { fs.closeSync(parentFd); } catch {}
    }
  }

  // 2. Re-run realpath check on parent directory immediately before opening
  const realParent = fs.realpathSync.native ? fs.realpathSync.native(parentDir) : fs.realpathSync(parentDir);
  const parentRel = path.relative(realRoot, realParent);
  if (parentRel.startsWith('..') || path.isAbsolute(parentRel)) {
    throw new Error(`Security Exception: Parent directory escapes project root boundary "${realRoot}".`);
  }

  // 3. Check destination file
  let destStat: fs.Stats | null = null;
  try {
    destStat = fs.lstatSync(filePath);
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
  }

  // A symlink at the final component can NEVER be followed
  if (destStat && destStat.isSymbolicLink()) {
    throw new Error(`Security Exception: Destination "${filePath}" is a symlink and cannot be written.`);
  }

  if (destStat && !overwrite) {
    throw new Error(`Security Exception: Refusing to overwrite existing file "${filePath}". Pass overwrite: true to allow.`);
  }

  // 4. Open file securely with O_NOFOLLOW
  const fileFlags = destStat
    ? fs.constants.O_WRONLY | fs.constants.O_TRUNC | (fs.constants.O_NOFOLLOW || 0)
    : fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW || 0);

  const fd = fs.openSync(filePath, fileFlags);
  try {
    fs.writeFileSync(fd, content, 'utf8');
  } finally {
    try { fs.closeSync(fd); } catch {}
  }
}

export interface SafeCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function executeSafeCommand(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs = 30000
): Promise<SafeCommandResult> {
  return new Promise((resolve, reject) => {
    // 1. Reject any path separators in command name
    if (cmd.includes('/') || cmd.includes('\\')) {
      return reject(
        new Error(`Security Exception: Command "${cmd}" must be a bare executable name without path separators (not in the allowed binaries whitelist).`)
      );
    }

    // 2. Only allow specific trusted binaries
    if (!ALLOWED_BARE_BINARIES.has(cmd)) {
      return reject(
        new Error(`Security Exception: Command "${cmd}" is not in the allowed binaries whitelist (allowed: npm, node, git).`)
      );
    }

    // 3. Exact subcommand validation per binary
    if (cmd === 'npm') {
      if (args.length === 0) {
        return reject(new Error(`Security Exception: npm command requires a subcommand.`));
      }
      const sub = args[0];
      if (sub === 'test') {
        // "npm test: accept at most one extra argument, an absolute path inside the project root; reject `--`, flags, and `--script-shell`."
        if (args.length > 2) {
          return reject(
            new Error(`Security Exception: npm test accepts at most one extra argument, received ${args.length - 1}.`)
          );
        }
        if (args.length === 2) {
          const extra = args[1];
          if (extra === '--' || extra.startsWith('-')) {
            return reject(
              new Error(`Security Exception: npm test extra argument cannot be a flag or "--", received "${extra}".`)
            );
          }
          if (!path.isAbsolute(extra)) {
            return reject(
              new Error(`Security Exception: npm test extra argument must be an absolute path inside project root, received "${extra}".`)
            );
          }
          const resolvedRoot = path.resolve(cwd);
          const realRoot = fs.existsSync(resolvedRoot)
            ? (fs.realpathSync.native ? fs.realpathSync.native(resolvedRoot) : fs.realpathSync(resolvedRoot))
            : resolvedRoot;
          let realExtra = path.resolve(extra);
          if (fs.existsSync(realExtra)) {
            realExtra = fs.realpathSync.native ? fs.realpathSync.native(realExtra) : fs.realpathSync(realExtra);
          }
          const rel = path.relative(realRoot, realExtra);
          if (rel.startsWith('..') || path.isAbsolute(rel)) {
            return reject(
              new Error(`Security Exception: npm test argument "${extra}" escapes project root boundary "${realRoot}".`)
            );
          }
        }
      } else if (sub === 'run') {
        const script = args[1];
        if (!script || !NPM_ALLOWED_RUN_SCRIPTS.has(script)) {
          return reject(
            new Error(`Security Exception: Prohibited npm run script "${script || ''}". Allowed scripts: build, typecheck.`)
          );
        }
        if (args.length !== 2) {
          return reject(
            new Error(`Security Exception: Prohibited extra arguments for "npm run ${script}".`)
          );
        }
      } else {
        return reject(
          new Error(`Security Exception: Prohibited npm subcommand "${sub}". Allowed: test, run build, run typecheck.`)
        );
      }
    } else if (cmd === 'git') {
      if (args.length === 0) {
        return reject(new Error(`Security Exception: git command requires a subcommand.`));
      }
      const sub = args[0];
      if (!GIT_ALLOWED_READ_ONLY_SUBCOMMANDS.has(sub)) {
        return reject(
          new Error(`Security Exception: Prohibited git subcommand "${sub}". Only read-only subcommands are allowed: status, log, diff, rev-parse, branch, describe, show.`)
        );
      }
      if (sub === 'branch') {
        for (const arg of args.slice(1)) {
          if (!GIT_BRANCH_ALLOWED_READ_ONLY_FLAGS.has(arg)) {
            return reject(
              new Error(`Security Exception: Prohibited git branch argument "${arg}". Only read-only branch queries (--show-current, --list, -a, --all, -r, --remotes, -v, -vv, --verbose) are allowed.`)
            );
          }
        }
      }
    } else if (cmd === 'node') {
      // "node: drop it from the allowlist unless a tool needs it; if needed, allow only node --test <path inside root>."
      if (args.length === 0 || args[0] !== '--test') {
        return reject(
          new Error(`Security Exception: Prohibited node invocation. Only "node --test <path inside root>" is allowed.`)
        );
      }
      if (args.length > 2) {
        return reject(
          new Error(`Security Exception: node --test accepts at most one test path argument, received ${args.length - 1}.`)
        );
      }
      if (args.length === 2) {
        const testPath = args[1];
        if (testPath.startsWith('-')) {
          return reject(
            new Error(`Security Exception: node --test path argument cannot be a flag, received "${testPath}".`)
          );
        }
        if (!path.isAbsolute(testPath)) {
          return reject(
            new Error(`Security Exception: node --test path argument must be an absolute path inside project root, received "${testPath}".`)
          );
        }
        const resolvedRoot = path.resolve(cwd);
        const realRoot = fs.existsSync(resolvedRoot)
          ? (fs.realpathSync.native ? fs.realpathSync.native(resolvedRoot) : fs.realpathSync(resolvedRoot))
          : resolvedRoot;
        let realTarget = path.resolve(testPath);
        if (fs.existsSync(realTarget)) {
          realTarget = fs.realpathSync.native ? fs.realpathSync.native(realTarget) : fs.realpathSync(realTarget);
        }
        const rel = path.relative(realRoot, realTarget);
        if (rel.startsWith('..') || path.isAbsolute(rel)) {
          return reject(
            new Error(`Security Exception: node --test path "${testPath}" escapes project root boundary "${realRoot}".`)
          );
        }
      }
    }

    // 4. Inspect arguments for command injection / dangerous flags
    const forbidden = FORBIDDEN_ARG_PATTERNS[cmd] || [];
    for (const arg of args) {
      for (const pattern of forbidden) {
        if (typeof pattern === 'string' ? arg === pattern : pattern.test(arg)) {
          return reject(
            new Error(`Security Exception: Argument "${arg}" is prohibited for command "${cmd}".`)
          );
        }
      }
    }

    const child = spawn(cmd, args, {
      cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let isDone = false;

    const timer = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        try { child.kill('SIGKILL'); } catch {}
        reject(new Error(`Command "${cmd} ${args.join(' ')}" timed out after ${timeoutMs}ms.`));
      }
    }, timeoutMs);

    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });

    child.on('error', (err) => {
      if (!isDone) {
        isDone = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    child.on('close', (code) => {
      if (!isDone) {
        isDone = true;
        clearTimeout(timer);
        resolve({
          stdout: redactSecrets(stdout),
          stderr: redactSecrets(stderr),
          exitCode: code ?? 0
        });
      }
    });
  });
}
