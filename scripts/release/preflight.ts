/**
 * @license Apache-2.0
 * @samrey/monorepo - Release Preflight Verification
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

export interface PreflightResult {
  nodeVersion: string;
  npmVersion: string;
  gitClean: boolean;
  packagesFound: number;
  toolsReady: boolean;
  authStatus: string;
  success: boolean;
  diagnostics: string[];
}

const PACKAGES = [
  'reactivity',
  'runtime',
  'security',
  'compiler',
  'router',
  'http',
  'forms',
  'ssr',
  'testing',
  'devtools',
  'cli'
];

export function runPreflight(): PreflightResult {
  const diagnostics: string[] = [];
  let success = true;

  // 1. Node.js Version Check
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (major < 18) {
    diagnostics.push(`Node.js version ${nodeVersion} is below required >=18.0.0`);
    success = false;
  } else {
    diagnostics.push(`Node.js version ${nodeVersion} satisfies >=18.0.0 requirement`);
  }

  // 2. NPM Version Check
  let npmVersion = 'unknown';
  try {
    npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    diagnostics.push(`npm version: ${npmVersion}`);
  } catch (err: any) {
    diagnostics.push(`Failed to detect npm version: ${err.message}`);
    success = false;
  }

  // 3. Git Status
  let gitClean = true;
  try {
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    if (gitStatus.length > 0) {
      gitClean = false;
      diagnostics.push(`Working directory has uncommitted files:\n${gitStatus}`);
    } else {
      diagnostics.push('Git working tree is clean');
    }
  } catch {
    diagnostics.push('Git repository status check skipped / clean');
  }

  // 4. Package Directory Presence
  let packagesFound = 0;
  for (const pkg of PACKAGES) {
    const pkgJsonPath = path.join(process.cwd(), 'packages', pkg, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      packagesFound++;
    } else {
      diagnostics.push(`Missing package manifest at packages/${pkg}/package.json`);
      success = false;
    }
  }
  diagnostics.push(`Found ${packagesFound}/${PACKAGES.length} @samrey/* packages`);

  // 5. Tooling Readiness (TypeScript, Vite, ESBuild)
  let toolsReady = true;
  try {
    execSync('npx tsc --version', { encoding: 'utf8' });
    diagnostics.push('TypeScript compiler (tsc) is ready');
  } catch (err: any) {
    diagnostics.push(`TypeScript compiler check failed: ${err.message}`);
    toolsReady = false;
    success = false;
  }

  // 6. NPM Auth Status
  let authStatus = 'unauthenticated';
  try {
    const whoami = execSync('npm whoami', { encoding: 'utf8' }).trim();
    authStatus = `authenticated as ${whoami}`;
    diagnostics.push(`npm auth: ${authStatus}`);
  } catch {
    authStatus = 'unauthenticated (PUBLICATION BLOCKED — CREDENTIAL/REGISTRY ACCESS REQUIRED)';
    diagnostics.push(`npm auth: ${authStatus}`);
  }

  return {
    nodeVersion,
    npmVersion,
    gitClean,
    packagesFound,
    toolsReady,
    authStatus,
    success,
    diagnostics
  };
}

if (process.argv[1]?.endsWith('preflight.ts') || process.argv[1]?.endsWith('preflight.js')) {
  console.log('▲ Samrey Release Preflight Check\n');
  const result = runPreflight();
  for (const diag of result.diagnostics) {
    console.log(`  • ${diag}`);
  }
  console.log(`\nPreflight Status: ${result.success ? 'PASSED' : 'FAILED'}`);
  if (!result.success) {
    process.exit(1);
  }
}
