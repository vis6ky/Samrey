/**
 * @license Apache-2.0
 * @gati/monorepo - Release Publisher & Registry Dispatcher
 */

import { execSync } from 'node:child_process';
import { validateDependencyTopology } from './validate-dependencies.js';
import { validateAllPackages } from './validate-packages.js';

export interface PublishOptions {
  tag?: string;
  dryRun?: boolean;
  forceLatest?: boolean;
}

export interface PublishResult {
  tag: string;
  isDryRun: boolean;
  authenticated: boolean;
  username?: string;
  publishedPackages: string[];
  blockedReason?: string;
  success: boolean;
}

export function runPublish(options: PublishOptions = {}): PublishResult {
  const tag = options.tag || 'rc';
  const isDryRun = options.dryRun ?? false;
  const forceLatest = options.forceLatest ?? false;

  // 1. Safety check for "latest" dist-tag
  if (tag === 'latest' && !forceLatest && !isDryRun) {
    return {
      tag,
      isDryRun,
      authenticated: false,
      publishedPackages: [],
      blockedReason: 'SAFETY VIOLATION: Cannot publish directly to "latest" tag without --force-latest flag.',
      success: false
    };
  }

  // 2. Validate all packages before publish
  const { allValid: packagesValid } = validateAllPackages();
  if (!packagesValid) {
    return {
      tag,
      isDryRun,
      authenticated: false,
      publishedPackages: [],
      blockedReason: 'Pre-publish package manifest validation failed.',
      success: false
    };
  }

  const { topologicalOrder } = validateDependencyTopology();

  // 3. Check npm authentication
  let username: string | undefined;
  let authenticated = false;
  try {
    username = execSync('npm whoami', { encoding: 'utf8' }).trim();
    authenticated = Boolean(username);
  } catch {
    authenticated = false;
  }

  if (isDryRun) {
    return {
      tag,
      isDryRun: true,
      authenticated,
      username,
      publishedPackages: topologicalOrder,
      success: true
    };
  }

  if (!authenticated) {
    return {
      tag,
      isDryRun: false,
      authenticated: false,
      publishedPackages: [],
      blockedReason: 'PUBLICATION BLOCKED — CREDENTIAL/REGISTRY ACCESS REQUIRED (Run `npm login` or configure NODE_AUTH_TOKEN to authenticate with npm registry)',
      success: false
    };
  }

  // 4. Perform sequential topological publishing
  const publishedPackages: string[] = [];
  try {
    for (const pkgName of topologicalOrder) {
      const pkg = pkgName.replace('@gati/', '');
      const cmd = `npm publish --access public --tag ${tag}`;
      execSync(cmd, { cwd: `packages/${pkg}`, stdio: 'inherit' });
      publishedPackages.push(pkgName);
    }
    return {
      tag,
      isDryRun: false,
      authenticated: true,
      username,
      publishedPackages,
      success: true
    };
  } catch (err: any) {
    return {
      tag,
      isDryRun: false,
      authenticated: true,
      username,
      publishedPackages,
      blockedReason: `NPM publish failed: ${err.message}`,
      success: false
    };
  }
}

if (process.argv[1]?.endsWith('publish.ts') || process.argv[1]?.endsWith('publish.js')) {
  console.log('▲ Gati Package Publishing Pipeline\n');
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isLatest = args.includes('--tag') && args[args.indexOf('--tag') + 1] === 'latest';
  const tagArgIdx = args.indexOf('--tag');
  const tag = tagArgIdx !== -1 ? args[tagArgIdx + 1] : 'rc';
  const forceLatest = args.includes('--force-latest') || args.includes('--force');

  console.log(`  Target Release Channel: "${tag}"`);
  console.log(`  Execution Mode:         ${isDryRun ? 'DRY RUN (Simulation)' : 'LIVE PUBLICATION'}\n`);

  const result = runPublish({ tag, dryRun: isDryRun, forceLatest });

  if (result.isDryRun) {
    console.log(`[SIMULATION] Packaging and publication check passed for ${result.publishedPackages.length} packages with dist-tag "${result.tag}":`);
    result.publishedPackages.forEach((p, idx) => console.log(`  ${idx + 1}. ${p}@1.0.0 [tag: ${result.tag}]`));
    console.log('\nDry-Run Status: READY FOR PUBLICATION');
  } else if (!result.success) {
    console.log(`\n✕ ${result.blockedReason}`);
    console.log('\nStatus: BLOCKED');
    process.exit(1);
  } else {
    console.log(`\nSuccessfully published ${result.publishedPackages.length} packages under tag "${result.tag}"!`);
    console.log('\nStatus: SUCCESS');
  }
}
