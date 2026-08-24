/**
 * @license Apache-2.0
 * @aether/monorepo - Release Tarball & Published File Whitelist Validation
 */

import * as path from 'node:path';
import { execSync } from 'node:child_process';

export interface PackageFileInspection {
  packageName: string;
  entryCount: number;
  files: string[];
  blacklistedFilesFound: string[];
  unpackedSizeKb: number;
  packageSizeKb: number;
  isValid: boolean;
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

const BLACKLIST_PATTERNS = [
  /\/tests?\//i,
  /\.test\.(ts|js|mjs)$/i,
  /\.spec\.(ts|js|mjs)$/i,
  /\/benchmarks?\//i,
  /\/coverage\//i,
  /\.env(\..+)?$/i,
  /credentials/i,
  /id_rsa/i,
  /id_ed25519/i,
  /\.pem$/i,
  /\.key$/i,
  /node_modules/i,
  /\.DS_Store/i,
  /\.git/i
];

export function inspectPublishedFiles(): { packages: PackageFileInspection[]; allValid: boolean } {
  const results: PackageFileInspection[] = [];
  let allValid = true;

  for (const pkg of PACKAGES) {
    const pkgDir = path.join(process.cwd(), 'packages', pkg);
    const out = execSync('npm pack --dry-run --json', { cwd: pkgDir, encoding: 'utf8' });
    const data = JSON.parse(out)[0];

    const files: string[] = (data.files || []).map((f: any) => f.path || f);
    const blacklistedFilesFound: string[] = [];

    for (const f of files) {
      for (const pattern of BLACKLIST_PATTERNS) {
        if (pattern.test(f)) {
          blacklistedFilesFound.push(`${f} (matched ${pattern})`);
        }
      }
    }

    const isValid = blacklistedFilesFound.length === 0;
    if (!isValid) {
      allValid = false;
    }

    results.push({
      packageName: data.name,
      entryCount: data.entryCount,
      files,
      blacklistedFilesFound,
      unpackedSizeKb: parseFloat((data.unpackedSize / 1024).toFixed(2)),
      packageSizeKb: parseFloat((data.size / 1024).toFixed(2)),
      isValid
    });
  }

  return { packages: results, allValid };
}

if (process.argv[1]?.endsWith('validate-files.ts') || process.argv[1]?.endsWith('validate-files.js')) {
  console.log('▲ Aether Tarball & Published File Whitelist Audit\n');
  const { packages, allValid } = inspectPublishedFiles();
  for (const pkg of packages) {
    console.log(`  • ${pkg.packageName.padEnd(22)}: ${pkg.entryCount} files, ${pkg.packageSizeKb} kB tarball (${pkg.unpackedSizeKb} kB unpacked) -> ${pkg.isValid ? 'CLEAN' : 'DIRTY'}`);
    if (pkg.blacklistedFilesFound.length > 0) {
      for (const b of pkg.blacklistedFilesFound) {
        console.log(`      ✕ Blacklisted file: ${b}`);
      }
    }
  }
  console.log(`\nPublished File Audit: ${allValid ? 'PASSED (0 Blacklisted Files in 11 Tarballs)' : 'FAILED'}`);
  if (!allValid) {
    process.exit(1);
  }
}
