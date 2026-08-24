/**
 * @license Apache-2.0
 * @aether/monorepo - Release Dependency Topology Validation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface TopologyResult {
  graph: Record<string, string[]>;
  topologicalOrder: string[];
  hasCycles: boolean;
  foreignFrameworkViolations: string[];
  invalidWorkspaceRefs: string[];
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

const FORBIDDEN_FRAMEWORKS = [
  'react', 'react-dom', 'vue', 'angular', 'svelte', 'solid-js', 'preact', 'lit',
  'redux', 'zustand', 'mobx', 'lucide-react', 'framer-motion', 'chakra', 'mui', 'antd',
  'bootstrap', 'tailwind-react', '@vitejs/plugin-react'
];

export function validateDependencyTopology(): TopologyResult {
  const graph: Record<string, string[]> = {};
  const foreignFrameworkViolations: string[] = [];
  const invalidWorkspaceRefs: string[] = [];

  for (const pkg of PACKAGES) {
    const pkgName = `@aether/${pkg}`;
    graph[pkgName] = [];
    const pkgPath = path.join(process.cwd(), 'packages', pkg, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;

    const manifest = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = manifest.dependencies || {};
    const devDeps = manifest.devDependencies || {};
    const peerDeps = manifest.peerDependencies || {};

    const allDeps = { ...deps, ...devDeps, ...peerDeps };

    for (const [dep, version] of Object.entries(allDeps)) {
      // Check forbidden framework dependencies
      if (FORBIDDEN_FRAMEWORKS.includes(dep)) {
        foreignFrameworkViolations.push(`Package ${pkgName} depends on forbidden foreign framework "${dep}"`);
      }

      // Check forbidden workspace/local path references
      const verStr = String(version);
      if (
        verStr.includes('workspace:') ||
        verStr.includes('file:') ||
        verStr.includes('../') ||
        verStr.includes('link:')
      ) {
        invalidWorkspaceRefs.push(`Package ${pkgName} has invalid local/workspace reference for "${dep}": "${verStr}"`);
      }

      // If internal @aether/* dependency
      if (dep.startsWith('@aether/')) {
        graph[pkgName].push(dep);
      }
    }
  }

  // Check for cycles & compute topological order (Kahn's algorithm)
  const inDegree: Record<string, number> = {};
  for (const node of Object.keys(graph)) {
    inDegree[node] = 0;
  }
  for (const node of Object.keys(graph)) {
    for (const neighbor of graph[node]) {
      if (inDegree[neighbor] !== undefined) {
        // neighbor is depended on by node (in reverse dependency ordering)
      }
    }
  }

  // To publish, tier 1 has 0 dependencies on other @aether packages
  // node -> depends on -> deps
  const depCount: Record<string, number> = {};
  for (const node of Object.keys(graph)) {
    depCount[node] = graph[node].length;
  }

  const topologicalOrder: string[] = [];
  const remaining = new Set(Object.keys(graph));

  while (remaining.size > 0) {
    let progress = false;
    for (const node of Array.from(remaining)) {
      // Can publish if all its dependencies are already in topologicalOrder
      const deps = graph[node];
      const allDepsPublished = deps.every(d => topologicalOrder.includes(d));
      if (allDepsPublished) {
        topologicalOrder.push(node);
        remaining.delete(node);
        progress = true;
      }
    }
    if (!progress) {
      break;
    }
  }

  const hasCycles = remaining.size > 0;
  const isValid = !hasCycles && foreignFrameworkViolations.length === 0 && invalidWorkspaceRefs.length === 0;

  return {
    graph,
    topologicalOrder,
    hasCycles,
    foreignFrameworkViolations,
    invalidWorkspaceRefs,
    isValid
  };
}

if (process.argv[1]?.endsWith('validate-dependencies.ts') || process.argv[1]?.endsWith('validate-dependencies.js')) {
  console.log('▲ Aether Dependency Topology & Cycle Audit\n');
  const result = validateDependencyTopology();

  console.log('  Topological Publishing Order:');
  result.topologicalOrder.forEach((pkg, idx) => {
    const deps = result.graph[pkg] || [];
    console.log(`    ${idx + 1}. ${pkg} (internal deps: ${deps.length > 0 ? deps.join(', ') : 'none'})`);
  });

  if (result.hasCycles) {
    console.log('\n  ✕ Circular dependencies detected in dependency graph!');
  }
  if (result.foreignFrameworkViolations.length > 0) {
    console.log('\n  ✕ Foreign Framework Violations:');
    result.foreignFrameworkViolations.forEach(v => console.log(`      - ${v}`));
  }
  if (result.invalidWorkspaceRefs.length > 0) {
    console.log('\n  ✕ Invalid Workspace References:');
    result.invalidWorkspaceRefs.forEach(v => console.log(`      - ${v}`));
  }

  console.log(`\nDependency Topology Audit: ${result.isValid ? 'PASSED (0 Cycles, 0 Foreign Deps, Clean Topological Order)' : 'FAILED'}`);
  if (!result.isValid) {
    process.exit(1);
  }
}
