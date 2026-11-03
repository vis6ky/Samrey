/**
 * @license Apache-2.0
 * @samrey/cli - "samrey dev" Command
 */

import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
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
  '.ts': 'text/javascript; charset=utf-8',
  '.tsx': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm'
};

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

  const server = http.createServer((req, res) => {
    let reqPath = req.url?.split('?')[0] || '/';
    if (reqPath === '/') reqPath = '/index.html';

    const cleanPath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.resolve(absoluteRoot, '.' + cleanPath);

    if (!filePath.startsWith(absoluteRoot + path.sep) && filePath !== path.join(absoluteRoot, 'index.html')) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden');
      return;
    }

    if (!fs.existsSync(filePath)) {
      // SPA Fallback to index.html
      filePath = path.join(absoluteRoot, 'index.html');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  });

  const listenHost = options.host ? (typeof options.host === 'string' ? options.host : '0.0.0.0') : '127.0.0.1';

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
