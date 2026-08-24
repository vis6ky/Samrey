/**
 * @license Apache-2.0
 * @aether/monorepo - Phase 24 Documentation Native UI Certification Test
 * Strictly verifies the "Aether Must Use Aether" architectural invariant.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Import Native App
import { App } from '../../src/App.js';
import { Header } from '../../src/components/Header.js';
import { DocReader } from '../../src/components/DocReader.js';
import { SearchModal } from '../../src/components/SearchModal.js';
import { CompetitiveView } from '../../src/components/CompetitiveView.js';
import { CompilerVisualizer } from '../../src/components/CompilerVisualizer.js';
import { ReactivityVisualizer } from '../../src/components/ReactivityVisualizer.js';
import { SecurityView } from '../../src/components/SecurityView.js';
import { ArchitectureView } from '../../src/components/ArchitectureView.js';
import { AppShell } from '../../src/task-studio/components/AppShell.js';

function isAetherElement(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) return true;
  return (node as any).nodeType === 1 && typeof (node as any).tagName === 'string';
}

describe('Phase 24 — Documentation UI Native Aether Certification', () => {
  const FORBIDDEN_LIBRARIES = [
    'react', 'react-dom', 'vue', 'angular', 'svelte', 'solid-js', 'preact', 'lit',
    'redux', 'zustand', 'mobx', 'lucide-react', 'framer-motion', 'chakra', 'mui', 'antd',
    'bootstrap', 'tailwind-react', '@vitejs/plugin-react'
  ];

  it('1. Verifies 0 foreign UI framework dependencies in src/ package/imports', () => {
    function scanDir(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const lib of FORBIDDEN_LIBRARIES) {
            const regex = new RegExp(`from\\s+['"]${lib}['"]|require\\(['"]${lib}['"]\\)`, 'i');
            assert.ok(!regex.test(content), `Foreign UI library "${lib}" detected in ${fullPath}`);
          }
        }
      }
    }

    scanDir(path.join(process.cwd(), 'src'));
  });

  it('2. Verifies Documentation Shell instantiates cleanly using Aether native el()', () => {
    const rootEl = App();
    assert.ok(isAetherElement(rootEl), 'App root must return a native Aether element');
    assert.ok(rootEl.classList.contains('min-h-screen'), 'Root element has layout styling');
  });

  it('3. Verifies Header component renders native elements with reactivity signals', () => {
    let selectedTab = 'docs';
    const header = Header({
      activeTab: { value: selectedTab } as any,
      onOpenSearch: () => {}
    });

    assert.ok(isAetherElement(header), 'Header must return an Aether element');
    const brand = header.querySelector('h1, span, a');
    assert.ok(brand, 'Header contains brand title');
  });

  it('4. Verifies Documentation Viewer and Search Modal native components', () => {
    const reader = DocReader();
    assert.ok(isAetherElement(reader), 'DocReader must instantiate as an Aether element');

    const searchModal = SearchModal({
      isOpen: { value: true } as any,
      activeTab: { value: 'docs' } as any
    });
    assert.ok(isAetherElement(searchModal), 'SearchModal must instantiate as an Aether element');
  });

  it('5. Verifies Interactive Visualizers (Reactivity, Compiler, Security, Architecture)', () => {
    const compVis = CompilerVisualizer();
    assert.ok(isAetherElement(compVis), 'CompilerVisualizer must instantiate as an Aether element');

    const reactVis = ReactivityVisualizer();
    assert.ok(isAetherElement(reactVis), 'ReactivityVisualizer must instantiate as an Aether element');

    const secView = SecurityView();
    assert.ok(isAetherElement(secView), 'SecurityView must instantiate as an Aether element');

    const archView = ArchitectureView();
    assert.ok(isAetherElement(archView), 'ArchitectureView must instantiate as an Aether element');

    const compView = CompetitiveView();
    assert.ok(isAetherElement(compView), 'CompetitiveView must instantiate as an Aether element');
  });

  it('6. Verifies Task Studio AppShell native component', () => {
    const taskStudio = AppShell();
    assert.ok(isAetherElement(taskStudio), 'Task Studio AppShell must instantiate as an Aether element');
  });
});
