/**
 * @license Apache-2.0
 * @samrey/monorepo - Phase 24 Developer Assistant Test Suite
 *
 * Verifies the Samrey Developer Assistant UI, Search Engine, Knowledge Retrieval,
 * Provider Abstraction, and Security Sanitization.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

import { AssistantView } from '../../src/components/AssistantView.js';
import {
  KNOWLEDGE_BASE,
  POPULAR_PROMPTS,
  queryKnowledgeBase
} from '../../src/data/assistantKnowledge.js';
import {
  DeterministicKnowledgeProvider,
  SmartAssistantProvider
} from '../../src/lib/assistantProvider.js';
import { renderMarkdown, formatInlineMarkdown } from '../../src/lib/markdown.js';

function isSamreyElement(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) return true;
  return (node as any).nodeType === 1 && typeof (node as any).tagName === 'string';
}

describe('Phase 24 — Samrey Developer Assistant', () => {

  it('1. Verifies AssistantView instantiates cleanly using Samrey native el()', () => {
    const view = AssistantView();
    assert.ok(isSamreyElement(view), 'AssistantView must return a native Samrey element');
    const elementId = (view as any).getAttribute ? (view as any).getAttribute('id') : (view as any).id;
    assert.equal(elementId, 'samrey-assistant-view');

    // Verify search input element exists
    const input = (view as HTMLElement).querySelector('input');
    assert.ok(input, 'Search input must exist');

    // Verify submit button element exists
    const buttons = (view as HTMLElement).querySelectorAll('button');
    assert.ok(buttons.length > 0, 'Buttons must exist');

    // Verify layout classes
    assert.ok((view as HTMLElement).classList.contains('space-y-8'), 'Root element has layout styling');
  });

  it('2. Verifies all 10 core developer questions are indexed in knowledge base', () => {
    assert.ok(POPULAR_PROMPTS.length >= 10, 'Must have at least 10 popular prompts');

    for (const prompt of POPULAR_PROMPTS) {
      const answer = queryKnowledgeBase(prompt);
      assert.ok(answer, `Knowledge query must return answer for: "${prompt}"`);
      assert.ok(answer.title, 'Answer must have a title');
      assert.ok(answer.shortAnswer, 'Answer must have section 1 (short answer)');
      assert.ok(answer.concept, 'Answer must have section 2 (concept)');
      assert.ok(answer.recommendedApi, 'Answer must have section 3 (recommended API)');
      assert.ok(answer.whenToUse, 'Answer must have section 4 (when to use)');
      assert.ok(Array.isArray(answer.implementationSteps) && answer.implementationSteps.length > 0, 'Answer must have section 5 (implementation steps)');
      assert.ok(answer.tsCodeExample, 'Answer must have section 6 (TypeScript code example)');
      assert.ok(answer.codeExplanation, 'Answer must have section 8 (code explanation)');
      assert.ok(Array.isArray(answer.commonMistakes) && answer.commonMistakes.length > 0, 'Answer must have section 10 (common mistakes)');
      assert.ok(Array.isArray(answer.relatedApis) && answer.relatedApis.length > 0, 'Answer must have section 11 (related APIs)');
      assert.ok(Array.isArray(answer.docLinks) && answer.docLinks.length > 0, 'Answer must have section 12 (documentation links)');
    }
  });

  it('3. Verifies deterministic knowledge provider answers component data transfer', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I transfer data between components?');

    assert.ok(answer.title.includes('Data Transfer') || answer.title.includes('Component'), 'Title matches topic');
    assert.ok(answer.recommendedApi.includes('createContext') || answer.recommendedApi.includes('Props'), 'Recommends createContext or Props');
    assert.ok(answer.tsCodeExample.includes('@samrey/runtime'), 'Code imports @samrey/runtime');
    assert.ok(answer.tsCodeExample.includes('@samrey/reactivity'), 'Code imports @samrey/reactivity');
  });

  it('4. Verifies deterministic knowledge provider answers reactive store creation', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I create a reactive store?');

    assert.ok(answer.recommendedApi.includes('createStore'), 'Recommends createStore API');
    assert.ok(answer.tsCodeExample.includes('createStore'), 'Code uses createStore');
    assert.ok(answer.tsCodeExample.includes('produce'), 'Code demonstrates produce mutation');
  });

  it('5. Verifies deterministic knowledge provider answers API calls and HTTP fetching', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I call an API?');

    assert.ok(answer.recommendedApi.includes('createHttpClient') || answer.recommendedApi.includes('resource'), 'Recommends createHttpClient or resource');
    assert.ok(answer.tsCodeExample.includes('@samrey/http'), 'Code imports @samrey/http');
  });

  it('6. Verifies deterministic knowledge provider answers form validation', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I validate a form?');

    assert.ok(answer.recommendedApi.includes('createForm'), 'Recommends createForm');
    assert.ok(answer.tsCodeExample.includes('@samrey/forms'), 'Code imports @samrey/forms');
  });

  it('7. Verifies deterministic knowledge provider answers routing questions', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I create a route?');

    assert.ok(answer.recommendedApi.includes('createRouter') || answer.recommendedApi.includes('Router'), 'Recommends router APIs');
    assert.ok(answer.tsCodeExample.includes('@samrey/router'), 'Code imports @samrey/router');
  });

  it('8. Verifies deterministic knowledge provider answers SSR and Hydration', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I implement SSR?');

    assert.ok(answer.recommendedApi.includes('renderToString') || answer.recommendedApi.includes('hydrate'), 'Recommends SSR and hydration APIs');
    assert.ok(answer.tsCodeExample.includes('@samrey/ssr') || answer.tsCodeExample.includes('@samrey/runtime'), 'Code uses ssr/runtime packages');
  });

  it('9. Verifies deterministic knowledge provider answers XSS prevention', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I prevent XSS?');

    assert.ok(answer.recommendedApi.includes('sanitizeHtml') || answer.recommendedApi.includes('sanitizeUri'), 'Recommends security sanitizers');
    assert.ok(answer.tsCodeExample.includes('@samrey/security'), 'Code imports @samrey/security');
  });

  it('10. Verifies deterministic knowledge provider answers AETH error diagnostics', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I handle an AETH-301 error?');

    assert.ok(answer.title.includes('AETH-301'), 'Identifies AETH-301 error code');
    assert.ok(answer.category === 'errors', 'Classified under errors category');
    assert.ok(answer.recommendedApi.includes('ErrorBoundary'), 'Recommends ErrorBoundary');
  });

  it('11. Verifies graceful handling of foreign framework questions (useState/useCallback)', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I use useState or useCallback?');

    assert.ok(answer.shortAnswer.includes('does NOT have `useState`'), 'Clarifies Samrey zero-hook paradigm');
    assert.ok(answer.recommendedApi.includes('signal'), 'Directs user to native signal API');
    assert.ok(answer.tsCodeExample.includes('@samrey/reactivity'), 'Provides native Samrey code');
  });

  it('12. Verifies SmartAssistantProvider gracefully falls back when server is offline', async () => {
    const smartProvider = new SmartAssistantProvider();
    const answer = await smartProvider.askQuestion('How do I update DOM elements when a signal changes?');

    assert.ok(answer, 'Smart provider returns valid answer');
    assert.ok(answer.title.includes('DOM') || answer.title.includes('Signal'), 'Title matches signal DOM topic');
    assert.ok(answer.tsCodeExample.includes('@samrey/runtime'), 'Provides Samrey runtime code');
  });

  it('13. Verifies Markdown renderer sanitizes malicious XSS scripts in assistant outputs', () => {
    const maliciousMarkdown = `
# Dangerous Response
<script>alert("XSS")</script>
<img src="x" onerror="alert(1)">
[dangerous link](javascript:stealCookie())

\`\`\`typescript
const safe = true;
\`\`\`
`;
    const rendered = renderMarkdown(maliciousMarkdown, { enableCopyCode: true });
    assert.ok(isSamreyElement(rendered), 'Rendered output is a native Samrey element');

    // Test inline sanitizer
    const safeOutput = renderMarkdown(maliciousMarkdown);
    assert.ok(isSamreyElement(safeOutput));

    const inlineSanitized = formatInlineMarkdown('[click me](javascript:alert(1)) <script>alert("xss")</script>');
    assert.ok(!inlineSanitized.includes('javascript:'), 'Must sanitize javascript: URI scheme');
    assert.ok(!inlineSanitized.includes('<script>'), 'Must escape script tags');
  });

  it('14. Verifies copy code button functionality on rendered code blocks', () => {
    const markdown = `
\`\`\`typescript
import { signal } from '@samrey/reactivity';
export const count = signal(0);
\`\`\`
`;
    const rendered = renderMarkdown(markdown, { enableCopyCode: true });
    const copyBtn = (rendered as HTMLElement).querySelector('button');
    assert.ok(copyBtn, 'Copy button must be rendered on fenced code block');
    assert.ok(copyBtn.getAttribute('aria-label')?.includes('Copy') || copyBtn.textContent?.includes('Copy'), 'Button has copy label');
  });

});
