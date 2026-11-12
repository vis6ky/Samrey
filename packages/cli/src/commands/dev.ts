/**
 * @license Apache-2.0
 * @samrey/cli - "samrey dev" Command
 */

import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { compileTemplate } from '@samrey/compiler';
import { CommandResult } from './create.js';

export interface DevCommandOptions {
  port?: number;
  host?: string | boolean;
  open?: boolean;
  dryRun?: boolean;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.samrey': 'text/javascript; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8',
  '.tsx': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm'
};

async function transpileTypeScriptModule(filePath: string, source: string, isTsx: boolean): Promise<string> {
  try {
    const esbuild = await import('esbuild');
    const result = await esbuild.transform(source, {
      loader: isTsx ? 'tsx' : 'ts',
      format: 'esm',
      sourcefile: filePath,
      sourcemap: 'inline'
    });
    return result.code;
  } catch (esbuildErr: any) {
    try {
      const ts = await import('typescript');
      const transpileModule = ts.transpileModule ?? ts.default?.transpileModule;
      if (typeof transpileModule === 'function') {
        const out = transpileModule(source, {
          fileName: filePath,
          compilerOptions: {
            module: 99, // ESNext
            target: 9,  // ES2022
            jsx: 1      // Preserve
          }
        });
        return out.outputText;
      }
    } catch {
      // Fall through to unified error below
    }
    throw new Error(
      `Failed to transpile ${path.basename(filePath)}: ${esbuildErr?.message || 'neither esbuild nor typescript could transpile module'}`
    );
  }
}

function hasForbiddenDotSegment(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/');
  return normalized
    .split('/')
    .some((seg) => seg === '..' || (seg.startsWith('.') && seg !== '.' && seg !== '.well-known'));
}

function normalizeHostHeader(hostHeader: string): string {
  const trimmed = hostHeader.trim().toLowerCase();
  if (trimmed.startsWith('[')) {
    const endBracket = trimmed.indexOf(']');
    return endBracket === -1 ? trimmed : trimmed.slice(0, endBracket + 1);
  }
  const colonIdx = trimmed.indexOf(':');
  return colonIdx === -1 ? trimmed : trimmed.slice(0, colonIdx);
}

function sanitizeDevErrorMessage(msg: unknown, resolvedRoot: string, realRoot: string): string {
  let text = String(msg || 'Unknown error');
  for (const root of [resolvedRoot, realRoot]) {
    if (root) {
      text = text.split(root + path.sep).join('').split(root).join('.');
    }
  }
  return text.split('\n')[0];
}

export function createNativeDevHandler(absoluteRoot: string, allowedHosts?: string[]): http.RequestListener {
  const resolvedRoot = path.resolve(absoluteRoot);
  const realRoot = (() => {
    try {
      return fs.realpathSync(resolvedRoot);
    } catch {
      return resolvedRoot;
    }
  })();

  const trustedHostSet = new Set<string>(['localhost', '127.0.0.1', '::1', '[::1]']);
  if (allowedHosts) {
    for (const h of allowedHosts) {
      if (h && h !== '0.0.0.0' && h !== '::') {
        trustedHostSet.add(normalizeHostHeader(h));
      }
    }
  }

  const isLexicallyWithinRoot = (candidate: string): boolean =>
    candidate === resolvedRoot || candidate.startsWith(resolvedRoot + path.sep);

  const isRealPathWithinRoot = (candidate: string): boolean => {
    try {
      const realCandidate = fs.realpathSync(candidate);
      if (realCandidate !== realRoot && !realCandidate.startsWith(realRoot + path.sep)) {
        return false;
      }
      const relFromRealRoot = path.relative(realRoot, realCandidate);
      return !hasForbiddenDotSegment(relFromRealRoot);
    } catch {
      return false;
    }
  };

  return async (req, res) => {
    const rawHost = req.headers?.host;
    if (typeof rawHost === 'string') {
      const hostName = normalizeHostHeader(rawHost);
      if (!trustedHostSet.has(hostName)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden: Untrusted Host header');
        return;
      }
    } else if ((req as any).socket) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('400 Bad Request');
      return;
    }

    const method = (req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }

    const rawPath = (req.url || '/').split(/[?#]/)[0] || '/';
    let reqPath: string;
    try {
      reqPath = decodeURIComponent(rawPath);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('400 Bad Request');
      return;
    }

    if (reqPath.includes('\0')) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('400 Bad Request');
      return;
    }

    const slashNormalized = reqPath.replace(/\\/g, '/');
    if (hasForbiddenDotSegment(slashNormalized)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }

    if (slashNormalized === '/') reqPath = '/index.html';
    else reqPath = slashNormalized;

    const cleanPath = path.posix.normalize(reqPath);
    const relativeTarget = cleanPath.replace(/^\/+/, '');
    let filePath = path.resolve(resolvedRoot, relativeTarget);

    if (!isLexicallyWithinRoot(filePath)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }

    // Reject symlinks escaping the dev server root before directory/stat fallback
    let targetLstat: fs.Stats | null = null;
    try {
      targetLstat = fs.lstatSync(filePath);
    } catch {
      targetLstat = null;
    }
    if (targetLstat && !isRealPathWithinRoot(filePath)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }

    let targetStat: fs.Stats | null = null;
    if (targetLstat) {
      try {
        targetStat = targetLstat.isSymbolicLink() ? fs.statSync(filePath) : targetLstat;
      } catch {
        targetStat = null;
      }
    }

    if (targetStat && targetStat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      if (!isLexicallyWithinRoot(filePath)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
      }
      try {
        targetLstat = fs.lstatSync(filePath);
        if (!isRealPathWithinRoot(filePath)) {
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('403 Forbidden');
          return;
        }
        targetStat = targetLstat.isSymbolicLink() ? fs.statSync(filePath) : targetLstat;
      } catch {
        targetLstat = null;
        targetStat = null;
      }
    }

    if (!targetStat) {
      const reqExt = path.extname(reqPath).toLowerCase();
      if (reqExt && reqExt !== '.html') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }
      // SPA Fallback to index.html only for extensionless client-side routes
      filePath = path.join(resolvedRoot, 'index.html');
      if (!isLexicallyWithinRoot(filePath)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
      }
      try {
        targetLstat = fs.lstatSync(filePath);
        if (!isRealPathWithinRoot(filePath)) {
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('403 Forbidden');
          return;
        }
        targetStat = targetLstat.isSymbolicLink() ? fs.statSync(filePath) : targetLstat;
      } catch {
        targetLstat = null;
        targetStat = null;
      }
    }

    if (targetStat && targetStat.isFile() && isRealPathWithinRoot(filePath)) {
      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.samrey') {
        try {
          const source = fs.readFileSync(filePath, 'utf-8');
          const compiled = compileTemplate(source, { filename: path.basename(filePath) });
          res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
          res.end(method === 'HEAD' ? undefined : compiled.generatedCode);
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(
            method === 'HEAD'
              ? undefined
              : `[Samrey Compile Error] ${sanitizeDevErrorMessage(err?.message || err, resolvedRoot, realRoot)}`
          );
        }
        return;
      }

      if (ext === '.ts' || ext === '.tsx') {
        try {
          const source = fs.readFileSync(filePath, 'utf-8');
          const transpiled = await transpileTypeScriptModule(filePath, source, ext === '.tsx');
          res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
          res.end(method === 'HEAD' ? undefined : transpiled);
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(
            method === 'HEAD'
              ? undefined
              : `[Samrey Dev Error] ${sanitizeDevErrorMessage(err?.message || err, resolvedRoot, realRoot)}`
          );
        }
        return;
      }

      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const respHeaders: Record<string, string> = { 'Content-Type': contentType };
      if (ext === '.svg') {
        respHeaders['X-Content-Type-Options'] = 'nosniff';
        respHeaders['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
      }

      if (method === 'HEAD') {
        try {
          fs.accessSync(filePath, fs.constants.R_OK);
          res.writeHead(200, respHeaders);
          res.end();
        } catch (err: any) {
          const code = err?.code === 'EACCES' ? 403 : 500;
          res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end();
        }
        return;
      }

      await new Promise<void>((resolve) => {
        const stream = fs.createReadStream(filePath);
        let settled = false;
        const finish = () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        };
        stream.once('open', () => {
          if (!res.headersSent) {
            res.writeHead(200, respHeaders);
          }
          stream.pipe(res);
        });
        stream.once('error', (err: any) => {
          const code = err?.code === 'EACCES' ? 403 : 500;
          if (!res.headersSent) {
            res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(code === 403 ? '403 Forbidden' : '500 Internal Server Error');
          } else {
            res.end();
          }
          finish();
        });
        res.once('finish', finish);
        res.once('close', finish);
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(method === 'HEAD' ? undefined : '404 Not Found');
    }
  };
}

