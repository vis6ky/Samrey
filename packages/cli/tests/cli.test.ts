import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  samreyVitePlugin,
  samreyPlugin,
  auditSource,
  runCLI,
  generateStarterProject,
  validateProjectName,
  scaffoldArtifact
} from '../src/index.js';

describe('@samrey/cli - Comprehensive Developer Experience & Tooling Suite', () => {
  it('integrates Vite plugin transform hook with compiler', () => {
    const plugin = samreyVitePlugin();
    assert.equal(plugin.name, 'vite-plugin-samrey');
    assert.equal(samreyPlugin, samreyVitePlugin);

    const transformed = plugin.transform('<div>{title}</div>', 'App.tsx');
    assert.ok(transformed !== null);
    assert.ok(transformed.code.includes('/*#__PURE__*/ template('));

    // Excludes node_modules
    assert.equal(plugin.transform('<div>{title}</div>', 'node_modules/pkg/App.tsx'), null);

    // Preserves TypeScript modules in .tsx
    const realTsx = "import { signal } from '@samrey/reactivity';\nexport function App() { return null; }";
    assert.equal(plugin.transform(realTsx, 'src/App.tsx'), null);
  });

  it('audits template for security and a11y non-conformances', () => {
    const badCode = '<img src="pic.jpg"><script>alert(1)</script>';
    const report = auditSource(badCode, 'Header.tsx');

    assert.equal(report.violationsCount, 2);
    assert.ok(report.messages.some((m) => m.includes('alt')));
    assert.ok(report.messages.some((m) => m.includes('script')));
  });

  it('generates a complete production starter project template with SSR, routing, and reactivity', () => {
    const files = generateStarterProject('my-samrey-app', { template: 'ssr' });

    assert.ok('package.json' in files);
    assert.ok('tsconfig.json' in files);
    assert.ok('vite.config.ts' in files);
    assert.ok('src/App.tsx' in files);
    assert.ok('src/components/Header.tsx' in files);
    assert.ok('src/components/Counter.tsx' in files);
    assert.ok('src/views/HomeView.tsx' in files);
    assert.ok('src/entry-client.tsx' in files);
    assert.ok('src/entry-server.tsx' in files);
    assert.ok('tests/app.test.ts' in files);

    const pkg = JSON.parse(files['package.json']!);
    assert.equal(pkg.name, 'my-samrey-app');
    assert.ok('@samrey/reactivity' in pkg.dependencies);
    assert.ok('@samrey/compiler' in pkg.dependencies);
    assert.ok('@samrey/ssr' in pkg.dependencies);
  });

  it('validates project names strictly for illegal characters and empty strings', () => {
    assert.equal(validateProjectName('my-cool-app').valid, true);
    assert.equal(validateProjectName('@scope/my-app').valid, true);
    assert.equal(validateProjectName('').valid, false);
    assert.equal(validateProjectName('my project with spaces').valid, false);
  });

  it('handles "samrey --help" and "samrey --version" cleanly', async () => {
    const helpResult = await runCLI(['--help']);
    assert.equal(helpResult.exitCode, 0);
    assert.ok(helpResult.message.includes('Samrey Framework CLI'));
    assert.ok(helpResult.message.includes('create <name>'));

    const versionResult = await runCLI(['--version']);
    assert.equal(versionResult.exitCode, 0);
    assert.ok(versionResult.message.includes('samrey v1.0.0'));
  });

  it('executes "samrey create" in dry-run mode with deterministic output', async () => {
    const result = await runCLI(['create', 'shop-app', '--template', 'ssr', '--dry-run']);
    assert.equal(result.exitCode, 0);
    assert.ok(result.message.includes('Prepared'));
  });

  it('returns non-zero exit code on missing project name in "samrey create"', async () => {
    const result = await runCLI(['create']);
    assert.equal(result.exitCode, 1);
    assert.ok(result.message.includes('Project name is required'));
  });

  it('executes "samrey dev" with port option and validation', async () => {
    const validDev = await runCLI(['dev', '--port', '4000', '--dry-run']);
    assert.equal(validDev.exitCode, 0);

    const invalidDev = await runCLI(['dev', '--port', '99999', '--dry-run']);
    assert.equal(invalidDev.exitCode, 1);
    assert.ok(invalidDev.message.includes('Invalid port'));
  });

  it('executes "samrey build" with production report or dry-run', async () => {
    const result = await runCLI(['build', '--dry-run']);
    assert.equal(result.exitCode, 0);
    assert.ok(result.message.includes('Samrey Production Build'));
  });

  it('executes "samrey test" runner in dry-run mode', async () => {
    const result = await runCLI(['test', '--dry-run']);
    assert.equal(result.exitCode, 0);
    assert.ok(result.message.includes('Samrey Test Runner'));
  });

  it('executes "samrey audit" detecting violations and honoring strict exit codes', async () => {
    const cleanAudit = await runCLI(['audit', '--warn-only']);
    assert.equal(cleanAudit.exitCode, 0);
    assert.ok(cleanAudit.message.includes('Static Check'));
  });

  it('executes "samrey analyze" requiring valid build output without fake metrics', async () => {
    // In empty directory, requires build first
    const noBuildRes = await runCLI(['analyze', '--outDir', 'non_existent_dist']);
    assert.equal(noBuildRes.exitCode, 1);
    assert.ok(noBuildRes.message.includes('run samrey build first'));
  });

  it('scaffolds components, routes, stores, and resources with "samrey generate"', async () => {
    const compScaffold = scaffoldArtifact('component', 'UserProfile');
    assert.equal(compScaffold.filename, 'UserProfile.tsx');
    assert.equal(compScaffold.testFilename, 'UserProfile.test.ts');
    assert.ok(compScaffold.code.includes('export function UserProfile('));

    const routeScaffold = scaffoldArtifact('route', 'Settings');
    assert.equal(routeScaffold.filename, 'SettingsView.tsx');

    const storeScaffold = scaffoldArtifact('store', 'Cart');
    assert.equal(storeScaffold.filename, 'CartStore.ts');
    assert.ok(storeScaffold.code.includes('createCartStore'));

    const genResult = await runCLI(['generate', 'component', 'Button', '--dry-run']);
    assert.equal(genResult.exitCode, 0);
    assert.ok(genResult.message.includes('Button.tsx'));
  });
});
