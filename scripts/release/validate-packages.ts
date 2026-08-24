/**
 * @license Apache-2.0
 * @aether/monorepo - Release Package Manifest Validation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface PackageValidationResult {
  packageName: string;
  version: string;
  license: string;
  hasPublishConfig: boolean;
  hasEngines: boolean;
  hasFilesWhitelist: boolean;
  hasValidExports: boolean;
  isValid: boolean;
  errors: string[];
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

export function validateAllPackages(expectedVersion = '1.0.0'): { packages: PackageValidationResult[]; allValid: boolean } {
  const results: PackageValidationResult[] = [];
  let allValid = true;

  for (const pkg of PACKAGES) {
    const pkgPath = path.join(process.cwd(), 'packages', pkg, 'package.json');
    const errors: string[] = [];

    if (!fs.existsSync(pkgPath)) {
      results.push({
        packageName: `@aether/${pkg}`,
        version: 'missing',
        license: 'missing',
        hasPublishConfig: false,
        hasEngines: false,
        hasFilesWhitelist: false,
        hasValidExports: false,
        isValid: false,
        errors: [`Manifest missing at ${pkgPath}`]
      });
      allValid = false;
      continue;
    }

    const manifest = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    // Check Name
    const expectedName = `@aether/${pkg}`;
    if (manifest.name !== expectedName) {
      errors.push(`Expected name "${expectedName}", found "${manifest.name}"`);
    }

    // Check Version
    if (manifest.version !== expectedVersion) {
      errors.push(`Expected version "${expectedVersion}", found "${manifest.version}"`);
    }

    // Check License
    if (manifest.license !== 'Apache-2.0') {
      errors.push(`Expected license "Apache-2.0", found "${manifest.license}"`);
    }

    // Check Type Module
    if (manifest.type !== 'module') {
      errors.push(`Expected type "module", found "${manifest.type}"`);
    }

    // Check Repository
    if (!manifest.repository || (typeof manifest.repository === 'object' && !manifest.repository.url)) {
      errors.push('Missing repository metadata');
    }

    // Check PublishConfig
    const hasPublishConfig = manifest.publishConfig?.access === 'public';
    if (!hasPublishConfig) {
      errors.push('Missing or invalid publishConfig: { "access": "public" }');
    }

    // Check Engines
    const hasEngines = Boolean(manifest.engines?.node);
    if (!hasEngines) {
      errors.push('Missing engines.node requirement');
    }

    // Check Files Whitelist
    const hasFilesWhitelist = Array.isArray(manifest.files) && manifest.files.includes('src') && manifest.files.includes('README.md') && manifest.files.includes('LICENSE');
    if (!hasFilesWhitelist) {
      errors.push('Invalid files whitelist (must include src, README.md, LICENSE)');
    }

    // Check Exports Map
    const hasValidExports = Boolean(manifest.exports && manifest.exports['.']);
    if (!hasValidExports) {
      errors.push('Missing or invalid exports map');
    }

    // CLI specific check
    if (pkg === 'cli') {
      if (!manifest.bin?.aether) {
        errors.push('CLI package must expose "bin.aether" entry point');
      }
      if (!manifest.files.includes('bin')) {
        errors.push('CLI package files whitelist must include "bin"');
      }
    }

    const isValid = errors.length === 0;
    if (!isValid) {
      allValid = false;
    }

    results.push({
      packageName: manifest.name || `@aether/${pkg}`,
      version: manifest.version || 'unknown',
      license: manifest.license || 'unknown',
      hasPublishConfig,
      hasEngines,
      hasFilesWhitelist,
      hasValidExports,
      isValid,
      errors
    });
  }

  return { packages: results, allValid };
}

if (process.argv[1]?.endsWith('validate-packages.ts') || process.argv[1]?.endsWith('validate-packages.js')) {
  console.log('▲ Aether Package Manifest Hardening Audit\n');
  const { packages, allValid } = validateAllPackages();
  for (const pkg of packages) {
    console.log(`  • ${pkg.packageName}@${pkg.version} [${pkg.license}] -> ${pkg.isValid ? 'VALID' : 'INVALID'}`);
    if (pkg.errors.length > 0) {
      for (const err of pkg.errors) {
        console.log(`      ✕ ${err}`);
      }
    }
  }
  console.log(`\nPackage Manifest Audit: ${allValid ? 'PASSED (11/11 Valid)' : 'FAILED'}`);
  if (!allValid) {
    process.exit(1);
  }
}
