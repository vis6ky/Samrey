#!/usr/bin/env node
/**
 * @license Apache-2.0
 * @samrey/mcp-server - Executable CLI Entry Point
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist', 'server.js');
const srcPath = path.join(__dirname, '..', 'src', 'server.js');
const target = fs.existsSync(distPath) ? distPath : (fs.existsSync(srcPath) ? srcPath : null);

if (!target) {
  const tsPath = path.join(__dirname, '..', 'src', 'server.ts');
  const mod = await import(pathToFileURL(tsPath).href);
  const server = new mod.SamreyMcpServer({ projectRoot: process.cwd() });
  server.startStdio();
} else {
  const mod = await import(pathToFileURL(target).href);
  const server = new mod.SamreyMcpServer({ projectRoot: process.cwd() });
  server.startStdio();
}

