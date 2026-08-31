/**
 * @license Apache-2.0
 * @samrey/doc - Hybrid Documentation Search & Intent Engine
 *
 * Implements the hybrid documentation search pipeline:
 * User Question -> Question Normalization -> Intent Detection -> Documentation Search ->
 * Grounded Context Building -> AI / Direct Answer Synthesis
 */

import { DocChunk, REPOSITORY_DOC_CHUNKS } from '../data/searchIndex.js';

export type IntentType =
  | 'API_LOOKUP'
  | 'ERROR_DIAGNOSTICS'
  | 'HOW_TO_GUIDE'
  | 'RECIPE_LOOKUP'
  | 'CONCEPTUAL'
  | 'MIGRATION_FOREIGN'
  | 'SECURITY'
  | 'UNKNOWN_OUT_OF_SCOPE';

export interface NormalizedQuery {
  raw: string;
  cleaned: string;
  tokens: string[];
  expandedTerms: string[];
  detectedErrorCode?: string;
  detectedApi?: string;
  isForeignFramework: boolean;
  foreignFrameworkName?: string;
}

export interface UserIntent {
  type: IntentType;
  category: DocChunk['category'];
  confidence: number;
  matchedEntity?: string;
  isDirectAnswerable: boolean;
  description: string;
}

export interface SearchResult {
  chunk: DocChunk;
  relevanceScore: number;
  matchedHeadings: string[];
  matchedTerms: string[];
  snippet: string;
  sourcePath: string;
  docUrl: string;
  isExactMatch: boolean;
}

export interface GroundedDocContext {
  contextMarkdown: string;
  sourceFiles: string[];
  relatedDocLinks: Array<{ label: string; url: string; sourcePath: string }>;
  topResult?: SearchResult;
  isExactMatchFound: boolean;
}

const STOP_WORDS = new Set([
  'how', 'what', 'when', 'where', 'which', 'who', 'whom', 'why',
  'this', 'that', 'these', 'those', 'the', 'a', 'an', 'and', 'or', 'but',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'doing', 'at', 'by', 'for', 'with', 'about', 'into',
  'through', 'during', 'before', 'after', 'to', 'from', 'in', 'out', 'on', 'off',
  'can', 'will', 'just', 'should', 'now', 'make', 'use', 'using', 'get', 'set'
]);

/**
 * 1. Question Normalization
 */
