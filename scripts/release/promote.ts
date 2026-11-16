/**
 * @license Apache-2.0
 * @samrey/monorepo - Dist-Tag Promotion Pipeline (e.g. rc -> latest)
 */

import { execSync } from 'node:child_process';
import { validateDependencyTopology } from './validate-dependencies.js';

export function promoteDistTag(targetTag = 'latest', sourceVersion = '2.1.0'): void {
  const { topologicalOrder } = validateDependencyTopology();

  console.log(`▲ Promoting ${topologicalOrder.length} packages (@version ${sourceVersion}) to dist-tag "${targetTag}"...\n`);

  for (const pkgName of topologicalOrder) {
    const cmd = `npm dist-tag add ${pkgName}@${sourceVersion} ${targetTag}`;
    try {
      console.log(`  ➜ ${cmd}`);
      execSync(cmd, { stdio: 'inherit' });
    } catch (err: any) {
      console.error(`  ✕ Failed to promote ${pkgName}:`, err?.message || err);
      process.exit(1);
    }
  }

  console.log(`\n🎉 Successfully promoted all ${topologicalOrder.length} packages to "${targetTag}"!`);
}

if (process.argv[1]?.endsWith('promote.ts') || process.argv[1]?.endsWith('promote.js')) {
  const args = process.argv.slice(2);
  const tag = args[0] || 'latest';
  const ver = args[1] || '2.1.0';
  promoteDistTag(tag, ver);
}

