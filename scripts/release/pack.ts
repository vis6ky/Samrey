/**
 * @license Apache-2.0
 * @samrey/monorepo - Release Tarball Packager
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { validateDependencyTopology } from './validate-dependencies.js';
import { buildAllPackages } from '../build-packages.js';

export interface PackedTarball {
  packageName: string;
  filename: string;
  destinationPath: string;
  sizeBytes: number;
  sha256: string;
}

const SHARED_TARBALL_DIR = path.join(os.tmpdir(), 'samrey-shared-tarballs-fixture');
let sharedCache: PackedTarball[] | null = null;

export function getSharedTarballs(force = false): PackedTarball[] {
  if (sharedCache && !force) {
    const allExist = sharedCache.every(t => fs.existsSync(t.destinationPath));
    if (allExist) return sharedCache;
  }

  if (!force && fs.existsSync(SHARED_TARBALL_DIR)) {
    const files = fs.readdirSync(SHARED_TARBALL_DIR).filter(f => f.endsWith('.tgz'));
    const { topologicalOrder } = validateDependencyTopology();
    if (files.length === topologicalOrder.length) {
      const results: PackedTarball[] = [];
      let valid = true;
      for (const fullPkgName of topologicalOrder) {
        const pkg = fullPkgName.replace('@samrey/', '');
        const match = files.find(f => f.startsWith(`samrey-${pkg}-`));
        if (match) {
          const dest = path.join(SHARED_TARBALL_DIR, match);
          const stats = fs.statSync(dest);
          results.push({
            packageName: fullPkgName,
            filename: match,
            destinationPath: dest,
            sizeBytes: stats.size,
            sha256: ''
          });
        } else {
          valid = false;
          break;
        }
      }
      if (valid && results.length === topologicalOrder.length) {
        sharedCache = results;
        return sharedCache;
      }
    }
  }

  sharedCache = packAllPackages(SHARED_TARBALL_DIR, { keepCliBin: true });
  return sharedCache;
}

export function packAllPackages(
  outDir = path.join(process.cwd(), 'dist', 'tarballs'),
  options?: { keepCliBin?: boolean; forceBuild?: boolean }
): PackedTarball[] {
  // Build dist/ for all packages only if not already built or forced
  const isBuilt = fs.existsSync(path.join(process.cwd(), 'packages', 'reactivity', 'dist', 'index.js'));
  if (!isBuilt || options?.forceBuild) {
    buildAllPackages();
  }

  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  const cliBundle = path.join(process.cwd(), 'packages', 'cli', 'bin', 'samrey.bundle.js');
  const cliBundleExistedBefore = fs.existsSync(cliBundle);

  const { topologicalOrder } = validateDependencyTopology();
  const packed: PackedTarball[] = [];

  for (const fullPkgName of topologicalOrder) {
    const pkg = fullPkgName.replace('@samrey/', '');
    const pkgDir = path.join(process.cwd(), 'packages', pkg);

    // Build CLI if needed
    if (pkg === 'cli') {
      execSync('npm run build', { cwd: pkgDir, stdio: 'pipe' });
    }

    const packOut = execSync(`npm pack --pack-destination "${outDir}"`, { cwd: pkgDir, encoding: 'utf8' }).trim();
    const generatedFilename = packOut.split('\n').filter(Boolean).pop()!.trim();
    const destTarball = path.join(outDir, generatedFilename);

    const stats = fs.statSync(destTarball);
    const fileBuffer = fs.readFileSync(destTarball);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    packed.push({
      packageName: fullPkgName,
      filename: generatedFilename,
      destinationPath: destTarball,
      sizeBytes: stats.size,
      sha256: hash
    });
  }

  if (!options?.keepCliBin && !cliBundleExistedBefore) {
    if (fs.existsSync(cliBundle)) {
      fs.rmSync(cliBundle, { force: true });
    }
  }

  return packed;
}

if (process.argv[1]?.endsWith('pack.ts') || process.argv[1]?.endsWith('pack.js')) {
  console.log('▲ Samrey Packaging Pipeline\n');
  const tarballs = packAllPackages();
  console.log(`  Packed ${tarballs.length} packages into dist/tarballs:\n`);
  for (const t of tarballs) {
    console.log(`  • ${t.packageName.padEnd(22)}: ${t.filename} (${(t.sizeBytes / 1024).toFixed(2)} kB)`);
    console.log(`      SHA256: ${t.sha256}`);
  }
  const cliBundle = path.join(process.cwd(), 'packages', 'cli', 'bin', 'samrey.bundle.js');
  const cliBundleExistedBefore = fs.existsSync(cliBundle);

  const { topologicalOrder } = validateDependencyTopology();
  console.log(`\nPackaging Status: PASSED (${tarballs.length}/${topologicalOrder.length} Archives Ready)`);
}
