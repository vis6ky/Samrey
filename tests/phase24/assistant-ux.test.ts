/**
 * @license Apache-2.0
 * @samrey/doc - Samrey Developer Assistant UX Pass Test Suite
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { queryKnowledgeBase, POPULAR_PROMPTS, FAQ_ENTRIES } from '../../src/data/assistantKnowledge.js';
import { SmartAssistantProvider, detectUnsupportedApis } from '../../src/lib/assistantProvider.js';
import { AssistantView } from '../../src/components/AssistantView.js';
import { renderTest, fireEvent, flushReactivity } from '../../packages/testing/src/index.js';

describe('Samrey Developer Assistant UX Pass & Recipe Retrieval', () => {
  const provider = new SmartAssistantProvider();

  it('retrieves high-confidence recipes for all 9 priority suggested questions', async () => {
    const questions = [
      'How do I transfer data between components?',
      'How do I update the DOM reactively?',
      'How do I create a store?',
      'How do I fetch API data?',
      'How do I validate a form?',
      'How do I create a route?',
      'How do I implement SSR?',
      'How do I prevent XSS?',
      'How do I test a component?'
    ];

    for (const q of questions) {
      const answer = await provider.askQuestion(q);
      assert.ok(answer.title, `Answer for "${q}" should have a title`);
      assert.ok(answer.concept || answer.samreyConcept, `Answer for "${q}" should have a concept`);
      assert.ok(answer.recommendedApi, `Answer for "${q}" should have a recommendedApi`);
      assert.ok(answer.tsCodeExample, `Answer for "${q}" should have a tsCodeExample`);
      assert.ok(answer.codeExplanation, `Answer for "${q}" should have codeExplanation`);
      assert.ok(answer.relatedApis && answer.relatedApis.length > 0, `Answer for "${q}" should have relatedApis`);
      assert.ok(answer.docLinks && answer.docLinks.length > 0, `Answer for "${q}" should have docLinks`);
    }
  });

  it('verifies testing recipe returns @samrey/testing guidance', () => {
    const res = queryKnowledgeBase('How do I test a component?');
    assert.match(res.recommendedApi, /@samrey\/testing/i);
    assert.match(res.tsCodeExample, /renderTest/);
    assert.match(res.tsCodeExample, /fireEvent/);
  });

  it('detects unsupported APIs with actionable alternatives', () => {
    const brokenCode = `import { useState } from 'react';
export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}`;
    const warnings = detectUnsupportedApis(brokenCode);
    assert.ok(warnings.length > 0, 'Should identify React useState');
    const useStateWarning = warnings.find(w => w.detectedApi === 'useState()');
    assert.ok(useStateWarning, 'Should include warning for useState()');
    assert.match(useStateWarning.samreyAlternative, /signal\(\)/);
  });

  it('mounts AssistantView and renders all search and interactive controls', async () => {
    const { container, unmount } = renderTest(() => AssistantView());
    const root = container as HTMLElement;

    // Check search input exists
    const searchInput = root.querySelector('#assistant-search-input') as HTMLInputElement | null;
    assert.ok(searchInput, 'Search input should be present');

    // Check tabs exist
    const qaTab = root.querySelector('#tab-assistant-qa');
    const codeHelpTab = root.querySelector('#tab-assistant-code-help');
    assert.ok(qaTab, 'QA tab should exist');
    assert.ok(codeHelpTab, 'Code Help tab should exist');

    // Switch to Code Help
    fireEvent(codeHelpTab!, 'click');
    await flushReactivity();

    const codeInput = root.querySelector('#assistant-code-input') as HTMLTextAreaElement | null;
    assert.ok(codeInput, 'Code input textarea should be visible in Code Help mode');

    // Switch back to QA
    fireEvent(qaTab!, 'click');
    await flushReactivity();

    assert.ok(root.querySelector('#assistant-search-input'), 'Search input should be visible again');

    unmount();
  });
});
