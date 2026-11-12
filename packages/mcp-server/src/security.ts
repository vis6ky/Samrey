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
const GLOB_META_RE = /[*?[\]{}]|[?!+*@]\(/;

function getRealPath(targetPath: string): string {
  return fs.realpathSync.native ? fs.realpathSync.native(targetPath) : fs.realpathSync(targetPath);
}

function assertSubtreeContainsNoEscapingSymlinks(
  dirPath: string,
  realRoot: string,
  includeInternalDirs: boolean,
  visited = new Set<string>()
): void {
  if (!fs.existsSync(dirPath)) return;
  const realDir = getRealPath(dirPath);
  if (visited.has(realDir)) return;
  visited.add(realDir);

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(realDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!includeInternalDirs && (entry.name === 'node_modules' || entry.name === '.git')) {
      continue;
    }
    const fullPath = path.join(realDir, entry.name);
    if (entry.isSymbolicLink()) {
      // Resolves symlink target realpath and throws if it escapes realRoot
      const safeTarget = resolveSafePath(realRoot, fullPath);
      try {
        if (fs.statSync(safeTarget).isDirectory()) {
          assertSubtreeContainsNoEscapingSymlinks(safeTarget, realRoot, includeInternalDirs, visited);
        }
      } catch {
        // Broken symlink still got checked via resolveSafePath above if resolvable/unresolvable
      }
    } else if (entry.isDirectory()) {
      assertSubtreeContainsNoEscapingSymlinks(fullPath, realRoot, includeInternalDirs, visited);
    }
  }
}

