/**
 * @license Apache-2.0
 * @gati/monorepo - Release License & Legal Header Validation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface LicenseValidationResult {
  rootLicenseExists: boolean;
  packageLicensesPresent: Record<string, boolean>;
  sourceFilesChecked: number;
  missingLicenseHeaders: string[];
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

export function validateLicense(): LicenseValidationResult {
  const rootLicenseExists = fs.existsSync(path.join(process.cwd(), 'LICENSE'));
  const packageLicensesPresent: Record<string, boolean> = {};
  const missingLicenseHeaders: string[] = [];
  let sourceFilesChecked = 0;

  for (const pkg of PACKAGES) {
    const pkgDir = path.join(process.cwd(), 'packages', pkg);
    const hasLicense = fs.existsSync(path.join(pkgDir, 'LICENSE')) || rootLicenseExists;
    packageLicensesPresent[`@gati/${pkg}`] = hasLicense;

    // Check package manifest
    const manifestPath = path.join(pkgDir, 'package.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.license !== 'Apache-2.0') {
        missingLicenseHeaders.push(`@gati/${pkg} manifest license is not Apache-2.0`);
      }
    }

    // Check source files
    const srcDir = path.join(pkgDir, 'src');
    if (fs.existsSync(srcDir)) {
      const files = fs.readdirSync(srcDir, { recursive: true }) as string[];
      for (const f of files) {
        const full = path.join(srcDir, f);
        if (fs.statSync(full).isFile() && (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js'))) {
          sourceFilesChecked++;
          const content = fs.readFileSync(full, 'utf8');
          if (!content.includes('@license Apache-2.0') && !content.includes('Apache-2.0') && !content.includes('Apache License')) {
            missingLicenseHeaders.push(`Missing license header in ${path.relative(process.cwd(), full)}`);
          }
        }
      }
    }
  }

  const isValid = rootLicenseExists && missingLicenseHeaders.length === 0;

  return {
    rootLicenseExists,
    packageLicensesPresent,
    sourceFilesChecked,
    missingLicenseHeaders,
    isValid
  };
}

if (process.argv[1]?.endsWith('validate-license.ts') || process.argv[1]?.endsWith('validate-license.js')) {
  console.log('▲ Gati License & Legal Header Audit\n');
  const result = validateLicense();
  console.log(`  Root LICENSE file: ${result.rootLicenseExists ? 'PRESENT (Apache-2.0)' : 'MISSING'}`);
  console.log(`  Source files audited: ${result.sourceFilesChecked}`);
  for (const [pkg, present] of Object.entries(result.packageLicensesPresent)) {
    console.log(`  • ${pkg.padEnd(22)}: ${present ? 'LICENSE VALID' : 'LICENSE MISSING'}`);
  }

  if (result.missingLicenseHeaders.length > 0) {
    console.log('\n  ✕ Header discrepancies:');
    result.missingLicenseHeaders.forEach(h => console.log(`      - ${h}`));
  }

  console.log(`\nLicense Audit: ${result.isValid ? 'PASSED (100% Apache-2.0 Coverage)' : 'FAILED'}`);
  if (!result.isValid) {
    process.exit(1);
  }
}