export function normalizeQuestion(rawQuery: string): NormalizedQuery {
  if (!rawQuery || typeof rawQuery !== 'string') {
    return {
      raw: '',
      cleaned: '',
      tokens: [],
      expandedTerms: [],
      isForeignFramework: false
    };
  }

  const raw = rawQuery.trim();
  let cleaned = raw
    .toLowerCase()
    .replace(/["'?!,;:()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Normalize error codes (e.g. "aeth101", "aeth-101", "aeth 101" -> "AETH-101")
  let detectedErrorCode: string | undefined;
  const errorCodeMatch = raw.match(/\b(?:AETH[-_ ]?|error\s+)(\d{3})\b/i);
  if (errorCodeMatch) {
    detectedErrorCode = `AETH-${errorCodeMatch[1]}`;
    cleaned += ` ${detectedErrorCode.toLowerCase()}`;
  }

  // Foreign framework term detection
  let isForeignFramework = false;
  let foreignFrameworkName: string | undefined;
  if (/\b(usestate|useeffect|usememo|usecallback|useref|usecontext|react|jsx-runtime|vdom|virtual\s*dom)\b/i.test(raw)) {
    isForeignFramework = true;
    foreignFrameworkName = 'React';
  } else if (/\b(v-model|vue|pinia|v-if|v-for|composition\s*api)\b/i.test(raw)) {
    isForeignFramework = true;
    foreignFrameworkName = 'Vue';
  } else if (/\b(svelte|runes|\$state|\$derived|\$effect)\b/i.test(raw)) {
    isForeignFramework = true;
    foreignFrameworkName = 'Svelte';
  } else if (/\b(solid|solidjs|createsignal|creatememo|createeffect)\b/i.test(raw)) {
    isForeignFramework = true;
    foreignFrameworkName = 'Solid';
  }

  // Tokenize
  const allTokens = cleaned.split(/\s+/).filter(t => t.length > 1);
  const tokens = allTokens.filter(t => !STOP_WORDS.has(t) || t === detectedErrorCode?.toLowerCase());

  // Synonym & acronym expansions
  const expandedSet = new Set<string>(tokens.length > 0 ? tokens : allTokens);

  if (/\b(ssr|server\s*side|hydrate|hydration|streaming)\b/i.test(raw)) {
    expandedSet.add('ssr');
    expandedSet.add('rendertostring');
    expandedSet.add('rendertostream');
    expandedSet.add('hydrate');
    expandedSet.add('server-side');
  }

  if (/\b(xss|cross\s*site|sanitize|sanitization|trusted\s*types|csp|security)\b/i.test(raw)) {
    expandedSet.add('security');
    expandedSet.add('sanitizehtml');
    expandedSet.add('sanitizeuri');
    expandedSet.add('sanitizeurl');
    expandedSet.add('trusted');
    expandedSet.add('csrf');
  }

  if (/\b(form|validation|validate|schema|zod|valibot|arktype|input|aria)\b/i.test(raw)) {
    expandedSet.add('forms');
    expandedSet.add('createform');
    expandedSet.add('createfield');
    expandedSet.add('bindfield');
    expandedSet.add('standardschema');
  }

  if (/\b(route|router|routing|navigate|url|path|params|useparams)\b/i.test(raw)) {
    expandedSet.add('router');
    expandedSet.add('createrouter');
    expandedSet.add('useparams');
    expandedSet.add('link');
    expandedSet.add('navigation');
  }

  if (/\b(http|fetch|api|request|resource|createresource|endpoint)\b/i.test(raw)) {
    expandedSet.add('http');
    expandedSet.add('createresource');
    expandedSet.add('httpclient');
    expandedSet.add('createhttpclient');
    expandedSet.add('fetching');
  }

  if (/\b(signal|signals|computed|effect|batch|store|createstore|reactivity|state)\b/i.test(raw)) {
    expandedSet.add('reactivity');
    expandedSet.add('signal');
    expandedSet.add('computed');
    expandedSet.add('effect');
    expandedSet.add('createstore');
  }

  if (/\b(dom|render|component|elements|show|for|mount|template|clonenode)\b/i.test(raw)) {
    expandedSet.add('runtime');
    expandedSet.add('el');
    expandedSet.add('show');
    expandedSet.add('for');
    expandedSet.add('mount');
  }

  // Detect specific API match
  let detectedApi: string | undefined;
  const knownApis = [
    'signal', 'computed', 'effect', 'batch', 'untrack', 'createStore', 'produce', 'reconcile',
    'createMemo', 'createRoot', 'onCleanup', 'createContext', 'useContext', 'el', 'svg', 'fragment',
    'mount', 'hydrate', 'Show', 'For', 'Switch', 'Match', 'Dynamic', 'ErrorBoundary',
    'createForm', 'createField', 'bindField', 'createRouter', 'useParams', 'useLocation',
    'useNavigate', 'Link', 'createHttpClient', 'HttpClient', 'createResource', 'resource',
    'renderToString', 'renderToStream', 'sanitizeHtml', 'sanitizeUri', 'sanitizeUrl',
    'safeJsonParse', 'escapeJsonState', 'generateCsrfToken', 'validateCsrfToken', 'testHarness'
  ];

  for (const api of knownApis) {
    const apiLower = api.toLowerCase();
    if (tokens.includes(apiLower) || cleaned.includes(apiLower)) {
      detectedApi = api;
      break;
    }
  }

  return {
    raw,
    cleaned,
    tokens,
    expandedTerms: Array.from(expandedSet),
    detectedErrorCode,
    detectedApi,
    isForeignFramework,
    foreignFrameworkName
  };
}

/**
 * 2. Intent Detection
 */
export function detectIntent(normalized: NormalizedQuery): UserIntent {
  const { raw, cleaned, detectedErrorCode, detectedApi, isForeignFramework, foreignFrameworkName } = normalized;

  // 1. Check for deterministic Error Code lookup
  if (detectedErrorCode) {
    return {
      type: 'ERROR_DIAGNOSTICS',
      category: 'errors',
      confidence: 0.98,
      matchedEntity: detectedErrorCode,
      isDirectAnswerable: true,
      description: `Diagnostic troubleshooting for ${detectedErrorCode}`
    };
  }

  // 2. Foreign framework translation / migration intent
  if (isForeignFramework) {
    return {
      type: 'MIGRATION_FOREIGN',
      category: 'migration',
      confidence: 0.95,
      matchedEntity: foreignFrameworkName,
      isDirectAnswerable: true,
      description: `Migration guidance from ${foreignFrameworkName || 'foreign framework'} to Samrey`
    };
  }

  // 3. Exact API lookup
  if (detectedApi && (/\b(api|function|how to use|signature|parameters|options|return|what is)\b/i.test(raw) || normalized.tokens.length <= 3)) {
    let category: DocChunk['category'] = 'general';
    if (['signal', 'computed', 'effect', 'batch', 'untrack', 'createStore', 'produce', 'reconcile', 'createMemo', 'createRoot', 'onCleanup', 'createContext', 'useContext'].includes(detectedApi)) {
      category = 'reactivity';
    } else if (['el', 'svg', 'fragment', 'mount', 'hydrate', 'Show', 'For', 'Switch', 'Match', 'Dynamic', 'ErrorBoundary'].includes(detectedApi)) {
      category = 'runtime';
    } else if (['createForm', 'createField', 'bindField'].includes(detectedApi)) {
      category = 'forms';
    } else if (['createRouter', 'useParams', 'useLocation', 'useNavigate', 'Link'].includes(detectedApi)) {
      category = 'router';
    } else if (['HttpClient', 'createHttpClient', 'createResource', 'resource'].includes(detectedApi)) {
      category = 'http';
    } else if (['renderToString', 'renderToStream', 'hydrate'].includes(detectedApi)) {
      category = 'ssr';
    } else if (['sanitizeHtml', 'sanitizeUri', 'sanitizeUrl', 'safeJsonParse', 'escapeJsonState', 'generateCsrfToken', 'validateCsrfToken'].includes(detectedApi)) {
      category = 'security';
    }

    return {
      type: 'API_LOOKUP',
      category,
      confidence: 0.96,
      matchedEntity: detectedApi,
      isDirectAnswerable: true,
      description: `Authoritative API reference for ${detectedApi}()`
    };
  }

  // Check domain relevance before general how-to classification
  const samreyKeywords = [
    'samrey', 'reactivity', 'signal', 'computed', 'effect', 'batch', 'store', 'dom', 'runtime', 'el', 'show', 'for',
    'form', 'forms', 'validation', 'validate', 'schema', 'zod', 'valibot', 'arktype', 'aria',
    'router', 'route', 'routing', 'navigation', 'useparams', 'uselocation', 'usenavigate',
    'http', 'fetch', 'api', 'request', 'resource', 'httpclient',
    'ssr', 'hydrate', 'hydration', 'streaming', 'rendertostring', 'rendertostream',
    'security', 'xss', 'csrf', 'trusted', 'sanitize', 'sanitizehtml', 'sanitizeuri', 'prototype',
    'compiler', 'cli', 'test', 'testing', 'harness', 'aeth', 'error', 'component', 'props', 'state', 'framework',
    'typescript', 'vdom', 'clone', 'data', 'transfer', 'context', 'parent', 'child', 'event', 'listener', 'handler'
  ];

  const hasRelevantKeyword = normalized.expandedTerms.some(term => {
    const t = term.toLowerCase();
    return samreyKeywords.some(kw => t.includes(kw) || kw.includes(t));
  });
  if (!hasRelevantKeyword && normalized.tokens.length > 0) {
    return {
      type: 'UNKNOWN_OUT_OF_SCOPE',
      category: 'general',
      confidence: 0.2,
      isDirectAnswerable: true,
      description: 'Out of scope or unrelated to Samrey Framework'
    };
  }

  // 4. Security intent
  if (/\b(xss|sanitize|sanitization|csrf|trusted types|secret|prototype pollution)\b/i.test(cleaned)) {
    return {
      type: 'SECURITY',
      category: 'security',
      confidence: 0.92,
      isDirectAnswerable: true,
      description: 'Security architecture, XSS prevention, and Trusted Types guidelines'
    };
  }

  // 5. How-to implementation guides
  if (/\b(how do i|how to|how can i|implement|create|build|write|setup|set up|guide)\b/i.test(cleaned)) {
    let category: DocChunk['category'] = 'general';
    if (/\b(form|validation|validate|schema|zod|aria)\b/i.test(cleaned)) category = 'forms';
    else if (/\b(route|router|routing|navigation|param)\b/i.test(cleaned)) category = 'router';
    else if (/\b(http|fetch|api|call|request|resource)\b/i.test(cleaned)) category = 'http';
    else if (/\b(store|state|signal|computed|reactive)\b/i.test(cleaned)) category = 'reactivity';
    else if (/\b(ssr|server|hydrate|hydration|stream)\b/i.test(cleaned)) category = 'ssr';
    else if (/\b(dom|component|update|element|show|for)\b/i.test(cleaned)) category = 'runtime';
    else if (/\b(test|testing|harness|assert)\b/i.test(cleaned)) category = 'testing';
    else if (/\b(cli|create app|starter|template)\b/i.test(cleaned)) category = 'cli';

    return {
      type: 'HOW_TO_GUIDE',
      category,
      confidence: 0.90,
      isDirectAnswerable: false,
      description: `Implementation guide for ${category} in Samrey`
    };
  }

  // 6. Conceptual / Architecture
  if (/\b(why|what is|architecture|how does|philosophy|vdom|virtual dom|benchmark|comparison|concept)\b/i.test(cleaned)) {
    return {
      type: 'CONCEPTUAL',
      category: 'general',
      confidence: 0.88,
      isDirectAnswerable: false,
      description: 'Architectural concepts and core design principles'
    };
  }

  return {
    type: 'HOW_TO_GUIDE',
    category: 'general',
    confidence: 0.7,
    isDirectAnswerable: false,
    description: 'Samrey development guidance'
  };
}

/**
 * 3. Documentation Search Engine (Multi-Tier Scoring)
 */
export function searchDocumentation(
  rawQuery: string,
  options: { maxResults?: number; minScoreThreshold?: number } = {}
): SearchResult[] {
  const maxResults = options.maxResults ?? 5;
  const minScoreThreshold = options.minScoreThreshold ?? 15;

  const normalized = normalizeQuestion(rawQuery);
  const intent = detectIntent(normalized);

  if (intent.type === 'UNKNOWN_OUT_OF_SCOPE') {
    return [];
  }

  const results: SearchResult[] = [];

  for (const chunk of REPOSITORY_DOC_CHUNKS) {
    let score = 0;
    const matchedHeadings: string[] = [];
    const matchedTerms: string[] = [];
    let isExactMatch = false;

    // A. Exact Error Code match (+100)
    if (normalized.detectedErrorCode && chunk.errorCodes.includes(normalized.detectedErrorCode)) {
      score += 100;
      isExactMatch = true;
      matchedTerms.push(normalized.detectedErrorCode);
    }

    // B. Exact API match (+100)
    if (normalized.detectedApi) {
      const hasApi = chunk.apis.some(api => api.toLowerCase() === normalized.detectedApi?.toLowerCase());
      if (hasApi) {
        score += 100;
        isExactMatch = true;
        matchedTerms.push(normalized.detectedApi);
      }
    }

    // C. Title exact/partial match (+40)
    const titleLower = chunk.title.toLowerCase();
    if (normalized.tokens.some(t => titleLower.includes(t))) {
      score += 40;
    }

    // D. Headings match (+30)
    for (const heading of chunk.headings) {
      const headingLower = heading.toLowerCase();
      for (const token of normalized.tokens) {
        if (headingLower.includes(token) && !matchedHeadings.includes(heading)) {
          matchedHeadings.push(heading);
          score += 25;
        }
      }
    }

    // E. Category match with detected intent (+25)
    if (chunk.category === intent.category) {
      score += 25;
    }

    // F. Keywords overlap (+15 per keyword)
    for (const kw of chunk.keywords) {
      const kwLower = kw.toLowerCase();
      if (normalized.expandedTerms.includes(kwLower) || normalized.tokens.some(t => kwLower.includes(t))) {
        score += 15;
        matchedTerms.push(kw);
      }
    }

    // G. Content token frequency matching
    const contentLower = chunk.content.toLowerCase();
    const summaryLower = chunk.summary.toLowerCase();

    for (const token of normalized.tokens) {
      if (summaryLower.includes(token)) {
        score += 10;
      }
      if (contentLower.includes(token)) {
        score += 5;
      }
    }

    if (score >= minScoreThreshold) {
      // Build high-density snippet
      const snippet = buildSnippet(chunk, normalized.tokens);

      results.push({
        chunk,
        relevanceScore: score,
        matchedHeadings,
        matchedTerms: Array.from(new Set(matchedTerms)),
        snippet,
        sourcePath: chunk.sourcePath,
        docUrl: chunk.docUrl,
        isExactMatch
      });
    }
  }

  // Sort by relevance score descending
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return results.slice(0, maxResults);
}

/**
 * Builds a contextual snippet around matched terms.
 */
function buildSnippet(chunk: DocChunk, tokens: string[]): string {
  const content = chunk.content;
  if (!tokens || tokens.length === 0) {
    return chunk.summary;
  }

  const lines = content.split('\n');
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    if (tokens.some(t => lineLower.includes(t)) && line.trim().length > 20) {
      return line.trim().replace(/^#+\s*/, '');
    }
  }

  return chunk.summary;
}

/**
 * 4. Build Grounded Context from Search Results
 */
export function buildGroundedContext(
  searchResults: SearchResult[],
  maxChunks = 3,
  maxTokensEstimate = 2000
): GroundedDocContext {
  if (searchResults.length === 0) {
    return {
      contextMarkdown: 'No relevant Samrey documentation found.',
      sourceFiles: [],
      relatedDocLinks: [],
      isExactMatchFound: false
    };
  }

  const selectedResults = searchResults.slice(0, maxChunks);
  const sourceFiles: string[] = [];
  const relatedDocLinks: Array<{ label: string; url: string; sourcePath: string }> = [];

  let contextMarkdown = '### Authoritative Samrey Documentation Context\n\n';

  for (const res of selectedResults) {
    const chunk = res.chunk;
    sourceFiles.push(chunk.sourcePath);
    relatedDocLinks.push({
      label: chunk.title,
      url: chunk.docUrl,
      sourcePath: chunk.sourcePath
    });

    contextMarkdown += `#### Document: [${chunk.title}] (${chunk.sourcePath})\n`;
    contextMarkdown += `**Category**: ${chunk.category} | **Relevance**: ${res.relevanceScore} pts\n`;
    contextMarkdown += `**Summary**: ${chunk.summary}\n\n`;
    contextMarkdown += `${chunk.content}\n\n---\n\n`;
  }

  return {
    contextMarkdown: contextMarkdown.trim(),
    sourceFiles: Array.from(new Set(sourceFiles)),
    relatedDocLinks,
    topResult: searchResults[0],
    isExactMatchFound: searchResults.some(r => r.isExactMatch)
  };
}
