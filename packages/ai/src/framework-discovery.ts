/**
 * @license Apache-2.0
 * @samrey/ai - Framework & Project Discovery Engine
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface InstalledSamreyPackage {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency' | 'workspace';
}

export interface SamreyProjectContext {
  projectRoot: string;
  projectName: string;
  projectVersion: string;
  isSamreyProject: boolean;
  frameworkVersion: string;
  installedPackages: InstalledSamreyPackage[];
  features: {
    ssr: boolean;
    routing: boolean;
    forms: boolean;
    http: boolean;
    testing: boolean;
    devtools: boolean;
    security: boolean;
    compiler: boolean;
  };
  configFiles: string[];
  sourceDirs: string[];
  entryFiles: string[];
  componentCount: number;
  warnings: string[];
}

export const ALL_OFFICIAL_PACKAGES = [
  '@samrey/reactivity',
  '@samrey/runtime',
  '@samrey/compiler',
  '@samrey/security',
  '@samrey/router',
  '@samrey/forms',
  '@samrey/http',
  '@samrey/ssr',
  '@samrey/testing',
  '@samrey/devtools',
  '@samrey/cli',
  '@samrey/ai',
  '@samrey/mcp-server'
];

export function discoverSamreyProject(projectRoot = process.cwd()): SamreyProjectContext {
  const root = path.resolve(projectRoot);
  const warnings: string[] = [];

  let projectName = 'unknown';
  let projectVersion = '1.0.0';
  let frameworkVersion = 'unknown';
  let isSamreyProject = false;
  const installedPackages: InstalledSamreyPackage[] = [];

  const pkgJsonPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      projectName = pkg.name || path.basename(root);
      projectVersion = pkg.version || '1.0.0';

      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};

      for (const [name, ver] of Object.entries(deps)) {
        if (name.startsWith('@samrey/')) {
          installedPackages.push({ name, version: String(ver), type: 'dependency' });
          if (frameworkVersion === 'unknown') {
            frameworkVersion = String(ver).replace(/^[\^~]/, '');
          }
        }
      }

      for (const [name, ver] of Object.entries(devDeps)) {
        if (name.startsWith('@samrey/')) {
          installedPackages.push({ name, version: String(ver), type: 'devDependency' });
          if (frameworkVersion === 'unknown') {
            frameworkVersion = String(ver).replace(/^[\^~]/, '');
          }
        }
      }

      // Check if root itself is a Samrey package or monorepo
      if (pkg.name?.startsWith('@samrey/')) {
        isSamreyProject = true;
        frameworkVersion = pkg.version || '2.0.0';
      } else if (installedPackages.length > 0) {
        isSamreyProject = true;
      }

      // If monorepo workspaces exist, also discover packages in packages/*
      const packagesDir = path.join(root, 'packages');
      if (fs.existsSync(packagesDir)) {
        try {
          const entries = fs.readdirSync(packagesDir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const subPkgPath = path.join(packagesDir, entry.name, 'package.json');
              if (fs.existsSync(subPkgPath)) {
                const subPkg = JSON.parse(fs.readFileSync(subPkgPath, 'utf8'));
                if (subPkg.name && !installedPackages.some((p) => p.name === subPkg.name)) {
                  installedPackages.push({
                    name: subPkg.name,
                    version: subPkg.version || '2.0.0',
                    type: 'workspace'
                  });
                }
              }
            }
          }
        } catch {}
      }
    } catch (e: any) {
      warnings.push(`Failed to parse package.json: ${e?.message || e}`);
    }
  } else {
    warnings.push(`No package.json found at project root: ${root}`);
  }

  // Detect feature flags based on installed packages and file structures
  const hasPkg = (name: string) => installedPackages.some((p) => p.name === name);

  const features = {
    ssr: hasPkg('@samrey/ssr') || fs.existsSync(path.join(root, 'server.ts')) || fs.existsSync(path.join(root, 'src/server.ts')),
    routing: hasPkg('@samrey/router') || fs.existsSync(path.join(root, 'src/routes')),
    forms: hasPkg('@samrey/forms'),
    http: hasPkg('@samrey/http'),
    testing: hasPkg('@samrey/testing'),
    devtools: hasPkg('@samrey/devtools'),
    security: hasPkg('@samrey/security'),
    compiler: hasPkg('@samrey/compiler') || fs.existsSync(path.join(root, 'vite.config.ts'))
  };

  // Discover config files
  const candidateConfigs = [
    'vite.config.ts',
    'vite.config.js',
    'tsconfig.json',
    'tailwind.config.js',
    'tailwind.config.ts',
    '.cursor/mcp.json',
    'claude_desktop_config.json',
    'AGENTS.md',
    'GEMINI.md',
    'CLAUDE.md'
  ];
  const configFiles = candidateConfigs.filter((c) => fs.existsSync(path.join(root, c)));

  // Discover source directories
  const candidateDirs = ['src', 'packages', 'app', 'routes', 'components', 'lib'];
  const sourceDirs = candidateDirs.filter((d) => fs.existsSync(path.join(root, d)));

  // Discover entry files
  const candidateEntries = [
    'src/main.ts',
    'src/main.tsx',
    'src/index.ts',
    'src/index.tsx',
    'src/App.ts',
    'src/App.tsx',
    'server.ts',
    'src/server.ts'
  ];
  const entryFiles = candidateEntries.filter((e) => fs.existsSync(path.join(root, e)));

  // Count component files (*.tsx or Component*.ts)
  let componentCount = 0;
  function countComponents(dir: string, depth = 0) {
    if (depth > 6 || !fs.existsSync(dir)) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          countComponents(full, depth + 1);
        } else if (entry.isFile()) {
          if (entry.name.endsWith('.tsx') || (entry.name.endsWith('.ts') && /^[A-Z]/.test(entry.name))) {
            componentCount++;
          }
        }
      }
    } catch {}
  }

  for (const sDir of sourceDirs) {
    countComponents(path.join(root, sDir));
  }

  if (isSamreyProject && installedPackages.length === 0 && !pkgJsonPath.includes('packages')) {
    warnings.push('Samrey project detected, but no @samrey/* packages found in dependencies.');
  }

  return {
    projectRoot: root,
    projectName,
    projectVersion,
    isSamreyProject,
    frameworkVersion: frameworkVersion === 'unknown' ? '2.0.0' : frameworkVersion,
    installedPackages,
    features,
    configFiles,
    sourceDirs,
    entryFiles,
    componentCount,
    warnings
  };
}
