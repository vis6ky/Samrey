/**
 * @license Apache-2.0
 * @samrey - Monorepo Strict TypeScript Verification Runner
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';

const rootDir = process.cwd();
const tscBin = path.join(
  rootDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsc.cmd' : 'tsc'
);

function runTsc(label: string, args: string[]): void {
  process.stdout.write(`🔎 Typechecking ${label}... `);
  try {
    execFileSync(tscBin, args, { cwd: rootDir, stdio: 'pipe' });
    console.log('PASSED');
  } catch (err: any) {
    console.log('FAILED');
    const out = err?.stdout?.toString?.() || '';
    const errOut = err?.stderr?.toString?.() || '';
    if (out) console.error(out);
    if (errOut) console.error(errOut);
    process.exit(1);
  }
}

runTsc('root tsconfig.json', ['--noEmit']);

const packagesDir = path.join(rootDir, 'packages');
const pkgDirs = fs
  .readdirSync(packagesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

for (const pkg of pkgDirs) {
  const tsconfigPath = path.join(packagesDir, pkg, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    runTsc(`@samrey/${pkg}`, [
      '-p',
      tsconfigPath,
      '--strict',
      '--noUnusedLocals',
      '--noUnusedParameters',
      '--noEmit'
    ]);
  }
}

const templateRefTypesTest = path.join(rootDir, 'tests', 'template-refs-types.test.ts');
if (fs.existsSync(templateRefTypesTest)) {
  runTsc('tests/template-refs-types.test.ts', [
    templateRefTypesTest,
    '--strict',
    '--noEmit',
    '--target',
    'ES2022',
    '--module',
    'ESNext',
    '--moduleResolution',
    'bundler',
    '--skipLibCheck'
  ]);
}

console.log('✅ All monorepo TypeScript projects and type tests passed strict checking.');

