import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const TARGET_VERSION = '2.0.0';
const TARGET_RANGE = '^2.0.0';
const rootDir = process.cwd();

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
  'ai',
  'mcp-server',
  'cli'
];

describe('Version 2.0.0 & Registry Consistency Gate', () => {
  it('1. Verifies root package.json has version 2.0.0', () => {
    const rootManifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.strictEqual(
      rootManifest.version,
      TARGET_VERSION,
      `Root package.json version is "${rootManifest.version}", expected "${TARGET_VERSION}"`
    );
  });

  it('2. Verifies all 11 package manifests have version 2.0.0', () => {
    for (const pkg of PACKAGES) {
      const pPath = path.join(rootDir, 'packages', pkg, 'package.json');
      assert.ok(fs.existsSync(pPath), `packages/${pkg}/package.json must exist`);
      const manifest = JSON.parse(fs.readFileSync(pPath, 'utf8'));
      assert.strictEqual(
        manifest.version,
        TARGET_VERSION,
        `packages/${pkg}/package.json version is "${manifest.version}", expected "${TARGET_VERSION}"`
      );
    }
  });

  it('3. Verifies all internal @samrey/* dependency ranges are ^2.0.0', () => {
    for (const pkg of PACKAGES) {
      const pPath = path.join(rootDir, 'packages', pkg, 'package.json');
      const manifest = JSON.parse(fs.readFileSync(pPath, 'utf8'));
      const allDeps = {
        ...(manifest.dependencies || {}),
        ...(manifest.devDependencies || {}),
        ...(manifest.peerDependencies || {})
      };
      for (const [depName, depVer] of Object.entries(allDeps)) {
        if (depName.startsWith('@samrey/')) {
          assert.strictEqual(
            depVer,
            TARGET_RANGE,
            `packages/${pkg}/package.json internal dep "${depName}" is "${depVer}", expected "${TARGET_RANGE}"`
          );
        }
      }
    }
  });

  it('4. Verifies starter template packages in CLI use ^2.0.0', () => {
    const starterTs = fs.readFileSync(path.join(rootDir, 'packages/cli/src/starter-template.ts'), 'utf8');
    assert.ok(
      starterTs.includes(`'@samrey/compiler': '${TARGET_RANGE}'`),
      `Starter template must specify @samrey/compiler: ${TARGET_RANGE}`
    );
    assert.ok(
      starterTs.includes(`'@samrey/reactivity': '${TARGET_RANGE}'`),
      `Starter template must specify @samrey/reactivity: ${TARGET_RANGE}`
    );
    assert.ok(
      starterTs.includes(`'@samrey/runtime': '${TARGET_RANGE}'`),
      `Starter template must specify @samrey/runtime: ${TARGET_RANGE}`
    );
    assert.ok(
      starterTs.includes(`'@samrey/router': '${TARGET_RANGE}'`),
      `Starter template must specify @samrey/router: ${TARGET_RANGE}`
    );
    assert.ok(
      starterTs.includes(`'@samrey/ssr': '${TARGET_RANGE}'`),
      `Starter template must specify @samrey/ssr: ${TARGET_RANGE}`
    );
    assert.ok(
      starterTs.includes(`'@samrey/devtools': '${TARGET_RANGE}'`),
      `Starter template must specify @samrey/devtools: ${TARGET_RANGE}`
    );
    assert.ok(
      starterTs.includes(`'@samrey/cli': '${TARGET_RANGE}'`),
      `Starter template must specify @samrey/cli: ${TARGET_RANGE}`
    );
  });

  it('5. Verifies repository/homepage/bugs URLs point to vis6ky/Samrey in all package manifests', () => {
    for (const pkg of PACKAGES) {
      const pPath = path.join(rootDir, 'packages', pkg, 'package.json');
      const manifest = JSON.parse(fs.readFileSync(pPath, 'utf8'));
      const repoUrl = typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url || '';
      assert.ok(
        repoUrl.includes('github.com/vis6ky/Samrey'),
        `packages/${pkg}/package.json repository must point to https://github.com/vis6ky/Samrey.git, found: ${repoUrl}`
      );
      assert.ok(
        manifest.homepage?.includes('github.com/vis6ky/Samrey'),
        `packages/${pkg}/package.json homepage must point to https://github.com/vis6ky/Samrey#readme, found: ${manifest.homepage}`
      );
      assert.ok(
        manifest.bugs?.url?.includes('github.com/vis6ky/Samrey/issues'),
        `packages/${pkg}/package.json bugs must point to https://github.com/vis6ky/Samrey/issues, found: ${manifest.bugs?.url}`
      );
    }
  });

  it('6. Verifies documentation and metadata files are synchronized to 2.0.0', () => {
    // 1. SECURITY.md
    const secContent = fs.readFileSync(path.join(rootDir, 'SECURITY.md'), 'utf8');
    assert.ok(
      secContent.includes('2.x') && secContent.includes('1.x'),
      'SECURITY.md must declare 2.x as supported and 1.x as unsupported'
    );

    // 2. CITATION.cff
    const cffContent = fs.readFileSync(path.join(rootDir, 'CITATION.cff'), 'utf8');
    assert.ok(
      cffContent.includes('version: "2.0.0"') || cffContent.includes('version: 2.0.0'),
      'CITATION.cff must specify version: 2.0.0'
    );

    // 3. codemeta.json
    const codeMeta = JSON.parse(fs.readFileSync(path.join(rootDir, 'codemeta.json'), 'utf8'));
    assert.strictEqual(codeMeta.version, TARGET_VERSION, 'codemeta.json version must be 2.0.0');

    // 4. README.md
    const readmeContent = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
    assert.ok(
      readmeContent.includes('2.0.0') || readmeContent.includes('v2.0.0') || readmeContent.includes('Samrey 2'),
      'README.md must reference 2.0.0'
    );

    // 5. CHANGELOG.md has 2.0.0 and Migration from 1.0.x
    const changelogContent = fs.readFileSync(path.join(rootDir, 'CHANGELOG.md'), 'utf8');
    assert.ok(
      changelogContent.includes('## [2.0.0]'),
      'CHANGELOG.md must contain ## [2.0.0]'
    );
    assert.ok(
      changelogContent.includes('Migration from 1.0.x') || changelogContent.includes('Migration from 1.0'),
      'CHANGELOG.md must document Migration from 1.0.x'
    );
  });

  it('7. Verifies example apps are updated to 2.0.0 and ^2.0.0', () => {
    const examples = ['project-manager', 'ssg', 'ssr', 'task-details-app'];
    for (const ex of examples) {
      const pPath = path.join(rootDir, 'examples', ex, 'package.json');
      const manifest = JSON.parse(fs.readFileSync(pPath, 'utf8'));
      assert.strictEqual(manifest.version, TARGET_VERSION, `examples/${ex} version must be ${TARGET_VERSION}`);
      const deps = { ...(manifest.dependencies || {}), ...(manifest.devDependencies || {}) };
      for (const [dep, range] of Object.entries(deps)) {
        if (dep.startsWith('@samrey/')) {
          assert.strictEqual(range, TARGET_RANGE, `examples/${ex} dep ${dep} must be ${TARGET_RANGE}`);
        }
      }
    }
  });

  it('8. Verifies no tracked package.json or source code mentions old version outside CHANGELOG history', () => {
    // Check all package manifests and root manifest
    const manifests = [
      path.join(rootDir, 'package.json'),
      ...PACKAGES.map(pkg => path.join(rootDir, 'packages', pkg, 'package.json')),
      ...['project-manager', 'ssg', 'ssr', 'task-details-app'].map(ex => path.join(rootDir, 'examples', ex, 'package.json'))
    ];

    for (const mPath of manifests) {
      const raw = fs.readFileSync(mPath, 'utf8');
      assert.ok(!raw.includes('"1.0.0"'), `${mPath} must not contain "1.0.0"`);
      assert.ok(!raw.includes('"1.0.1"'), `${mPath} must not contain "1.0.1"`);
      assert.ok(!raw.includes('"1.0.0-rc.1"'), `${mPath} must not contain "1.0.0-rc.1"`);
      assert.ok(!raw.includes('^1.0.0'), `${mPath} must not contain "^1.0.0"`);
      assert.ok(!raw.includes('^1.0.1'), `${mPath} must not contain "^1.0.1"`);
      assert.ok(!raw.includes('^1.0.0-rc.1'), `${mPath} must not contain "^1.0.0-rc.1"`);
    }
  });
});
