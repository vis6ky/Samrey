/**
 * @license Apache-2.0
 * @samrey/ai - Project Structure & Anti-Pattern Analyzer
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { discoverSamreyProject, SamreyProjectContext } from './framework-discovery.js';

export interface CodeIssue {
  filePath: string;
  line: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  category: 'anti-pattern' | 'foreign-framework' | 'security' | 'reactivity' | 'accessibility';
  message: string;
  codeSnippet: string;
  suggestedFix: string;
}

export interface ProjectAnalysisReport {
  timestamp: string;
  project: SamreyProjectContext;
  healthScore: number;
  issues: CodeIssue[];
  discoveredComponents: Array<{ name: string; filePath: string; usesSignals: boolean; usesTemplates: boolean }>;
  discoveredRoutes: Array<{ path: string; filePath: string }>;
  recommendations: string[];
}

export function analyzeProject(projectRoot = process.cwd()): ProjectAnalysisReport {
  const root = path.resolve(projectRoot);
  const project = discoverSamreyProject(root);
  const issues: CodeIssue[] = [];
  const discoveredComponents: Array<{ name: string; filePath: string; usesSignals: boolean; usesTemplates: boolean }> = [];
  const discoveredRoutes: Array<{ path: string; filePath: string }> = [];

  function scanDir(dir: string, depth = 0) {
    if (depth > 8 || !fs.existsSync(dir)) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === 'coverage' ||
          entry.name === 'tests' ||
          entry.name === '__tests__' ||
          entry.name === 'benchmarks' ||
          entry.name === 'scripts' ||
          entry.name === 'docs'
        ) {
          continue;
        }

        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(root, fullPath);

        if (entry.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (
          entry.isFile() &&
          /\.(ts|tsx|js|jsx)$/.test(entry.name) &&
          !/\.(test|spec|bench)\.(ts|tsx|js|jsx)$/.test(entry.name)
        ) {
          analyzeSourceFile(fullPath, relPath);
        }
      }
    } catch {}
  }

  function analyzeSourceFile(fullPath: string, relPath: string) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      // Check for component exports
      const componentMatches = content.match(/export\s+function\s+([A-Z][a-zA-Z0-9_]*)/g);
      if (componentMatches) {
        for (const match of componentMatches) {
          const compName = match.replace(/export\s+function\s+/, '').trim();
          discoveredComponents.push({
            name: compName,
            filePath: relPath,
            usesSignals: content.includes('signal(') || content.includes('computed('),
            usesTemplates: content.includes('template(')
          });
        }
      }

      // Check for route definitions
      const routePathMatches = content.matchAll(/path:\s*['"]([^'"]+)['"]/g);
      for (const match of routePathMatches) {
        discoveredRoutes.push({
          path: match[1],
          filePath: relPath
        });
      }

      // Line-by-line inspection for anti-patterns
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // 1. Foreign React Hooks
        const hookMatch = line.match(/\b(useState|useEffect|useMemo|useCallback|useRef|useContext)\b/);
        if (hookMatch) {
          issues.push({
            filePath: relPath,
            line: lineNum,
            severity: 'error',
            category: 'foreign-framework',
            message: `Foreign React hook "${hookMatch[1]}" detected in Samrey application.`,
            codeSnippet: line.trim(),
            suggestedFix: `Replace "${hookMatch[1]}" with native Samrey primitives: use signal(), computed(), or effect() from @samrey/reactivity.`
          });
        }

        // 2. Foreign React / Vue imports
        if (/\bfrom\s+['"](react|vue|svelte|@angular|solid-js)['"]/.test(line)) {
          issues.push({
            filePath: relPath,
            line: lineNum,
            severity: 'error',
            category: 'foreign-framework',
            message: 'Forbidden foreign framework import detected.',
            codeSnippet: line.trim(),
            suggestedFix: 'Remove foreign framework import. Import from @samrey/runtime, @samrey/reactivity, or @samrey/compiler.'
          });
        }

        // 3. In-place signal mutation (.value.push, .value.splice, etc.)
        const inPlaceMutation = line.match(/\.value\.(push|splice|pop|shift|unshift|sort|reverse)\(/);
        if (inPlaceMutation) {
          issues.push({
            filePath: relPath,
            line: lineNum,
            severity: 'warning',
            category: 'reactivity',
            message: `In-place mutation via ".value.${inPlaceMutation[1]}()" does not trigger signal reactivity.`,
            codeSnippet: line.trim(),
            suggestedFix: `Assign a new array reference instead: signal.value = [...signal.value, item] or use signal.update(arr => [...arr, item]).`
          });
        }

        // 4. Insecure innerHTML assignment
        if (line.includes('.innerHTML =') || line.includes('dangerouslySetInnerHTML')) {
          issues.push({
            filePath: relPath,
            line: lineNum,
            severity: 'error',
            category: 'security',
            message: 'Direct innerHTML assignment bypasses Samrey Trusted Types sanitization.',
            codeSnippet: line.trim(),
            suggestedFix: 'Use bindText() for dynamic text, or sanitizeHtml() from @samrey/security before inserting trusted HTML.'
          });
        }

        // 5. Template-level <Show> or <For> tag in string template
        if (line.includes('<Show ') || line.includes('<Show>') || line.includes('<For ') || line.includes('<For>')) {
          issues.push({
            filePath: relPath,
            line: lineNum,
            severity: 'error',
            category: 'anti-pattern',
            message: 'Template-level <Show> or <For> tag detected inside template markup.',
            codeSnippet: line.trim(),
            suggestedFix: 'In Samrey, Show and For are component functions. Call them in JS/TS as Show({ when, children }) or For({ each, key, children }).'
          });
        }
      }
    } catch {}
  }

  // Scan project source dirs
  if (project.sourceDirs.length > 0) {
    for (const sDir of project.sourceDirs) {
      scanDir(path.join(root, sDir));
    }
  } else {
    scanDir(root);
  }

  // Compute overall health score
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const rawScore = 100 - errorCount * 15 - warningCount * 5;
  const healthScore = Math.max(0, Math.min(100, rawScore));

  const recommendations: string[] = [];
  if (errorCount > 0) {
    recommendations.push(`Fix ${errorCount} architectural error(s) preventing pure Samrey reactivity.`);
  }
  if (!project.features.testing) {
    recommendations.push('Install @samrey/testing to ensure automated component and integration test coverage.');
  }
  if (!project.configFiles.includes('AGENTS.md')) {
    recommendations.push('Run "npx @samrey/cli ai init" to configure AI developer instructions and MCP tooling.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Project architecture is healthy and follows Samrey compile-time reactive best practices.');
  }

  return {
    timestamp: new Date().toISOString(),
    project,
    healthScore,
    issues,
    discoveredComponents,
    discoveredRoutes,
    recommendations
  };
}
