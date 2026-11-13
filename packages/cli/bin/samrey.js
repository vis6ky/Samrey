#!/usr/bin/env node

/**
 * @license Apache-2.0
 * @samrey/cli - Executable Entrypoint
 *
 * The production standalone CLI bundle is generated at build/pack time.
 * If the compiled bundle is not found, instructs the user to build packages/cli.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const bundlePath = path.join(__dirname, 'samrey.bundle.js');

if (!fs.existsSync(bundlePath)) {
  console.error("Run `npm run build` in packages/cli");
  process.exit(1);
}

await import(pathToFileURL(bundlePath).href);
