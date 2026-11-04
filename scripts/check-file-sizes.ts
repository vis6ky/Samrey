/**
 * @license Apache-2.0
 * CI/Pre-commit check to ensure no tracked file exceeds 5 MB.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const rootDir = process.cwd();

function checkTrackedFileSizes(): void {
  let trackedFiles: string[] = [];
  try {
    const output = execSync('git ls-files', { cwd: rootDir, encoding: 'utf8' });
    trackedFiles = output.split('\n').map((l) => l.trim()).filter(Boolean);
  } catch (err: any) {
    console.error('[File Size Check] Failed to execute git ls-files:', err.message);
    process.exit(1);
  }

  const oversizedFiles: { file: string; size: number }[] = [];

  for (const relFile of trackedFiles) {
    const fullPath = path.resolve(rootDir, relFile);
    if (fs.existsSync(fullPath)) {
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && stat.size > MAX_FILE_SIZE_BYTES) {
          oversizedFiles.push({ file: relFile, size: stat.size });
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  if (oversizedFiles.length > 0) {
    console.error('\n❌ [File Size Check FAILED] The following tracked files exceed the 5 MB limit:');
    for (const item of oversizedFiles) {
      const mb = (item.size / (1024 * 1024)).toFixed(2);
      console.error(`  - ${item.file} (${mb} MB, limit: 5.00 MB)`);
    }
    console.error('\nPlease remove or untrack large files before committing.\n');
    process.exit(1);
  }

  console.log(`✅ [File Size Check PASSED] All ${trackedFiles.length} tracked files are under 5 MB.`);
}

checkTrackedFileSizes();
