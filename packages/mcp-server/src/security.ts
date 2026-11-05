/**
 * @license Apache-2.0
 * @samrey/mcp-server - Security Boundaries & Path Sandboxing
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { spawn } from 'node:child_process';

const ALLOWED_BARE_BINARIES = new Set(['npm', 'node', 'git']);

const FORBIDDEN_ARG_PATTERNS: Record<string, Array<RegExp | string>> = {
  node: [
    /^-e$/,
    /^--eval$/,
    /^-p$/,
    /^--print$/,
    /^--import(=|$)/,
    /^--loader(=|$)/,
    /^-r$/,
    /^--require(=|$)/
  ],
  git: [
    /^-c.*/,
    /^--upload-pack(=|$)/,
    /^--receive-pack(=|$)/,
    /^--exec-path(=|$)/,
    /^--config-env(=|$)/
  ]
};

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

  // Find the deepest existing ancestor of the target to handle both existing and newly generated paths
  let curr = resolvedTarget;
  const uncreatedParts: string[] = [];

  while (!fs.existsSync(curr)) {
    const parent = path.dirname(curr);
    if (parent === curr) break;
    uncreatedParts.unshift(path.basename(curr));
    curr = parent;
  }

  const realAncestor = fs.realpathSync.native ? fs.realpathSync.native(curr) : fs.realpathSync(curr);
  const realTarget = uncreatedParts.length > 0
    ? path.join(realAncestor, ...uncreatedParts)
    : realAncestor;

  const rel = path.relative(realRoot, realTarget);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Security Exception: Path "${relativePath}" escapes project root boundary "${realRoot}".`);
  }

  return realTarget;
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

    // 3. Inspect arguments for command injection / dangerous flags
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
