/**
 * @license Apache-2.0
 * @samrey/mcp-server - Security Boundaries & Path Sandboxing
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import { spawn } from 'node:child_process';

const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /AIza[0-9A-Za-z\-_]{10,}/g,
  /sk-[a-zA-Z0-9_\-]{10,}/g,
  /ghp_[a-zA-Z0-9]{20,}/g,
  /gho_[a-zA-Z0-9]{20,}/g,
  /(password|secret|apiKey|api_key|access_token|private_key)\s*[:=]\s*['"][^'"]+['"]/gi
];

export function redactSecrets(text: string): string {
  if (!text) return text;
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, '[REDACTED_SECRET]');
  }
  return result;
}

export function resolveSafePath(projectRoot: string, relativePath: string): string {
  const root = path.resolve(projectRoot);
  const normalizedRel = path.normalize(relativePath);

  // Reject paths trying to use absolute root or traversal
  if (path.isAbsolute(relativePath)) {
    // If absolute, verify it starts with root
    const absPath = path.resolve(relativePath);
    if (!absPath.startsWith(root)) {
      throw new Error(`Security Exception: Absolute path "${relativePath}" escapes project root boundary "${root}".`);
    }
    return absPath;
  }

  const resolved = path.resolve(root, normalizedRel);
  if (!resolved.startsWith(root)) {
    throw new Error(`Security Exception: Path "${relativePath}" escapes project root boundary via directory traversal.`);
  }

  return resolved;
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
    // Only allow specific trusted binaries
    const ALLOWED_BINARIES = ['npm', 'node', 'npx', 'git'];
    const binName = path.basename(cmd);

    if (!ALLOWED_BINARIES.includes(binName)) {
      return reject(new Error(`Security Exception: Command "${cmd}" is not in the allowed binaries whitelist.`));
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