function globMightMatchInternalDir(normalizedPattern: string): boolean {
  if (normalizedPattern.includes('node_modules') || normalizedPattern.includes('.git')) {
    return true;
  }
  const segs = normalizedPattern.split('/').filter(Boolean);
  return segs.some((seg) => {
    if (!GLOB_META_RE.test(seg)) return false;
    return /^(\*|n|node|\.|{\s*node|\{\s*\.|\?)/i.test(seg) || seg.includes('**');
  });
}

function validateSafeCommandTestPath(rawArg: string, cwd: string, cmdLabel: string): string {
  if (!rawArg || rawArg.includes('\0') || rawArg === '--' || rawArg.startsWith('-')) {
    throw new Error(
      `Security Exception: ${cmdLabel} test path argument cannot be empty or a flag, received "${rawArg}".`
    );
  }
  if (!path.isAbsolute(rawArg)) {
    throw new Error(
      `Security Exception: ${cmdLabel} test path must be an absolute path inside project root (got relative "${rawArg}").`
    );
  }

  const normalized = rawArg.replace(/\\/g, '/');
  const resolvedRoot = path.resolve(cwd);
  const realRoot = getRealPath(resolvedRoot);
  const candidate = normalized;

  if (!GLOB_META_RE.test(candidate)) {
    return resolveSafePath(resolvedRoot, candidate);
  }

  // Reject any literal ".." segment or brace/delimiter variant like "{..,tests}" anywhere in glob pattern
  const hasTraversalToken = candidate.split('/').some((seg) =>
    seg === '..' || /(?:^|[{,!\s])\.\.(?:$|[},\s])/.test(seg)
  );
  if (hasTraversalToken) {
    throw new Error(
      `Security Exception: Glob test pattern "${rawArg}" contains ".." traversal sequence.`
    );
  }

  // Validate the longest concrete directory prefix before any glob metacharacter
  const firstGlobIdx = candidate.search(GLOB_META_RE);
  const slashBeforeGlob = candidate.lastIndexOf('/', firstGlobIdx);
  const concretePrefix = slashBeforeGlob > 0 ? candidate.slice(0, slashBeforeGlob) : '/';
  const globSuffix = slashBeforeGlob >= 0 ? candidate.slice(slashBeforeGlob + 1) : candidate;

  const safePrefix = resolveSafePath(resolvedRoot, concretePrefix);
  const includeInternalDirs = globMightMatchInternalDir(normalized);

  assertSubtreeContainsNoEscapingSymlinks(safePrefix, realRoot, includeInternalDirs);

  const globSyncFn = (fs as unknown as {
    globSync?: (pattern: string | string[], options?: { cwd?: string }) => string[];
  }).globSync;
  if (typeof globSyncFn !== 'function') {
    throw new Error(
      `Security Exception: Glob test pattern "${rawArg}" cannot be verified cleanly without fs.globSync support.`
    );
  }

  const globPattern = slashBeforeGlob >= 0
    ? path.join(safePrefix, globSuffix)
    : candidate;
  const matches = globSyncFn(globPattern, { cwd: realRoot });
  for (const match of matches) {
    const absMatch = path.isAbsolute(match) ? match : path.resolve(realRoot, match);
    resolveSafePath(realRoot, absMatch);
  }
  return globPattern;
}

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

  // Normalize slashes (handling Windows ..\ variants) and Unicode NFC WITHOUT collapsing ".." first
  const cleanRel = relativePath.replace(/\\/g, '/').normalize('NFC');
  const realRootNorm = realRoot.replace(/\\/g, '/').replace(/\/+$/, '');
  const resolvedRootNorm = resolvedRoot.replace(/\\/g, '/').replace(/\/+$/, '');

  let rawRelSegments: string[];
  if (path.isAbsolute(cleanRel)) {
    const cleanNoTrail = cleanRel.replace(/\/+$/, '');
    if (cleanNoTrail === realRootNorm || cleanNoTrail === resolvedRootNorm) {
      rawRelSegments = [];
    } else if (cleanRel.startsWith(realRootNorm + '/')) {
      rawRelSegments = cleanRel.slice(realRootNorm.length + 1).split('/').filter(Boolean);
    } else if (cleanRel.startsWith(resolvedRootNorm + '/')) {
      rawRelSegments = cleanRel.slice(resolvedRootNorm.length + 1).split('/').filter(Boolean);
    } else {
      // Handle macOS /var -> /private/var or symlinked intermediate ancestors only when no uncollapsed '..' traversal hides an escape
      const hasRawDotDot = cleanRel.split('/').includes('..');
      if (hasRawDotDot) {
        throw new Error(`Security Exception: Path "${relativePath}" escapes project root boundary "${realRoot}".`);
      }
      const absTarget = path.resolve(cleanRel);
      const relFromReal = path.relative(realRoot, absTarget);
      const relFromResolved = path.relative(resolvedRoot, absTarget);
      const inRealRoot = !relFromReal.startsWith('..') && !path.isAbsolute(relFromReal);
      const inResolvedRoot = !relFromResolved.startsWith('..') && !path.isAbsolute(relFromResolved);
      if (!inRealRoot && !inResolvedRoot) {
        throw new Error(`Security Exception: Path "${relativePath}" escapes project root boundary "${realRoot}".`);
      }
      const picked = inRealRoot ? relFromReal : relFromResolved;
      rawRelSegments = picked.split(path.sep).filter(Boolean);
    }
  } else {
    rawRelSegments = cleanRel.split('/').filter(Boolean);
  }

  // Walk segments sequentially from realRoot, resolving symlinks BEFORE applying ".."
  let currentReal = realRoot;
  const missingSegments: string[] = [];

  for (let i = 0; i < rawRelSegments.length; i++) {
    const seg = rawRelSegments[i]!;
    if (seg === '.') continue;
    if (seg === '..') {
      if (missingSegments.length > 0) {
        missingSegments.pop();
      } else {
        if (currentReal === realRoot) {
          throw new Error(`Security Exception: Path "${relativePath}" escapes project root boundary "${realRoot}".`);
        }
        currentReal = path.dirname(currentReal);
        const relCheck = path.relative(realRoot, currentReal);
        if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) {
          throw new Error(`Security Exception: Path "${relativePath}" escapes project root boundary "${realRoot}".`);
        }
      }
      continue;
    }

    if (missingSegments.length > 0) {
      missingSegments.push(seg);
      continue;
    }

    const nextPath = path.join(currentReal, seg);
    let stat: fs.Stats | null = null;
    try {
      stat = fs.lstatSync(nextPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
      missingSegments.push(seg);
      continue;
    }

    if (stat.isSymbolicLink()) {
      let linkTarget = nextPath;
      let depth = 0;
      while (depth < 40) {
        let linkStat: fs.Stats | null = null;
        try {
          linkStat = fs.lstatSync(linkTarget);
        } catch (err: any) {
          if (err.code !== 'ENOENT') throw err;
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

      const finalRel = path.relative(realRoot, linkTarget);
      if (finalRel.startsWith('..') || path.isAbsolute(finalRel)) {
        throw new Error(
          `Security Exception: Path "${relativePath}" escapes project root boundary "${realRoot}" via symlink.`
        );
      }

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
        currentReal = realLinkTarget;
      } else {
        // Dangling link whose target is inside realRoot: treat unresolved suffix relative to realRoot
        const danglingRel = path.relative(realRoot, linkTarget);
        const danglingSegs = danglingRel.split(path.sep).filter(Boolean);
        missingSegments.push(...danglingSegs);
      }
    } else {
      currentReal = nextPath;
    }
  }

  const finalPath = missingSegments.length > 0
    ? path.join(currentReal, ...missingSegments)
    : currentReal;
  const finalCheck = path.relative(realRoot, finalPath);
  if (finalCheck.startsWith('..') || path.isAbsolute(finalCheck)) {
    throw new Error(`Security Exception: Path "${relativePath}" escapes project root boundary "${realRoot}".`);
  }

  return finalPath;
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
  if (typeof filePath !== 'string' || !filePath || filePath.includes('\0')) {
    throw new Error('Security Exception: File path contains invalid or NUL bytes.');
  }

  const resolvedRoot = path.resolve(projectRoot);
  if (!fs.existsSync(resolvedRoot)) {
    throw new Error(`Security Exception: Project root "${resolvedRoot}" does not exist.`);
  }
  const realRoot = fs.realpathSync.native ? fs.realpathSync.native(resolvedRoot) : fs.realpathSync(resolvedRoot);

  const normalizedInput = resolveSafePath(resolvedRoot, filePath);
  const absTarget = normalizedInput;

  const relFromResolved = path.relative(resolvedRoot, absTarget);
  const relFromReal = path.relative(realRoot, absTarget);
  const inResolvedRoot = !relFromResolved.startsWith('..') && !path.isAbsolute(relFromResolved);
  const inRealRoot = !relFromReal.startsWith('..') && !path.isAbsolute(relFromReal);

  if (!inResolvedRoot && !inRealRoot) {
    throw new Error(`Security Exception: Target "${filePath}" escapes project root boundary "${realRoot}".`);
  }

  const normalizedRelTarget = inRealRoot ? relFromReal : relFromResolved;
  if (!normalizedRelTarget || normalizedRelTarget === '.') {
    throw new Error(`Security Exception: Target "${filePath}" must refer to a file inside project root.`);
  }
  const parentRelFromRoot = path.dirname(normalizedRelTarget);

  // Walk existing ancestors before creating directories so symlinks cannot hijack mkdirSync
  const candidateParentDir = path.dirname(absTarget);
  let existingAncestor = candidateParentDir;
  while (!fs.existsSync(existingAncestor)) {
    const up = path.dirname(existingAncestor);
    if (up === existingAncestor) break;
    existingAncestor = up;
  }

  const realAncestor = fs.realpathSync.native
    ? fs.realpathSync.native(existingAncestor)
    : fs.realpathSync(existingAncestor);
  const ancestorRel = path.relative(realRoot, realAncestor);
  if (ancestorRel.startsWith('..') || path.isAbsolute(ancestorRel)) {
    throw new Error(`Security Exception: Ancestor directory "${existingAncestor}" escapes project root boundary "${realRoot}".`);
  }

  // Ensure every existing segment under realRoot leading to parentDir is inside root and not an escaping symlink
  const safeParentDir = parentRelFromRoot === '.'
    ? realRoot
    : resolveSafePath(realRoot, parentRelFromRoot);
  const safeTargetPath = path.join(safeParentDir, path.basename(absTarget));

  if (!fs.existsSync(safeParentDir)) {
    fs.mkdirSync(safeParentDir, { recursive: true });
  }

  // 1. Open and hold parent directory fd with O_DIRECTORY | O_NOFOLLOW across the destination open
  const dirFlags = (fs.constants.O_RDONLY || 0) | (fs.constants.O_DIRECTORY || 0) | (fs.constants.O_NOFOLLOW || 0);
  const parentFd = fs.openSync(safeParentDir, dirFlags);
  try {
    const parentFdStat = fs.fstatSync(parentFd);
    const parentPathLstat = fs.lstatSync(safeParentDir);
    if (parentPathLstat.isSymbolicLink() || parentFdStat.dev !== parentPathLstat.dev || parentFdStat.ino !== parentPathLstat.ino) {
      throw new Error(`Security Exception: Parent directory "${safeParentDir}" changed or is a symlink.`);
    }

    // 2. Verify realpath of parent directory remains strictly inside realRoot
    const realParent = fs.realpathSync.native ? fs.realpathSync.native(safeParentDir) : fs.realpathSync(safeParentDir);
    const parentRel = path.relative(realRoot, realParent);
    if (parentRel.startsWith('..') || path.isAbsolute(parentRel)) {
      throw new Error(`Security Exception: Parent directory escapes project root boundary "${realRoot}".`);
    }

    // 3. Check destination file
    let destStat: fs.Stats | null = null;
    try {
      destStat = fs.lstatSync(safeTargetPath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }

    if (destStat && destStat.isSymbolicLink()) {
      throw new Error(`Security Exception: Destination "${filePath}" is a symlink and cannot be written.`);
    }

    if (destStat && !overwrite) {
      throw new Error(`Security Exception: Refusing to overwrite existing file "${filePath}". Pass overwrite: true to allow.`);
    }

    // 4. Open destination file with O_NOFOLLOW (never O_TRUNC before verifying fd identity) and re-verify while holding both fds
    const fileFlags = destStat
      ? fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW || 0)
      : fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW || 0);

    const fd = fs.openSync(safeTargetPath, fileFlags);
    let createdNewFile = !destStat;
    try {
      const postParentLstat = fs.lstatSync(safeParentDir);
      const postFileStat = fs.fstatSync(fd);
      const postFileLstat = fs.lstatSync(safeTargetPath);
      if (
        postParentLstat.isSymbolicLink() ||
        postParentLstat.dev !== parentFdStat.dev ||
        postParentLstat.ino !== parentFdStat.ino ||
        postFileLstat.isSymbolicLink() ||
        !postFileStat.isFile() ||
        postFileStat.dev !== postFileLstat.dev ||
        postFileStat.ino !== postFileLstat.ino ||
        (destStat && (postFileStat.dev !== destStat.dev || postFileStat.ino !== destStat.ino))
      ) {
        throw new Error(`Security Exception: Detected concurrent path modification while opening "${filePath}".`);
      }
      if (destStat) {
        fs.ftruncateSync(fd, 0);
      }
      fs.writeSync(fd, content, 0, 'utf8');
      createdNewFile = false;
    } catch (err) {
      if (createdNewFile) {
        try { fs.unlinkSync(safeTargetPath); } catch {}
      }
      throw err;
    } finally {
      try { fs.closeSync(fd); } catch {}
    }
  } finally {
    try { fs.closeSync(parentFd); } catch {}
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
    let spawnArgs = [...args];
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
          spawnArgs = ['test', validateSafeCommandTestPath(extra, cwd, 'npm test')];
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
        spawnArgs = ['--test', validateSafeCommandTestPath(args[1], cwd, 'node --test')];
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

    const child = spawn(cmd, spawnArgs, {
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
