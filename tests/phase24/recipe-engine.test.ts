/**
 * @license Apache-2.0
 * @samrey/monorepo - Implementation Recipes Engine Test Suite
 *
 * Verifies structured implementation recipe classification, catalog integrity,
 * formatting, and multi-provider resolution for all 19 mandatory recipe categories.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

import {
  RECIPES,
  classifyRecipeCategory,
  findRecipeForQuery,
  formatRecipeToAnswer,
  RecipeCategory
} from '../../src/data/recipeCatalog.js';
import {
  DeterministicKnowledgeProvider,
  SmartAssistantProvider
} from '../../src/lib/assistantProvider.js';

const MANDATORY_CATEGORIES: RecipeCategory[] = [
  'component-communication',
  'reactive-state',
  'dom-manipulation',
  'conditional-rendering',
  'list-rendering',
  'events',
  'forms',
  'validation',
  'http-api',
  'routing',
  'ssr',
  'ssg',
  'security',
  'error-handling',
  'lifecycle',
  'cleanup',
  'performance',
  'testing',
  'devtools'
];

describe('Implementation Recipes Engine', () => {

  it('1. Verifies all 19 mandatory recipe categories exist in catalog with complete schemas', () => {
    assert.ok(RECIPES.length >= 19, 'Must have at least 19 recipes');

    for (const cat of MANDATORY_CATEGORIES) {
      const recipe = RECIPES.find(r => r.category === cat);
      assert.ok(recipe, `Recipe for category "${cat}" must exist`);

      // Verify all 10 structured recipe fields
      assert.ok(recipe.problem && recipe.problem.length > 5, `Recipe "${cat}" must have PROBLEM`);
      assert.ok(recipe.samreyConcept && recipe.samreyConcept.length > 5, `Recipe "${cat}" must have SAMREY CONCEPT`);
      assert.ok(recipe.recommendedApi && recipe.recommendedApi.includes('@samrey/'), `Recipe "${cat}" must have RECOMMENDED API from @samrey/*`);
      assert.ok(recipe.implementation && recipe.implementation.includes('import'), `Recipe "${cat}" must have IMPLEMENTATION code with imports`);
      assert.ok(recipe.howItWorks && recipe.howItWorks.length > 10, `Recipe "${cat}" must have HOW IT WORKS explanation`);
      assert.ok(recipe.whenToUse && recipe.whenToUse.length > 5, `Recipe "${cat}" must have WHEN TO USE guidance`);
      assert.ok(recipe.alternative && recipe.alternative.length > 5, `Recipe "${cat}" must have ALTERNATIVE`);
      assert.ok(Array.isArray(recipe.commonMistakes) && recipe.commonMistakes.length > 0, `Recipe "${cat}" must have COMMON MISTAKES`);
      assert.ok(Array.isArray(recipe.relatedApis) && recipe.relatedApis.length > 0, `Recipe "${cat}" must have RELATED APIs`);
      assert.ok(Array.isArray(recipe.documentation) && recipe.documentation.length > 0, `Recipe "${cat}" must have DOCUMENTATION links`);
    }
  });

  it('2. Verifies recipe category classification for natural language task queries', () => {
    const testCases: Array<{ query: string; expectedCategory: RecipeCategory }> = [
      { query: 'How do I transfer data between components?', expectedCategory: 'component-communication' },
      { query: 'How do I create a reactive store or signals?', expectedCategory: 'reactive-state' },
      { query: 'How do I update DOM elements when a signal changes?', expectedCategory: 'dom-manipulation' },
      { query: 'How do I conditionally render elements with Show?', expectedCategory: 'conditional-rendering' },
      { query: 'How do I render a keyed list of items with For?', expectedCategory: 'list-rendering' },
      { query: 'How do I listen to DOM events and handle clicks?', expectedCategory: 'events' },
      { query: 'How do I create and bind a form?', expectedCategory: 'forms' },
      { query: 'How do I validate a form with schema validation?', expectedCategory: 'validation' },
      { query: 'How do I call an API or fetch data?', expectedCategory: 'http-api' },
      { query: 'How do I configure routing and navigate between pages?', expectedCategory: 'routing' },
      { query: 'How do I implement SSR streaming?', expectedCategory: 'ssr' },
      { query: 'How do I generate static pages with SSG?', expectedCategory: 'ssg' },
      { query: 'How do I prevent XSS attacks and sanitize input?', expectedCategory: 'security' },
      { query: 'How do I handle errors and exceptions with ErrorBoundary?', expectedCategory: 'error-handling' },
      { query: 'How do I handle component lifecycle with onMount?', expectedCategory: 'lifecycle' },
      { query: 'How do I clean up resources with onCleanup?', expectedCategory: 'cleanup' },
      { query: 'How do I optimize reactivity performance with batch and untrack?', expectedCategory: 'performance' },
      { query: 'How do I write unit tests with TestHarness?', expectedCategory: 'testing' },
      { query: 'How do I inspect reactive state in DevTools?', expectedCategory: 'devtools' }
    ];

    for (const { query, expectedCategory } of testCases) {
      const detected = classifyRecipeCategory(query);
      assert.equal(detected, expectedCategory, `Query "${query}" should classify as "${expectedCategory}"`);
    }
  });

  it('3. Verifies formatRecipeToAnswer produces valid structured 12-section answer format', () => {
    const recipe = RECIPES.find(r => r.category === 'component-communication')!;
    const answer = formatRecipeToAnswer(recipe, 'How do I transfer data between components?');

    assert.equal(answer.isRecipe, true);
    assert.equal(answer.problem, 'Component-to-component data communication');
    assert.ok(answer.samreyConcept?.includes('Reactive state communication'));
    assert.ok(answer.recommendedApi.includes('@samrey/reactivity'));
    assert.ok(answer.tsCodeExample.includes('@samrey/runtime'));
    assert.ok(answer.tsCodeExample.includes('@samrey/reactivity'));
    assert.ok(answer.howItWorks?.includes('components execute once'));
    assert.ok(answer.alternative?.includes('createStore'));
    assert.ok(answer.commonMistakes.length >= 2);
    assert.ok(answer.relatedApis.includes('signal'));
    assert.ok(answer.relatedApis.includes('createStore'));
    assert.ok(answer.docLinks.length >= 2);
  });

  it('4. Verifies findRecipeForQuery retrieves matching recipe with high relevance', () => {
    const recipe = findRecipeForQuery('How do I transfer data between components?');
    assert.ok(recipe, 'Should find recipe for component communication');
    assert.equal(recipe?.category, 'component-communication');
    assert.equal(recipe?.problem, 'Component-to-component data communication');
  });

  it('5. Verifies DeterministicKnowledgeProvider handles recipe tasks accurately', async () => {
    const provider = new DeterministicKnowledgeProvider();
    const answer = await provider.askQuestion('How do I transfer data between components?');

    assert.ok(answer, 'Provider returns answer');
    assert.ok(answer.title.includes('Component') || answer.title.includes('Data Transfer'));
    assert.ok(answer.recommendedApi.includes('signal') || answer.recommendedApi.includes('Props') || answer.recommendedApi.includes('createContext'));
    assert.ok(answer.tsCodeExample.includes('@samrey/runtime'));
    assert.ok(answer.tsCodeExample.includes('@samrey/reactivity'));
  });

  it('6. Verifies SmartAssistantProvider retrieves structured recipes smoothly', async () => {
    const smartProvider = new SmartAssistantProvider();
    const answer = await smartProvider.askQuestion('How do I validate a form?');

    assert.ok(answer, 'Smart provider returns answer');
    assert.ok(answer.recommendedApi.includes('createForm'));
    assert.ok(answer.tsCodeExample.includes('@samrey/forms'));
  });

});
