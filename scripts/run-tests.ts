import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function findTestFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry !== 'node_modules' && entry !== 'dist' && entry !== '.git') {
        results.push(...findTestFiles(fullPath));
      }
    } else if (entry.endsWith('.test.ts') || entry.endsWith('.test.js')) {
      results.push(fullPath);
    }
  }

  return results;
}

async function main() {
  console.log('🔍 Running Aether Monorepo Test Suites...');
  const testFiles = [
    ...findTestFiles(resolve('packages')),
    ...findTestFiles(resolve('tests'))
  ];

  console.log(`Found ${testFiles.length} test files. Executing...`);

  const res = spawnSync('node', ['--import', 'tsx', '--test', ...testFiles], {
    stdio: 'inherit',
    shell: false
  });

  if (res.status !== 0) {
    console.error(`\n❌ Some test suites failed.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All ${testFiles.length} Test Suites Passed Successfully!`);
  }
}

main().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
