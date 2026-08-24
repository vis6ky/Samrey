/**
 * @license Apache-2.0
 * @aether/monorepo - Release Version Consistency Validation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface VersionValidationResult {
  expectedVersion: string;
  rootVersion: string;
  packageVersions: Record<string, string>;
  allMatch: boolean;
  mismatches: string[];
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

export function validateVersionConsistency(expectedVersion = '1.0.0'): VersionValidationResult {
  const rootManifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const rootVersion = rootManifest.version;
  const packageVersions: Record<string, string> = {};
  const mismatches: string[] = [];

  if (rootVersion !== expectedVersion) {
    mismatches.push(`Root package.json version is "${rootVersion}", expected "${expectedVersion}"`);
  }

  for (const pkg of PACKAGES) {
    const pPath = path.join(process.cwd(), 'packages', pkg, 'package.json');
    if (!fs.existsSync(pPath)) {
      mismatches.push(`packages/${pkg}/package.json missing`);
      continue;
    }
    const manifest = JSON.parse(fs.readFileSync(pPath, 'utf8'));
    packageVersions[`@aether/${pkg}`] = manifest.version;
    if (manifest.version !== expectedVersion) {
      mismatches.push(`@aether/${pkg} version is "${manifest.version}", expected "${expectedVersion}"`);
    }

    // Check internal dependencies version alignment
    const allDeps = {
      ...(manifest.dependencies || {}),
      ...(manifest.peerDependencies || {})
    };
    for (const [dep, ver] of Object.entries(allDeps)) {
      if (dep.startsWith('@aether/')) {
        const expectedPattern = `^${expectedVersion}`;
        if (ver !== expectedVersion && ver !== expectedPattern) {
          mismatches.push(`@aether/${pkg} has dependency "${dep}": "${ver}", expected "${expectedPattern}" or "${expectedVersion}"`);
        }
      }
    }
  }

  return {
    expectedVersion,
    rootVersion,
    packageVersions,
    allMatch: mismatches.length === 0,
    mismatches
  };
}

if (process.argv[1]?.endsWith('validate-version.ts') || process.argv[1]?.endsWith('validate-version.js')) {
  console.log('▲ Aether Version Consistency Audit\n');
  const result = validateVersionConsistency();
  console.log(`  Target Release Version: ${result.expectedVersion}`);
  console.log(`  Root Monorepo Version:  ${result.rootVersion}`);
  for (const [pkg, ver] of Object.entries(result.packageVersions)) {
    console.log(`  • ${pkg.padEnd(22)}: ${ver}`);
  }

  if (result.mismatches.length > 0) {
    console.log('\n  ✕ Mismatches found:');
    result.mismatches.forEach(m => console.log(`      - ${m}`));
  }

  console.log(`\nVersion Consistency Audit: ${result.allMatch ? 'PASSED (11/11 Packages + Root Pinned to 1.0.0)' : 'FAILED'}`);
  if (!result.allMatch) {
    process.exit(1);
  }
}
