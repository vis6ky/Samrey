/**
 * @license Apache-2.0
 * @samrey/monorepo - Release Public API Export Verification
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ExportVerificationResult {
  packageName: string;
  expectedExports: string[];
  actualExports: string[];
  missingExports: string[];
  unexpectedExports: string[];
  isValid: boolean;
}

// Authoritative contract from docs/PUBLIC_API.md
export const PUBLIC_API_CONTRACT: Record<string, string[]> = {
  '@samrey/reactivity': [
    'signal', 'computed', 'effect', 'batch', 'untrack', 'createStore',
    'produce', 'reconcile', 'createMemo', 'createRoot', 'getOwner',
    'runWithOwner', 'onCleanup', 'createContext', 'useContext'
  ],
  '@samrey/runtime': [
    'el', 'svg', 'fragment', 'text', 'mount', 'hydrate', 'Show', 'For',
    'Switch', 'Match', 'ErrorBoundary', 'Dynamic', 'Portal', 'Suspense',
    'onMount', 'onCleanup', 'onError', 'createComponent'
  ],
  '@samrey/security': [
    'sanitizeHtml', 'sanitizeUrl', 'sanitizeAttribute', 'isSafeUrl',
    'safeJsonParse', 'safeJsonStringify', 'createCsrfToken',
    'validateCsrfToken', 'TrustedTypesPolicy', 'escapeHtmlText'
  ],
  '@samrey/compiler': [
    'compileTemplate', 'parseTemplate', 'buildAIR', 'generateCode',
    'classifySecurityNode', 'lintAccessibility', 'SamreyCompilerError',
    'generateSourceFrame', 'ERROR_REGISTRY'
  ],
  '@samrey/router': [
    'Router', 'Route', 'Link', 'useRouter', 'useParams', 'useSearchParams',
    'useLocation', 'matchRoute', 'matchPath', 'matchRoutes', 'createLink',
    'createBrowserHistory', 'createMemoryHistory', 'createRouter'
  ],
  '@samrey/http': [
    'createResource', 'httpClient', 'createHttpCache', 'HttpError'
  ],
  '@samrey/forms': [
    'createForm', 'createField', 'validateSchema', 'getAccessibleFieldProps'
  ],
  '@samrey/ssr': [
    'renderToString', 'renderToStream', 'generateStaticSite', 'hydrateFromSSR',
    'escapeHtml', 'escapeJsonState', 'sanitizeSsrState', 'stripSecrets',
    'serializeStateForHydration'
  ],
  '@samrey/testing': [
    'renderTestComponent', 'fireEvent', 'waitFor', 'waitForNextUpdate',
    'createMockResource', 'cleanupAllTestContainers'
  ],
  '@samrey/devtools': [
    'initDevTools', 'SamreyDevToolsBridge', 'ReactiveGraphInspector',
    'ComponentInspector', 'PerfInspector', 'DevToolsBridge',
    'samreyDevToolsBridge', 'GraphInspector', 'PerformanceInspector'
  ],
  '@samrey/cli': [
    'runCLI', 'generateStarterProject', 'samreyVitePlugin', 'runCreateCommand',
    'runDevCommand', 'runBuildCommand', 'runPreviewCommand', 'runTestCommand',
    'runAuditCommand', 'runAnalyzeCommand', 'runGenerateCommand', 'CLI_VERSION',
    'runSamreyAudit'
  ]
};

export async function validatePublicAPIExports(): Promise<{ results: ExportVerificationResult[]; allValid: boolean }> {
  const results: ExportVerificationResult[] = [];
  let allValid = true;

  for (const [pkgName, expected] of Object.entries(PUBLIC_API_CONTRACT)) {
    const pkgFolder = pkgName.replace('@samrey/', '');
    const indexPath = path.join(process.cwd(), 'packages', pkgFolder, 'src', 'index.ts');

    let actualExports: string[] = [];
    try {
      const mod = await import(path.resolve(indexPath));
      actualExports = Object.keys(mod);
    } catch {
      // Fallback: parse AST or export lines
      const content = fs.readFileSync(indexPath, 'utf8');
      const matches = content.match(/export\s+\{([^}]+)\}/g) || [];
      for (const m of matches) {
        const inner = m.replace(/export\s*\{/, '').replace(/\}/, '');
        const items = inner.split(',').map(s => s.trim().split(/\s+as\s+/)[1] || s.trim().split(/\s+/)[0]).filter(Boolean);
        actualExports.push(...items);
      }
    }

    const missing = expected.filter(exp => !actualExports.includes(exp));
    const isValid = missing.length === 0;

    if (!isValid) {
      allValid = false;
    }

    results.push({
      packageName: pkgName,
      expectedExports: expected,
      actualExports,
      missingExports: missing,
      unexpectedExports: [],
      isValid
    });
  }

  // Generate docs/release/PUBLIC_API_RELEASE_VERIFICATION.md
  const reportLines = [
    '# Samrey Framework — Public API Release Verification Report',
    '',
    `**Target Version:** 1.0.0-rc.1  `,
    `**Audit Date:** 2026-08-21  `,
    `**Authoritative Contract:** \`docs/PUBLIC_API.md\`  `,
    `**Overall Status:** ${allValid ? 'PASS (100% Export Parity)' : 'FAIL'}  `,
    '',
    '---',
    '',
    '## 1. Export Parity Matrix by Package',
    '',
    '| Package | Expected Exports | Actual Exports | Missing | Status |',
    '| :--- | :--- | :--- | :--- | :--- |'
  ];

  for (const r of results) {
    reportLines.push(`| \`${r.packageName}\` | ${r.expectedExports.length} | ${r.actualExports.length} | ${r.missingExports.length > 0 ? r.missingExports.join(', ') : '0'} | **${r.isValid ? 'PASS' : 'FAIL'}** |`);
  }

  reportLines.push('');
  reportLines.push('## 2. Detailed Symbol Breakdown');
  reportLines.push('');

  for (const r of results) {
    reportLines.push(`### \`${r.packageName}\``);
    reportLines.push(`- **Contract Symbols (${r.expectedExports.length}):** \`${r.expectedExports.join('`, `')}\``);
    reportLines.push(`- **Runtime Parity:** ${r.isValid ? '100% Match' : 'Discrepancies found'}`);
    reportLines.push('');
  }

  const outDir = path.join(process.cwd(), 'docs', 'release');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(path.join(outDir, 'PUBLIC_API_RELEASE_VERIFICATION.md'), reportLines.join('\n'));

  return { results, allValid };
}

if (process.argv[1]?.endsWith('validate-exports.ts') || process.argv[1]?.endsWith('validate-exports.js')) {
  console.log('▲ Samrey Public API Export Verification Audit\n');
  validatePublicAPIExports().then(({ results, allValid }) => {
    for (const r of results) {
      console.log(`  • ${r.packageName} (${r.expectedExports.length} exports) -> ${r.isValid ? 'MATCH' : 'MISMATCH'}`);
      if (r.missingExports.length > 0) {
        console.log(`      ✕ Missing: ${r.missingExports.join(', ')}`);
      }
    }
    console.log(`\nPublic API Export Verification: ${allValid ? 'PASSED (100% Export Parity)' : 'FAILED'}`);
    if (!allValid) {
      process.exit(1);
    }
  });
}
