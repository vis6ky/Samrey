import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { packAllPackages } from '../scripts/release/pack.js';

describe('Issue 13: Packaging & Plain Node.js Consumer Import Acceptance', () => {
  it('installs packed tarballs into an external consumer and plain Node can import every package', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'samrey-consumer-test-'));
    const tarballDir = path.join(tempDir, 'tarballs');

    try {
      // 1. Pack all packages
      const packed = packAllPackages(tarballDir);
      assert.equal(packed.length, 11, 'Must produce 11 tarballs');

      // 2. Initialize consumer project
      const consumerDir = path.join(tempDir, 'consumer');
      fs.mkdirSync(consumerDir, { recursive: true });
      const dependencies: Record<string, string> = {};
      for (const p of packed) {
        dependencies[p.packageName] = `file:${p.destinationPath}`;
      }
      fs.writeFileSync(
        path.join(consumerDir, 'package.json'),
        JSON.stringify({ name: 'consumer-app', type: 'module', dependencies, overrides: dependencies }, null, 2),
        'utf8'
      );

      // 3. Install all tarballs using npm
      execSync('npm install --prefer-offline --no-audit', {
        cwd: consumerDir,
        stdio: 'pipe'
      });

      // 4. Test plain node import on every package entry point
      const packagesToImport = [
        '@samrey/security',
        '@samrey/reactivity',
        '@samrey/compiler',
        '@samrey/runtime',
        '@samrey/router',
        '@samrey/forms',
        '@samrey/http',
        '@samrey/ssr',
        '@samrey/devtools',
        '@samrey/testing',
        '@samrey/cli'
      ];

      for (const pkgName of packagesToImport) {
        const script = `import('${pkgName}').then(m => {
          if (!m || Object.keys(m).length === 0) process.exit(1);
        }).catch(err => {
          console.error(err);
          process.exit(1);
        });`;

        execSync(`node -e "${script.replace(/\n/g, ' ')}"`, {
          cwd: consumerDir,
          stdio: 'pipe'
        });
      }

      // Also specifically check samreyVitePlugin from @samrey/cli
      const vitePluginScript = `import { samreyVitePlugin } from '@samrey/cli';
      if (typeof samreyVitePlugin !== 'function') process.exit(1);`;
      execSync(`node -e "${vitePluginScript.replace(/\n/g, ' ')}"`, {
        cwd: consumerDir,
        stdio: 'pipe'
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