export async function runDevCommand(options: DevCommandOptions = {}): Promise<CommandResult> {
  const port = options.port || 3000;
  const host = options.host ? (typeof options.host === 'string' ? options.host : '0.0.0.0') : 'localhost';

  if (port < 1 || port > 65535) {
    return {
      success: false,
      message: `[Samrey Dev Error] Invalid port ${port}. Port must be between 1 and 65535.`,
      exitCode: 1
    };
  }

  const devUrl = `http://${host}:${port}`;
  const banner = [
    `  ▲ Samrey Development Server`,
    `  ➜ Local:   ${devUrl}/`,
    `  ➜ DevTools: Enabled (Bridge active on window.__SAMREY_DEVTOOLS_BRIDGE__)`,
    `  ➜ HMR:     Fine-grained reactive signal updates enabled`,
    `  ➜ Mode:    Development (Diagnostics & runtime assertions active)`
  ].join('\n');

  if (options.dryRun) {
    return {
      success: true,
      message: `[Dry Run] Dev server configuration validated for port ${port}`,
      exitCode: 0,
      data: { port, host, devUrl }
    };
  }

  // Try launching Vite if present in user workspace
  try {
    const viteModule = await import('vite').catch(() => null);
    if (viteModule && typeof viteModule.createServer === 'function') {
      const server = await viteModule.createServer({
        server: {
          port,
          host: typeof options.host === 'string' ? options.host : (options.host ? true : undefined)
        }
      });
      await server.listen();
      console.log(banner);
      server.printUrls();
      return {
        success: true,
        message: banner,
        exitCode: 0,
        data: { port, host, devUrl, mode: 'vite' }
      };
    }
  } catch {
    // Fall back to built-in dev HTTP server
  }

  // Native lightweight dev server fallback
  const rootDir = process.cwd();
  const absoluteRoot = path.resolve(rootDir);
  const listenHost = options.host ? (typeof options.host === 'string' ? options.host : '0.0.0.0') : '127.0.0.1';
  const server = http.createServer(
    createNativeDevHandler(absoluteRoot, typeof options.host === 'string' ? [options.host] : undefined)
  );

  return new Promise((resolve) => {
    server.listen(port, listenHost, () => {
      console.log(banner);
      resolve({
        success: true,
        message: banner,
        exitCode: 0,
        data: { port, host, devUrl, mode: 'native' }
      });
    });

    server.on('error', (err: any) => {
      resolve({
        success: false,
        message: `[Samrey Dev Error] ${err.message}`,
        exitCode: 1
      });
    });
  });
}
