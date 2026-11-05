/**
 * @license Apache-2.0
 * @samrey/monorepo - Lockfile Consistency & Synchronization Checker
 *
 * Verifies that:
 * 1. Exactly one lockfile exists (package-lock.json); alternative lockfiles (bun.lock*, yarn.lock, pnpm-lock.yaml) are forbidden.
 * 2. package-lock.json is synchronized with root package.json (version, dependencies, devDependencies).
 * 3. All workspace package manifests (packages/*) match package-lock.json recorded versions and dependencies.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface LockfileCheckResult {
  inSync: boolean;
  errors: string[];
}

export function checkLockfile(rootDir = process.cwd()): LockfileCheckResult {
  const errors: string[] = [];

  // 1. Check for forbidden alternative lockfiles
  const forbiddenFiles = ['bun.lock', 'bun.lockb', 'yarn.lock', 'pnpm-lock.yaml'];
  for (const forbidden of forbiddenFiles) {
    if (fs.existsSync(path.join(rootDir, forbidden))) {
      errors.push(`Forbidden alternative lockfile found: "${forbidden}". Only "package-lock.json" is allowed.`);
    }
  }

  // 2. Verify package-lock.json exists
  const lockfilePath = path.join(rootDir, 'package-lock.json');
  if (!fs.existsSync(lockfilePath)) {
    errors.push('package-lock.json does not exist');
    return { inSync: false, errors };
  }

  const rootPkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(rootPkgPath)) {
    errors.push('Root package.json does not exist');
    return { inSync: false, errors };
  }

  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  const lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));

  // 3. Root version check
  if (lockfile.version !== rootPkg.version) {
    errors.push(`Lockfile root version "${lockfile.version}" does not match package.json version "${rootPkg.version}"`);
  }

  const rootLockEntry = lockfile.packages?.[''];
  if (!rootLockEntry) {
    errors.push('Lockfile missing root entry packages[""]');
  } else if (rootLockEntry.version !== rootPkg.version) {
    errors.push(`Lockfile packages[""].version "${rootLockEntry.version}" does not match package.json version "${rootPkg.version}"`);
  }

  // 4. Root dependencies / devDependencies
  const checkDeps = (pkgDeps: Record<string, string> = {}, lockDeps: Record<string, string> = {}, type: string) => {
    for (const [dep, spec] of Object.entries(pkgDeps)) {
      if (lockDeps[dep] !== spec) {
        errors.push(`Root ${type} "${dep}": package.json has "${spec}", lockfile has "${lockDeps[dep] ?? 'missing'}"`);
      }
    }
  };

  if (rootLockEntry) {
    checkDeps(rootPkg.dependencies, rootLockEntry.dependencies, 'dependencies');
    checkDeps(rootPkg.devDependencies, rootLockEntry.devDependencies, 'devDependencies');
  }

  // 5. Workspaces check
  const packagesDir = path.join(rootDir, 'packages');
  if (fs.existsSync(packagesDir)) {
    const pkgs = fs.readdirSync(packagesDir);
    for (const pkg of pkgs) {
      const manifestPath = path.join(packagesDir, pkg, 'package.json');
      if (!fs.existsSync(manifestPath)) continue;

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const pkgName = manifest.name || `@samrey/${pkg}`;
      const lockKey = `packages/${pkg}`;
      const entry = lockfile.packages?.[lockKey];

      if (!entry) {
        errors.push(`Lockfile missing workspace entry packages["${lockKey}"] for ${pkgName}`);
        continue;
      }

      // Check workspace link entry in node_modules
      const linkKey = `node_modules/${pkgName}`;
      const linkEntry = lockfile.packages?.[linkKey];
      if (!linkEntry) {
        errors.push(`Lockfile missing workspace link entry packages["${linkKey}"] for ${pkgName}`);
      } else if (!linkEntry.link || linkEntry.resolved !== lockKey) {
        errors.push(`Lockfile workspace link entry packages["${linkKey}"] must link to "${lockKey}"`);
      }

      if (entry.version !== manifest.version) {
        errors.push(`Workspace ${lockKey} version "${entry.version}" does not match manifest version "${manifest.version}"`);
      }

      const mDeps = manifest.dependencies || {};
      const lDeps = entry.dependencies || {};
      for (const [dep, spec] of Object.entries(mDeps)) {
        if (lDeps[dep] !== spec) {
          errors.push(`Workspace ${lockKey} dependency "${dep}": manifest has "${spec}", lockfile has "${lDeps[dep] ?? 'missing'}"`);
        }
      }
    }
  }

  return {
    inSync: errors.length === 0,
    errors
  };
}

if (process.argv[1]?.endsWith('check-lockfile.ts') || process.argv[1]?.endsWith('check-lockfile.js')) {
  const result = checkLockfile();
  if (result.inSync) {
    console.log('✓ Lockfile package-lock.json is in sync with package.json manifests (PASSED)');
    process.exit(0);
  } else {
    console.error('✕ Lockfile package-lock.json is OUT OF DATE:');
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    console.error('\nRun "npm install --package-lock-only" to regenerate package-lock.json.');
    process.exit(1);
  }
}
