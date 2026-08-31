/**
 * @license Apache-2.0
 * @samrey/doc - Samrey Developer Assistant Provider Abstraction
 *
 * Implements a hybrid Documentation Search + AI architecture:
 * User Question -> Normalization -> Intent Detection -> Documentation Search ->
 * Retrieve Relevant Documentation -> Build Grounded Context -> AI / Deterministic Answer Generation
 */

import { AssistantAnswer, queryKnowledgeBase } from '../data/assistantKnowledge.js';
import {
  normalizeQuestion,
  detectIntent,
  searchDocumentation,
  buildGroundedContext,
  UserIntent,
  SearchResult
} from './docSearchEngine.js';
import { findRecipeForQuery, formatRecipeToAnswer } from '../data/recipeCatalog.js';
import type {
  CodeHelpRequest,
  CodeHelpResult
} from './codeHelpEngine.js';
import {
  analyzeSamreyCode,
  detectUnsupportedApis
} from './codeHelpEngine.js';

export type { CodeHelpRequest, CodeHelpResult };
export { detectUnsupportedApis, analyzeSamreyCode };

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantProvider {
  askQuestion(query: string, history?: ChatMessage[]): Promise<AssistantAnswer>;
  analyzeCode?(request: CodeHelpRequest): Promise<CodeHelpResult>;
}

/**
 * Server-Side Gemini Provider with Grounded Context Support
 * Calls the secure backend endpoint `/api/assistant`.
 */
export class GeminiServerProvider implements AssistantProvider {
  async askQuestion(
    query: string,
    history: ChatMessage[] = [],
    retrievedDocs = ''
  ): Promise<AssistantAnswer> {
    if (typeof fetch === 'undefined') {
      throw new Error('fetch API is not available in current environment');
    }

    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: query,
        history,
        retrievedDocs
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.answer && typeof data.answer === 'object') {
      return {
        ...data.answer,
        isAiGenerated: true,
        provider: data.provider || 'gemini-3.7-flash'
      };
    }

    if (typeof data.answer === 'string') {
      // Parse markdown formatted response into structured sections
      const parsed = parseMarkdownToAnswer(data.answer, query);
      return {
        ...parsed,
        isAiGenerated: true,
        provider: data.provider || 'gemini-3.7-flash'
      };
    }

    throw new Error('Invalid response structure received from /api/assistant');
  }

  async analyzeCode(
    request: CodeHelpRequest,
    retrievedDocs = ''
  ): Promise<CodeHelpResult> {
    if (typeof fetch === 'undefined') {
      throw new Error('fetch API is not available in current environment');
    }

    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: request.question || 'Analyze and fix this Samrey code.',
        code: request.code,
        mode: 'code_help',
        retrievedDocs
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.codeHelp && typeof data.codeHelp === 'object') {
      return {
        ...data.codeHelp,
        isAiGenerated: true,
        provider: data.provider || 'gemini-3.7-flash'
      };
    }

    // Fallback to local deterministic analysis
    return analyzeSamreyCode(request.code, request.question);
  }
}

/**
 * Deterministic Knowledge Base Provider
 * Grounded on authoritative repository docs, specs, and error catalogs.
 */
export class DeterministicKnowledgeProvider implements AssistantProvider {
  async askQuestion(query: string): Promise<AssistantAnswer> {
    const normalized = normalizeQuestion(query);
    const intent = detectIntent(normalized);
    const searchResults = searchDocumentation(query, { maxResults: 4, minScoreThreshold: 10 });
    const groundedContext = buildGroundedContext(searchResults, 3);

    // If query is completely out of scope or unknown
    if (intent.type === 'UNKNOWN_OUT_OF_SCOPE' && searchResults.length === 0) {
      return createUnknownDocAnswer(query, intent);
    }

    const baseAnswer = queryKnowledgeBase(query);

    // Merge retrieved doc links and source files
    const docLinks = [...baseAnswer.docLinks];
    for (const link of groundedContext.relatedDocLinks) {
      if (!docLinks.some(l => l.url === link.url || l.label === link.label)) {
        docLinks.push(link);
      }
    }

    return {
      ...baseAnswer,
      docLinks,
      sourceFiles: groundedContext.sourceFiles,
      intentType: intent.type,
      isDirectMatch: groundedContext.isExactMatchFound || intent.isDirectAnswerable,
      isAiGenerated: false,
      provider: 'samrey-knowledge-engine-v1.0.0'
    };
  }

