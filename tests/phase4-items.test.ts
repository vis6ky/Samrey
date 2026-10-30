import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 4 - Hygiene & Infrastructure (4.2 - 4.5)', () => {
  const rootDir = process.cwd();

  test('4.2 CI Workflow: uses Bun for install with frozen lockfile and supports Node 18.x, 20.x, 22.x', () => {
    const ciPath = path.join(rootDir, '.github/workflows/ci.yml');
    assert.ok(fs.existsSync(ciPath), 'CI workflow file must exist');

    const ciContent = fs.readFileSync(ciPath, 'utf8');

    // Must not use npm ci which fails when only bun.lock is present
    assert.ok(!ciContent.includes('npm ci'), 'CI should not run `npm ci` without a package-lock.json');

    // Must use Bun setup and frozen lockfile install
    assert.ok(ciContent.includes('setup-bun'), 'CI should set up Bun');
    assert.ok(ciContent.includes('bun install --frozen-lockfile'), 'CI should install dependencies using bun install --frozen-lockfile');

    // Matrix must contain 18.x, 20.x, 22.x matching README compatibility table
    assert.ok(ciContent.includes('18.x'), 'CI node-version matrix must include 18.x');
    assert.ok(ciContent.includes('20.x'), 'CI node-version matrix must include 20.x');
    assert.ok(ciContent.includes('22.x'), 'CI node-version matrix must include 22.x');
  });

  test('4.3 Dev Script & /api/assistant Security: dev defaults to localhost, rate limiter exists', () => {
    const pkgJsonPath = path.join(rootDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

    // dev script must NOT bind to 0.0.0.0 by default
    assert.ok(!pkg.scripts.dev.includes('--host=0.0.0.0'), 'dev script should not bind to 0.0.0.0 by default; must default to localhost');
    // must have an explicit command or flag for host exposure (e.g. dev:host)
    assert.ok(pkg.scripts['dev:host']?.includes('--host=0.0.0.0') || pkg.scripts['dev:host']?.includes('--host'), 'must provide explicit dev:host script for network exposure');

    // Check vite.config.ts has rate limiting implemented for /api/assistant
    const viteConfigPath = path.join(rootDir, 'vite.config.ts');
    const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf8');
    assert.ok(viteConfigContent.includes('429'), 'vite.config.ts assistantApiPlugin must enforce rate limiting with HTTP 429');
    assert.ok(/rateLimit|rate_limit|requestCount|rateLimiter/i.test(viteConfigContent), 'vite.config.ts must have a rate limiter mechanism');
  });

  test('4.4 Asset Cleanup: public/assets/aistudio/*.pdf and *.txt must be removed', () => {
    const publicAssetsDir = path.join(rootDir, 'public/assets/aistudio');
    if (fs.existsSync(publicAssetsDir)) {
      const files = fs.readdirSync(publicAssetsDir);
      const pdfOrTxt = files.filter(f => f.endsWith('.pdf') || f.endsWith('.txt'));
      assert.strictEqual(
        pdfOrTxt.length,
        0,
        `public/assets/aistudio must not contain publicly exposed bug report PDFs or TXTs: found [${pdfOrTxt.join(', ')}]`
      );
    }
  });

  test('4.5 Metadata & Legal/CFF Consistency: version strings, repository URLs, and CITATION.cff', () => {
    // 1. Version strings consistency: SECURITY.md must reference 1.0.0
    const secContent = fs.readFileSync(path.join(rootDir, 'SECURITY.md'), 'utf8');
    assert.ok(secContent.includes('1.0.0') && !secContent.includes('1.0.0-rc.1'), 'SECURITY.md should reference 1.0.0 (not 1.0.0-rc.1)');

    // 2. CITATION.cff must not contain placeholders, all-zero ORCID, and must point to vis6ky/Samrey
    const cffContent = fs.readFileSync(path.join(rootDir, 'CITATION.cff'), 'utf8');
    assert.ok(!cffContent.includes('[Author Family Name Placeholder]'), 'CITATION.cff must not contain author placeholders');
    assert.ok(!cffContent.includes('[Institutional Placeholder]'), 'CITATION.cff must not contain institutional placeholders');
    assert.ok(!cffContent.includes('0000-0000-0000-0000'), 'CITATION.cff must not contain all-zero ORCID');
    assert.ok(cffContent.includes('vis6ky/Samrey'), 'CITATION.cff repository-code must point to vis6ky/Samrey');

    // 3. Package repositories must point to vis6ky/Samrey
    const pkgDirs = fs.readdirSync(path.join(rootDir, 'packages'));
    for (const dir of pkgDirs) {
      const p = path.join(rootDir, 'packages', dir, 'package.json');
      if (fs.existsSync(p)) {
        const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
        const repoStr = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url || '';
        assert.ok(repoStr.includes('vis6ky/Samrey'), `Package ${dir} repository must point to vis6ky/Samrey, found ${repoStr}`);
      }
    }
  });
});
