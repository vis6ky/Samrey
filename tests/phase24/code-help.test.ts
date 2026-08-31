/**
 * @license Apache-2.0
 * @samrey/monorepo - Phase 24 Code Help & Repair Engine Test Suite
 *
 * Verifies the Samrey Code Help capability:
 * 1. AST Diagnostics (Stale closures, in-place mutations, React hooks)
 * 2. Unsupported and Foreign API Detection & Warnings
 * 3. Nonexistent @samrey/* package warnings
 * 4. Zero-Eval Security & Malicious Code Handling
 * 5. Native Samrey UI Components & Interactions
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

import {
  detectUnsupportedApis,
  analyzeSamreyCode,
  VALID_SAMREY_PACKAGES
} from '../../src/lib/codeHelpEngine.js';
import {
  DeterministicKnowledgeProvider,
  SmartAssistantProvider
} from '../../src/lib/assistantProvider.js';
import { AssistantView } from '../../src/components/AssistantView.js';

function isSamreyElement(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) return true;
  return (node as any).nodeType === 1 && typeof (node as any).tagName === 'string';
}

describe('Phase 24 — Code Help & Repair Capability', () => {

  it('1. Detects and diagnoses "Why isn\'t my signal updating?" (Stale closure bug)', () => {
    const brokenCode = `
import { signal } from '@samrey/reactivity';
import { el } from '@samrey/runtime';

export function BrokenCounter() {
  const count = signal(0);
  // Evaluated once at setup time without getter closure:
  return el('div', null,
    el('p', null, count.value),
    el('button', { onClick: () => { count.value++; } }, 'Increment')
  );
}
`;
    const result = analyzeSamreyCode(brokenCode, "Why isn't my signal updating?");
    assert.ok(result, 'Must return a CodeHelpResult');
    assert.ok(result.problem.toLowerCase().includes('signal') || result.problem.toLowerCase().includes('closure') || result.problem.toLowerCase().includes('binding'), 'Problem must diagnose signal/binding');
    assert.ok(result.explanation.includes('execute ONLY ONCE') || result.explanation.includes('closure'), 'Must explain single execution model');
    assert.ok(result.fixedCode.includes('() =>'), 'Fixed code must use getter closure in el()');
    assert.ok(result.changesExplanation.length > 0, 'Must provide list of specific changes made');
    assert.ok(result.relatedApis.includes('signal'), 'Must list signal in related APIs');
  });

  it('2. Detects foreign React hooks and translates to idiomatic Samrey signals/computations/effects', () => {
    const reactCode = `
import React, { useState, useEffect, useMemo } from 'react';

export function Profile({ initialName }) {
  const [name, setName] = useState(initialName);
  const [count, setCount] = useState(0);

  const greeting = useMemo(() => \`Hello \${name}\`, [name]);

  useEffect(() => {
    console.log('Count updated:', count);
  }, [count]);

  return <div onClick={() => setCount(count + 1)}>{greeting}</div>;
}
`;
    const unsupported = detectUnsupportedApis(reactCode);
    assert.ok(unsupported.length >= 3, 'Must detect React imports and hooks');
    assert.ok(unsupported.some(w => w.detectedApi.includes('useState')), 'Must detect useState');
    assert.ok(unsupported.some(w => w.detectedApi.includes('useEffect')), 'Must detect useEffect');
    assert.ok(unsupported.some(w => w.detectedApi.includes('useMemo')), 'Must detect useMemo');

    const result = analyzeSamreyCode(reactCode, 'Fix this Samrey code.');
    assert.ok(result.fixedCode.includes('@samrey/reactivity'), 'Fixed code must import from @samrey/reactivity');
    assert.ok(result.fixedCode.includes('signal('), 'Fixed code must use signal()');
    assert.ok(result.fixedCode.includes('computed('), 'Fixed code must use computed()');
    assert.ok(result.fixedCode.includes('effect('), 'Fixed code must use effect()');
    assert.ok(result.warnings.length > 0, 'Must output warnings for foreign APIs');
  });

  it('3. Detects in-place signal array/object mutation and corrects it', () => {
    const inPlaceCode = `
import { signal } from '@samrey/reactivity';

export function TodoList() {
  const todos = signal(['Item 1']);
  const addItem = (item) => {
    todos.value.push(item);
  };
}
`;
    const result = analyzeSamreyCode(inPlaceCode, "Why isn't my signal updating?");
    assert.ok(result.problem.toLowerCase().includes('mutation') || result.problem.toLowerCase().includes('in-place'), 'Must diagnose in-place mutation');
    assert.ok(result.fixedCode.includes('[...'), 'Fixed code must show immutable array spread reassignment or produce');
    assert.ok(result.relatedApis.includes('createStore') || result.relatedApis.includes('signal'), 'Must suggest createStore or signal');
  });

  it('4. Converts form requirement to @samrey/forms schema implementation', () => {
    const requirement = 'Create a task form using Samrey with title, priority, and validation.';
    const result = analyzeSamreyCode(requirement, 'Create a task form using Samrey.');
    assert.ok(result.fixedCode.includes('@samrey/forms'), 'Must import from @samrey/forms');
    assert.ok(result.fixedCode.includes('createForm'), 'Must use createForm');
    assert.ok(result.fixedCode.includes('bindField') || result.fixedCode.includes('createField'), 'Must use bindField or createField');
    assert.ok(result.docLinks.some(l => l.sourcePath?.includes('FORMS')), 'Must reference forms documentation');
  });

  it('5. Structures an idiomatic Samrey component when asked "How should I structure this component?"', () => {
    const result = analyzeSamreyCode('', 'How should I structure this component?');
    assert.ok(result.fixedCode.includes('@samrey/reactivity'), 'Must import @samrey/reactivity');
    assert.ok(result.fixedCode.includes('@samrey/runtime'), 'Must import @samrey/runtime');
    assert.ok(result.fixedCode.includes('signal('), 'Must define local state atoms with signal()');
    assert.ok(result.fixedCode.includes('onMount') || result.fixedCode.includes('computed'), 'Must demonstrate lifecycle or computed derivations');
    assert.ok(result.fixedCode.includes('el('), 'Must construct zero-VDOM elements with el()');
  });

  it('6. Detects nonexistent @samrey/* packages and suggests valid packages', () => {
    const bogusCode = `
import { magic } from '@samrey/quantum';
import { neuralState } from '@samrey/neural';
`;
    const unsupported = detectUnsupportedApis(bogusCode);
    assert.ok(unsupported.some(w => w.detectedApi === '@samrey/quantum'), 'Must detect nonexistent @samrey/quantum');
    assert.ok(unsupported.some(w => w.detectedApi === '@samrey/neural'), 'Must detect nonexistent @samrey/neural');
    assert.ok(VALID_SAMREY_PACKAGES.includes('@samrey/reactivity'), 'Valid packages list contains @samrey/reactivity');
  });

  it('7. Enforces Zero-Eval Security: Detects and warns against eval(), new Function(), and innerHTML', () => {
    const maliciousCode = `
const runUntrusted = (str) => {
  eval(str);
  new Function('return ' + str)();
  document.getElementById('root').innerHTML = str;
};
`;
    const unsupported = detectUnsupportedApis(maliciousCode);
    assert.ok(unsupported.some(w => w.category === 'security_hazard'), 'Must flag security hazards');
    assert.ok(unsupported.some(w => w.detectedApi.includes('eval')), 'Must detect eval');
    assert.ok(unsupported.some(w => w.detectedApi.includes('innerHTML')), 'Must detect innerHTML');

    // Analysis of malicious code must never execute it and must return safe sanitized result
    const result = analyzeSamreyCode(maliciousCode, 'Fix this insecure code');
    assert.ok(result.warnings.some(w => w.includes('eval') || w.includes('forbidden') || w.includes('Security')), 'Must warn about security hazard');
    assert.ok(!result.fixedCode.includes('eval('), 'Fixed code must not include dynamic eval()');
  });

  it('8. Verifies SmartAssistantProvider and DeterministicKnowledgeProvider analyzeCode methods', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const result = await provider.analyzeCode({
      code: `const count = signal(0); return el('p', null, count.value);`,
      question: "Why isn't my signal updating?"
    });
    assert.ok(result, 'Must return result');
    assert.ok(result.problem, 'Must have problem description');
    assert.ok(result.fixedCode, 'Must have fixed code');

    const smartProvider = new SmartAssistantProvider();
    const smartResult = await smartProvider.analyzeCode({
      code: `import { useState } from 'react';`,
      question: 'Fix this Samrey code.'
    });
    assert.ok(smartResult, 'Must return smart result');
    assert.ok(smartResult.unsupportedApisFound.length > 0, 'Must find unsupported APIs');
  });

  it('9. Verifies AssistantView UI rendering with Code Help mode and tab elements', () => {
    const view = AssistantView();
    assert.ok(isSamreyElement(view), 'AssistantView must return native Samrey HTMLElement');

    const codeTabBtn = (view as HTMLElement).querySelector('#tab-assistant-code-help');
    assert.ok(codeTabBtn, 'Tab button #tab-assistant-code-help must exist');

    const qaTabBtn = (view as HTMLElement).querySelector('#tab-assistant-qa');
    assert.ok(qaTabBtn, 'Tab button #tab-assistant-qa must exist');

    // Switch to code help tab
    (codeTabBtn as HTMLButtonElement).click();

    // Verify code textarea and analyze button exist
    const codeTextarea = (view as HTMLElement).querySelector('#assistant-code-input');
    assert.ok(codeTextarea, 'Textarea #assistant-code-input must exist');

    const analyzeBtn = (view as HTMLElement).querySelector('#assistant-code-analyze-btn');
    assert.ok(analyzeBtn, 'Analyze button #assistant-code-analyze-btn must exist');
  });
});