  async analyzeCode(request: CodeHelpRequest): Promise<CodeHelpResult> {
    return analyzeSamreyCode(request.code, request.question);
  }
}

/**
 * Smart Hybrid Provider
 * Pipeline:
 * 1. Normalize question
 * 2. Detect user intent
 * 3. Search repository documentation
 * 4. Build grounded context
 * 5. Direct match optimization: if exact match / simple lookup, returns fast deterministic answer
 * 6. Otherwise calls Gemini with grounded documentation context, falling back smoothly to local knowledge engine
 */
export class SmartAssistantProvider implements AssistantProvider {
  private geminiProvider = new GeminiServerProvider();
  private knowledgeProvider = new DeterministicKnowledgeProvider();

  async askQuestion(query: string, history: ChatMessage[] = []): Promise<AssistantAnswer> {
    const normalized = normalizeQuestion(query);
    const intent = detectIntent(normalized);
    const searchResults = searchDocumentation(query, { maxResults: 4, minScoreThreshold: 10 });
    const groundedContext = buildGroundedContext(searchResults, 3);

    // Handle unknown out of scope questions immediately
    if (intent.type === 'UNKNOWN_OUT_OF_SCOPE' && searchResults.length === 0) {
      return createUnknownDocAnswer(query, intent);
    }

    // Direct match fast-path optimization
    // If the query is an exact error code (e.g. AETH-101) or exact API lookup with high confidence,
    // we can return the grounded answer directly without unnecessary AI latency.
    if ((intent.type === 'ERROR_DIAGNOSTICS' || (intent.type === 'API_LOOKUP' && groundedContext.isExactMatchFound)) && intent.confidence >= 0.95) {
      const directAnswer = await this.knowledgeProvider.askQuestion(query);
      return {
        ...directAnswer,
        isDirectMatch: true,
        isAiGenerated: false,
        provider: 'samrey-knowledge-engine-v1.0.0 (Direct Exact Match)'
      };
    }

    try {
      // Pass grounded context to Gemini
      const aiAnswer = await this.geminiProvider.askQuestion(
        query,
        history,
        groundedContext.contextMarkdown
      );

      // Enhance AI answer with authoritative source file citations and doc links
      const mergedDocLinks = [...(aiAnswer.docLinks || [])];
      for (const link of groundedContext.relatedDocLinks) {
        if (!mergedDocLinks.some(l => l.url === link.url || l.label === link.label)) {
          mergedDocLinks.push(link);
        }
      }

      return {
        ...aiAnswer,
        sourceFiles: groundedContext.sourceFiles.length > 0 ? groundedContext.sourceFiles : ['docs/PUBLIC_API.md'],
        docLinks: mergedDocLinks,
        intentType: intent.type,
        isDirectMatch: false,
        isAiGenerated: true,
        provider: aiAnswer.provider || 'gemini-3.7-flash (Grounded)'
      };
    } catch {
      // Seamless graceful deterministic fallback
      const fallbackAnswer = await this.knowledgeProvider.askQuestion(query);
      return {
        ...fallbackAnswer,
        isAiGenerated: false,
        provider: 'samrey-knowledge-engine-v1.0.0'
      };
    }
  }

  async analyzeCode(request: CodeHelpRequest): Promise<CodeHelpResult> {
    const searchResults = searchDocumentation(request.question || request.code, { maxResults: 3, minScoreThreshold: 10 });
    const groundedContext = buildGroundedContext(searchResults, 2);

    try {
      const aiResult = await this.geminiProvider.analyzeCode(request, groundedContext.contextMarkdown);
      const unsupported = detectUnsupportedApis(request.code);
      const warnings = unsupported.map(w => `⚠️ ${w.detectedApi}: ${w.description} -> ${w.samreyAlternative}`);

      return {
        ...aiResult,
        warnings: [...new Set([...(aiResult.warnings || []), ...warnings])],
        unsupportedApisFound: unsupported,
        docLinks: groundedContext.relatedDocLinks.length > 0 ? groundedContext.relatedDocLinks : aiResult.docLinks,
        isAiGenerated: true,
        provider: aiResult.provider || 'gemini-3.7-flash (Code Engine)'
      };
    } catch {
      // Deterministic analyzer fallback
      return this.knowledgeProvider.analyzeCode(request);
    }
  }
}

