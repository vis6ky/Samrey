/**
 * @license Apache-2.0
 * @samrey/monorepo - Release Tarball Packager
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { validateDependencyTopology } from './validate-dependencies.js';

export interface PackedTarball {
  packageName: string;
  filename: string;
  destinationPath: string;
  sizeBytes: number;
  sha256: string;
}

export function packAllPackages(outDir = path.join(process.cwd(), 'dist', 'tarballs')): PackedTarball[] {
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  const { topologicalOrder } = validateDependencyTopology();
  const packed: PackedTarball[] = [];

  for (const fullPkgName of topologicalOrder) {
    const pkg = fullPkgName.replace('@samrey/', '');
    const pkgDir = path.join(process.cwd(), 'packages', pkg);

    // Build CLI if needed
    if (pkg === 'cli') {
      execSync('npm run build', { cwd: pkgDir, stdio: 'pipe' });
    }

    const packOut = execSync('npm pack', { cwd: pkgDir, encoding: 'utf8' }).trim();
    const generatedFilename = packOut.split('\n').filter(Boolean).pop()!.trim();
    const sourceTarball = path.join(pkgDir, generatedFilename);
    const destTarball = path.join(outDir, generatedFilename);

    // Move to outDir
    fs.copyFileSync(sourceTarball, destTarball);
    fs.unlinkSync(sourceTarball);

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
  console.log(`\nPackaging Status: PASSED (${tarballs.length}/11 Archives Ready)`);
}
