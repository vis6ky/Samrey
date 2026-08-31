/**
 * @license Apache-2.0
 * @samrey/monorepo - Hybrid Documentation Search & Intent Engine Test Suite
 *
 * Verifies question normalization, intent detection, documentation search relevance,
 * grounded context compilation, exclusion rules, error code diagnostics, and smart fallback.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

import {
  normalizeQuestion,
  detectIntent,
  searchDocumentation,
  buildGroundedContext
} from '../../src/lib/docSearchEngine.js';
import {
  REPOSITORY_DOC_CHUNKS,
  DocChunk
} from '../../src/data/searchIndex.js';
import {
  SmartAssistantProvider,
  DeterministicKnowledgeProvider
} from '../../src/lib/assistantProvider.js';

describe('Hybrid Documentation Search & AI Engine', () => {

  it('1. Verifies question normalization (synonyms, abbreviations, error code parsing)', () => {
    // A. Error code extraction
    const normErr1 = normalizeQuestion('What is aeth-101 and how to fix it?');
    assert.equal(normErr1.detectedErrorCode, 'AETH-101');

    const normErr2 = normalizeQuestion('error 301 in computed signal');
    assert.equal(normErr2.detectedErrorCode, 'AETH-301');

    // B. Synonym / acronym expansion
    const normSSR = normalizeQuestion('how does SSR work in samrey?');
    assert.ok(normSSR.expandedTerms.includes('ssr'), 'Includes ssr');
    assert.ok(normSSR.expandedTerms.includes('rendertostring'), 'Includes rendertostring');
    assert.ok(normSSR.expandedTerms.includes('hydrate'), 'Includes hydrate');

    const normSec = normalizeQuestion('prevent XSS and sanitize HTML');
    assert.ok(normSec.expandedTerms.includes('security'), 'Includes security');
    assert.ok(normSec.expandedTerms.includes('sanitizehtml'), 'Includes sanitizehtml');

    // C. Foreign framework detection
    const normReact = normalizeQuestion('how to replace useState and useEffect in Samrey?');
    assert.equal(normReact.isForeignFramework, true);
    assert.equal(normReact.foreignFrameworkName, 'React');
  });

  it('2. Verifies intent detection accurately classifies query categories', () => {
    // API Lookup
    const intentApi = detectIntent(normalizeQuestion('what is createStore function signature?'));
    assert.equal(intentApi.type, 'API_LOOKUP');
    assert.equal(intentApi.category, 'reactivity');
    assert.equal(intentApi.matchedEntity, 'createStore');

    // Error Code
    const intentErr = detectIntent(normalizeQuestion('troubleshoot AETH-501 error'));
    assert.equal(intentErr.type, 'ERROR_DIAGNOSTICS');
    assert.equal(intentErr.category, 'errors');
    assert.equal(intentErr.matchedEntity, 'AETH-501');

    // Foreign Migration
    const intentMig = detectIntent(normalizeQuestion('how do I migrate from React useState to Samrey?'));
    assert.equal(intentMig.type, 'MIGRATION_FOREIGN');
    assert.equal(intentMig.category, 'migration');

    // Security
    const intentSec = detectIntent(normalizeQuestion('how does Samrey handle XSS and Trusted Types?'));
    assert.equal(intentSec.type, 'SECURITY');
    assert.equal(intentSec.category, 'security');

    // Out of scope query
    const intentOutOfScope = detectIntent(normalizeQuestion('how do I make a chocolate cake recipe?'));
    assert.equal(intentOutOfScope.type, 'UNKNOWN_OUT_OF_SCOPE');
  });

  it('3. Verifies repository documentation index excludes build artifacts and sensitive files', () => {
    assert.ok(REPOSITORY_DOC_CHUNKS.length >= 10, 'Must have at least 10 authoritative doc chunks');

    for (const chunk of REPOSITORY_DOC_CHUNKS) {
      assert.ok(chunk.id, 'Chunk must have an ID');
      assert.ok(chunk.title, 'Chunk must have a title');
      assert.ok(chunk.sourcePath, 'Chunk must have a sourcePath');
      assert.ok(chunk.summary, 'Chunk must have a summary');
      assert.ok(chunk.content, 'Chunk must have content');

      // Check strict exclusions
      assert.ok(!chunk.sourcePath.includes('node_modules'), 'Must NOT index node_modules');
      assert.ok(!chunk.sourcePath.includes('/dist/'), 'Must NOT index dist');
      assert.ok(!chunk.sourcePath.includes('.git'), 'Must NOT index .git');
      assert.ok(!chunk.sourcePath.includes('.env'), 'Must NOT index .env files');
      assert.ok(!chunk.content.includes('process.env.GEMINI_API_KEY = "'), 'Must NOT index secret credentials');
    }
  });

  it('4. Verifies search relevance for exact API lookups', () => {
    // createStore
    const resultsStore = searchDocumentation('createStore');
    assert.ok(resultsStore.length > 0, 'Must return results for createStore');
    assert.ok(resultsStore[0].chunk.apis.includes('createStore'), 'Top result must contain createStore API');
    assert.ok(resultsStore[0].isExactMatch, 'Must be marked as exact match');

    // createForm
    const resultsForm = searchDocumentation('createForm validation');
    assert.ok(resultsForm.length > 0, 'Must return results for createForm');
    assert.equal(resultsForm[0].chunk.category, 'forms');

    // sanitizeHtml
    const resultsSanitize = searchDocumentation('sanitizeHtml');
    assert.ok(resultsSanitize.length > 0, 'Must return results for sanitizeHtml');
    assert.equal(resultsSanitize[0].chunk.category, 'security');
  });

  it('5. Verifies search relevance for deterministic error code lookup (AETH-xxx)', () => {
    const resultsErr = searchDocumentation('AETH-101');
    assert.ok(resultsErr.length > 0, 'Must return error doc for AETH-101');
    assert.equal(resultsErr[0].chunk.id, 'doc-error-codes');
    assert.ok(resultsErr[0].isExactMatch, 'Error code lookup must be exact match');
    assert.ok(resultsErr[0].chunk.errorCodes.includes('AETH-101'), 'Must match AETH-101 code');
  });

  it('6. Verifies grounded context builder compiles concise documentation context', () => {
    const results = searchDocumentation('forms validation Standard Schema');
    const grounded = buildGroundedContext(results, 2);

    assert.ok(grounded.contextMarkdown.length > 50, 'Context markdown must be populated');
    assert.ok(grounded.sourceFiles.length > 0, 'Source files must be populated');
    assert.ok(grounded.relatedDocLinks.length > 0, 'Related doc links must be populated');
    assert.ok(grounded.contextMarkdown.includes('Authoritative Samrey Documentation Context'));
    assert.ok(grounded.contextMarkdown.includes('docs/FORMS_AND_VALIDATION.md') || grounded.contextMarkdown.includes('forms'));
  });

  it('7. Verifies graceful handling of unknown / out-of-scope queries', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('how to bake sourdough bread at home?');

    assert.ok(answer, 'Must return structured answer');
    assert.equal(answer.intentType, 'UNKNOWN_OUT_OF_SCOPE');
    assert.ok(answer.title.includes('No Matching Samrey Documentation Found'), 'Title indicates no matching doc');
    assert.ok(answer.shortAnswer.includes('No relevant Samrey Framework documentation was found'), 'Short answer is polite and informative');
    assert.ok(answer.docLinks.length > 0, 'Provides fallback doc links to explore Samrey');
  });

  it('8. Verifies SmartAssistantProvider executes full hybrid flow with 12 sections and source citations', async () => {
    const provider = new SmartAssistantProvider();
    const answer = await provider.askQuestion('How do I validate a form with Zod schema?');

    assert.ok(answer.title, 'Must have title');
    assert.ok(answer.shortAnswer, 'Must have Section 1 (short answer)');
    assert.ok(answer.concept, 'Must have Section 2 (concept)');
    assert.ok(answer.recommendedApi, 'Must have Section 3 (recommended API)');
    assert.ok(answer.whenToUse, 'Must have Section 4 (when to use)');
    assert.ok(answer.implementationSteps.length > 0, 'Must have Section 5 (steps)');
    assert.ok(answer.tsCodeExample.includes('createForm'), 'Must have Section 6 (code)');
    assert.ok(answer.codeExplanation, 'Must have Section 8 (explanation)');
    assert.ok(answer.commonMistakes.length > 0, 'Must have Section 10 (common mistakes)');
    assert.ok(answer.relatedApis.length > 0, 'Must have Section 11 (related APIs)');
    assert.ok(answer.docLinks.length > 0, 'Must have Section 12 (doc links)');
    assert.ok(Array.isArray(answer.sourceFiles) && answer.sourceFiles.length > 0, 'Must have sourceFiles citations');
  });

});