/**
 * Produces structured response for unknown/out-of-scope queries
 */
function createUnknownDocAnswer(query: string, intent: UserIntent): AssistantAnswer {
  return {
    id: `unknown-${Date.now()}`,
    query,
    category: 'general',
    title: 'No Matching Samrey Documentation Found',
    shortAnswer: `No relevant Samrey Framework documentation was found for "${query}". Samrey Developer Assistant answers questions regarding official @samrey/* packages (reactivity, runtime, forms, router, HTTP, SSR, security, compiler, CLI, and AETH error codes).`,
    concept: 'The Samrey Developer Assistant is strictly grounded on the official Samrey Framework repository documentation and avoids hallucinating non-existent features or APIs.',
    recommendedApi: 'Explore official @samrey/* packages in the Documentation and Architecture tabs.',
    whenToUse: 'Use the Samrey Developer Assistant to ask about signals, fine-grained DOM bindings, schema forms, route navigation, zero-eval security, SSR streaming, or AETH error codes.',
    implementationSteps: [
      'Check the spelling of your search terms or API names.',
      'Search for a core Samrey subsystem: Reactivity (`signal`, `computed`), Runtime (`el`, `Show`, `For`), Forms (`createForm`), Router (`createRouter`), or HTTP (`createResource`).',
      'If troubleshooting an error, provide the exact code (e.g. `AETH-101`, `AETH-301`).',
      'Select one of the popular question chips or browse the full specification documents.'
    ],
    tsCodeExample: `// Example: Creating reactive state in Samrey
import { signal, computed, effect } from '@samrey/reactivity';

const count = signal(0);
const doubled = computed(() => count.value * 2);

effect(() => {
  console.log(\`Current count is: \${count.value}, doubled is: \${doubled.value}\`);
});`,
    codeExplanation: 'To get started with Samrey, use @samrey/reactivity for signal management and @samrey/runtime for direct DOM rendering with zero Virtual DOM overhead.',
    commonMistakes: [
      'Asking questions unrelated to Samrey Framework or frontend architecture.',
      'Assuming React/Vue/Svelte runtime packages are bundled with Samrey.'
    ],
    relatedApis: ['signal', 'computed', 'effect', 'el', 'Show', 'For', 'createForm', 'createRouter'],
    docLinks: [
      { label: 'Full Documentation Suite', url: '#docs', sourcePath: 'docs/GETTING_STARTED.md' },
      { label: 'Public API Reference', url: '#architecture', sourcePath: 'docs/PUBLIC_API.md' },
      { label: 'Reactivity Visualizer', url: '#reactivity', sourcePath: 'docs/REACTIVITY_AND_CONTROL_FLOW.md' }
    ],
    sourceFiles: ['docs/GETTING_STARTED.md', 'docs/PUBLIC_API.md'],
    intentType: intent.type,
    isDirectMatch: false,
    isAiGenerated: false,
    provider: 'samrey-knowledge-engine-v1.0.0 (Out of Scope)'
  };
}

/**
 * Parses markdown text into structured 12-section answer fields.
 */
function parseMarkdownToAnswer(markdown: string, query: string): AssistantAnswer {
  const base = queryKnowledgeBase(query);

  const extractSection = (headingRegex: RegExp): string | undefined => {
    const match = markdown.match(headingRegex);
    return match ? match[1]?.trim() : undefined;
  };

  const shortAnswer = extractSection(/(?:###?\s*(?:1\.\s*)?Short Answer)([\s\S]*?)(?=###?\s*(?:2\.\s*)?Concept|$)/i) || base.shortAnswer;
  const concept = extractSection(/(?:###?\s*(?:2\.\s*)?Concept)([\s\S]*?)(?=###?\s*(?:3\.\s*)?Recommended|$)/i) || base.concept;
  const recommendedApi = extractSection(/(?:###?\s*(?:3\.\s*)?Recommended Samrey API)([\s\S]*?)(?=###?\s*(?:4\.\s*)?When to use|$)/i) || base.recommendedApi;
  const whenToUse = extractSection(/(?:###?\s*(?:4\.\s*)?When to use(?: it)?)([\s\S]*?)(?=###?\s*(?:5\.\s*)?Step-by-step|$)/i) || base.whenToUse;

  return {
    ...base,
    id: `ai-${Date.now()}`,
    query,
    shortAnswer,
    concept,
    recommendedApi,
    whenToUse
  };
}
