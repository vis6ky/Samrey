/**
 * @license Apache-2.0
 * @samrey/monorepo - Multi-Package Build Pipeline
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { validateDependencyTopology } from './release/validate-dependencies.js';

export function buildAllPackages(): void {
  const { topologicalOrder } = validateDependencyTopology();

  for (const fullPkgName of topologicalOrder) {
    const pkg = fullPkgName.replace('@samrey/', '');
    const pkgDir = path.join(process.cwd(), 'packages', pkg);
    const srcIndex = path.join(pkgDir, 'src', 'index.ts');
    const distDir = path.join(pkgDir, 'dist');
    const srcDir = path.join(pkgDir, 'src');

    if (!fs.existsSync(srcIndex)) continue;

    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    // Build with tsc: output JS + .d.ts + sourcemaps into dist
    execSync(
      `npx tsc "${srcIndex}" --outDir "${distDir}" --rootDir "${srcDir}" --declaration --declarationMap --sourceMap --target ES2022 --module ESNext --moduleResolution bundler --skipLibCheck`,
      { cwd: process.cwd(), stdio: 'pipe' }
    );

    // Copy any static declaration files from src/ to dist/
    if (fs.existsSync(srcDir)) {
      const srcFiles = fs.readdirSync(srcDir);
      for (const file of srcFiles) {
        if (file.endsWith('.d.ts')) {
          fs.copyFileSync(path.join(srcDir, file), path.join(distDir, file));
        }
      }
    }

    // Build CLI bin bundle if cli
    if (pkg === 'cli') {
      execSync('npm run build', { cwd: pkgDir, stdio: 'pipe' });
    }
  }
}

if (process.argv[1]?.endsWith('build-packages.ts') || process.argv[1]?.endsWith('build-packages.js')) {
  console.log('▲ Building all Samrey packages to dist/...\n');
  buildAllPackages();
  console.log('▲ Finished building all packages.');
}
